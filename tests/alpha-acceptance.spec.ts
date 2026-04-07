import { test, expect } from '@playwright/test';

// Utility to generate random emails for isolation
function randomEmail() {
  return `user_${Math.random().toString(36).substring(2, 10)}@example.com`;
}

// Test 1: Sign up User A, create deep dive, verify in history
// Test 2: Sign up User B, confirm cannot access User A's report
// Test 3: JD extraction on 5 job pages
// Test 4: Run 5 full deep dives
// Test 5: Regenerate report, confirm no stale data
// Test 6: Submit feedback, verify persistence
// Test 7: Force failure cases

test.describe('Alpha Acceptance Suite', () => {
  let userA = { email: randomEmail(), password: 'TestPass123!' };
  let userB = { email: randomEmail(), password: 'TestPass123!' };
  let userAReportId: string;

  test('Sign up User A, create deep dive, verify in history', async ({ page }) => {
    // Sign up User A
    await page.goto('/auth');
    await page.fill('input[type=email]', userA.email);
    await page.fill('input[type=password]', userA.password);
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/deep-dive/);
    // Create deep dive
    await page.goto('/deep-dive/new');
    await page.fill('input[placeholder="e.g., Anthropic"]', 'Microsoft');
    await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Software Engineer');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/deep-dive\//);
    userAReportId = page.url().split('/').pop()!;
    // Verify in history
    await page.goto('/history');
    await expect(page.locator(`a[href*="${userAReportId}"]`)).toBeVisible();
  });

  test('Sign up User B, confirm cannot access User A’s report', async ({ page }) => {
    // Sign up User B
    await page.goto('/auth');
    await page.fill('input[type=email]', userB.email);
    await page.fill('input[type=password]', userB.password);
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/deep-dive/);
    // Try to access User A's report
    await page.goto(`/deep-dive/${userAReportId}`);
    await expect(page.locator('body')).toContainText(/not authorized|not found|forbidden/i);
  });

  // Additional tests for JD extraction, deep dives, regeneration, feedback, and failures would follow...
});
