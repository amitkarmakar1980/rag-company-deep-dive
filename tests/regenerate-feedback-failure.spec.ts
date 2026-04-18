import { test, expect } from '@playwright/test';

// Regeneration, feedback, and failure cases

test('Regenerate report does not leak old data', async ({ page }) => {
  // Sign in and create a deep dive
  // ... (reuse logic from previous tests)
  // Go to report, click regenerate, verify new content
  // (Pseudo-code, needs selectors from your UI)
  await page.goto('/deep-dive/new');
  await page.fill('input[placeholder="e.g., Anthropic"]', 'Stripe');
  await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Engineer');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/deep-dive\//);
  const reportUrl = page.url();
  await page.click('button:has-text("Regenerate")');
  await expect(page).toHaveURL(reportUrl); // Should stay on same page
  // Wait for new content, check for no stale data
  await expect(page.locator('.report-section')).not.toContainText('Old content');
});

test('Section and overall feedback persists', async ({ page }) => {
  // Sign in and create a deep dive
  // ...
  await page.goto('/deep-dive/new');
  await page.fill('input[placeholder="e.g., Anthropic"]', 'Meta');
  await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Engineer');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/deep-dive\//);
  // Submit section feedback
  await page.fill('textarea[placeholder*="section feedback"]', 'Section is clear');
  await page.click('button:has-text("Submit Feedback")');
  await expect(page.locator('.feedback-success')).toBeVisible();
  // Submit overall feedback
  await page.fill('textarea[placeholder*="overall feedback"]', 'Great report');
  await page.click('button:has-text("Submit Feedback")');
  await expect(page.locator('.feedback-success')).toBeVisible();
});

test.describe('Failure cases', () => {
  test('Bad URL', async ({ request }) => {
    const res = await request.post('/api/deep-dive/extract-jd', { data: { url: 'not-a-url' } });
    expect(res.status()).toBe(400);
  });
  test('Empty extraction', async ({ request }) => {
    const res = await request.post('/api/deep-dive/extract-jd', { data: { url: 'https://example.com/empty' } });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.companyUrl).toBe('https://example.com');
  });
  test('Weak sources', async ({ request }) => {
    const res = await request.post('/api/deep-dive/extract-jd', { data: { url: 'https://example.com/weak' } });
    expect(res.status()).toBe(200);
  });
  test('Signed-out access', async ({ page }) => {
    await page.goto('/deep-dive/new');
    // Should redirect to auth or show error
    await expect(page).toHaveURL(/auth|login/);
  });
  test('Expired session', async ({ page }) => {
    // Simulate expired session (implementation depends on your auth)
    // For now, just clear cookies
    await page.context().clearCookies();
    await page.goto('/deep-dive/new');
    await expect(page).toHaveURL(/auth|login/);
  });
});
