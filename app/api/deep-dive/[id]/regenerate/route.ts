import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  getDeepDiveRequest,
  getReport,
  updateDeepDiveStatus,
  deleteReportForRequest,
  deleteSourcesForRequest,
  getSourceCount,
} from "@/lib/db/operations";

export const maxDuration = 300; // 5 minutes — needed for o3 + gpt-4o-mini pipeline

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Verify auth
    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const request = await getDeepDiveRequest(requestId);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Don't allow re-triggering if already in progress
    const inProgress = new Set([
      "pending", "fetching_sources", "indexing",
      "generating_report", "generating_deep_analysis", "generating_interview_layer",
    ]);
    if (inProgress.has(request.status)) {
      return NextResponse.json({ error: "Analysis is already in progress" }, { status: 409 });
    }

    // Check what's already done so we can skip completed stages
    const sourceCount = await getSourceCount(requestId);
    const existingReport = await getReport(requestId);
    const checkpoint = existingReport?.summary_json?.checkpoint ?? null;

    const hasDeepAnalysis = !!checkpoint?.deep_analysis;
    const hasInterviewLayer = !!checkpoint?.interview_layer;
    console.log(
      `[Regenerate] requestId=${requestId} sources=${sourceCount} ` +
      `deepDone=${hasDeepAnalysis} interviewDone=${hasInterviewLayer}`
    );

    // Get company details
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", request.company_id)
      .single();

    // Decide what to wipe:
    // - If no sources exist: wipe everything and restart fully
    // - If sources exist but no checkpoint: sources are good, wipe report and regenerate LLM stages
    // - If checkpoint exists: keep report record (checkpoint intact), only redo missing LLM stages
    if (sourceCount === 0) {
      // Full restart
      await deleteReportForRequest(requestId);
      await deleteSourcesForRequest(requestId);
    } else if (!hasDeepAnalysis) {
      // Sources OK, but no LLM results — wipe report, keep sources
      await deleteReportForRequest(requestId);
    }
    // If hasDeepAnalysis: keep existing report record (checkpoint will be reused in assembleReport)

    await updateDeepDiveStatus(requestId, "pending");

    setImmediate(() => {
      (async () => {
        try {
          let plannerQueries: string[] | undefined;

          if (sourceCount === 0) {
            // Stage 1: Re-ingest sources
            await updateDeepDiveStatus(requestId, "fetching_sources");
            const { ingestSources } = await import("@/lib/ingestion/ingest");
            const result = await ingestSources(
              requestId,
              request.company_id,
              company?.name ?? "",
              request.role_title,
              request.company_url ?? undefined,
              [],
              request.job_description ?? undefined,
              request.profile_context ?? undefined
            );
            if (!result.success) {
              console.error(`[Regenerate] ingestSources failed: ${result.error}`);
              await updateDeepDiveStatus(requestId, "failed");
              return;
            }

            plannerQueries = result.researchPlan.retrievalQueries;
          }

          // Stage 2: LLM report generation (assembleReport handles checkpoint internally)
          await updateDeepDiveStatus(requestId, "generating_report");
          const { assembleReport } = await import("@/lib/report/assembleReport");
          await assembleReport(requestId, plannerQueries);
          await updateDeepDiveStatus(requestId, "completed");
          console.log(`[Regenerate] Complete for requestId=${requestId}`);
        } catch (err) {
          console.error("[Regenerate] Pipeline error:", err);
          await updateDeepDiveStatus(requestId, "failed");
        }
      })();
    });

    return NextResponse.json({ requestId, status: "pending" });
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to start regeneration" },
      { status: 500 }
    );
  }
}
