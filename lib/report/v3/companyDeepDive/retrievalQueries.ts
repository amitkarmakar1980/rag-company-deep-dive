export const COMPANY_DEEP_DIVE_RETRIEVAL_QUERIES: Record<string, string[]> = {
  company_snapshot: [
    "{company} company overview business model leadership products",
    "{company} annual report investor relations business segments",
    "{company} about mission values leadership founding history",
  ],

  business_model: [
    "{company} revenue model business model monetization pricing",
    "{company} 10-K revenue segments customers annual report",
    "{company} earnings call revenue growth margins business lines",
  ],

  strategy: [
    "{company} strategy AI platform product roadmap strategic priorities",
    "{company} CEO strategic priorities earnings call shareholder letter",
    "{company} recent product announcements AI investment transformation",
  ],

  competition: [
    "{company} competitors market share competitive landscape industry",
    "{company} vs competitors product strategy differentiation moat",
    "{company} industry analysis competitive threats market position",
  ],

  risks: [
    "{company} risks 10-K risk factors challenges headwinds",
    "{company} regulatory risk competitive risk execution risk financial",
    "{company} layoffs reorg leadership changes restructuring",
  ],

  culture_sentiment: [
    "{company} Glassdoor employee reviews culture work environment",
    "{company} Blind employee sentiment PM culture management",
    "{company} Levels.fyi compensation culture interview experience",
  ],

  customer_sentiment: [
    "{company} customer reviews G2 Gartner Reddit product feedback",
    "{company} customer complaints product reviews satisfaction",
    "{company} developer reviews API platform ecosystem partners",
  ],

  recent_news: [
    "{company} latest news acquisition layoffs AI product launch 2024 2025",
    "{company} earnings latest quarter strategy announcement",
    "{company} leadership change product announcement press release",
  ],
};

export function buildCompanyRetrievalQueries(companyName: string): string[] {
  const all: string[] = [];
  for (const queries of Object.values(COMPANY_DEEP_DIVE_RETRIEVAL_QUERIES)) {
    for (const q of queries) {
      all.push(q.replace(/\{company\}/g, companyName));
    }
  }
  return all;
}
