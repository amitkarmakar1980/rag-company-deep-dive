import { supabaseAdmin } from "@/lib/db/supabase";
import { generateCandidateOverlay } from "@/lib/ai/openai";
import { getCandidateOverlayPrompt } from "@/lib/ai/overlayPrompt";
import type { CandidateOverlayData } from "@/lib/types";
import type { PremiumSectionContent } from "@/lib/report/premiumTypes";

function getStoredAiQueryCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function titleCaseFit(value: CandidateOverlayData["candidate_role_match"]["overall_fit"]): string {
  switch (value) {
    case "strong":
      return "Strong";
    case "moderate":
      return "Moderate";
    case "stretch":
      return "Stretch";
    case "mismatch":
      return "Mismatch";
    default:
      return value;
  }
}

function getOverlayFinalDecision(match: CandidateOverlayData["candidate_role_match"]): string {
  if (match.final_decision) {
    return match.final_decision;
  }

  if (match.match_score >= 8) return "Pursue Aggressively";
  if (match.match_score >= 6) return "Pursue Cautiously";
  if (match.match_score >= 4) return "Borderline";
  return "Do Not Pursue";
}

function buildScoreDimensionFacts(match: CandidateOverlayData["candidate_role_match"]): NonNullable<PremiumSectionContent["facts"]> {
  const dimensions = match.score_dimensions;

  return [
    { label: "Relevant Domain Experience", value: dimensions ? `${dimensions.relevant_domain_experience.score}/10` : "INSUFFICIENT_EVIDENCE" },
    { label: "Scope And Seniority Match", value: dimensions ? `${dimensions.scope_and_seniority_match.score}/10` : "INSUFFICIENT_EVIDENCE" },
    { label: "Functional Skill Match", value: dimensions ? `${dimensions.functional_skill_match.score}/10` : "INSUFFICIENT_EVIDENCE" },
    { label: "Strategic Context Match", value: dimensions ? `${dimensions.strategic_context_match.score}/10` : "INSUFFICIENT_EVIDENCE" },
    { label: "Risks And Gaps", value: dimensions ? `${dimensions.risks_and_gaps.score}/10` : "INSUFFICIENT_EVIDENCE" },
    { label: "Match Score", value: `${match.match_score}/10` },
    { label: "Final Decision", value: getOverlayFinalDecision(match) },
  ];
}

export function buildPremiumCandidateFitSection(overlayData: CandidateOverlayData): PremiumSectionContent {
  const match = overlayData.candidate_role_match;
  const topStrengths = overlayData.strengths_to_emphasize.strengths.slice(0, 3);
  const topStories = overlayData.story_recommendations.stories.slice(0, 3);
  const topObjections = overlayData.objection_handling.objections.slice(0, 2);
  const topGaps = overlayData.gap_management.gaps.slice(0, 3);
  const dimensionBlocks = match.score_dimensions
    ? [
        {
          title: "Score Breakdown",
          bullets: [
            `Relevant Domain Experience: ${match.score_dimensions.relevant_domain_experience.score}/10 - ${match.score_dimensions.relevant_domain_experience.rationale}`,
            `Scope And Seniority Match: ${match.score_dimensions.scope_and_seniority_match.score}/10 - ${match.score_dimensions.scope_and_seniority_match.rationale}`,
            `Functional Skill Match: ${match.score_dimensions.functional_skill_match.score}/10 - ${match.score_dimensions.functional_skill_match.rationale}`,
            `Strategic Context Match: ${match.score_dimensions.strategic_context_match.score}/10 - ${match.score_dimensions.strategic_context_match.rationale}`,
            `Risks And Gaps: ${match.score_dimensions.risks_and_gaps.score}/10 - ${match.score_dimensions.risks_and_gaps.rationale}`,
          ],
        },
      ]
    : [];

  return {
    schema: "premium_section_v1",
    group: "Candidate Fit",
    surface: "full",
    question: "What strengths, gaps, and stories will determine my candidacy?",
    summary: match.rationale,
    facts: [
      { label: "Resume provided?", value: "true" },
      { label: "Overall fit", value: titleCaseFit(match.overall_fit) },
      ...buildScoreDimensionFacts(match),
    ],
    callouts: topStrengths.map((strength) => ({
      label: strength.strength,
      value: `${strength.evidence_from_resume} ${strength.why_it_matters_for_role}`.trim(),
      tone: "strong",
    })),
    bullets: match.key_gaps.length
      ? match.key_gaps.map((gap) => `Gap to manage: ${gap}`)
      : ["No major gaps were called out in the resume overlay."],
    blocks: [
      ...dimensionBlocks,
      ...(topGaps.length
        ? [{
            title: "Gap Management",
            bullets: topGaps.map((gap) => `${gap.gap}: ${gap.talking_point}`),
          }]
        : []),
      ...(topStories.length
        ? [{
            title: "Stories to lead with",
            bullets: topStories.map((story) => `${story.theme}: ${story.suggested_story} Maps to: ${story.maps_to_requirement}`),
          }]
        : []),
      ...(topObjections.length
        ? [{
            title: "Likely objections to pre-empt",
            bullets: topObjections.map((objection) => `${objection.objection} ${objection.how_to_respond}`.trim()),
          }]
        : []),
    ],
    evidence: {
      threshold: "resume overlay",
      status: "met",
      confidence: "high",
      note: "This section was refreshed from the candidate resume overlay after personalization completed.",
    },
  };
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

      const { data: candidateFitSection } = await supabaseAdmin
        .from("report_sections")
        .select("id")
        .eq("report_id", reportRow.id)
        .eq("section_key", "candidate_fit")
        .maybeSingle();

      if (candidateFitSection?.id) {
        await supabaseAdmin
          .from("report_sections")
          .update({ content_markdown: JSON.stringify(buildPremiumCandidateFitSection(overlayData)) })
          .eq("id", candidateFitSection.id);
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
