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

    // If a resume was provided, create resume + overlay records so that
    // overlay generation can begin immediately after the base report finishes.
    let overlayId: string | undefined;
    if (resumeText && typeof resumeText === "string" && resumeText.trim().length > 0) {
      const { data: resume } = await supabaseAdmin
        .from("candidate_resumes")
        .insert({ user_id: user.id, raw_text: resumeText.trim(), status: "parsed" })
        .select("id")
        .single();

      if (resume) {
        const { data: overlay } = await supabaseAdmin
          .from("candidate_overlays")
          .upsert(
            {
              request_id: request.id,
              resume_id: resume.id,
              status: "pending",
              overlay_json: null,
              error_message: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "request_id,resume_id", ignoreDuplicates: false }
          )
          .select("id")
          .single();

        if (overlay) {
          overlayId = overlay.id;
        }
      }
    }

    // Fire-and-forget: kick off pipeline without blocking the response.
    // setImmediate defers execution until after the response is flushed.
    // Works in both dev and production (Node.js runtime).
    setImmediate(() => {
      runPipeline(
        request.id,
        company.id,
        companyName,
        companyUrl,
        customUrls,
        jobDescription,
        profileContext,
        overlayId
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
  companyName: string,
  companyUrl: string | undefined,
  customUrls: string[] | undefined,
  jobDescription: string | undefined,
  profileContext: string | undefined,
  overlayId?: string
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

      await updateDeepDiveStatus(requestId, "completed");
      console.log("[Pipeline] Status → completed ✓");

      // If a resume was submitted with the form, kick off overlay generation now
      if (overlayId) {
        console.log(`[Pipeline] Starting overlay generation overlayId=${overlayId}`);
        const { generateOverlay } = await import("@/lib/report/generateOverlay");
        generateOverlay(overlayId).catch((err) =>
          console.error("[Pipeline] Overlay generation failed:", err)
        );
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
