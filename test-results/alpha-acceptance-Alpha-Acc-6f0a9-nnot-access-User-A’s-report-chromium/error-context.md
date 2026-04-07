# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: alpha-acceptance.spec.ts >> Alpha Acceptance Suite >> Sign up User B, confirm cannot access User A’s report
- Location: tests\alpha-acceptance.spec.ts:40:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/auth
Call log:
  - navigating to "http://localhost:3000/auth", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Utility to generate random emails for isolation
  4  | function randomEmail() {
  5  |   return `user_${Math.random().toString(36).substring(2, 10)}@example.com`;
  6  | }
  7  | 
  8  | // Test 1: Sign up User A, create deep dive, verify in history
  9  | // Test 2: Sign up User B, confirm cannot access User A's report
  10 | // Test 3: JD extraction on 5 job pages
  11 | // Test 4: Run 5 full deep dives
  12 | // Test 5: Regenerate report, confirm no stale data
  13 | // Test 6: Submit feedback, verify persistence
  14 | // Test 7: Force failure cases
  15 | 
  16 | test.describe('Alpha Acceptance Suite', () => {
  17 |   let userA = { email: randomEmail(), password: 'TestPass123!' };
  18 |   let userB = { email: randomEmail(), password: 'TestPass123!' };
  19 |   let userAReportId: string;
  20 | 
  21 |   test('Sign up User A, create deep dive, verify in history', async ({ page }) => {
  22 |     // Sign up User A
  23 |     await page.goto('/auth');
  24 |     await page.fill('input[type=email]', userA.email);
  25 |     await page.fill('input[type=password]', userA.password);
  26 |     await page.click('button[type=submit]');
  27 |     await expect(page).toHaveURL(/deep-dive/);
  28 |     // Create deep dive
  29 |     await page.goto('/deep-dive/new');
  30 |     await page.fill('input[placeholder="e.g., Anthropic"]', 'Microsoft');
  31 |     await page.fill('input[placeholder="e.g., Senior Product Manager"]', 'Software Engineer');
  32 |     await page.click('button[type=submit]');
  33 |     await expect(page).toHaveURL(/deep-dive\//);
  34 |     userAReportId = page.url().split('/').pop()!;
  35 |     // Verify in history
  36 |     await page.goto('/history');
  37 |     await expect(page.locator(`a[href*="${userAReportId}"]`)).toBeVisible();
  38 |   });
  39 | 
  40 |   test('Sign up User B, confirm cannot access User A’s report', async ({ page }) => {
  41 |     // Sign up User B
> 42 |     await page.goto('/auth');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/auth
  43 |     await page.fill('input[type=email]', userB.email);
  44 |     await page.fill('input[type=password]', userB.password);
  45 |     await page.click('button[type=submit]');
  46 |     await expect(page).toHaveURL(/deep-dive/);
  47 |     // Try to access User A's report
  48 |     await page.goto(`/deep-dive/${userAReportId}`);
  49 |     await expect(page.locator('body')).toContainText(/not authorized|not found|forbidden/i);
  50 |   });
  51 | 
  52 |   // Additional tests for JD extraction, deep dives, regeneration, feedback, and failures would follow...
  53 | });
  54 | 
```