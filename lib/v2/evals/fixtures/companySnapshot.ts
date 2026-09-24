import type { Claim, Report, Section } from "@/lib/v2/contract/schema";

/**
 * Hand-written fixtures for scorer self-tests.
 *
 * A fictional company, deliberately: a real one would tempt anyone reading these
 * to check the facts, and the fixtures exist to test the scorers, not the facts.
 *
 * `CLEAN_REPORT` must score a clean pass on every scorer. Each `broken_*` helper
 * introduces exactly one defect. That one-defect-at-a-time discipline is what
 * makes a self-test failure diagnostic rather than merely alarming.
 */

export const CHUNKS: Record<string, string> = {
  chunk_fin_1:
    "For fiscal year 2024, Northwind Systems reported revenue of $340 million, " +
    "up from $280 million in the prior year. Gross margin was 61%, down two " +
    "points year over year as infrastructure costs rose.",
  chunk_fin_2:
    "Revenue in our Intelligence segment increased 64% year over year, while " +
    "the remainder of the portfolio grew 4%. We continue to direct incremental " +
    "investment toward Intelligence.",
  chunk_own_1:
    "Northwind Systems was founded in 2011 in Denver and has been publicly " +
    "traded on the Nasdaq since its listing in September 2021. Founder Dana " +
    "Reyes remains chief executive.",
  chunk_scale_1:
    "As of the close of fiscal 2024 the company employed 2,150 people across " +
    "nine countries and served approximately 4,800 enterprise customers.",
  chunk_model_1:
    "Northwind sells annual subscriptions to its data platform, priced per " +
    "ingested terabyte, with professional services accounting for a small " +
    "share of total revenue.",
  chunk_event_1:
    "In March 2026 Northwind Systems eliminated 500 roles, of which 340 came " +
    "from the Platform organization. The company described the action as a " +
    "reallocation rather than a cost reduction.",
};

export const chunkLookup = (id: string): string | undefined => CHUNKS[id];

const claims: Claim[] = [
  {
    id: "c1",
    factType: "ownership",
    factKey: "northwind.public_since_2021",
    role: "canonical",
    statement:
      "Northwind Systems was founded in Denver in 2011, has traded on the Nasdaq since September 2021, and is still led by founder Dana Reyes.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_own_1",
        sourceId: "src_10k",
        quote:
          "founded in 2011 in Denver and has been publicly traded on the Nasdaq since its listing in September 2021",
      },
      {
        chunkId: "chunk_own_1",
        sourceId: "src_10k",
        quote: "Founder Dana Reyes remains chief executive",
      },
    ],
    soWhat:
      "A founder-led public company sets a different decision-making cadence than a PE-owned one.",
  },
  {
    id: "c2",
    factType: "scale",
    factKey: "northwind.scale_fy24",
    role: "canonical",
    statement:
      "As of FY24 the company employed 2,150 people and served roughly 4,800 enterprise customers.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_scale_1",
        sourceId: "src_10k",
        quote: "employed 2,150 people across nine countries and served approximately 4,800 enterprise customers",
      },
    ],
  },
  {
    id: "c3",
    factType: "product",
    factKey: "northwind.business_model",
    role: "canonical",
    statement:
      "Revenue comes from annual subscriptions to the data platform, priced per ingested terabyte.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_model_1",
        sourceId: "src_10k",
        quote: "annual subscriptions to its data platform, priced per ingested terabyte",
      },
    ],
    soWhat:
      "Usage-based pricing means revenue tracks customer data volume, not seat count — a different growth lever for a PM to pull.",
  },
  {
    id: "c4",
    factType: "financials",
    factKey: "northwind.revenue_fy24",
    role: "canonical",
    statement: "Revenue reached $340 million in FY24, up from $280 million in FY23.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_fin_1",
        sourceId: "src_10k",
        quote: "revenue of $340 million, up from $280 million in the prior year",
      },
    ],
  },
  {
    id: "c5",
    factType: "event",
    factKey: "northwind.layoffs_2026",
    role: "canonical",
    statement:
      "In March 2026 the company cut 500 roles, 340 of them from the Platform organization.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_event_1",
        sourceId: "src_pr",
        quote: "eliminated 500 roles, of which 340 came from the Platform organization",
      },
    ],
  },
  {
    id: "c6",
    factType: "strategy",
    factKey: "northwind.platform_harvested",
    role: "canonical",
    statement: "The Platform organization is being harvested rather than funded.",
    label: "inference",
    reasoning:
      "The Intelligence segment grew 64% while the rest of the portfolio grew 4%, and 340 of the 500 roles cut in March 2026 came from Platform. Investment and headcount are both moving the same direction, away from Platform.",
    confidence: "medium",
    evidence: [
      {
        chunkId: "chunk_fin_2",
        sourceId: "src_10k",
        quote: "Intelligence segment increased 64% year over year, while the remainder of the portfolio grew 4%",
      },
      {
        chunkId: "chunk_event_1",
        sourceId: "src_pr",
        quote: "340 came from the Platform organization",
      },
    ],
    soWhat:
      "A role owning any part of Platform inherits an efficiency mandate, not a growth one.",
  },
  {
    id: "c7",
    factType: "financials",
    factKey: "northwind.margin_pressure",
    role: "canonical",
    statement: "Gross margin fell two points to 61% in FY24 as infrastructure costs rose.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_fin_1",
        sourceId: "src_10k",
        quote: "Gross margin was 61%, down two points year over year as infrastructure costs rose",
      },
    ],
  },
  {
    id: "c8",
    factType: "financials",
    role: "canonical",
    statement:
      "Whether Intelligence margins hold as the segment scales is not disclosed.",
    label: "open_question",
    confidence: "low",
    evidence: [],
    resolvesWith: "Segment-level gross margin disclosure in the FY25 annual report.",
  },
];

export const CLEAN_SECTION: Section = {
  id: "company_snapshot",
  title: "Company Snapshot",
  summary:
    "Northwind Systems is a founder-led, Nasdaq-listed data platform business " +
    "with $340M in FY24 revenue growing 22%. Growth is concentrated almost " +
    "entirely in one segment, and the March 2026 reduction fell on the other.",
  claims,
  coverage: {
    questionsAsked: 9,
    questionsAnswered: 8,
    chunksRetrieved: 6,
    unresolvedQuestions: ["Segment-level gross margin for Intelligence"],
    sufficiency: "strong",
  },
};

export const CLEAN_REPORT: Report = {
  requestId: "fixture_1",
  companyName: "Northwind Systems",
  roleTitle: "Director of Product, Platform",
  generatedAt: "2026-09-23T00:00:00.000Z",
  sections: [CLEAN_SECTION],
};

/** Prose that renders CLEAN_REPORT while holding the style contract. */
export const CLEAN_PROSE = `## Company Snapshot

Northwind Systems has traded on the Nasdaq since September 2021, having been founded in Denver in 2011 under Dana Reyes, who remains chief executive. Revenue reached $340 million in FY24, up from $280 million in FY23. As of FY24 the company employed 2,150 people and served roughly 4,800 enterprise customers.

Revenue comes from annual subscriptions to the data platform, priced per ingested terabyte. Gross margin fell two points to 61% in FY24 as infrastructure costs rose. In March 2026 the company cut 500 roles, 340 of them from the Platform organization.

**Inference —** the Platform organization is being harvested rather than funded. Basis: the Intelligence segment grew 64% in FY24 while the remainder of the portfolio grew 4%, and 340 of the 500 roles cut in March 2026 came from Platform. A role owning any part of Platform inherits an efficiency mandate rather than a growth one.

**Open question —** whether Intelligence margins hold as the segment scales. Resolves with segment-level gross margin disclosure in the FY25 annual report.`;

export const CLEAN_WORDS: Record<string, number> = {
  company_snapshot: CLEAN_PROSE.trim().split(/\s+/).length,
};

// ── Broken variants: exactly one defect each ──────────────────────────────

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function mutateSection(fn: (s: Section) => void): Report {
  const r = clone(CLEAN_REPORT);
  fn(r.sections[0]);
  return r;
}

/** A quote that does not occur in the chunk it cites. */
export const broken_fabricatedQuote = () =>
  mutateSection((s) => {
    s.claims[3].evidence[0].quote = "revenue of $890 million, a record year";
  });

/** A citation to a chunk that does not exist. */
export const broken_missingChunk = () =>
  mutateSection((s) => {
    s.claims[3].evidence[0].chunkId = "chunk_does_not_exist";
  });

/** An inference labelled as a fact. */
export const broken_mislabelledInference = () =>
  mutateSection((s) => {
    s.claims[1].statement =
      "The headcount reduction suggests the company is prioritising margin over growth.";
  });

/** Required coverage element C3 (business model) absent. */
export const broken_missingCoverage = () =>
  mutateSection((s) => {
    s.claims = s.claims.filter((c) => c.factType !== "product" && c.factType !== "pricing");
  });

/** Claims confident despite thin coverage. */
export const broken_overconfidentThinCoverage = () =>
  mutateSection((s) => {
    s.coverage.sufficiency = "thin";
  });

/** Same fact stated in full by two sections. */
export const broken_duplicateCanonical = (): Report => {
  const r = clone(CLEAN_REPORT);
  const second = clone(r.sections[0]);
  second.id = "swot";
  second.title = "SWOT";
  second.claims = [clone(r.sections[0].claims[4])];
  second.claims[0].id = "s1";
  r.sections.push(second);
  return r;
};

/** Repetition with no justification. */
export const broken_unjustifiedReinforce = (): Report => {
  const r = broken_duplicateCanonical();
  r.sections[1].claims[0].role = "reinforce";
  return r;
};

/** Prose stating a number that is in no claim. */
export const broken_proseInventsNumber = () =>
  CLEAN_PROSE.replace("$340 million", "$412 million");

/** Prose naming a person who is in no claim. */
export const broken_proseInventsName = () =>
  CLEAN_PROSE.replace("Dana Reyes", "Marcus Villanueva");

/** Prose using banned language. */
export const broken_proseBannedPhrase = () =>
  CLEAN_PROSE.replace(
    "Revenue reached $340 million in FY24",
    "The company saw strong growth in FY24, reaching $340 million",
  );

/** Prose addressing the reader directly. */
export const broken_proseSecondPerson = () =>
  CLEAN_PROSE.replace(
    "A role owning any part of Platform inherits",
    "If you own any part of Platform, you inherit",
  );

/** An inference rendered without its marker. */
export const broken_proseUnmarkedInference = () =>
  CLEAN_PROSE.replace("**Inference —** the Platform", "The Platform");
