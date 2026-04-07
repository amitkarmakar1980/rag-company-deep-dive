# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: jd-and-dive.spec.ts >> Full Deep Dive Generation >> Generate deep dive for Meta
- Location: tests\jd-and-dive.spec.ts:19:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/deep-dive/new
Call log:
  - navigating to "http://localhost:3000/deep-dive/new", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { JD_URLS, COMPANIES } from './test-utils';
  3  | 
  4  | test.describe('JD Extraction', () => {
  5  |   for (const [label, url] of Object.entries(JD_URLS)) {
  6  |     test(`Extract JD from ${label} page`, async ({ request }) => {
  7  |       const res = await request.post('/api/deep-dive/extract-jd', {
  8  |         data: { url },
  9  |       });
  10 |       expect(res.ok()).toBeTruthy();
  11 |       const data = await res.json();
  12 |       expect(data.companyName || data.roleTitle || data.jobDescription).toBeTruthy();
  13 |     });
  14 |   }
  15 | });
  16 | 
  17 | test.describe('Full Deep Dive Generation', () => {
  18 |   for (const company of COMPANIES) {
  19 |     test(`Generate deep dive for ${company.name}`, async ({ page }) => {
  20 |       // Assume user is already signed in for this test
> 21 |       await page.goto('/deep-dive/new');
     |                  ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/deep-dive/new
  22 |       await page.fill('input[placeholder="e.g., Anthropic"]', company.name);
  23 |       await page.fill('input[placeholder="e.g., Senior Product Manager"]', company.role);
  24 |       await page.click('button[type=submit]');
  25 |       await expect(page).toHaveURL(/deep-dive\//);
  26 |       await expect(page.locator('h1')).toContainText(company.name);
  27 |     });
  28 |   }
  29 | });
  30 | 
```