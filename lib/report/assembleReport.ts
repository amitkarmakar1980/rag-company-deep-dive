import {
  getDeepDiveRequest,
  getRequestSources,
  createReport,
  createReportSection,
  semanticSearch,
} from "@/lib/db/operations";
import { generateEmbedding } from "@/lib/ai/embeddings";
import {
  generateCompanySnapshot,
  generateRoleMandate,
  generateRiskFlags,
  generateOpportunities,
  generatePositioning,
  generateSmartQuestions,
} from "./generateSection";
import {
  calculateScores,
  recommendationFromScores,
  calculateEvidenceDensity,
} from "@/lib/scoring/scores";
import { rerank } from "@/lib/retrieval/search";
import { RetrievalContext, Report } from "@/lib/types";

const SECTION_QUERIES = {
  company_snapshot: "company strategy momentum product announcements",
  role_mandate:
    "role responsibilities hiring growth team structure this position",
  risk_flags: "restructuring layoff leadership changes chaos unclear vague",
  opportunities:
    "expansion growth market opportunity platform leverage scale new products",
  positioning:
    "team structure org chart role level responsibilities impact scope",
  questions: "strategy direction priorities challenges organization",
};

export async function assembleReport(requestId: string): Promise<Report | null> {
  try {
    // Get request and context
    const request = await getDeepDiveRequest(requestId);
    if (!request) throw new Error("Request not found");

    const sources = await getRequestSources(requestId);
    if (sources.length === 0) {
      throw new Error("No sources available for report");
    }

    // Calculate scores from sources
    const scores = calculateScores(sources);
    const chunkCount = sources.length * 5; // Rough estimate, typically 5-10 chunks per source
    const evidenceDensity = calculateEvidenceDensity(
      chunkCount,
      sources.length,
      0
    );

    // Determine recommendation
    const recommendation = recommendationFromScores(scores, evidenceDensity);

    // Create report record
    const report = await createReport(
      requestId,
      recommendation,
      scores
    );

    // Generate each section
    const sections = Object.entries(SECTION_QUERIES);

    for (const [sectionKey, query] of sections) {
      try {
        // Get retrieval context for this section
        const queryEmbedding = await generateEmbedding(query);
        const retrievalResults = await semanticSearch(
          requestId,
          queryEmbedding,
          10,
          0.5
        );

        const rerankeddResults = rerank(retrievalResults, {
          role_title: request.role_title,
          company_name: (request as any).companies?.name ?? "Company",
        });

        const context: RetrievalContext = {
          chunks: rerankeddResults.map((r) => ({
            text: r.chunk.text,
            source_id: r.source.id,
            source_title: r.source.title,
            source_url: r.source.url,
            source_type: r.source.source_type,
          })),
          metadata: {
            total_chunks_available: chunkCount,
            retrieval_confidence: evidenceDensity,
          },
        };

        // Generate section content
        let sectionContent: any = {};

        switch (sectionKey) {
          case "company_snapshot":
            sectionContent = await generateCompanySnapshot(
              context,
              (request as any).companies?.name ?? "Company",
              request.profile_context || ""
            );
            break;
          case "role_mandate":
            sectionContent = await generateRoleMandate(
              context,
              (request as any).companies?.name ?? "Company",
              request.role_title,
              request.job_description
            );
            break;
          case "risk_flags":
            sectionContent = await generateRiskFlags(
              context,
              (request as any).companies?.name ?? "Company",
              request.role_title
            );
            break;
          case "opportunities":
            sectionContent = await generateOpportunities(
              context,
              (request as any).companies?.name ?? "Company",
              request.role_title
            );
            break;
          case "positioning":
            sectionContent = await generatePositioning(
              context,
              (request as any).companies?.name ?? "Company",
              request.role_title,
              request.profile_context
            );
            break;
          case "questions":
            sectionContent = await generateSmartQuestions(
              context,
              (request as any).companies?.name ?? "Company",
              request.role_title
            );
            break;
        }

        // Format section content to markdown
        const markdown = formatSectionMarkdown(sectionKey, sectionContent);
        const citations = extractCitations(sectionContent, context);

        // Store section
        const sectionTitle = getSectionTitle(sectionKey);
        await createReportSection(
          report.id,
          sectionKey,
          sectionTitle,
          markdown,
          citations
        );
      } catch (error) {
        console.error(`Error generating section ${sectionKey}:`, error);
        // Continue with next section
      }
    }

    return report;
  } catch (error) {
    console.error("Report assembly error:", error);
    throw error;
  }
}

function formatSectionMarkdown(sectionKey: string, content: any): string {
  // Format the generated content into readable markdown
  let markdown = "";

  if (sectionKey === "company_snapshot") {
    markdown = `${content.snapshot || ""}\n\n*Confidence: ${((content.confidence || 0) * 100).toFixed(0)}%*`;

    if (content.evidence_gaps?.length) {
      markdown += `\n\n**Evidence Gaps:** ${content.evidence_gaps.join(", ")}`;
    }
  } else if (sectionKey === "role_mandate") {
    markdown = `${content.mandate || ""}\n\n**Likely Priorities:**\n${(content.likely_priorities || []).map((p: string) => `- ${p}`).join("\n")}`;
  } else if (sectionKey === "risk_flags") {
    markdown = (content.risks || [])
      .map(
        (r: any) =>
          `**${r.flag}**\n- Signal: ${r.signal}\n- Impact: ${r.impact}`
      )
      .join("\n\n");

    markdown += `\n\n**Overall Execution Risk:** ${content.overall_execution_risk?.toUpperCase()}`;
  } else if (sectionKey === "opportunities") {
    markdown = (content.opportunities || [])
      .map(
        (o: any) =>
          `**${o.opportunity}**\n- Leverage: ${o.leverage}\n- Timeframe: ${o.timeframe}`
      )
      .join("\n\n");

    markdown += `\n\n**Overall Role Leverage:** ${content.overall_role_leverage?.toUpperCase()}`;
  } else if (sectionKey === "positioning") {
    markdown = `${content.positioning_strategy || ""}\n\n**Strengths to Emphasize:**\n${(content.key_strengths_to_emphasize || []).map((s: string) => `- ${s}`).join("\n")}\n\n**Gaps to Address:**\n${(content.gaps_to_address || []).map((g: string) => `- ${g}`).join("\n")}`;
  } else if (sectionKey === "questions") {
    markdown = (content.questions || [])
      .map(
        (q: any) =>
          `**${q.question}**\n- Why: ${q.why_ask}\n- Red flags in answer: ${(q.red_flags_in_answer || []).join(", ")}`
      )
      .join("\n\n");
  }

  return markdown;
}

function extractCitations(
  _content: any,
  context: RetrievalContext
): Array<{
  source_id: string;
  url?: string;
  title: string;
}> {
  // Extract citations from the context
  return context.chunks.map((chunk) => ({
    source_id: chunk.source_id,
    url: chunk.source_url,
    title: chunk.source_title,
  }));
}

function getSectionTitle(sectionKey: string): string {
  const titles: Record<string, string> = {
    company_snapshot: "Company Snapshot",
    role_mandate: "Role Mandate Hypothesis",
    risk_flags: "Risk Flags",
    opportunities: "Opportunity Flags",
    positioning: "How to Position Yourself",
    questions: "Questions to Ask",
  };

  return titles[sectionKey] || sectionKey;
}
