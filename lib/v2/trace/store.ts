import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Redactor, Span, Trace, TraceSink } from "./types";

/**
 * Trace sinks.
 *
 * Deliberately plain. A trace store that needs a running service is a trace
 * store that is off when someone is debugging at 1am, and evals then have
 * nothing to read.
 */

/** Keeps everything in memory. For tests and for eval runs that process the
 *  trace immediately. */
export class MemorySink implements TraceSink {
  readonly spans: Span[] = [];
  readonly traces: Trace[] = [];

  onSpanEnd(span: Span): void {
    this.spans.push(span);
  }

  onTraceEnd(trace: Trace): void {
    this.traces.push(trace);
  }
}

/**
 * Appends one JSON object per line as spans close.
 *
 * Append-on-close rather than write-at-end, so a run that crashes still leaves
 * everything up to the crash — which is the run most worth reading. JSONL
 * because it survives partial writes: a truncated final line costs one span,
 * not the file.
 */
export class JsonlSink implements TraceSink {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  onSpanEnd(span: Span): void {
    appendFileSync(this.filePath, JSON.stringify(span) + "\n", "utf8");
  }

  onTraceEnd(trace: Trace): void {
    appendFileSync(
      this.filePath,
      JSON.stringify({ __trace__: { ...trace, spans: undefined } }) + "\n",
      "utf8",
    );
  }
}

/** Fans out to several sinks. One sink failing must not take down the run —
 *  tracing is observability, not the product. */
export class MultiSink implements TraceSink {
  constructor(private readonly sinks: TraceSink[]) {}

  async onSpanEnd(span: Span): Promise<void> {
    for (const sink of this.sinks) {
      try {
        await sink.onSpanEnd(span);
      } catch {
        // Intentionally swallowed.
      }
    }
  }

  async onTraceEnd(trace: Trace): Promise<void> {
    for (const sink of this.sinks) {
      try {
        await sink.onTraceEnd?.(trace);
      } catch {
        // Intentionally swallowed.
      }
    }
  }
}

/** Default location for a dev run's trace. */
export function traceFilePath(traceId: string, dir = "traces"): string {
  return join(dir, `${traceId}.jsonl`);
}

/** Read a JSONL trace file back. Skips the trailing partial line a crashed run
 *  can leave, rather than failing to load the whole trace over it. */
export function readTraceFile(filePath: string): Span[] {
  if (!existsSync(filePath)) return [];
  const out: Span[] = [];

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.__trace__) continue;
      out.push(parsed as Span);
    } catch {
      // Partial final line from an interrupted run.
    }
  }
  return out;
}

/**
 * Redacts long free text from spans while keeping structure and metrics.
 *
 * Not a PII redactor — see `types.ts`. This one keeps dev trace files readable
 * and small. Layer C will need a real redactor before any resume text reaches a
 * sink (BACKLOG B15).
 */
export function truncatingRedactor(maxChars = 2000): Redactor {
  const shrink = (value: unknown): unknown => {
    if (typeof value === "string" && value.length > maxChars) {
      return value.slice(0, maxChars) + `…[${value.length - maxChars} more chars]`;
    }
    if (Array.isArray(value)) return value.map(shrink);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shrink(v)]),
      );
    }
    return value;
  };

  return (span) => ({
    ...span,
    input: shrink(span.input),
    output: shrink(span.output),
  });
}
