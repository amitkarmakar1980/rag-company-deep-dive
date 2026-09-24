import type { Span, SpanType, TokenUsage } from "./types";

/**
 * Reading traces.
 *
 * Evals consume traces, not just final outputs. A report can look fine while
 * the researcher gave up on half its questions, and only the trace shows that.
 * These helpers are the queries the eval layer actually needs.
 */

export function byType(spans: Span[], type: SpanType): Span[] {
  return spans.filter((s) => s.type === type);
}

export function byName(spans: Span[], name: string): Span[] {
  return spans.filter((s) => s.name === name);
}

export function childrenOf(spans: Span[], parentId: string): Span[] {
  return spans.filter((s) => s.parentId === parentId);
}

/** Every span beneath `spanId`, at any depth. */
export function descendantsOf(spans: Span[], spanId: string): Span[] {
  const out: Span[] = [];
  const queue = [spanId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of spans.filter((s) => s.parentId === current)) {
      out.push(child);
      queue.push(child.id);
    }
  }
  return out;
}

/** Spans for one section, including everything nested under it. */
export function sectionSpans(spans: Span[], sectionId: string): Span[] {
  const section = spans.find(
    (s) => s.type === "section" && s.attributes?.sectionId === sectionId,
  );
  if (!section) return [];
  return [section, ...descendantsOf(spans, section.id)];
}

export interface UsageTotals {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export function totalUsage(spans: Span[]): UsageTotals {
  const totals: UsageTotals = {
    calls: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  };

  for (const s of spans) {
    if (s.type !== "model_call" || !s.usage) continue;
    totals.calls++;
    totals.input += s.usage.input;
    totals.output += s.usage.output;
    totals.cacheRead += s.usage.cacheRead ?? 0;
    totals.cacheWrite += s.usage.cacheWrite ?? 0;
  }
  return totals;
}

/** Token usage grouped by model, for spotting where the budget actually went. */
export function usageByModel(spans: Span[]): Record<string, UsageTotals> {
  const out: Record<string, UsageTotals> = {};
  for (const s of spans) {
    if (s.type !== "model_call" || !s.usage || !s.model) continue;
    const t = (out[s.model] ??= {
      calls: 0,
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    });
    t.calls++;
    t.input += s.usage.input;
    t.output += s.usage.output;
    t.cacheRead += s.usage.cacheRead ?? 0;
    t.cacheWrite += s.usage.cacheWrite ?? 0;
  }
  return out;
}

export interface ResearchQuestionTrace {
  question: string;
  sectionId?: string;
  iterations: number;
  resolved: boolean;
  /** Why the loop stopped: "sufficient", "budget", "no_new_evidence", … */
  stopReason?: string;
  durationMs: number;
  chunksRetrieved: number;
  toolCalls: number;
}

/**
 * One row per research question.
 *
 * The highest-value view in this file. The researcher is the only genuinely
 * autonomous component, and these are the questions it decides the report can
 * answer. A section that scores badly usually has a bad row here — a question
 * abandoned after one iteration, or one that looped to the budget ceiling and
 * stopped without saying so.
 */
export function researchQuestions(spans: Span[]): ResearchQuestionTrace[] {
  return byName(spans, "researcher").map((span) => {
    const nested = descendantsOf(spans, span.id);
    const iterations = nested.filter(
      (s) => s.type === "decision" && s.name === "sufficiency_check",
    ).length;

    return {
      question: String(span.attributes?.question ?? span.input ?? ""),
      sectionId: span.attributes?.sectionId
        ? String(span.attributes.sectionId)
        : undefined,
      iterations,
      resolved: span.attributes?.resolved === true,
      stopReason: span.attributes?.stopReason
        ? String(span.attributes.stopReason)
        : undefined,
      durationMs: span.durationMs ?? 0,
      chunksRetrieved: nested
        .filter((s) => s.type === "retrieval")
        .reduce((n, s) => n + Number(s.attributes?.chunkCount ?? 0), 0),
      toolCalls: nested.filter((s) => s.type === "tool_call").length,
    };
  });
}

/** Questions the researcher could not answer. Drives coverage honesty, and is
 *  the raw material for the derived "unknowns to validate" view. */
export function unresolvedQuestions(spans: Span[]): ResearchQuestionTrace[] {
  return researchQuestions(spans).filter((q) => !q.resolved);
}

export interface TraceHealth {
  spans: number;
  errors: Span[];
  /** Spans that never closed — an early return or a missing await, and always a
   *  hole in the record. */
  unclosed: Span[];
  /** Spans whose parent is absent, which means the tree cannot be walked. */
  orphans: Span[];
  wallClockMs: number;
}

/**
 * Structural check on a trace.
 *
 * Runs in the self-test. A trace with holes is worse than no trace: it looks
 * authoritative while quietly omitting the step that explains the failure.
 */
export function traceHealth(spans: Span[]): TraceHealth {
  const ids = new Set(spans.map((s) => s.id));
  const root = spans.find((s) => s.parentId === null);

  return {
    spans: spans.length,
    errors: spans.filter((s) => s.status === "error"),
    unclosed: spans.filter((s) => !s.endedAt),
    orphans: spans.filter((s) => s.parentId !== null && !ids.has(s.parentId)),
    wallClockMs: root?.durationMs ?? 0,
  };
}

/** Indented tree, for reading a trace in a terminal. */
export function formatTree(spans: Span[], indent = "  "): string {
  const lines: string[] = [];

  const walk = (parentId: string | null, depth: number) => {
    for (const s of spans.filter((x) => x.parentId === parentId)) {
      const ms = s.durationMs !== undefined ? `${s.durationMs}ms` : "open";
      const usage: TokenUsage | undefined = s.usage;
      const tokens = usage ? ` ${usage.input}→${usage.output}tok` : "";
      const flag = s.status === "error" ? " ERROR" : "";
      lines.push(
        `${indent.repeat(depth)}${s.type}:${s.name} (${ms}${tokens})${flag}`,
      );
      walk(s.id, depth + 1);
    }
  };

  walk(null, 0);
  return lines.join("\n");
}
