import { NextRequest, NextResponse, after } from "next/server";

export const maxDuration = 300; // 5 minutes — needed for o4-mini + gpt-4o-mini pipeline
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  sanitizeHttpUrl,
  sanitizeMultiLineText,
  sanitizeSingleLineText,
} from "@/lib/ai/untrustedInput";
import {
  getOrCreateCompany,
  createDeepDiveRequest,
  updateDeepDiveStatus,
} from "@/lib/db/operations";

export async function POST(req: NextRequest) {
  try {
    const {
      companyName,
      roleTitle,
      jobDescription,
      companyUrl,
      resumeText,
    } = await req.json();

    const safeCompanyName = sanitizeSingleLineText(companyName, 140);
    const safeRoleTitle = sanitizeSingleLineText(roleTitle, 180);
    const safeCompanyUrl = sanitizeHttpUrl(companyUrl);
    const safeJobDescription = sanitizeMultiLineText(jobDescription, 20000);
    const safeResumeText = sanitizeMultiLineText(resumeText, 24000);

    if (!safeCompanyName || !safeRoleTitle) {
      return NextResponse.json(
        { error: "Company name and role title are required." },
        { status: 400 }
      );
    }

    // Get current user from session cookie
    const supabase = createRouteClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in custom users table (FK requirement for deep_dive_requests + candidate_resumes)
    await supabaseAdmin
      .from("users")
      .upsert({ id: user.id, email: user.email ?? "" }, { onConflict: "id", ignoreDuplicates: true });

    // Get or create company
    const company = await getOrCreateCompany(safeCompanyName, safeCompanyUrl);

    // Create deep dive request
    const request = await createDeepDiveRequest(
      user.id,
      company.id,
      safeRoleTitle,
      safeJobDescription,
      safeCompanyUrl,
      undefined
    );

    // after() keeps the serverless function alive after the response is sent (Vercel waitUntil).
    // setImmediate would be silently killed on Vercel once the response is returned.
    after(
      runPipeline(
        request.id,
        company.id,
        user.id,
        safeCompanyName,
        safeRoleTitle,
        safeCompanyUrl,
        undefined,
        safeJobDescription,
        undefined,
        safeResumeText
      ).catch((err) =>
        console.error("[Pipeline] Unhandled top-level error:", err)
      )
    );

    return NextResponse.json({ requestId: request.id, status: "pending" });
  } catch (error) {
    console.error("Create deep dive error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create deep dive",
      },
      { status: 500 }
    );
  }
}

async function runPipeline(
  requestId: string,
  companyId: string,
  userId: string,
  companyName: string,
  roleTitle: string,
  companyUrl: string | undefined,
  customUrls: string[] | undefined,
  jobDescription: string | undefined,
  profileContext: string | undefined,
  resumeText: string | undefined
) {
  console.log(`[Pipeline] START requestId=${requestId} company=${companyName}`);
  try {
    await updateDeepDiveStatus(requestId, "fetching_sources");
    console.log("[Pipeline] Status → fetching_sources");

    const { ingestSources } = await import("@/lib/ingestion/ingest");
    console.log("[Pipeline] Calling ingestSources...");
    const result = await ingestSources(
      requestId,
      companyId,
      companyName,
      roleTitle,
      companyUrl,
      customUrls || [],
      jobDescription,
      profileContext
    );
    console.log(
      `[Pipeline] ingestSources result: success=${result.success} sources=${result.sourcesCreated} chunks=${result.chunksCreated} error=${result.error ?? "none"}`
    );

    if (result.success) {
      await updateDeepDiveStatus(requestId, "generating_report");
      console.log("[Pipeline] Status → generating_report");

      const { assemblePremiumReportV2 } = await import("@/lib/report/assemblePremiumReportV2");
      console.log("[Pipeline] Calling assemblePremiumReportV2...");
      await assemblePremiumReportV2(requestId, result.researchPlan.retrievalQueries);
      console.log("[Pipeline] assemblePremiumReportV2 complete");

      // If resume was provided, create the overlay record BEFORE marking completed.
      // This prevents a race: the page polls, sees "completed", checks for overlay —
      // and finds it already pending/generating rather than missing.
      let overlayId: string | undefined;
      if (resumeText?.trim()) {
        try {
          const { supabaseAdmin } = await import("@/lib/db/supabase");
          const { data: resumeRecord, error: resumeErr } = await supabaseAdmin
            .from("candidate_resumes")
            .insert({ user_id: userId, raw_text: resumeText.trim(), status: "parsed" })
            .select("id")
            .single();
          if (resumeErr) console.error("[Pipeline] Resume insert error:", resumeErr.message);

          if (resumeRecord) {
            const { data: overlayRecord } = await supabaseAdmin
              .from("candidate_overlays")
              .insert({ request_id: requestId, resume_id: resumeRecord.id, status: "pending" })
              .select("id")
              .single();
            overlayId = overlayRecord?.id;
          }
        } catch (overlayErr) {
          console.error("[Pipeline] Failed to create overlay record (non-fatal):", overlayErr);
        }
      }

      await updateDeepDiveStatus(requestId, "completed");
      console.log("[Pipeline] Status → completed ✓");

      // Now run the overlay LLM call (page is already polling for the pending record)
      if (overlayId) {
        try {
          const { generateOverlay } = await import("@/lib/report/generateOverlay");
          await generateOverlay(overlayId);
          console.log("[Pipeline] Candidate overlay complete ✓");
        } catch (overlayErr) {
          console.error("[Pipeline] Overlay generation failed (non-fatal):", overlayErr);
        }
      }
    } else {
      console.error(`[Pipeline] ingestSources failed: ${result.error}`);
      await updateDeepDiveStatus(requestId, "failed", result.error ?? "Source ingestion failed before report generation started.");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Pipeline] EXCEPTION:", msg);
    console.error(error);
    await updateDeepDiveStatus(requestId, "failed", msg);
  }
}
