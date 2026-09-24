import { randomUUID } from "node:crypto";
import type {
  Redactor,
  Span,
  SpanStatus,
  SpanType,
  TokenUsage,
  Trace,
  TraceSink,
} from "./types";

/**
 * Minimal tracer.
 *
 * Nesting is explicit — a span creates its children — rather than implicit via
 * AsyncLocalStorage. Explicit parentage survives `Promise.all`, which this
 * pipeline uses constantly for within-tier parallelism, and it makes the tree
 * shape a property of the code rather than of the async scheduler.
 */

export interface SpanHandle {
  readonly id: string;
  readonly type: SpanType;
  readonly name: string;

  /** Open a child span. */
  child(type: SpanType, name: string, input?: unknown): SpanHandle;

  /** Attach data as the span runs. Merges rather than replaces. */
  annotate(attributes: Record<string, string | number | boolean | null>): void;
  setInput(input: unknown): void;
  setOutput(output: unknown): void;
  recordUsage(model: string, usage: TokenUsage): void;

  end(status?: SpanStatus): void;
  fail(error: unknown): void;

  /**
   * Run `fn` inside this span, closing it correctly on both paths.
   *
   * The preferred entry point: a span closed only on the success path leaves
   * failures invisible, and failures are the runs worth tracing.
   */
  run<T>(fn: (span: SpanHandle) => Promise<T>): Promise<T>;
}

export interface TracerOptions {
  sinks?: TraceSink[];
  redact?: Redactor;
  /** Injectable for deterministic tests. */
  now?: () => Date;
  newId?: () => string;
}

export class Tracer {
  private readonly trace: Trace;
  private readonly sinks: TraceSink[];
  private readonly redact: Redactor;
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly open = new Map<string, Span>();

  constructor(
    meta: { requestId: string; companyName: string; roleTitle?: string },
    opts: TracerOptions = {},
  ) {
    this.sinks = opts.sinks ?? [];
    this.redact = opts.redact ?? ((s) => s);
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? (() => randomUUID());

    this.trace = {
      id: this.newId(),
      requestId: meta.requestId,
      companyName: meta.companyName,
      roleTitle: meta.roleTitle,
      startedAt: this.now().toISOString(),
      spans: [],
    };
  }

  get traceId(): string {
    return this.trace.id;
  }

  /** The root span. Everything else descends from it. */
  startRun(name = "deep_dive", input?: unknown): SpanHandle {
    return this.open_(null, "run", name, input);
  }

  /** Completed trace. Safe to call once the root span has ended. */
  snapshot(): Trace {
    return {
      ...this.trace,
      endedAt: this.trace.endedAt,
      spans: [...this.trace.spans],
    };
  }

  async finish(): Promise<Trace> {
    this.trace.endedAt = this.now().toISOString();
    const snap = this.snapshot();
    for (const sink of this.sinks) {
      if (sink.onTraceEnd) await sink.onTraceEnd(snap);
    }
    return snap;
  }

  private open_(
    parentId: string | null,
    type: SpanType,
    name: string,
    input?: unknown,
  ): SpanHandle {
    const span: Span = {
      id: this.newId(),
      traceId: this.trace.id,
      parentId,
      type,
      name,
      startedAt: this.now().toISOString(),
      status: "ok",
      input,
    };

    this.open.set(span.id, span);
    this.trace.spans.push(span);

    return this.handle(span);
  }

  private handle(span: Span): SpanHandle {
    const self = this;
    let ended = false;

    const close = (status: SpanStatus) => {
      // Ending twice would double-emit to sinks and corrupt any aggregate
      // computed from the stream. Silently ignoring the second call is safer
      // than throwing inside a finally block.
      if (ended) return;
      ended = true;

      const end = self.now();
      span.endedAt = end.toISOString();
      span.durationMs = end.getTime() - new Date(span.startedAt).getTime();
      span.status = status;
      self.open.delete(span.id);

      const emitted = self.redact({ ...span });
      for (const sink of self.sinks) void sink.onSpanEnd(emitted);
    };

    return {
      id: span.id,
      type: span.type,
      name: span.name,

      child: (type, name, input) => self.open_(span.id, type, name, input),

      annotate(attributes) {
        span.attributes = { ...(span.attributes ?? {}), ...attributes };
      },
      setInput(input) {
        span.input = input;
      },
      setOutput(output) {
        span.output = output;
      },
      recordUsage(model, usage) {
        span.model = model;
        span.usage = usage;
      },

      end: (status = "ok") => close(status),

      fail(error) {
        span.error = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };
        close("error");
      },

      async run(fn) {
        const handle = self.handle(span);
        try {
          const result = await fn(handle);
          close("ok");
          return result;
        } catch (err) {
          handle.fail(err);
          throw err;
        }
      },
    };
  }

  /**
   * Spans still open. A non-empty list after a run means work was started and
   * never closed — usually an early return or a missing `await`, and always a
   * hole in the record.
   */
  openSpans(): Span[] {
    return [...this.open.values()];
  }
}
