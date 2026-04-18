import test from "node:test";
import assert from "node:assert/strict";
import { buildReportCitations, getCitationEvidenceTier, isFallbackThirdPartyCitation } from "../lib/report/citationMetadata.ts";

test("company-host custom urls are treated as primary evidence", () => {
  assert.equal(
    getCitationEvidenceTier({
      sourceType: "custom_url",
      sourceUrl: "https://www.uber.com/us/en/newsroom/ubers-new-safety-toolkit/",
      companyUrl: "https://www.uber.com",
    }),
    "primary"
  );
});

test("non-company custom urls are labeled as fallback third-party evidence", () => {
  const citations = buildReportCitations(
    [
      {
        source_id: "source-1",
        source_url: "https://www.wbtv.com/2023/03/07/new-safety-feature-how-record-audio-during-an-uber-ride/",
        source_title: "New safety feature: How to record audio during an Uber ride",
        source_type: "custom_url",
      },
    ],
    "https://www.uber.com"
  );

  assert.equal(citations[0]?.evidence_tier, "fallback_third_party");
  assert.equal(citations[0]?.evidence_label, "Fallback third-party");
  assert.equal(isFallbackThirdPartyCitation(citations[0]), true);
});