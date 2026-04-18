import { test, expect } from '@playwright/test';
import { JD_URLS, COMPANIES } from './test-utils';
import { randomTestEmail, signInSeededUser } from './support/testAccounts';

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
  test.setTimeout(420_000);

  for (const company of COMPANIES) {
    test(`Generate deep dive for ${company.name}`, async ({ page }) => {
      const email = randomTestEmail(`jd-dive-${company.name}`);
      const password = 'TestPass123!';
      await signInSeededUser(page, email, password);

      await page.goto('/deep-dive/new');
      await page.fill('input[placeholder="e.g., Anthropic"]', company.name);
      await page.fill('input[placeholder="e.g., Senior Product Manager"]', company.role);
      await page.click('button[type=submit]');

      await page.waitForURL((url) => {
        const pathname = url.pathname;
        return /^\/deep-dive\/[^/?#]+$/.test(pathname) && pathname !== '/deep-dive/new';
      });

      const requestId = page.url().split('/').pop();
      expect(requestId).toBeTruthy();
      expect(requestId).not.toBe('new');

      const statusResponse = await page.request.get(`/api/deep-dive/status?id=${requestId}`);
      expect(statusResponse.ok()).toBeTruthy();
      const statusJson = await statusResponse.json();
      expect([
        'pending',
        'fetching_sources',
        'indexing',
        'generating_report',
        'generating_deep_analysis',
        'generating_interview_layer',
        'completed',
      ]).toContain(statusJson.status);

      await expect(page.locator('body')).toContainText(/starting analysis|fetching sources|generating|interview intelligence report/i);
    });
  }
});
