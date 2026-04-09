import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { getSourceCount } from "@/lib/db/operations";

export const maxDuration = 300;

/**
 * GET /api/cron/retry-queue
 *
 * Called by Vercel Cron every 5 minutes.
 * Finds requests that are:
 *   - stuck in a processing status for > 8 minutes (likely timed out), OR
 *   - failed with a checkpoint (can resume from where they stopped)
 *
 * Retries up to 2 requests per cron tick to avoid overloading Vercel.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron authenticates with CRON_SECRET in the Authorization header
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const PROCESSING_STATUSES = [
    "pending",
    "fetching_sources",
    "indexing",
    "generating_report",
    "generating_deep_analysis",
    "generating_interview_layer",
  ];

  const stuckCutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString(); // 8 min ago

  // Find stuck (processing too long) + failed-with-checkpoint requests
  const { data: stuck } = await supabaseAdmin
    .from("deep_dive_requests")
    .select("id, status, company_id, company_url, job_description, profile_context, updated_at")
    .in("status", PROCESSING_STATUSES)
    .lt("updated_at", stuckCutoff)
    .limit(2);

  const { data: failed } = await supabaseAdmin
    .from("deep_dive_requests")
    .select("id, status, company_id, company_url, job_description, profile_context")
    .eq("status", "failed")
    .gte("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()) // failed in last 30 min
    .limit(2);

  const candidates = [...(stuck ?? []), ...(failed ?? [])].slice(0, 2);

  if (candidates.length === 0) {
    return NextResponse.json({ retried: 0, message: "Nothing to retry" });
  }

  const results: { requestId: string; action: string }[] = [];

  for (const request of candidates) {
    try {
      // Check what we already have
      const { data: existingReport } = await supabaseAdmin
        .from("reports")
        .select("id, summary_json")
        .eq("request_id", request.id)
        .single();

      const checkpoint = existingReport?.summary_json?.checkpoint ?? null;
      const hasDeepAnalysis = !!checkpoint?.deep_analysis;

      const sourceCount = await getSourceCount(request.id);

      // Decide what to wipe (same logic as regenerate route)
      if (sourceCount === 0) {
        await supabaseAdmin.from("reports").delete().eq("request_id", request.id);
      } else if (!hasDeepAnalysis) {
        await supabaseAdmin.from("reports").delete().eq("request_id", request.id);
      }

      await supabaseAdmin
        .from("deep_dive_requests")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      // Get company name
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("name")
        .eq("id", request.company_id)
        .single();

      // Run pipeline
      if (sourceCount === 0) {
        await supabaseAdmin
          .from("deep_dive_requests")
          .update({ status: "fetching_sources", updated_at: new Date().toISOString() })
          .eq("id", request.id);

        const { ingestSources } = await import("@/lib/ingestion/ingest");
        const result = await ingestSources(
          request.id,
          request.company_id,
          company?.name ?? "",
          request.company_url ?? undefined,
          [],
          request.job_description ?? undefined,
          request.profile_context ?? undefined
        );

        if (!result.success) {
          await supabaseAdmin
            .from("deep_dive_requests")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", request.id);
          results.push({ requestId: request.id, action: "ingest_failed" });
          continue;
        }
      }

      await supabaseAdmin
        .from("deep_dive_requests")
        .update({ status: "generating_report", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      const { assembleReport } = await import("@/lib/report/assembleReport");
      await assembleReport(request.id);

      await supabaseAdmin
        .from("deep_dive_requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      results.push({ requestId: request.id, action: "completed" });
      console.log(`[CronRetry] Completed requestId=${request.id}`);
    } catch (err) {
      console.error(`[CronRetry] Failed requestId=${request.id}:`, err);
      await supabaseAdmin
        .from("deep_dive_requests")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", request.id);
      results.push({ requestId: request.id, action: "retry_failed" });
    }
  }

  return NextResponse.json({ retried: results.length, results });
}
