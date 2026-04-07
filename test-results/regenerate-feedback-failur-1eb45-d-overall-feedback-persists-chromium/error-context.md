# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: regenerate-feedback-failure.spec.ts >> Section and overall feedback persists
- Location: tests\regenerate-feedback-failure.spec.ts:22:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/deep-dive/new
Call log:
  - navigating to "http://localhost:3000/deep-dive/new", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Regeneration, feedback, and failure cases
  4  | 
  5  | test('Regenerate report does not leak old data', async ({ page }) => {
  6  |   // Sign in and create a deep dive
  7  |   // ... (reuse logic from previous tests)
  8  |   // Go to report, click regenerate, verify new content
  9  |   // (Pseudo-code, needs selectors from your UI)
  10 |   await page.goto('/deep-dive/new');
  11 |   await page.fill('input[placeholder="e.g., Anthropic"]', 'Stripe');
  12 |   await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Engineer');
  13 |   await page.click('button[type=submit]');
  14 |   await expect(page).toHaveURL(/deep-dive\//);
  15 |   const reportUrl = page.url();
  16 |   await page.click('button:has-text("Regenerate")');
  17 |   await expect(page).toHaveURL(reportUrl); // Should stay on same page
  18 |   // Wait for new content, check for no stale data
  19 |   await expect(page.locator('.report-section')).not.toContainText('Old content');
  20 | });
  21 | 
  22 | test('Section and overall feedback persists', async ({ page }) => {
  23 |   // Sign in and create a deep dive
  24 |   // ...
> 25 |   await page.goto('/deep-dive/new');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/deep-dive/new
  26 |   await page.fill('input[placeholder="e.g., Anthropic"]', 'Meta');
  27 |   await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Engineer');
  28 |   await page.click('button[type=submit]');
  29 |   await expect(page).toHaveURL(/deep-dive\//);
  30 |   // Submit section feedback
  31 |   await page.fill('textarea[placeholder*="section feedback"]', 'Section is clear');
  32 |   await page.click('button:has-text("Submit Feedback")');
  33 |   await expect(page.locator('.feedback-success')).toBeVisible();
  34 |   // Submit overall feedback
  35 |   await page.fill('textarea[placeholder*="overall feedback"]', 'Great report');
  36 |   await page.click('button:has-text("Submit Feedback")');
  37 |   await expect(page.locator('.feedback-success')).toBeVisible();
  38 | });
  39 | 
  40 | test.describe('Failure cases', () => {
  41 |   test('Bad URL', async ({ request }) => {
  42 |     const res = await request.post('/api/deep-dive/extract-jd', { data: { url: 'not-a-url' } });
  43 |     expect(res.status()).toBe(400);
  44 |   });
  45 |   test('Empty extraction', async ({ request }) => {
  46 |     const res = await request.post('/api/deep-dive/extract-jd', { data: { url: 'https://example.com/empty' } });
  47 |     expect(res.status()).toBe(422);
  48 |   });
  49 |   test('Weak sources', async ({ request }) => {
  50 |     const res = await request.post('/api/deep-dive/extract-jd', { data: { url: 'https://example.com/weak' } });
  51 |     expect([200, 422]).toContain(res.status());
  52 |   });
  53 |   test('Signed-out access', async ({ page }) => {
  54 |     await page.goto('/deep-dive/new');
  55 |     // Should redirect to auth or show error
  56 |     await expect(page).toHaveURL(/auth|login/);
  57 |   });
  58 |   test('Expired session', async ({ page }) => {
  59 |     // Simulate expired session (implementation depends on your auth)
  60 |     // For now, just clear cookies
  61 |     await page.context().clearCookies();
  62 |     await page.goto('/deep-dive/new');
  63 |     await expect(page).toHaveURL(/auth|login/);
  64 |   });
  65 | });
  66 | 
```