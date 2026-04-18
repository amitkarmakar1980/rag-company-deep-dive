import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalJobDescription,
  extractJobPostingSchemaFromHtml,
  normalizeExtractedJobText,
  stripMarkdown,
} from "../lib/ingestion/firecrawlJobExtract.ts";

test("JobPosting schema extraction preserves structured job metadata and description", () => {
  const html = `
    <html>
      <body>
        <a href="/careers/apply/interstitial/158040">Apply Now</a>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Lead Product Manager, Mobility Marketplace",
            "department": "Product Management, Product",
            "employmentType": "FULL_TIME",
            "hiringOrganization": { "@type": "Organization", "name": "Uber" },
            "jobLocation": [
              { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": "New York", "addressRegion": "New York" } },
              { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": "Seattle", "addressRegion": "Washington" } }
            ],
            "description": "<p>About the Role</p><p>Lead the marketplace roadmap.</p><ul><li>Define KPIs</li><li>Partner cross-functionally</li></ul><p>Preferred Qualifications</p><p>Experience with machine learning.</p>"
          }
        </script>
      </body>
    </html>
  `;

  const result = extractJobPostingSchemaFromHtml(html, "https://www.uber.com/global/en/careers/list/158040/");

  assert.equal(result?.companyName, "Uber");
  assert.equal(result?.roleTitle, "Lead Product Manager, Mobility Marketplace");
  assert.equal(result?.department, "Product Management, Product");
  assert.equal(result?.employmentType, "FULL_TIME");
  assert.deepEqual(result?.locations, ["New York, New York", "Seattle, Washington"]);
  assert.equal(result?.applyUrl, "https://www.uber.com/careers/apply/interstitial/158040");
  assert.match(result?.descriptionText ?? "", /About the Role/);
  assert.match(result?.descriptionText ?? "", /Lead the marketplace roadmap\./);
  assert.match(result?.descriptionText ?? "", /• Define KPIs/);
  assert.match(result?.descriptionText ?? "", /Preferred Qualifications/);
  assert.match(result?.descriptionText ?? "", /Experience with machine learning\./);
});

test("Canonical job description keeps page-derived body text and prepends missing header metadata", () => {
  const description = buildCanonicalJobDescription({
    rawText: "About the Role\n\nLead the marketplace roadmap.\n\nPreferred Qualifications\n\nExperience with machine learning.",
    structuredPosting: {
      companyName: "Uber",
      roleTitle: "Lead Product Manager, Mobility Marketplace",
      department: "Product Management, Product",
      employmentType: "Full Time",
      locations: ["New York, New York", "Seattle, Washington", "San Francisco, California"],
      applyUrl: "https://www.uber.com/careers/apply/interstitial/158040",
      descriptionText: undefined,
    },
  });

  assert.match(description, /^Lead Product Manager, Mobility Marketplace/m);
  assert.match(description, /Product Management, Product/);
  assert.match(description, /New York, New York\s+\|\s+Seattle, Washington\s+\|\s+San Francisco, California/);
  assert.match(description, /Full Time/);
  assert.match(description, /Apply Now/);
  assert.match(description, /About the Role/);
  assert.match(description, /Preferred Qualifications/);
});

test("Markdown stripping preserves headings, bullets, and later salary paragraphs", () => {
  const markdown = `
# Lead Product Manager, Mobility Marketplace

Product Management, Product
New York, New York   |   Seattle, Washington
Full Time

## About the Role

As a Lead Product Manager for the Mobility Marketplace, you will spearhead product strategies.

## What the Candidate Will Do

- Develop the strategic product vision.
- Drive end-to-end product lifecycle management.

## Preferred Qualifications

- Experience with machine learning.

For New York, NY-based roles: The base salary range for this role is USD$216,000 per year - USD$240,000 per year.
  `;

  const result = normalizeExtractedJobText(stripMarkdown(markdown));

  assert.match(result, /^Lead Product Manager, Mobility Marketplace/m);
  assert.match(result, /About the Role/);
  assert.match(result, /• Develop the strategic product vision\./);
  assert.match(result, /Preferred Qualifications/);
  assert.match(result, /base salary range/i);
});