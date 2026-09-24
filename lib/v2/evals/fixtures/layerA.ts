import type { Claim, Report, Section, SectionId } from "@/lib/v2/contract/schema";

/**
 * Hand-written fixtures for scorer self-tests.
 *
 * A fictional company, deliberately: a real one would tempt anyone reading these
 * to check the facts, and the fixtures exist to test the scorers, not the facts.
 *
 * Two sections — `business_fundamentals` and `trajectory_and_health` — because
 * the document-level scorers (redundancy, fabrication, prose ratio) are only
 * meaningfully exercised by a multi-section report.
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

// ── business_fundamentals ────────────────────────────────────────────────

const fundamentalsClaims: Claim[] = [
  {
    id: "bf1",
    factType: "ownership",
    factKey: "northwind.public_since_2021",
    role: "canonical",
    statement:
      "Northwind Systems was founded in Denver in 2011 and has traded on the Nasdaq since September 2021.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_own_1",
        sourceId: "src_10k",
        quote:
          "founded in 2011 in Denver and has been publicly traded on the Nasdaq since its listing in September 2021",
      },
    ],
  },
  {
    // Separate from bf1 because a claim carries one factType, and leadership is
    // its own coverage element (BF4) with its own sources.
    id: "bf4",
    factType: "leadership",
    factKey: "northwind.founder_ceo",
    role: "canonical",
    statement: "Founder Dana Reyes is still chief executive.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_own_1",
        sourceId: "src_10k",
        quote: "Founder Dana Reyes remains chief executive",
      },
    ],
    soWhat:
      "A founder-led public company sets a different decision-making cadence than a professionally managed one.",
  },
  {
    id: "bf2",
    factType: "scale",
    factKey: "northwind.scale_fy24",
    role: "canonical",
    statement:
      "As of FY24 the company employed 2,150 people across nine countries and served roughly 4,800 enterprise customers.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_scale_1",
        sourceId: "src_10k",
        quote:
          "employed 2,150 people across nine countries and served approximately 4,800 enterprise customers",
      },
    ],
  },
  {
    id: "bf3",
    factType: "product",
    factKey: "northwind.business_model",
    role: "canonical",
    statement:
      "Revenue comes from annual subscriptions to the data platform, priced per ingested terabyte, with professional services a small share.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_model_1",
        sourceId: "src_10k",
        quote:
          "annual subscriptions to its data platform, priced per ingested terabyte, with professional services accounting for a small share of total revenue",
      },
    ],
    soWhat:
      "Usage-based pricing means revenue tracks customer data volume rather than seat count, a different growth lever for a product manager to pull.",
  },
];

// ── trajectory_and_health ────────────────────────────────────────────────

const trajectoryClaims: Claim[] = [
  {
    id: "th1",
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
    id: "th2",
    factType: "market",
    factKey: "northwind.growth_concentration",
    role: "canonical",
    statement:
      "Growth in FY24 was concentrated in one segment: Intelligence grew 64% while the remainder of the portfolio grew 4%.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_fin_2",
        sourceId: "src_10k",
        quote:
          "Intelligence segment increased 64% year over year, while the remainder of the portfolio grew 4%",
      },
    ],
    soWhat:
      "Headline growth of 22% describes a company that is really two businesses moving at different speeds.",
  },
  {
    id: "th3",
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
        quote:
          "eliminated 500 roles, of which 340 came from the Platform organization",
      },
    ],
  },
  {
    id: "th4",
    factType: "financials",
    factKey: "northwind.margin_pressure",
    role: "canonical",
    statement:
      "Gross margin fell two points to 61% in FY24 as infrastructure costs rose.",
    label: "fact",
    confidence: "high",
    evidence: [
      {
        chunkId: "chunk_fin_1",
        sourceId: "src_10k",
        quote:
          "Gross margin was 61%, down two points year over year as infrastructure costs rose",
      },
    ],
  },
  {
    id: "th5",
    factType: "strategy",
    factKey: "northwind.platform_harvested",
    role: "canonical",
    statement: "The Platform organization is being harvested rather than funded.",
    label: "inference",
    reasoning:
      "Investment and headcount are moving the same direction. The Intelligence segment grew 64% against 4% for the rest of the portfolio, and 340 of the 500 roles cut in March 2026 came from Platform.",
    confidence: "medium",
    evidence: [
      {
        chunkId: "chunk_fin_2",
        sourceId: "src_10k",
        quote: "We continue to direct incremental investment toward Intelligence",
      },
      {
        chunkId: "chunk_event_1",
        sourceId: "src_pr",
        quote: "340 came from the Platform organization",
      },
    ],
    soWhat:
      "A role owning any part of Platform inherits an efficiency mandate rather than a growth one.",
  },
  {
    id: "th6",
    factType: "financials",
    role: "canonical",
    statement:
      "Whether Intelligence margins hold as the segment scales is not disclosed.",
    label: "open_question",
    confidence: "low",
    evidence: [],
    resolvesWith:
      "Segment-level gross margin disclosure in the FY25 annual report.",
  },
];

export const CLEAN_FUNDAMENTALS: Section = {
  id: "business_fundamentals",
  title: "Business Fundamentals",
  summary:
    "Northwind Systems is a founder-led, Nasdaq-listed data platform business " +
    "of roughly 2,150 people, selling usage-priced subscriptions to about " +
    "4,800 enterprise customers.",
  claims: fundamentalsClaims,
  coverage: {
    questionsAsked: 5,
    questionsAnswered: 5,
    chunksRetrieved: 3,
    unresolvedQuestions: [],
    sufficiency: "strong",
  },
};

export const CLEAN_TRAJECTORY: Section = {
  id: "trajectory_and_health",
  title: "Trajectory and Financial Health",
  summary:
    "Revenue grew 22% in FY24, but almost all of it came from one segment " +
    "while the rest of the portfolio was flat. Margin is compressing, and the " +
    "March 2026 reduction fell on the slower half of the business.",
  claims: trajectoryClaims,
  coverage: {
    questionsAsked: 7,
    questionsAnswered: 6,
    chunksRetrieved: 4,
    unresolvedQuestions: ["Segment-level gross margin for Intelligence"],
    sufficiency: "strong",
  },
};

export const CLEAN_REPORT: Report = {
  requestId: "fixture_1",
  companyName: "Northwind Systems",
  roleTitle: "Director of Product, Platform",
  generatedAt: "2026-09-23T00:00:00.000Z",
  sections: [CLEAN_FUNDAMENTALS, CLEAN_TRAJECTORY],
};

// ── Prose that renders CLEAN_REPORT while holding the style contract ──────

const PROSE_FUNDAMENTALS = `## Business Fundamentals

Northwind Systems was founded in Denver in 2011 and has traded on the Nasdaq since September 2021. Founder Dana Reyes remains chief executive, which gives the company a decision-making cadence closer to a private founder-led business than to a professionally managed public one.

As of FY24 the company employed 2,150 people across nine countries and served roughly 4,800 enterprise customers. Revenue comes from annual subscriptions to the data platform, priced per ingested terabyte, with professional services a small share. Usage-based pricing means revenue tracks customer data volume rather than seat count, a different growth lever for a product manager to pull.`;

const PROSE_TRAJECTORY = `## Trajectory and Financial Health

Revenue reached $340 million in FY24, up from $280 million in FY23. That headline conceals the more important fact: growth in FY24 was concentrated in one segment, with Intelligence up 64% while the remainder of the portfolio grew 4%. Northwind is really two businesses moving at different speeds.

Gross margin fell two points to 61% in FY24 as infrastructure costs rose. In March 2026 the company cut 500 roles, 340 of them from the Platform organization.

**Inference —** the Platform organization is being harvested rather than funded. Basis: investment and headcount are moving the same direction, with Intelligence growing 64% against 4% for the rest of the portfolio in FY24, and 340 of the 500 roles cut in March 2026 coming from Platform. A role owning any part of Platform inherits an efficiency mandate rather than a growth one.

**Open question —** whether Intelligence margins hold as the segment scales. Resolves with segment-level gross margin disclosure in the FY25 annual report.`;

export const CLEAN_PROSE = `${PROSE_FUNDAMENTALS}\n\n${PROSE_TRAJECTORY}`;

const wordCount = (s: string) => s.trim().split(/\s+/).length;

export const CLEAN_WORDS: Record<string, number> = {
  business_fundamentals: wordCount(PROSE_FUNDAMENTALS),
  trajectory_and_health: wordCount(PROSE_TRAJECTORY),
};

// ── Broken variants: exactly one defect each ─────────────────────────────

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function mutate(sectionId: SectionId, fn: (s: Section) => void): Report {
  const r = clone(CLEAN_REPORT);
  const section = r.sections.find((s) => s.id === sectionId);
  if (!section) throw new Error(`Fixture has no section '${sectionId}'.`);
  fn(section);
  return r;
}

function claimIn(section: Section, id: string): Claim {
  const c = section.claims.find((x) => x.id === id);
  if (!c) throw new Error(`Fixture has no claim '${id}'.`);
  return c;
}

/** A quote that does not occur in the chunk it cites. */
export const broken_fabricatedQuote = () =>
  mutate("trajectory_and_health", (s) => {
    claimIn(s, "th1").evidence[0].quote = "revenue of $890 million, a record year";
  });

/** A citation to a chunk that does not exist. */
export const broken_missingChunk = () =>
  mutate("trajectory_and_health", (s) => {
    claimIn(s, "th1").evidence[0].chunkId = "chunk_does_not_exist";
  });

/** An inference labelled as a fact. */
export const broken_mislabelledInference = () =>
  mutate("business_fundamentals", (s) => {
    claimIn(s, "bf2").statement =
      "The headcount figure suggests the company is prioritising margin over growth.";
  });

/** Required coverage element BF3 (business model) absent. */
export const broken_missingCoverage = () =>
  mutate("business_fundamentals", (s) => {
    s.claims = s.claims.filter(
      (c) => c.factType !== "product" && c.factType !== "pricing",
    );
  });

/** Claims confident despite thin coverage. */
export const broken_overconfidentThinCoverage = () =>
  mutate("trajectory_and_health", (s) => {
    s.coverage.sufficiency = "thin";
  });

/** Same fact stated in full by two sections. */
export const broken_duplicateCanonical = (): Report => {
  const r = clone(CLEAN_REPORT);
  const source = r.sections.find((s) => s.id === "trajectory_and_health")!;
  const duplicated = clone(claimIn(source, "th3"));
  duplicated.id = "sw1";

  r.sections.push({
    id: "company_swot",
    title: "Company SWOT",
    summary: "Concentration in one segment is the defining risk.",
    claims: [duplicated],
    coverage: {
      questionsAsked: 3,
      questionsAnswered: 3,
      chunksRetrieved: 2,
      unresolvedQuestions: [],
      sufficiency: "partial",
    },
  });
  return r;
};

/** Repetition with no justification. */
export const broken_unjustifiedReinforce = (): Report => {
  const r = broken_duplicateCanonical();
  const swot = r.sections.find((s) => s.id === "company_swot")!;
  swot.claims[0].role = "reinforce";
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
