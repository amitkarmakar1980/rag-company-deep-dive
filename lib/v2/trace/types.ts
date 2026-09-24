/**
 * Tracing.
 *
 * A trace is the complete record of one run: every agent invocation, model
 * call, retrieval, tool call, and decision, from the initial request to the
 * final report.
 *
 * First-class rather than bolted on, for three reasons:
 *
 *  1. The researcher loop is the one genuinely autonomous component, and an
 *     autonomous loop you cannot see inside is unfixable. "Why did it stop
 *     after two iterations" must be answerable from the record.
 *
 *  2. Evals read traces, not just outputs. Recall@k needs the retrieval spans;
 *     cost per section needs the model spans; "which upstream conclusion poisoned
 *     this section" needs the whole tree.
 *
 *  3. Attribution. With ~340 model calls per run, a bad claim has to be
 *     traceable to the exact call that produced it and the exact evidence that
 *     call saw.
 *
 * The interface is ours; Langfuse and friends are optional exporters over it
 * (see `store.ts`). A foundation that evals depend on should not be able to go
 * down because a vendor did.
 */

export type SpanType =
  /** The whole run. Exactly one per trace, and the root of the tree. */
  | "run"
  /** One section's end-to-end work. */
  | "section"
  /** One agent invocation: planner, researcher, claim_writer, verifier, … */
  | "agent"
  /** One request to a model. The unit that costs money. */
  | "model_call"
  /** One query against the evidence store. */
  | "retrieval"
  /** One external fetch: web search, crawl, scrape. */
  | "tool_call"
  /** A branch point worth recording even though nothing external happened —
   *  above all, the researcher's decision to loop again or stop. */
  | "decision"
  /** One scorer run. Recorded so eval results sit in the same tree as the work
   *  they grade. */
  | "scorer";

export type SpanStatus = "ok" | "error" | "skipped";

export interface TokenUsage {
  input: number;
  output: number;
  /** Cached input tokens, where the provider reports them separately. */
  cacheRead?: number;
  cacheWrite?: number;
}

export interface Span {
  id: string;
  traceId: string;
  /** Null only for the root `run` span. */
  parentId: string | null;
  type: SpanType;
  /** Stable identifier for aggregation: "researcher", "verifier", … */
  name: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: SpanStatus;

  /**
   * What went in and what came out.
   *
   * This is what separates a trace from a log. A log says the verifier ran; a
   * trace says what claim it saw, what chunk it saw, and what it concluded —
   * which is the only version that lets anyone reconstruct a decision after the
   * fact.
   */
  input?: unknown;
  output?: unknown;

  /** Model spans only. */
  model?: string;
  usage?: TokenUsage;

  /** Free-form, for anything worth filtering on later: sectionId, question,
   *  iteration number, claimId, chunkIds. */
  attributes?: Record<string, string | number | boolean | null>;

  error?: {
    message: string;
    stack?: string;
  };
}

export interface Trace {
  id: string;
  /** The deep-dive request this run serves. */
  requestId: string;
  companyName: string;
  roleTitle?: string;
  startedAt: string;
  endedAt?: string;
  spans: Span[];
}

/**
 * Where spans go. Deliberately minimal so that adding a Langfuse, OpenTelemetry,
 * or Supabase sink is a new implementation rather than a change to the tracer.
 */
export interface TraceSink {
  /** Called as each span closes, so a crashed run still leaves a partial trace
   *  — which is exactly the run you most want to look at. */
  onSpanEnd(span: Span): void | Promise<void>;
  onTraceEnd?(trace: Trace): void | Promise<void>;
}

/**
 * Redaction hook, applied before a span reaches any sink.
 *
 * Layer C (candidate positioning) puts resume text through the same pipeline,
 * and resume text is PII. Designing the hook now costs nothing; retrofitting it
 * after traces are already being written somewhere means rewriting history that
 * should never have existed. See BACKLOG B15.
 */
export type Redactor = (span: Span) => Span;
