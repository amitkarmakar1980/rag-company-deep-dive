import { test, expect } from '@playwright/test';
import { JD_URLS, COMPANIES } from './test-utils';

test.describe('JD Extraction', () => {
  for (const [label, url] of Object.entries(JD_URLS)) {
    test(`Extract JD from ${label} page`, async ({ request }) => {
      const res = await request.post('/api/deep-dive/extract-jd', {
        data: { url },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.companyName || data.roleTitle || data.jobDescription).toBeTruthy();
    });
  }
});

test.describe('Full Deep Dive Generation', () => {
  for (const company of COMPANIES) {
    test(`Generate deep dive for ${company.name}`, async ({ page }) => {
      // Assume user is already signed in for this test
      await page.goto('/deep-dive/new');
      await page.fill('input[placeholder="e.g., Anthropic"]', company.name);
      await page.fill('input[placeholder="e.g., Senior Product Manager"]', company.role);
      await page.click('button[type=submit]');
      await expect(page).toHaveURL(/deep-dive\//);
      await expect(page.locator('h1')).toContainText(company.name);
    });
  }
});
