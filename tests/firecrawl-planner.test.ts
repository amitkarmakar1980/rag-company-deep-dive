import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRagSourceStrategy,
  buildPlannerCandidatePool,
  extractFirstPartyCandidatesFromHomepage,
  extractSearchResultLinks,
  getDomainSpecificSourceFallbackUrls,
  isFirecrawlQuotaError,
  isSearchResultsUrl,
  resetFirecrawlBypassForTest,
  resolveCanonicalSourceUrl,
} from "../lib/ingestion/firecrawl.ts";

test.afterEach(() => {
  resetFirecrawlBypassForTest();
});

test("planner candidate pool keeps high-confidence official pages and drops speculative guessed paths", () => {
  const candidates = buildPlannerCandidatePool(
    "Microsoft",
    "Solutions Architect",
    "https://www.microsoft.com/"
  );

  const urls = new Set(candidates.map((candidate) => candidate.url));

  assert.ok(urls.has("https://www.microsoft.com/"));
  assert.ok(urls.has("https://www.microsoft.com/careers"));
  assert.ok(urls.has("https://www.microsoft.com/investors"));
  assert.ok(urls.has("https://www.microsoft.com/press"));

  assert.ok(!urls.has("https://microsoft.com/careers/solutions-architect"));
  assert.ok(!urls.has("https://microsoft.com/investor-relations"));
  assert.ok(!urls.has("https://microsoft.com/engineering"));
  assert.ok(!urls.has("https://microsoft.com/newsroom"));
});

test("planner candidate pool includes generic strategy-search seeds for deeper company analysis", () => {
  const candidates = buildPlannerCandidatePool(
    "Uber",
    "Lead Product Manager, In-App Recording (Safety)",
    "https://www.uber.com/"
  );

  const urls = new Set(candidates.map((candidate) => candidate.url));

  assert.ok([...urls].some((url) => /investor relations annual report earnings shareholder letter/i.test(decodeURIComponent(url))));
  assert.ok([...urls].some((url) => /site:sec\.gov uber 10-k annual report/i.test(decodeURIComponent(url))));
  assert.ok([...urls].some((url) => /uber leadership interview podcast keynote strategy/i.test(decodeURIComponent(url))));
  assert.ok([...urls].some((url) => /uber culture values operating principles/i.test(decodeURIComponent(url))));
  assert.ok([...urls].some((url) => /uber strategy analysis stratechery reuters/i.test(decodeURIComponent(url))));
  assert.ok([...urls].some((url) => /uber competitors alternatives market share gartner forrester/i.test(decodeURIComponent(url))));
  assert.ok([...urls].some((url) => /uber industry report market size growth rate.*analyst|uber industry report.*customer segments.*analyst/i.test(decodeURIComponent(url))));
});

test("rag source strategy prioritizes investor, culture, and leadership evidence for uber", () => {
  const candidatePool = buildPlannerCandidatePool(
    "Uber",
    "Lead Product Manager, In-App Recording (Safety)",
    "https://www.uber.com/"
  );

  const strategy = buildRagSourceStrategy({
    companyName: "Uber",
    roleTitle: "Lead Product Manager, In-App Recording (Safety)",
    companyUrl: "https://www.uber.com/",
    jobDescription: "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience.",
    candidatePool,
  });

  assert.ok(strategy.requiredSourceClasses.includes("investor_materials"));
  assert.ok(strategy.requiredSourceClasses.includes("leadership_strategy"));
  assert.ok(strategy.requiredSourceClasses.includes("competitor_positioning"));
  assert.ok(strategy.recommendedSources.some((candidate) => /uber leadership interview podcast keynote strategy/i.test(decodeURIComponent(candidate.url)) || candidate.url === "https://www.uber.com/investors"));
  assert.ok(strategy.recommendedSources.some((candidate) => /site:sec\.gov uber 10-k annual report/i.test(decodeURIComponent(candidate.url)) || /investor relations annual report earnings shareholder letter/i.test(decodeURIComponent(candidate.url))));
  assert.ok(strategy.recommendedSources.some((candidate) => /uber competitors alternatives market share gartner forrester/i.test(decodeURIComponent(candidate.url)) || /competitive landscape search/i.test(candidate.label)));
  assert.ok(strategy.recommendedSources.some((candidate) => /uber culture values operating principles/i.test(decodeURIComponent(candidate.url)) || /glassdoor interview culture employee reviews/i.test(decodeURIComponent(candidate.url))));
  assert.ok(strategy.notes.some((note) => /competitor, analyst, and market-structure evidence/i.test(note)));
  assert.ok(strategy.notes.some((note) => /Build the source strategy before synthesis/i.test(note)));
});

test("homepage discovery extracts relevant first-party links instead of relying only on guessed paths", () => {
  const candidates = extractFirstPartyCandidatesFromHomepage({
    companyUrl: "https://www.uber.com/",
    content: `
      <html>
        <body>
          <a href="/us/en/about/investors/">Investors</a>
          <a href="/us/en/newsroom/">Newsroom</a>
          <a href="/us/en/careers/list/">Careers</a>
          <a href="/us/en/safety/">Safety</a>
          <a href="https://www.linkedin.com/company/uber/">LinkedIn</a>
        </body>
      </html>
    `,
  });

  const urls = new Set(candidates.map((candidate) => candidate.url));

  assert.ok(urls.has("https://www.uber.com/us/en/about/investors/"));
  assert.ok(urls.has("https://www.uber.com/us/en/newsroom/"));
  assert.ok(urls.has("https://www.uber.com/us/en/careers/list/"));
  assert.ok(urls.has("https://www.uber.com/us/en/safety/"));
  assert.ok(!urls.has("https://www.linkedin.com/company/uber/"));
});

test("search-result extraction resolves underlying result links instead of keeping search pages", () => {
  const links = extractSearchResultLinks({
    searchUrl: "https://www.google.com/search?q=uber+investor+relations",
    content: `
      <html>
        <body>
          <a href="/url?q=https%3A%2F%2Finvestor.uber.com%2F&sa=U&ved=0">Investor Relations</a>
          <a href="/url?q=https%3A%2F%2Fwww.reuters.com%2Fmarkets%2Fcompanies%2FUBER.N%2F&sa=U&ved=0">Reuters</a>
          <a href="https://lh3.googleusercontent.com/a-/AOh14Gh123=w24-h24">Avatar</a>
          <a href="https://fonts.googleapis.com/css?family=Google+Sans">Font CSS</a>
          <a href="https://support.google.com/websearch/answer/">Support</a>
        </body>
      </html>
    `,
  });

  assert.deepEqual(links, [
    "https://investor.uber.com/",
    "https://www.reuters.com/markets/companies/UBER.N/",
  ]);
});

test("search-result detection distinguishes real results pages from article pages", () => {
  assert.equal(isSearchResultsUrl("https://www.google.com/search?q=uber+leadership"), true);
  assert.equal(isSearchResultsUrl("https://news.google.com/search?q=uber"), true);
  assert.equal(isSearchResultsUrl("https://news.google.com/articles/CBMiX2h0dHBzOi8vd3d3LnJlYXR1ZXJzLmNvbS8") , false);
  assert.equal(isSearchResultsUrl("https://www.uber.com/us/en/about/"), false);
});

test("domain-specific fallbacks provide accessible Uber alternatives for blocked investor and job pages", () => {
  assert.deepEqual(getDomainSpecificSourceFallbackUrls("https://jobs.uber.com/en/"), [
    "https://www.uber.com/us/en/careers/list/",
    "https://www.uber.com/us/en/careers/",
    "https://www.uber.com/global/en/careers/",
  ]);

  assert.deepEqual(getDomainSpecificSourceFallbackUrls("https://investor.uber.com/"), [
    "https://www.uber.com/us/en/about/investors/",
    "https://www.uber.com/newsroom/",
    "https://www.uber.com/us/en/about/",
  ]);

  assert.deepEqual(getDomainSpecificSourceFallbackUrls("https://www.uber.com/us/en/careers/list/"), [
    "https://www.uber.com/us/en/careers/list/",
    "https://www.uber.com/us/en/careers/",
    "https://www.uber.com/global/en/careers/",
  ]);
});

test("domain-specific fallbacks do not leak Uber URLs into other companies' careers or investor pages", () => {
  assert.deepEqual(
    getDomainSpecificSourceFallbackUrls("https://jobs.ea.com/en_US/careers/JobDetail/Head-of-Product-Development/210124"),
    []
  );

  assert.deepEqual(
    getDomainSpecificSourceFallbackUrls("https://www.microsoft.com/en-us/Investor"),
    []
  );
});

test("domain-specific fallbacks provide intent-preserving alternatives for blocked Crunchbase, G2, and Glassdoor pages", () => {
  assert.deepEqual(getDomainSpecificSourceFallbackUrls("https://www.crunchbase.com/textsearch?q=Uber"), [
    "https://www.google.com/search?q=Uber%20funding%20valuation%20acquisition%20revenue%20strategy",
    "https://finance.yahoo.com/lookup?s=Uber",
    "https://www.reuters.com/site-search/?query=Uber",
  ]);

  assert.deepEqual(getDomainSpecificSourceFallbackUrls("https://www.g2.com/search?query=Uber"), [
    "https://www.google.com/search?q=Uber%20reviews%20alternatives%20pricing",
    "https://www.capterra.com/search/?query=Uber",
    "https://www.google.com/search?q=Uber%20product%20offerings%20customer%20reviews",
  ]);

  assert.deepEqual(getDomainSpecificSourceFallbackUrls("https://www.glassdoor.com/Search/results.htm?keyword=Uber"), [
    "https://www.google.com/search?q=Uber%20employee%20reviews%20culture%20management",
    "https://www.google.com/search?q=Uber%20interview%20experience%20culture",
    "https://www.google.com/search?q=Uber%20company%20culture%20leadership%20employees",
  ]);
});

test("canonical source resolution leaves non-wrapper URLs untouched", async () => {
  const resolved = await resolveCanonicalSourceUrl("https://www.uber.com/newsroom/");
  assert.equal(resolved, "https://www.uber.com/newsroom/");
});

test("firecrawl quota detection recognizes payment-required responses and leaves unrelated errors alone", () => {
  assert.equal(isFirecrawlQuotaError({ response: { status: 402 } }), true);
  assert.equal(isFirecrawlQuotaError(new Error("Request failed with status code 402")), true);
  assert.equal(isFirecrawlQuotaError({ response: { status: 403 } }), false);
  assert.equal(isFirecrawlQuotaError(new Error("socket hang up")), false);
});