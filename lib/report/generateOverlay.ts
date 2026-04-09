import { supabaseAdmin } from "@/lib/db/supabase";
import { generateCandidateOverlay } from "@/lib/ai/openai";
import { getCandidateOverlayPrompt } from "@/lib/ai/overlayPrompt";

/**
 * Generates the candidate overlay for a given (requestId, overlayId) pair.
 * Runs asynchronously after the resume upload API creates the overlay record.
 * Updates the candidate_overlays row with the result or error.
 */
export async function generateOverlay(overlayId: string): Promise<void> {
  // 1. Load overlay record
  const { data: overlay, error: overlayErr } = await supabaseAdmin
    .from("candidate_overlays")
    .select("id, request_id, resume_id")
    .eq("id", overlayId)
    .single();

  if (overlayErr || !overlay) {
    console.error("[generateOverlay] Overlay not found:", overlayId);
    return;
  }

  // Mark as generating
  await supabaseAdmin
    .from("candidate_overlays")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", overlayId);

  try {
    // 2. Load resume text
    const { data: resume } = await supabaseAdmin
      .from("candidate_resumes")
      .select("raw_text")
      .eq("id", overlay.resume_id)
      .single();

    if (!resume?.raw_text) throw new Error("Resume text not found");

    // 3. Load deep dive request for company/role/JD context
    const { data: request } = await supabaseAdmin
      .from("deep_dive_requests")
      .select("role_title, job_description, company_id")
      .eq("id", overlay.request_id)
      .single();

    if (!request) throw new Error("Request not found");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", request.company_id)
      .single();

    const companyName = company?.name ?? "the company";

    // 4. Load existing base report sections for context (candidate_positioning + role_snapshot)
    const { data: reportRow } = await supabaseAdmin
      .from("reports")
      .select("id")
      .eq("request_id", overlay.request_id)
      .single();

    let baseCandidatePositioning: string | undefined;
    let baseRoleSnapshot: string | undefined;

    if (reportRow) {
      const { data: sections } = await supabaseAdmin
        .from("report_sections")
        .select("section_key, content_markdown")
        .eq("report_id", reportRow.id)
        .in("section_key", ["candidate_positioning", "role_snapshot"]);

      for (const s of sections ?? []) {
        if (s.section_key === "candidate_positioning") {
          baseCandidatePositioning = s.content_markdown;
        } else if (s.section_key === "role_snapshot") {
          baseRoleSnapshot = s.content_markdown;
        }
      }
    }

    // 5. Build prompt and call LLM
    const prompt = getCandidateOverlayPrompt(
      resume.raw_text,
      companyName,
      request.role_title,
      request.job_description ?? undefined,
      baseCandidatePositioning,
      baseRoleSnapshot
    );

    const { data: overlayData } = await generateCandidateOverlay(prompt);

    // 6. Persist result
    await supabaseAdmin
      .from("candidate_overlays")
      .update({
        overlay_json: overlayData,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", overlayId);

    console.log(`[generateOverlay] Completed overlay ${overlayId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generateOverlay] Failed overlay ${overlayId}:`, message);
    await supabaseAdmin
      .from("candidate_overlays")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", overlayId);
  }
}
