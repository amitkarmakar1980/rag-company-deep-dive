"use client";

import { StructuredReport } from "@/lib/types";
import { SectionShell, BulletList, ProseBlock, ConfidencePill } from "./report/SectionShell";
import { ExecutiveSummarySection } from "./report/ExecutiveSummary";
import { AssessmentSnapshotSection } from "./report/AssessmentSnapshot";
import { SWOTCard } from "./report/SWOTCard";
import { QuestionsSection } from "./report/QuestionsCard";
import { RisksSection } from "./report/RisksCard";
import { InterviewDecisionSummary } from "./report/InterviewDecisionSummary";
import { FiveMinuteBrief } from "./report/FiveMinuteBrief";
import { StrategicImportanceCard } from "./report/StrategicImportanceCard";
import { LikelyInterviewAgenda } from "./report/LikelyInterviewAgenda";
import { UnknownsToValidate } from "./report/UnknownsToValidate";
import { EvidenceContractCard } from "./report/EvidenceContractCard";

interface Citation {
  source_id: string;
  url?: string;
  title: string;
}

interface ReportSectionCardProps {
  sectionKey: string;
  title: string;
  content: string; // JSON.stringify'd section data
  citations?: Citation[];
  feedback?: React.ReactNode;
}

/**
 * Parses section content (JSON string) and routes to the correct renderer.
 * Falls back to legacy text rendering for old reports.
 */
export function ReportSectionCard({
  sectionKey,
  title,
  content,
  citations,
  feedback,
}: ReportSectionCardProps) {
  let data: any = null;

  try {
    data = JSON.parse(content);
  } catch {
    // Legacy markdown content — render as plain text
    data = null;
  }

  // Fallback for legacy/unparseable content
  if (data === null) {
    return (
      <SectionShell id={sectionKey} title={title} feedback={feedback}>
        <div className="space-y-2">
          {content.split("\n").filter(Boolean).map((line, i) => (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
        {citations && citations.length > 0 && (
          <CitationList citations={citations} />
        )}
      </SectionShell>
    );
  }

  // Route to section-specific renderer
  switch (sectionKey) {
    case "company_overview": {
      const d = data as StructuredReport["company_overview"];
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Founding, scale, products, markets, and recent milestones"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
            {d.founded && <MetaField label="Founded" value={d.founded} />}
            {d.headquarters && <MetaField label="Headquarters" value={d.headquarters} />}
            {d.employees && <MetaField label="Employees" value={d.employees} />}
            {d.stage && <MetaField label="Stage" value={d.stage} />}
            {d.funding && <MetaField label="Funding / Market Cap" value={d.funding} />}
          </div>
          <BulletGroup label="Products & Services" items={d.products_services} />
          <BulletGroup label="Key Markets" items={d.key_markets} />
          {d.notable_customers?.length > 0 && (
            <BulletGroup label="Notable Customers" items={d.notable_customers} />
          )}
          <BulletGroup label="Recent Milestones" items={d.recent_milestones} />
          {citations && <CitationList citations={citations} />}
        </SectionShell>
      );
    }

    case "mission_vision_leadership": {
      const d = data as StructuredReport["mission_vision_leadership"];
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Mission, vision, operating principles, and leadership team"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <ProseBlock label="Mission" value={d.mission} />
          <ProseBlock label="Vision" value={d.vision} />
          {d.leadership_principles?.length > 0 && (
            <BulletGroup label="Leadership Principles" items={d.leadership_principles} />
          )}
          <ProseBlock label="CEO" value={d.ceo} />
          {d.key_executives?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Key Executives
              </h3>
              <div className="space-y-2">
                {d.key_executives.map((exec, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-gray-800">{exec.name}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-500">{exec.role}</span>
                    {exec.context && (
                      <p className="text-gray-500 mt-0.5 text-xs leading-relaxed">{exec.context}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {d.culture_signals?.length > 0 && (
            <BulletGroup label="Culture Signals" items={d.culture_signals} />
          )}
          {citations && <CitationList citations={citations} />}
        </SectionShell>
      );
    }

    case "interview_decision_summary":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Pursue recommendation, positioning angle, top questions, and key watchouts"
          feedback={feedback}
        >
          <InterviewDecisionSummary data={data as StructuredReport["interview_decision_summary"]} />
        </SectionShell>
      );

    case "five_minute_brief":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Optimized for pre-interview skimming — everything you need in 5 minutes"
          feedback={feedback}
        >
          <FiveMinuteBrief data={data as StructuredReport["five_minute_brief"]} />
        </SectionShell>
      );

    case "strategic_bet_analysis":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Classification of this role's strategic significance and what it means for you"
          feedback={feedback}
        >
          <StrategicImportanceCard data={data as StructuredReport["strategic_bet_analysis"]} />
        </SectionShell>
      );

    case "likely_interview_agenda":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="What interviewers are validating, worrying about, and need to see"
          feedback={feedback}
        >
          <LikelyInterviewAgenda data={data as StructuredReport["likely_interview_agenda"]} />
        </SectionShell>
      );

    case "unknowns_to_validate":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Important uncertainties — what to ask live and how to interpret the answers"
          feedback={feedback}
        >
          <UnknownsToValidate data={data as StructuredReport["unknowns_to_validate"]} />
        </SectionShell>
      );

    case "executive_summary":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Overall recommendation and top-priority insights"
          feedback={feedback}
        >
          <ExecutiveSummarySection data={data as StructuredReport["executive_summary"]} />
        </SectionShell>
      );

    case "assessment_snapshot":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="AI-generated signal scores based on retrieved evidence. Use for decision support, not as facts."
          feedback={feedback}
        >
          <AssessmentSnapshotSection data={data as StructuredReport["assessment_snapshot"]} />
        </SectionShell>
      );

    case "company_snapshot": {
      const d = data as StructuredReport["company_snapshot"];
      const evidenceBacked = d.evidence_basis === "strong" || d.evidence_basis === "partial";
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Business model, strategic priorities, and current operating context"
          evidenceBacked={evidenceBacked}
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <ProseBlock label="Business Model" value={d.business_model} />
          <BulletGroup label="Strategic Priorities" items={d.strategic_priorities} />
          <BulletGroup label="Momentum Signals" items={d.momentum_signals} />
          <BulletGroup label="Pressure Points" items={d.pressure_points} />
          <ProseBlock label="Competitive Context" value={d.competitive_context} />
          {citations && <CitationList citations={citations} />}
        </SectionShell>
      );
    }

    case "company_swot":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Relevant to role context and interview positioning"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <SWOTCard data={data as StructuredReport["company_swot"]} />
        </SectionShell>
      );

    case "role_snapshot": {
      const d = data as StructuredReport["role_snapshot"];
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Inferred charter, success metrics, and first-year expectations"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <ProseBlock label="Likely Charter" value={d.likely_charter} />
          <BulletGroup label="Success Metrics (12 months)" items={d.success_metrics} />
          <BulletGroup label="Key Stakeholders" items={d.key_stakeholders} />
          <BulletGroup label="Likely Challenges" items={d.likely_challenges} />
          <BulletGroup label="Year 1 Expectations" items={d.first_year_expectations} />
          {citations && <CitationList citations={citations} />}
        </SectionShell>
      );
    }

    case "role_swot":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Strengths, weaknesses, opportunities, and threats specific to this role's charter"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <SWOTCard data={data as StructuredReport["role_swot"]} />
        </SectionShell>
      );

    case "why_role_exists_now": {
      const d = data as StructuredReport["why_role_exists_now"];
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="What changed in the company, market, or org that created demand for this hire"
          feedback={feedback}
          evidenceBacked={d.confidence === "high" || d.confidence === "medium"}
        >
          <ProseBlock value={d.primary_driver} />
          <BulletGroup label="Supporting Signals" items={d.supporting_signals} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Inference confidence:</span>
            <ConfidencePill level={d.confidence} />
          </div>
          {citations && <CitationList citations={citations} />}
        </SectionShell>
      );
    }

    case "questions_to_ask":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Grouped by intent — click any question to see why it matters and what to listen for"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <QuestionsSection data={data as StructuredReport["questions_to_ask"]} />
        </SectionShell>
      );

    case "risks_red_flags":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="Flags ranked by severity — sorted high to low"
          feedback={feedback}
        >
          <RisksSection data={data as StructuredReport["risks_red_flags"]} />
        </SectionShell>
      );

    case "evidence_contract":
      return (
        <SectionShell
          id={sectionKey}
          title={title}
          subtitle="What we know vs. inferred vs. unknown — with your next actions"
          feedback={feedback}
          collapsible
          defaultCollapsed
        >
          <EvidenceContractCard data={data as StructuredReport["evidence_contract"]} />
        </SectionShell>
      );

    default:
      return (
        <SectionShell id={sectionKey} title={title} feedback={feedback}>
          <pre className="text-xs text-gray-500 whitespace-pre-wrap break-words">
            {typeof data === "object" ? JSON.stringify(data, null, 2) : content}
          </pre>
        </SectionShell>
      );
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function BulletGroup({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {label}
      </h3>
      <BulletList items={items} />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-700 mt-0.5">{value}</dd>
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  const unique = Array.from(
    new Map(citations.map((c) => [c.source_id, c])).values()
  ).filter((c) => c.title);

  if (unique.length === 0) return null;

  return (
    <div className="pt-3 border-t border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        Sources Used
      </h3>
      <ul className="space-y-1" role="list">
        {unique.map((c, i) => (
          <li key={i} className="text-xs">
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-800 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-900 rounded transition-colors"
              >
                {c.title}
              </a>
            ) : (
              <span className="text-gray-400">{c.title}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
