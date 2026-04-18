import { test, expect } from '@playwright/test';
import { randomTestEmail, signInSeededUser } from './support/testAccounts';

// Test 1: Sign up User A, create deep dive, verify in history
// Test 2: Sign up User B, confirm cannot access User A's report
// Test 3: JD extraction on 5 job pages
// Test 4: Run 5 full deep dives
// Test 5: Regenerate report, confirm no stale data
// Test 6: Submit feedback, verify persistence
// Test 7: Force failure cases

test.describe('Alpha Acceptance Suite', () => {
  test.setTimeout(300_000);

  let userA = { email: randomTestEmail('alpha-user-a'), password: 'TestPass123!' };
  let userB = { email: randomTestEmail('alpha-user-b'), password: 'TestPass123!' };
  let userAReportId: string;

  test('Sign up User A, create deep dive, verify in history', async ({ page }) => {
    await signInSeededUser(page, userA.email, userA.password);
    await expect(page).toHaveURL(/deep-dive/);
    // Create deep dive
    await page.goto('/deep-dive/new');
    await page.fill('input[placeholder="e.g., Anthropic"]', 'Microsoft');
    await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Software Engineer');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\/deep-dive\/[0-9a-f-]{36}$/i);
    userAReportId = new URL(page.url()).pathname.split('/').pop()!;

    await expect
      .poll(
        async () => {
          const response = await page.request.get(`/api/deep-dive/status?id=${userAReportId}`);
          const data = await response.json();
          return data.status;
        },
        {
          timeout: 240_000,
          intervals: [1_000, 2_000, 5_000],
        }
      )
      .toBe('completed');

    const statusResponse = await page.request.get(`/api/deep-dive/status?id=${userAReportId}`);
    const statusJson = await statusResponse.json();
    const persistedReportId = statusJson.report?.id;
    expect(persistedReportId).toBeTruthy();

    const reportResponse = await page.request.get(`/api/report/${persistedReportId}`);
    expect(reportResponse.ok()).toBeTruthy();
    const reportJson = await reportResponse.json();
    expect(reportJson.reportFormat).toBe('premium_v2');
    expect(reportJson.reportFamily).toBe('premium');

    // Verify in history
    await page.goto('/history');
    await expect(page.locator(`a[href*="${userAReportId}"]`)).toBeVisible();
  });

  test('Sign up User B, confirm cannot access User A’s report', async ({ page }) => {
    await signInSeededUser(page, userB.email, userB.password);
    await expect(page).toHaveURL(/deep-dive/);
    // Try to access User A's report
    await page.goto(`/deep-dive/${userAReportId}`);
    await expect(page.locator('body')).toContainText(/not authorized|not found|forbidden/i);
  });

  // Additional tests for JD extraction, deep dives, regeneration, feedback, and failures would follow...
});
