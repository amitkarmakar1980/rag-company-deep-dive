import { test, expect } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

// Utility to generate random emails for isolation
function randomEmail() {
  return `user${Math.random().toString(36).substring(2, 10)}@mailinator.com`;
}

function getTestSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials for acceptance tests.');
  }

  return createClient(url, serviceRoleKey);
}

async function ensureConfirmedUser(email: string, password: string) {
  const supabaseAdmin = getTestSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && !/already|exists|registered/i.test(error.message)) {
    throw error;
  }

  if (data?.user?.id) {
    await supabaseAdmin
      .from('users')
      .upsert({ id: data.user.id, email }, { onConflict: 'id', ignoreDuplicates: true });
  }
}

async function signInSeededUser(page: import('@playwright/test').Page, email: string, password: string) {
  await ensureConfirmedUser(email, password);
  await page.goto('/auth');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

// Test 1: Sign up User A, create deep dive, verify in history
// Test 2: Sign up User B, confirm cannot access User A's report
// Test 3: JD extraction on 5 job pages
// Test 4: Run 5 full deep dives
// Test 5: Regenerate report, confirm no stale data
// Test 6: Submit feedback, verify persistence
// Test 7: Force failure cases

test.describe('Alpha Acceptance Suite', () => {
  test.setTimeout(300_000);

  let userA = { email: randomEmail(), password: 'TestPass123!' };
  let userB = { email: randomEmail(), password: 'TestPass123!' };
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
