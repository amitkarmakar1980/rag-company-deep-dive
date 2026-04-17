import { supabaseAdmin } from "@/lib/db/supabase";
import { generateCandidateOverlay } from "@/lib/ai/openai";
import { getCandidateOverlayPrompt } from "@/lib/ai/overlayPrompt";

function getStoredAiQueryCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

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
    let { data: reportRow, error: reportRowError } = await supabaseAdmin
      .from("reports")
      .select("id, ai_query_count, report_format")
      .eq("request_id", overlay.request_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportRowError && /report_format/i.test(reportRowError.message ?? "")) {
      ({ data: reportRow, error: reportRowError } = await supabaseAdmin
        .from("reports")
        .select("id, ai_query_count")
        .eq("request_id", overlay.request_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle());
    }

    if (reportRowError) throw reportRowError;

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

    const { data: overlayData, usage: overlayUsage } = await generateCandidateOverlay(prompt);
    const overlayAiQueryCount = 1;

    // 6. Persist result
    await supabaseAdmin
      .from("candidate_overlays")
      .update({
        overlay_json: overlayData,
        ai_query_count: overlayAiQueryCount,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", overlayId);

    // 7. Write candidate_fit_score back to the report + update the section JSON
    const matchScore = overlayData?.candidate_role_match?.match_score;
    if (typeof matchScore === "number" && reportRow) {
      const nextAiQueryCount = getStoredAiQueryCount(reportRow.ai_query_count) + overlayAiQueryCount;

      await supabaseAdmin
        .from("reports")
        .update({
          candidate_fit_score: matchScore,
          ai_query_count: nextAiQueryCount,
        })
        .eq("id", reportRow.id);

      // Also patch the assessment_snapshot section so the rendered score is live
      const { data: snapSection } = await supabaseAdmin
        .from("report_sections")
        .select("id, content_markdown")
        .eq("report_id", reportRow.id)
        .eq("section_key", "assessment_snapshot")
        .single();

      if (snapSection?.content_markdown) {
        try {
          const snap = JSON.parse(snapSection.content_markdown);
          if (snap?.candidate_role_match) {
            const fit = overlayData.candidate_role_match;
            snap.candidate_role_match.score = matchScore;
            snap.candidate_role_match.signal = fit.overall_fit === "strong" ? "Strong" : fit.overall_fit === "mismatch" ? "Weak" : "Mixed";
            snap.candidate_role_match.rationale = fit.rationale ?? snap.candidate_role_match.rationale;
            await supabaseAdmin
              .from("report_sections")
              .update({ content_markdown: JSON.stringify(snap) })
              .eq("id", snapSection.id);
          }
        } catch {
          // Non-fatal — section will show old score but report table is correct
        }
      }

      console.log(
        `[generateOverlay] Updated candidate_fit_score=${matchScore}, ai_query_count=${nextAiQueryCount} on report ${reportRow.id}`
      );
    }

    console.log(
      `[generateOverlay] Overlay usage ${overlayUsage.input_tokens}in/${overlayUsage.output_tokens}out`
    );
    console.log(`[generateOverlay] Completed overlay ${overlayId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generateOverlay] Failed overlay ${overlayId}:`, message);
    await supabaseAdmin
      .from("candidate_overlays")
      .update({
        ai_query_count: 1,
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", overlayId);
  }
}
