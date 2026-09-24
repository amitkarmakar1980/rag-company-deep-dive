import {
  MemorySink,
  Tracer,
  formatTree,
  researchQuestions,
  sectionSpans,
  totalUsage,
  traceHealth,
  unresolvedQuestions,
  usageByModel,
} from "./index";

/**
 * Tracer self-test.
 *
 * Exercises the shape a real run produces — a section containing a researcher
 * loop that succeeds, a researcher loop that exhausts its budget, and a failing
 * agent — then asserts the trace can answer the questions evals will ask of it.
 *
 * The failure case matters most. A tracer that records happy paths and loses
 * the step where things went wrong is worse than none: it looks authoritative
 * while omitting the only part anyone needed.
 *
 * Run: npm run trace:selftest
 */

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

async function buildSampleTrace() {
  const sink = new MemorySink();
  const tracer = new Tracer(
    { requestId: "req_1", companyName: "Microsoft", roleTitle: "Principal PM" },
    { sinks: [sink] },
  );

  const run = tracer.startRun("deep_dive", { company: "Microsoft" });

  await run.run(async (runSpan) => {
    const section = runSpan.child("section", "business_fundamentals");
    section.annotate({ sectionId: "business_fundamentals" });

    await section.run(async (sectionSpan) => {
      // Planner
      await sectionSpan
        .child("agent", "planner", { brief: "What kind of business is this?" })
        .run(async (span) => {
          span.child("model_call", "plan_questions").run(async (call) => {
            call.recordUsage("claude-sonnet-5", { input: 1200, output: 300 });
            call.setOutput(["How does Microsoft make money?", "Who owns it?"]);
          });
          span.setOutput({ questions: 2 });
        });

      // Researcher — resolves on the second iteration.
      const r1 = sectionSpan.child("agent", "researcher");
      r1.annotate({
        sectionId: "business_fundamentals",
        question: "How does Microsoft make money?",
      });
      await r1.run(async (span) => {
        for (const iteration of [1, 2]) {
          const search = span.child("retrieval", "hybrid_search");
          search.annotate({ chunkCount: 8, iteration });
          search.end();

          const check = span.child("decision", "sufficiency_check");
          check.annotate({ iteration, sufficient: iteration === 2 });
          check.end();

          if (iteration === 1) {
            const fetch = span.child("tool_call", "web_search");
            fetch.annotate({ query: "Microsoft segment revenue FY25" });
            fetch.end();
          }
        }
        span.annotate({ resolved: true, stopReason: "sufficient" });
      });

      // Researcher — exhausts its budget without resolving. The case a report
      // must report as thin rather than paper over.
      const r2 = sectionSpan.child("agent", "researcher");
      r2.annotate({
        sectionId: "business_fundamentals",
        question: "What is the internal org structure of Azure?",
      });
      await r2.run(async (span) => {
        for (const iteration of [1, 2, 3]) {
          const check = span.child("decision", "sufficiency_check");
          check.annotate({ iteration, sufficient: false });
          check.end();
        }
        span.annotate({ resolved: false, stopReason: "budget_exhausted" });
      });

      // Claim writer
      await sectionSpan.child("agent", "claim_writer").run(async (span) => {
        await span.child("model_call", "write_claims").run(async (call) => {
          call.recordUsage("claude-opus-5", { input: 18000, output: 2400 });
        });
        span.setOutput({ claims: 6 });
      });

      // A failing verifier. The span must still close, with the error attached.
      const verifier = sectionSpan.child("agent", "verifier");
      try {
        await verifier.run(async () => {
          throw new Error("model timeout");
        });
      } catch {
        // Swallowed here so the self-test continues; the pipeline would retry.
      }
    });
  });

  await tracer.finish();
  return { tracer, sink };
}

async function main(): Promise<number> {
  const log = (s: string) => process.stdout.write(s + "\n");
  const { tracer, sink } = await buildSampleTrace();
  const spans = tracer.snapshot().spans;
  const health = traceHealth(spans);
  const questions = researchQuestions(spans);
  const unresolved = unresolvedQuestions(spans);
  const usage = totalUsage(spans);
  const models = usageByModel(spans);

  const checks: Check[] = [
    {
      name: "trace has no unclosed spans",
      ok: health.unclosed.length === 0,
      detail: health.unclosed.map((s) => `${s.type}:${s.name}`).join(", "),
    },
    {
      name: "trace has no orphaned spans",
      ok: health.orphans.length === 0,
      detail: health.orphans.map((s) => s.id).join(", "),
    },
    {
      name: "a thrown error is recorded rather than lost",
      ok:
        health.errors.length === 1 &&
        health.errors[0].name === "verifier" &&
        health.errors[0].error?.message === "model timeout",
      detail: `${health.errors.length} error span(s)`,
    },
    {
      name: "every research question appears in the trace",
      ok: questions.length === 2,
      detail: `${questions.length} question(s)`,
    },
    {
      name: "loop iterations are countable per question",
      ok: questions[0]?.iterations === 2 && questions[1]?.iterations === 3,
      detail: questions.map((q) => `${q.iterations}`).join(", "),
    },
    {
      name: "an unresolved question is identifiable, with its stop reason",
      ok:
        unresolved.length === 1 &&
        unresolved[0].stopReason === "budget_exhausted",
      detail: unresolved.map((q) => `${q.question} (${q.stopReason})`).join("; "),
    },
    {
      name: "retrieved chunk counts roll up per question",
      ok: questions[0]?.chunksRetrieved === 16 && questions[1]?.chunksRetrieved === 0,
      detail: questions.map((q) => `${q.chunksRetrieved}`).join(", "),
    },
    {
      name: "tool calls are attributed to the question that triggered them",
      ok: questions[0]?.toolCalls === 1 && questions[1]?.toolCalls === 0,
      detail: questions.map((q) => `${q.toolCalls}`).join(", "),
    },
    {
      name: "token usage totals across the run",
      ok: usage.calls === 2 && usage.input === 19200 && usage.output === 2700,
      detail: JSON.stringify(usage),
    },
    {
      name: "usage is attributable per model",
      ok:
        models["claude-opus-5"]?.input === 18000 &&
        models["claude-sonnet-5"]?.input === 1200,
      detail: Object.keys(models).join(", "),
    },
    {
      name: "a section's work is retrievable as a subtree",
      ok: sectionSpans(spans, "business_fundamentals").length > 5,
      detail: `${sectionSpans(spans, "business_fundamentals").length} spans`,
    },
    {
      name: "sink received every closed span",
      ok: sink.spans.length === spans.length,
      detail: `${sink.spans.length} emitted vs ${spans.length} recorded`,
    },
  ];

  log("");
  log("Tracer self-test");
  log("");
  let failures = 0;
  for (const c of checks) {
    if (c.ok) {
      log(`  PASS  ${c.name}`);
    } else {
      failures++;
      log(`  FAIL  ${c.name}`);
      if (c.detail) log(`        ${c.detail}`);
    }
  }

  log("");
  log("Sample trace:");
  log("");
  log(formatTree(spans, "    "));
  log("");
  log(
    failures === 0
      ? `All ${checks.length} checks passed.`
      : `${failures} check(s) failed.`,
  );
  log("");
  return failures === 0 ? 0 : 1;
}

main().then((code) => process.exit(code));
