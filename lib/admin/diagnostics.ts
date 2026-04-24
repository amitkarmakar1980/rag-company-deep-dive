import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  createDeepDiveRequest,
  getDeepDiveRequest,
  getOrCreateCompany,
  updateDeepDiveRequestMetadata,
  updateDeepDiveStatus,
} from "@/lib/db/operations";
import { ingestSources } from "@/lib/ingestion/ingest";
import { generateOverlay } from "@/lib/report/generateOverlay";
import {
  buildOrderedDefinitions,
  buildPremiumDraft,
  buildPremiumRetrievalState,
  evaluateDraft,
  persistPremiumReportArtifacts,
} from "@/lib/report/assemblePremiumReportV2";
import {
  buildPersonaAwareRetrievalQueries,
  getPremiumPresentationPlan,
  inferPremiumPersona,
} from "@/lib/report/premiumPersona";
import { finalizePremiumQualityGate } from "@/lib/report/premiumQualityGate";
import { extractJobDetailsFromUrl } from "@/lib/ingestion/extractJobDetails";
import type { ResearchPlan } from "@/lib/ingestion/firecrawl";
import type { DeepDiveRequest, ReportTokenUsage } from "@/lib/types";
import type { PremiumSectionContent, PremiumReportModelOutput } from "@/lib/report/premiumTypes";
import type { PremiumPersonaQaSummary } from "@/lib/report/premiumTelemetry";
import type { PremiumQualityGateResult } from "@/lib/report/premiumQualityGate";
import type { PremiumSectionKey } from "@/lib/report/premiumTypes";

type DiagnosticsContext = {
  request: DeepDiveRequest;
  companyName: string;
  latestResearchPlan: ResearchPlan | null;
  persona: ReturnType<typeof inferPremiumPersona>;
  presentationPlan: ReturnType<typeof getPremiumPresentationPlan>;
  orderedDefinitions: ReturnType<typeof buildOrderedDefinitions>;
  normalizedQueries: string[];
};

type DiagnosticsDraftBundle = {
  data: PremiumReportModelOutput;
  wrappedSections: Record<string, PremiumSectionContent>;
  personaQa: PremiumPersonaQaSummary;
  usage: ReportTokenUsage["calls"][number];
};

type DiagnosticsEvaluationBundle = {
  qualityGate: PremiumQualityGateResult;
  usage: ReportTokenUsage["calls"][number];
};

type DiagnosticsExpectedOutputEntry = {
  rowKey: string;
  rowLabel: string;
  actionId: string;
  sectionKey: string | null;
  sectionTitle: string | null;
  html: string;
  plainText: string;
  updatedAt: string;
  feedbackStatus: "captured";
  promptTarget: "prompt_update_candidate";
  source: "admin_diagnostics";
};

export type PromptFeedbackReviewStatus = "pending" | "approved" | "rejected" | "needs_more_context";
export type PromptFeedbackArea =
  | "report_generation"
  | "evaluation"
  | "retrieval"
  | "ingestion"
  | "overlay"
  | "other";

type DiagnosticsPromptFeedbackReviewEntry = {
  rowKey: string;
  status: PromptFeedbackReviewStatus;
  promptArea: PromptFeedbackArea | null;
  reviewNotes: string;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeExpectedOutputHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|link|meta)[^>]*?>/gi, "")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, 16000);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function plainTextFromExpectedOutputHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12000);
}

function readDiagnosticsExpectedOutputs(request: DeepDiveRequest): Record<string, DiagnosticsExpectedOutputEntry> {
  const diagnostics = isRecord(request.metadata_json?.diagnostics) ? request.metadata_json?.diagnostics : null;
  const expectedOutputs = diagnostics && isRecord(diagnostics.expectedOutputs) ? diagnostics.expectedOutputs : null;
  if (!expectedOutputs) {
    return {};
  }

  const normalizedEntries = Object.entries(expectedOutputs).flatMap(([rowKey, value]) => {
    if (!isRecord(value) || typeof value.html !== "string") {
      return [];
    }

    return [[
      rowKey,
      {
        rowKey,
        rowLabel: typeof value.rowLabel === "string" ? value.rowLabel : rowKey,
        actionId: typeof value.actionId === "string" ? value.actionId : rowKey,
        sectionKey: typeof value.sectionKey === "string" ? value.sectionKey : null,
        sectionTitle: typeof value.sectionTitle === "string" ? value.sectionTitle : null,
        html: value.html,
        plainText: typeof value.plainText === "string" ? value.plainText : plainTextFromExpectedOutputHtml(value.html),
        updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
        feedbackStatus: "captured" as const,
        promptTarget: "prompt_update_candidate" as const,
        source: "admin_diagnostics" as const,
      },
    ]] as const;
  });

  return Object.fromEntries(normalizedEntries);
}

function readDiagnosticsPromptFeedbackReviews(
  request: DeepDiveRequest
): Record<string, DiagnosticsPromptFeedbackReviewEntry> {
  const diagnostics = isRecord(request.metadata_json?.diagnostics) ? request.metadata_json?.diagnostics : null;
  const promptImprovementFeedback =
    diagnostics && isRecord(diagnostics.promptImprovementFeedback) ? diagnostics.promptImprovementFeedback : null;
  const reviewDecisions =
    promptImprovementFeedback && isRecord(promptImprovementFeedback.reviewDecisions)
      ? promptImprovementFeedback.reviewDecisions
      : null;

  if (!reviewDecisions) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(reviewDecisions).flatMap(([rowKey, value]) => {
      if (!isRecord(value)) {
        return [];
      }

      const status = value.status;
      if (
        status !== "pending" &&
        status !== "approved" &&
        status !== "rejected" &&
        status !== "needs_more_context"
      ) {
        return [];
      }

      const promptArea = value.promptArea;
      const normalizedPromptArea =
        promptArea === "report_generation" ||
        promptArea === "evaluation" ||
        promptArea === "retrieval" ||
        promptArea === "ingestion" ||
        promptArea === "overlay" ||
        promptArea === "other"
          ? promptArea
          : null;

      return [[
        rowKey,
        {
          rowKey,
          status,
          promptArea: normalizedPromptArea,
          reviewNotes: typeof value.reviewNotes === "string" ? value.reviewNotes : "",
          updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
        },
      ]] as const;
    })
  );
}

export async function getDiagnosticsExpectedOutputs(requestId: string) {
  const request = await getDeepDiveRequest(requestId);
  if (!request) {
    throw new Error("Request not found.");
  }

  return {
    requestId,
    expectedOutputs: readDiagnosticsExpectedOutputs(request),
  };
}

export async function saveDiagnosticsExpectedOutputs(args: {
  requestId: string;
  entries: Array<{
    rowKey: string;
    rowLabel: string;
    actionId: string;
    sectionKey?: string | null;
    sectionTitle?: string | null;
    html: string;
  }>;
}) {
  const request = await getDeepDiveRequest(args.requestId);
  if (!request) {
    throw new Error("Request not found.");
  }

  const currentDiagnostics = isRecord(request.metadata_json?.diagnostics) ? request.metadata_json?.diagnostics : {};
  const nextExpectedOutputs = {
    ...readDiagnosticsExpectedOutputs(request),
  };

  for (const entry of args.entries) {
    const rowKey = entry.rowKey.trim();
    if (!rowKey) {
      continue;
    }

    const sanitizedHtml = sanitizeExpectedOutputHtml(entry.html);
    if (!sanitizedHtml) {
      delete nextExpectedOutputs[rowKey];
      continue;
    }

    nextExpectedOutputs[rowKey] = {
      rowKey,
      rowLabel: entry.rowLabel.trim() || rowKey,
      actionId: entry.actionId.trim() || rowKey,
      sectionKey: entry.sectionKey?.trim() || null,
      sectionTitle: entry.sectionTitle?.trim() || null,
      html: sanitizedHtml,
      plainText: plainTextFromExpectedOutputHtml(sanitizedHtml),
      updatedAt: new Date().toISOString(),
      feedbackStatus: "captured",
      promptTarget: "prompt_update_candidate",
      source: "admin_diagnostics",
    };
  }

  await updateDeepDiveRequestMetadata(args.requestId, {
    diagnostics: {
      ...currentDiagnostics,
      lastUpdatedAt: new Date().toISOString(),
      expectedOutputs: nextExpectedOutputs,
      promptImprovementFeedback: {
        source: "admin_diagnostics",
        target: "prompt_update_candidate",
        lastUpdatedAt: new Date().toISOString(),
        entries: nextExpectedOutputs,
      },
    },
  });

  return {
    requestId: args.requestId,
    expectedOutputs: nextExpectedOutputs,
  };
}

export async function exportDiagnosticsPromptFeedback(requestId: string) {
  const context = await loadDiagnosticsContext(requestId);
  const expectedOutputs = readDiagnosticsExpectedOutputs(context.request);
  const reviews = readDiagnosticsPromptFeedbackReviews(context.request);
  const entries = Object.values(expectedOutputs)
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
    .map((entry) => ({
      review: reviews[entry.rowKey] ?? null,
      recordType: "prompt_feedback_review_item" as const,
      requestId,
      companyName: context.companyName,
      roleTitle: context.request.role_title,
      companyUrl: context.request.company_url ?? null,
      hasResumeContext: Boolean(context.request.profile_context?.trim()),
      rowKey: entry.rowKey,
      rowLabel: entry.rowLabel,
      actionId: entry.actionId,
      scope: entry.sectionKey ? "draft_section" : "pipeline_step",
      sectionKey: entry.sectionKey,
      sectionTitle: entry.sectionTitle,
      expectedOutputText: entry.plainText,
      expectedOutputHtml: entry.html,
      promptTarget: entry.promptTarget,
      feedbackStatus: entry.feedbackStatus,
      source: entry.source,
      capturedAt: entry.updatedAt,
      requestContext: {
        normalizedQueries: context.normalizedQueries,
        persona: context.persona,
        jobDescriptionExcerpt: context.request.job_description?.slice(0, 2000) ?? null,
      },
    }));

  return {
    requestId,
    exportedAt: new Date().toISOString(),
    source: "admin_diagnostics",
    purpose: "prompt_update_review_queue",
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    entryCount: entries.length,
    reviewQueue: entries,
  };
}

export async function listDiagnosticsPromptFeedback(args?: { limit?: number }) {
  const limit = Math.min(Math.max(args?.limit ?? 200, 1), 500);
  const { data, error } = await supabaseAdmin
    .from("deep_dive_requests")
    .select(`
      id,
      user_id,
      role_title,
      company_url,
      job_description,
      profile_context,
      created_at,
      updated_at,
      metadata_json,
      companies(name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const queue = ((data ?? []) as Array<DeepDiveRequest & { companies?: { name?: string | null } | null }>)
    .flatMap((request) => {
      const expectedOutputs = readDiagnosticsExpectedOutputs(request);
      const reviews = readDiagnosticsPromptFeedbackReviews(request);
      return Object.values(expectedOutputs).map((entry) => ({
        requestId: request.id,
        userId: request.user_id,
        companyName: request.companies?.name ?? "Unknown company",
        roleTitle: request.role_title,
        companyUrl: request.company_url ?? null,
        requestCreatedAt: request.created_at,
        requestUpdatedAt: request.updated_at ?? null,
        rowKey: entry.rowKey,
        rowLabel: entry.rowLabel,
        actionId: entry.actionId,
        scope: entry.sectionKey ? ("draft_section" as const) : ("pipeline_step" as const),
        sectionKey: entry.sectionKey,
        sectionTitle: entry.sectionTitle,
        expectedOutputText: entry.plainText,
        expectedOutputHtml: entry.html,
        hasResumeContext: Boolean(request.profile_context?.trim()),
        capturedAt: entry.updatedAt,
        source: entry.source,
        promptTarget: entry.promptTarget,
        reviewStatus: reviews[entry.rowKey]?.status ?? ("pending" as const),
        promptArea: reviews[entry.rowKey]?.promptArea ?? null,
        reviewNotes: reviews[entry.rowKey]?.reviewNotes ?? "",
        reviewUpdatedAt: reviews[entry.rowKey]?.updatedAt ?? null,
      }));
    })
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));

  return {
    fetchedAt: new Date().toISOString(),
    source: "admin_diagnostics" as const,
    totalRequestsScanned: (data ?? []).length,
    totalEntries: queue.length,
    queue,
  };
}

export async function saveDiagnosticsPromptFeedbackReview(args: {
  requestId: string;
  rowKey: string;
  status: PromptFeedbackReviewStatus;
  promptArea?: PromptFeedbackArea | null;
  reviewNotes?: string;
}) {
  const result = await saveDiagnosticsPromptFeedbackReviews({
    requestId: args.requestId,
    entries: [
      {
        rowKey: args.rowKey,
        status: args.status,
        promptArea: args.promptArea ?? null,
        reviewNotes: args.reviewNotes,
      },
    ],
  });

  return {
    requestId: args.requestId,
    rowKey: args.rowKey,
    review: result.reviews[args.rowKey],
  };
}

export async function saveDiagnosticsPromptFeedbackReviews(args: {
  requestId: string;
  entries: Array<{
    rowKey: string;
    status: PromptFeedbackReviewStatus;
    promptArea?: PromptFeedbackArea | null;
    reviewNotes?: string;
  }>;
}) {
  const request = await getDeepDiveRequest(args.requestId);
  if (!request) {
    throw new Error("Request not found.");
  }

  const expectedOutputs = readDiagnosticsExpectedOutputs(request);
  const currentDiagnostics = isRecord(request.metadata_json?.diagnostics) ? request.metadata_json?.diagnostics : {};
  const currentPromptImprovementFeedback =
    isRecord(currentDiagnostics.promptImprovementFeedback) ? currentDiagnostics.promptImprovementFeedback : {};
  const nextReviewDecisions = {
    ...readDiagnosticsPromptFeedbackReviews(request),
  };

  for (const entry of args.entries) {
    if (!expectedOutputs[entry.rowKey]) {
      throw new Error(`Prompt feedback row not found for request row ${entry.rowKey}.`);
    }

    nextReviewDecisions[entry.rowKey] = {
      rowKey: entry.rowKey,
      status: entry.status,
      promptArea: entry.promptArea ?? null,
      reviewNotes: entry.reviewNotes?.trim() ?? "",
      updatedAt: new Date().toISOString(),
    };
  }

  await updateDeepDiveRequestMetadata(args.requestId, {
    diagnostics: {
      ...currentDiagnostics,
      lastUpdatedAt: new Date().toISOString(),
      promptImprovementFeedback: {
        ...currentPromptImprovementFeedback,
        source: "admin_diagnostics",
        target: "prompt_update_candidate",
        lastUpdatedAt: new Date().toISOString(),
        entries: expectedOutputs,
        reviewDecisions: nextReviewDecisions,
      },
    },
  });

  return {
    requestId: args.requestId,
    reviews: nextReviewDecisions,
  };
}

function dedupeStrings(values: string[]): string[] {
  return values.filter((value, index) => value.trim().length > 0 && values.indexOf(value) === index);
}

function sourceTypeLabel(type: string): string {
  switch (type) {
    case "job_description":
      return "Job description";
    case "company_homepage":
      return "Company homepage";
    case "newsroom":
      return "Newsroom / press";
    case "blog":
      return "Company blog";
    case "custom_url":
      return "Custom URL";
    case "profile_text":
      return "Resume / profile context";
    default:
      return type;
  }
}

function normalizeComparableUrl(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return null;
  }
}

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function pathnameFromUrl(value: string): string {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function googleQueryFromUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.toLowerCase().replace(/^www\./, "") !== "google.com") {
      return null;
    }

    return parsed.searchParams.get("q")?.trim() ?? null;
  } catch {
    return null;
  }
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeSourcePurpose(sourceClasses?: string[], rationale?: string): string {
  if (rationale?.trim() && !isGenericSourcePurpose(rationale)) {
    return rationale.trim();
  }

  if (!sourceClasses?.length) {
    return "General company and role context.";
  }

  return `Supports ${sourceClasses.map((sourceClass) => toTitleCase(sourceClass)).join(", ")}.`;
}

function isGenericSourcePurpose(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "retrieved evidence used in downstream retrieval and drafting." ||
    normalized === "fallback external source from google.com to increase independent evidence coverage." ||
    normalized === "general company and role context."
  );
}

function describeGoogleSearchPurpose(query: string, companyName: string): string {
  const normalized = query.toLowerCase();

  if (/(annual report|10-k|10q|shareholder|earnings|investor)/.test(normalized)) {
    return `Google query seeded to find ${companyName} annual reports, SEC filings, earnings releases, or investor-relations materials.`;
  }

  if (/(operating principles|culture|values|trust code|codebook|standards of business conduct|mission)/.test(normalized)) {
    return `Google query seeded to find ${companyName} culture, values, operating-principles, or business-conduct materials.`;
  }

  if (/(engineering|developer|platform|architecture|api|blog)/.test(normalized)) {
    return `Google query seeded to find ${companyName} engineering blogs, developer surfaces, and platform context.`;
  }

  if (/(market share|competitor|competitive|gartner|forrester|canalys|synergy)/.test(normalized)) {
    return `Google query seeded to find independent market-share, competitor, or analyst coverage for ${companyName}.`;
  }

  return `Google query seeded to find role-relevant external evidence for ${companyName}.`;
}

function inferUrlPurpose(args: {
  url: string;
  type: string;
  companyName: string;
  companyUrl?: string | null;
  title?: string;
}): string | null {
  const hostname = hostnameFromUrl(args.url);
  const pathname = pathnameFromUrl(args.url);
  const normalizedTitle = args.title?.trim();
  const normalizedCompanyUrl = args.companyUrl ? normalizeComparableUrl(args.companyUrl) : null;
  const normalizedSourceUrl = normalizeComparableUrl(args.url);

  const query = googleQueryFromUrl(args.url);
  if (query) {
    return describeGoogleSearchPurpose(query, args.companyName);
  }

  if (args.type === "job_description") {
    return `Exact ${args.companyName} job posting used to anchor role requirements, scope, and stated responsibilities.`;
  }

  if (args.type === "profile_text") {
    return "Resume/profile context carried forward for fit-sensitive retrieval, drafting, and overlay work.";
  }

  if (normalizedCompanyUrl && normalizedCompanyUrl === normalizedSourceUrl) {
    return `Official ${args.companyName} corporate homepage for company narrative, product framing, and top-level positioning.`;
  }

  if (hostname === "sec.gov" || /\b10-k\b|\b10q\b|\/investor\/|\/earnings|annual-reports|\/reports\/ar/.test(`${hostname}${pathname}`)) {
    return `${args.companyName} investor, annual-report, or SEC-filing source for strategy, financial priorities, and risk disclosures.`;
  }

  if (/news|press|newsroom|source/.test(`${hostname}${pathname}`)) {
    return `Official ${args.companyName} newsroom or press source for launches, executive messaging, and company updates.`;
  }

  if (/devblogs\.|engineering|developer|api|docs|platform|blog/.test(`${hostname}${pathname}`)) {
    return `${args.companyName} engineering, developer, or blog source for platform, product, and execution context.`;
  }

  if (/culture|about|mission|values|codebook|compliance|\/sbc|standards/.test(pathname)) {
    return `${args.companyName} culture, mission, values, or standards-of-business-conduct source.`;
  }

  if (args.type === "company_homepage") {
    return `First-party ${args.companyName} site selected for official positioning and product context.`;
  }

  if (args.type === "custom_url" && hostname && normalizedTitle) {
    return `${normalizedTitle} was ingested as targeted evidence for downstream retrieval and drafting.`;
  }

  return null;
}

function buildIngestionReadableSummary(args: {
  companyName: string;
  request: DeepDiveRequest;
  researchPlan: ResearchPlan;
  ingestedSources: Array<{ id: string; source_type: string; title: string; url: string | null; fetched_at: string }>;
  durationMs: number;
  result: Awaited<ReturnType<typeof ingestSources>>;
}) {
  const recommendedSignalsByUrl = new Map(
    args.researchPlan.sourceStrategy.recommendedSources.map((source) => [normalizeComparableUrl(source.url) ?? source.url, source.signal])
  );
  const ingestedByUrl = new Map(
    args.ingestedSources
      .filter((source) => Boolean(source.url))
      .map((source) => [normalizeComparableUrl(source.url as string) ?? (source.url as string), source])
  );

  const plannedSources = args.researchPlan.selectedSources.map((source) => ({
    type: source.type,
    label: sourceTypeLabel(source.type),
    url: source.url,
    priority: source.priority,
    purpose:
      inferUrlPurpose({
        url: source.url,
        type: source.type,
        companyName: args.companyName,
        companyUrl: args.request.company_url ?? null,
      }) ||
      summarizeSourcePurpose(source.sourceClasses, source.rationale) ||
      recommendedSignalsByUrl.get(normalizeComparableUrl(source.url) ?? source.url) ||
      "General company and role context.",
    sourceClasses: source.sourceClasses?.map((sourceClass) => toTitleCase(sourceClass)) ?? [],
    trustTier: source.trustTier ?? null,
    party: source.party ?? null,
    origin: source.origin ?? null,
    score: source.score ?? null,
    selectionReason: source.selectionReason ?? source.rationale ?? null,
    gapCoverage: source.gapCoverage?.map((sourceClass) => toTitleCase(sourceClass)) ?? [],
    ingested: ingestedByUrl.has(normalizeComparableUrl(source.url) ?? source.url),
  }));

  const actualSources = args.ingestedSources.map((source) => ({
    id: source.id,
    title: source.title,
    type: sourceTypeLabel(source.source_type),
    url: source.url,
    sourceClasses:
      plannedSources
        .find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))
        ?.sourceClasses ?? [],
    trustTier:
      plannedSources
        .find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))
        ?.trustTier ?? null,
    party:
      plannedSources
        .find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))
        ?.party ?? null,
    origin:
      plannedSources
        .find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))
        ?.origin ?? null,
    score:
      plannedSources
        .find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))
        ?.score ?? null,
    selectionReason:
      plannedSources
        .find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))
        ?.selectionReason ?? null,
    purpose: source.url
      ? plannedSources.find((planned) => normalizeComparableUrl(planned.url) === normalizeComparableUrl(source.url ?? ""))?.purpose ??
        inferUrlPurpose({
          url: source.url,
          type: source.source_type,
          companyName: args.companyName,
          companyUrl: args.request.company_url ?? null,
          title: source.title,
        }) ??
        `${source.title || sourceTypeLabel(source.source_type)} was ingested as ${sourceTypeLabel(source.source_type).toLowerCase()} evidence for downstream retrieval and drafting.`
      : source.source_type === "job_description"
        ? "Anchors the run on the specific role requirements."
        : source.source_type === "profile_text"
          ? "Carries resume context for later fit and overlay work."
          : "Retrieved evidence used in downstream retrieval and drafting.",
  }));

  return {
    kind: "ingest",
    overview: {
      durationMs: args.durationMs,
      sourcesCreated: args.result.sourcesCreated,
      chunksCreated: args.result.chunksCreated,
      strategySummary: args.researchPlan.strategySummary,
      goal: args.researchPlan.sourceStrategy.goal,
      coveredSourceClasses: args.researchPlan.coverageSummary?.coveredSourceClasses?.map((sourceClass) => toTitleCase(sourceClass)).join(", ") ?? "—",
      missingSourceClasses: args.researchPlan.coverageSummary?.missingSourceClasses?.map((sourceClass) => toTitleCase(sourceClass)).join(", ") ?? "None",
      secondPassAddedCount: args.researchPlan.coverageSummary?.secondPassAddedCount ?? 0,
      independentDomainsActual: args.researchPlan.coverageSummary?.independentDomainsActual ?? 0,
      independentDomainsTarget: args.researchPlan.coverageSummary?.independentDomainsTarget ?? 0,
    },
    qualityChecks: [
      args.request.job_description?.trim()
        ? "The run included the job description as a first-class source."
        : "No pasted or extracted job description was present, so the role anchor may be weaker than normal.",
      args.request.profile_context?.trim()
        ? "Resume/profile context was also ingested and can influence later fit-sensitive steps."
        : "No resume/profile context was ingested for this run.",
      `Required source classes: ${args.researchPlan.sourceStrategy.requiredSourceClasses.map((sourceClass) => toTitleCase(sourceClass)).join(", ")}.`,
      args.researchPlan.coverageSummary?.missingSourceClasses?.length
        ? `Coverage gaps after source selection: ${args.researchPlan.coverageSummary.missingSourceClasses.map((sourceClass) => toTitleCase(sourceClass)).join(", ")}.`
        : "All required source classes were covered by the selected source set.",
      args.researchPlan.coverageSummary && args.researchPlan.coverageSummary.secondPassAddedCount > 0
        ? `Second-pass gap filling added ${args.researchPlan.coverageSummary.secondPassAddedCount} source${args.researchPlan.coverageSummary.secondPassAddedCount === 1 ? "" : "s"}.`
        : "Second-pass gap filling was not needed for this run.",
      args.researchPlan.coverageSummary
        ? `Independent domains: ${args.researchPlan.coverageSummary.independentDomainsActual} of ${args.researchPlan.coverageSummary.independentDomainsTarget} target.`
        : "Independent-domain coverage summary unavailable.",
    ],
    plannedSources,
    actualSources,
    priorityOrder: args.researchPlan.sourceStrategy.priorityOrder,
    notes: args.researchPlan.sourceStrategy.notes,
  };
}

function buildRetrievalReadableSummary(args: {
  retrievalState: Awaited<ReturnType<typeof buildPremiumRetrievalState>>;
  companyName: string;
  roleTitle: string;
}) {
  const topSources = new Map<string, {
    title: string;
    type: string;
    url: string | null;
    chunkCount: number;
    bestRank: number;
    bestExcerpt: string;
  }>();

  for (const result of args.retrievalState.reranked.slice(0, 12)) {
    const existing = topSources.get(result.source.id);
    if (existing) {
      existing.chunkCount += 1;
      existing.bestRank = Math.min(existing.bestRank, result.rank + 1);
      continue;
    }

    topSources.set(result.source.id, {
      title: result.source.title,
      type: sourceTypeLabel(result.source.source_type),
      url: result.source.url ?? null,
      chunkCount: 1,
      bestRank: result.rank + 1,
      bestExcerpt: result.chunk.text.slice(0, 260),
    });
  }

  return {
    kind: "retrieval",
    overview: {
      companyName: args.companyName,
      roleTitle: args.roleTitle,
      durationMs: args.retrievalState.retrievalDurationMs,
      evidenceRating: args.retrievalState.evidenceQuality.rating,
      distinctSourceCount: args.retrievalState.evidenceQuality.distinct_source_count,
      distinctSourceTypes: args.retrievalState.evidenceQuality.distinct_source_types,
      totalRetrievedChunks: args.retrievalState.reranked.length,
    },
    queries: args.retrievalState.normalizedQueries,
    warnings: args.retrievalState.evidenceQuality.warnings,
    topSources: Array.from(topSources.values()).sort((left, right) => left.bestRank - right.bestRank),
    topChunks: args.retrievalState.context.chunks.slice(0, 8).map((chunk, index) => ({
      rank: index + 1,
      title: chunk.source_title,
      type: sourceTypeLabel(chunk.source_type),
      url: chunk.source_url ?? null,
      excerpt: chunk.text.slice(0, 320),
    })),
    sourceCoverage: args.retrievalState.coverage,
  };
}

function buildDraftReadableSummary(args: {
  orderedDefinitions: ReturnType<typeof buildOrderedDefinitions>;
  draft: DiagnosticsDraftBundle;
  durationMs: number;
}) {
  const sectionCards = args.orderedDefinitions
    .filter((definition) => definition.key !== "operations_and_cost")
    .map((definition) => {
      const section = args.draft.wrappedSections[definition.key as PremiumSectionKey];
      return {
        key: definition.key,
        title: definition.title,
        group: definition.group,
        question: definition.question,
        summary: section?.summary ?? "No section content returned.",
        evidence: section?.evidence
          ? {
              status: section.evidence.status,
              confidence: section.evidence.confidence,
              threshold: section.evidence.threshold,
              note: section.evidence.note,
            }
          : null,
        facts: section?.facts?.slice(0, 4) ?? [],
        callouts: section?.callouts?.slice(0, 4) ?? [],
        bullets: section?.bullets?.slice(0, 5) ?? [],
        blocks: section?.blocks?.slice(0, 4) ?? [],
      };
    });

  return {
    kind: "draft",
    overview: {
      durationMs: args.durationMs,
      recommendation: args.draft.data.report_recommendation,
      sectionCount: sectionCards.length,
      usage: args.draft.usage,
    },
    sections: sectionCards,
  };
}

function asResearchPlan(value: unknown): ResearchPlan | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    strategySummary?: unknown;
    selectedSources?: unknown;
    retrievalQueries?: unknown;
    sourceStrategy?: unknown;
    strategy_summary?: unknown;
    selected_sources?: unknown;
    retrieval_queries?: unknown;
    source_strategy?: unknown;
  };

  const strategySummary = typeof candidate.strategySummary === "string"
    ? candidate.strategySummary
    : typeof candidate.strategy_summary === "string"
      ? candidate.strategy_summary
      : null;
  const selectedSources = Array.isArray(candidate.selectedSources)
    ? candidate.selectedSources
    : Array.isArray(candidate.selected_sources)
      ? candidate.selected_sources
      : null;
  const retrievalQueries = Array.isArray(candidate.retrievalQueries)
    ? candidate.retrievalQueries
    : Array.isArray(candidate.retrieval_queries)
      ? candidate.retrieval_queries
      : null;
  const sourceStrategy = candidate.sourceStrategy ?? candidate.source_strategy;

  if (!strategySummary || !selectedSources || !retrievalQueries || !sourceStrategy) {
    return null;
  }

  return {
    strategySummary,
    selectedSources: selectedSources as ResearchPlan["selectedSources"],
    retrievalQueries: retrievalQueries.filter((query): query is string => typeof query === "string"),
    sourceStrategy: sourceStrategy as ResearchPlan["sourceStrategy"],
  };
}

async function loadDiagnosticsContext(requestId: string): Promise<DiagnosticsContext> {
  const request = await getDeepDiveRequest(requestId);
  if (!request) {
    throw new Error("Request not found.");
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", request.company_id)
    .single();

  if (companyError) {
    throw companyError;
  }

  const companyName = company?.name ?? "the company";
  const latestResearchPlan = asResearchPlan(request.metadata_json?.research_plan);
  const persona = inferPremiumPersona(
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );
  const presentationPlan = getPremiumPresentationPlan(persona);
  const orderedDefinitions = buildOrderedDefinitions(presentationPlan);
  const normalizedQueries = dedupeStrings(
    latestResearchPlan?.retrievalQueries ??
      buildPersonaAwareRetrievalQueries(
        companyName,
        request.role_title,
        request.job_description ?? undefined,
        persona
      )
  );

  return {
    request,
    companyName,
    latestResearchPlan,
    persona,
    presentationPlan,
    orderedDefinitions,
    normalizedQueries,
  };
}

function summarizeRetrievalState(retrievalState: Awaited<ReturnType<typeof buildPremiumRetrievalState>>) {
  return {
    retrievalDurationMs: retrievalState.retrievalDurationMs,
    normalizedQueries: retrievalState.normalizedQueries,
    evidenceQuality: retrievalState.evidenceQuality,
    coverage: retrievalState.coverage,
    sources: retrievalState.sources.map((source) => ({
      id: source.id,
      type: source.source_type,
      title: source.title,
      url: source.url ?? null,
      trustScore: source.trust_score,
      fetchedAt: source.fetched_at,
    })),
    topChunks: retrievalState.context.chunks.slice(0, 12).map((chunk) => ({
      sourceId: chunk.source_id,
      sourceTitle: chunk.source_title,
      sourceType: chunk.source_type,
      sourceUrl: chunk.source_url ?? null,
      excerpt: chunk.text.slice(0, 800),
    })),
  };
}

export async function extractDiagnosticsJobFromUrl(url: string) {
  const extracted = await extractJobDetailsFromUrl(url);
  if (!extracted) {
    throw new Error("Could not extract job details from that URL.");
  }

  return {
    sourceUrl: url,
    companyName: extracted.companyName ?? "",
    roleTitle: extracted.roleTitle ?? "",
    companyUrl: extracted.companyUrl ?? "",
    jobDescription: extracted.jobDescription ?? "",
    extractionWarning: null,
  };
}

export async function createDiagnosticsRequest(args: {
  userId: string;
  email: string;
  companyName: string;
  roleTitle: string;
  companyUrl?: string;
  jobDescription?: string;
  resumeText?: string;
}) {
  await supabaseAdmin
    .from("users")
    .upsert({ id: args.userId, email: args.email }, { onConflict: "id", ignoreDuplicates: true });

  const company = await getOrCreateCompany(args.companyName, args.companyUrl);
  const request = await createDeepDiveRequest(
    args.userId,
    company.id,
    args.roleTitle,
    args.jobDescription,
    args.companyUrl ?? company.website_url,
    args.resumeText
  );

  return {
    requestId: request.id,
    companyId: company.id,
    companyName: company.name,
    roleTitle: request.role_title,
    status: request.status,
    createdAt: request.created_at,
  };
}

export async function ingestDiagnosticsSources(requestId: string) {
  const context = await loadDiagnosticsContext(requestId);

  await updateDeepDiveStatus(requestId, "fetching_sources");
  const startedAt = Date.now();
  const result = await ingestSources(
    requestId,
    context.request.company_id,
    context.companyName,
    context.request.role_title,
    context.request.company_url ?? undefined,
    [],
    context.request.job_description ?? undefined,
    context.request.profile_context ?? undefined
  );

  if (!result.success) {
    await updateDeepDiveStatus(requestId, "failed", result.error ?? "Source ingestion failed.");
  }

  const { data: sources, error: sourcesError } = await supabaseAdmin
    .from("sources")
    .select("id, source_type, title, url, fetched_at")
    .eq("request_id", requestId)
    .order("fetched_at", { ascending: false })
    .limit(20);

  if (sourcesError) {
    throw sourcesError;
  }

  return {
    requestId,
    durationMs: Date.now() - startedAt,
    status: result.success ? "ok" : "failed",
    ingest: result,
    humanReadable: buildIngestionReadableSummary({
      companyName: context.companyName,
      request: context.request,
      researchPlan: result.researchPlan,
      ingestedSources: sources ?? [],
      durationMs: Date.now() - startedAt,
      result,
    }),
    recentSources: (sources ?? []).map((source: { id: string; source_type: string; title: string; url: string | null; fetched_at: string }) => ({
      id: source.id,
      type: source.source_type,
      title: source.title,
      url: source.url ?? null,
      fetchedAt: source.fetched_at,
    })),
  };
}

export async function inspectDiagnosticsRetrieval(requestId: string) {
  const context = await loadDiagnosticsContext(requestId);
  const retrievalState = await buildPremiumRetrievalState({
    requestId,
    queries: context.normalizedQueries,
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    persona: context.persona,
  });

  return {
    requestId,
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    persona: context.persona,
    humanReadable: buildRetrievalReadableSummary({
      retrievalState,
      companyName: context.companyName,
      roleTitle: context.request.role_title,
    }),
    retrieval: summarizeRetrievalState(retrievalState),
  };
}

export async function generateDiagnosticsDraft(requestId: string) {
  const context = await loadDiagnosticsContext(requestId);
  const retrievalState = await buildPremiumRetrievalState({
    requestId,
    queries: context.normalizedQueries,
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    persona: context.persona,
  });

  const startedAt = Date.now();
  const draft = await buildPremiumDraft({
    retrievalState,
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    jobDescription: context.request.job_description ?? undefined,
    profileContext: context.request.profile_context ?? undefined,
    persona: context.persona,
    qualityGate: null,
  });

  return {
    requestId,
    durationMs: Date.now() - startedAt,
    humanReadable: buildDraftReadableSummary({
      orderedDefinitions: context.orderedDefinitions,
      draft: {
        data: draft.data,
        wrappedSections: draft.wrappedSections,
        personaQa: draft.personaQa,
        usage: draft.usage,
      },
      durationMs: Date.now() - startedAt,
    }),
    retrieval: summarizeRetrievalState(retrievalState),
    draft: {
      data: draft.data,
      wrappedSections: draft.wrappedSections,
      personaQa: draft.personaQa,
      usage: draft.usage,
    },
  };
}

export async function evaluateDiagnosticsDraft(args: {
  requestId: string;
  draft: {
    wrappedSections: DiagnosticsDraftBundle["wrappedSections"];
    personaQa: DiagnosticsDraftBundle["personaQa"];
  };
}) {
  const context = await loadDiagnosticsContext(args.requestId);
  const retrievalState = await buildPremiumRetrievalState({
    requestId: args.requestId,
    queries: context.normalizedQueries,
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    persona: context.persona,
  });

  const startedAt = Date.now();
  const evaluationResult = await evaluateDraft({
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    persona: context.persona,
    evidenceQuality: retrievalState.evidenceQuality,
    coverage: retrievalState.coverage,
    personaQa: args.draft.personaQa,
    sections: args.draft.wrappedSections,
    orderedDefinitions: context.orderedDefinitions,
    hasRetry: false,
  });

  const qualityGate = finalizePremiumQualityGate({
    evaluation: evaluationResult.evaluation,
    sections: args.draft.wrappedSections,
    evidenceQuality: retrievalState.evidenceQuality,
    coverage: retrievalState.coverage,
    personaQa: args.draft.personaQa,
    persona: context.persona,
    hasRetry: false,
  });

  return {
    requestId: args.requestId,
    durationMs: Date.now() - startedAt,
    evaluation: evaluationResult.evaluation,
    usage: evaluationResult.usage,
    qualityGate,
  };
}

export async function persistDiagnosticsReport(args: {
  requestId: string;
  draft: DiagnosticsDraftBundle;
  evaluation: DiagnosticsEvaluationBundle;
}) {
  const context = await loadDiagnosticsContext(args.requestId);
  const retrievalState = await buildPremiumRetrievalState({
    requestId: args.requestId,
    queries: context.normalizedQueries,
    companyName: context.companyName,
    roleTitle: context.request.role_title,
    persona: context.persona,
  });

  await updateDeepDiveStatus(args.requestId, "generating_report");
  const assemblyStartedAt = Date.now();
  const report = await persistPremiumReportArtifacts({
    requestId: args.requestId,
    request: context.request,
    companyName: context.companyName,
    persona: context.persona,
    presentationPlan: context.presentationPlan,
    orderedDefinitions: context.orderedDefinitions,
    retrievalState,
    latestResearchPlan: context.latestResearchPlan,
    totalRetrievalDurationMs: retrievalState.retrievalDurationMs,
    totalSynthesisDurationMs: 0,
    llmCalls: [args.draft.usage, args.evaluation.usage],
    finalData: args.draft.data,
    wrappedSections: args.draft.wrappedSections,
    personaQa: args.draft.personaQa,
    qualityGate: args.evaluation.qualityGate,
    targetedRetrievalLoops: 0,
    assemblyStartedAt,
    runId: randomUUID(),
  });

  await updateDeepDiveStatus(args.requestId, "completed");

  return {
    requestId: args.requestId,
    reportId: report.id,
    recommendation: report.recommendation,
    createdAt: report.created_at,
  };
}

export async function runDiagnosticsOverlay(requestId: string) {
  const context = await loadDiagnosticsContext(requestId);
  const resumeText = context.request.profile_context?.trim();
  if (!resumeText) {
    throw new Error("This request does not include resume text, so there is no overlay step to run.");
  }

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report?.id) {
    throw new Error("Persist a report before running the overlay step.");
  }

  const { data: resumeRecord, error: resumeError } = await supabaseAdmin
    .from("candidate_resumes")
    .insert({ user_id: context.request.user_id, raw_text: resumeText, status: "parsed" })
    .select("id")
    .single();

  if (resumeError || !resumeRecord) {
    throw resumeError ?? new Error("Failed to create resume record.");
  }

  const { data: overlayRecord, error: overlayError } = await supabaseAdmin
    .from("candidate_overlays")
    .insert({ request_id: requestId, resume_id: resumeRecord.id, status: "pending" })
    .select("id")
    .single();

  if (overlayError || !overlayRecord) {
    throw overlayError ?? new Error("Failed to create overlay record.");
  }

  await generateOverlay(overlayRecord.id);

  const { data: overlay, error: readError } = await supabaseAdmin
    .from("candidate_overlays")
    .select("id, status, error_message, overlay_json, updated_at")
    .eq("id", overlayRecord.id)
    .single();

  if (readError) {
    throw readError;
  }

  return {
    requestId,
    overlayId: overlay.id,
    status: overlay.status,
    updatedAt: overlay.updated_at,
    error: overlay.error_message ?? null,
    overlay: overlay.overlay_json,
  };
}