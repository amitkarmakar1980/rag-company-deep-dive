import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes — needed for o3 + gpt-4o-mini pipeline
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
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
      profileContext,
      customUrls,
      resumeText,
    } = await req.json();

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
    const company = await getOrCreateCompany(companyName, companyUrl);

    // Create deep dive request
    const request = await createDeepDiveRequest(
      user.id,
      company.id,
      roleTitle,
      jobDescription,
      companyUrl,
      profileContext
    );

    // Fire-and-forget: kick off pipeline without blocking the response.
    setImmediate(() => {
      runPipeline(
        request.id,
        company.id,
        user.id,
        companyName,
        companyUrl,
        customUrls,
        jobDescription,
        profileContext,
        resumeText || undefined
      ).catch((err) =>
        console.error("[Pipeline] Unhandled top-level error:", err)
      );
    });

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

      const { assembleReport } = await import("@/lib/report/assembleReport");
      console.log("[Pipeline] Calling assembleReport...");
      await assembleReport(requestId);
      console.log("[Pipeline] assembleReport complete");

      // If resume was provided, create the overlay record BEFORE marking completed.
      // This prevents a race: the page polls, sees "completed", checks for overlay —
      // and finds it already pending/generating rather than missing.
      let overlayId: string | undefined;
      if (resumeText?.trim()) {
        try {
          const { supabaseAdmin } = await import("@/lib/db/supabase");
          const { data: resumeRecord, error: resumeErr } = await supabaseAdmin
            .from("candidate_resumes")
            .insert({ user_id: userId, request_id: requestId, raw_text: resumeText.trim(), status: "parsed" })
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
      await updateDeepDiveStatus(requestId, "failed");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Pipeline] EXCEPTION:", msg);
    console.error(error);
    await updateDeepDiveStatus(requestId, "failed");
  }
}
