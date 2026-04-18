import { expect, type Page } from '@playwright/test';
import { createClient, type User } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

export const TEST_EMAIL_DOMAIN = 'e2e.company-deep-dive.test';

const LEGACY_MAILINATOR_PATTERNS = [
  /^resumecreate[a-z0-9]{8}@mailinator\.com$/i,
  /^user[a-z0-9]{8}@mailinator\.com$/i,
];

type CleanupSummary = {
  authUsersDeleted: number;
  publicUsersDeleted: number;
  requestsDeleted: number;
  reportsDeleted: number;
  resumesDeleted: number;
  feedbackDeleted: number;
};

function getTestSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials for test-account management.');
  }

  return createClient(url, serviceRoleKey);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function isManagedTestEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.endsWith(`@${TEST_EMAIL_DOMAIN}`)) {
    return true;
  }

  return LEGACY_MAILINATOR_PATTERNS.some((pattern) => pattern.test(normalizedEmail));
}

function isManagedTestUser(user: User): boolean {
  if (isManagedTestEmail(user.email)) {
    return true;
  }

  return user.user_metadata?.testAccount === true && user.user_metadata?.testApp === 'company-deep-dive';
}

async function listManagedTestUsers() {
  const supabaseAdmin = getTestSupabaseAdmin();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const authUsers = data.users.filter(isManagedTestUser);
    users.push(...authUsers);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function deleteInChunks(
  values: string[],
  deleter: (chunk: string[]) => Promise<void>,
  chunkSize = 100
) {
  for (let index = 0; index < values.length; index += chunkSize) {
    await deleter(values.slice(index, index + chunkSize));
  }
}

export function randomTestEmail(prefix = 'playwright') {
  const normalizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${normalizedPrefix || 'playwright'}-${randomSuffix()}@${TEST_EMAIL_DOMAIN}`;
}

export async function ensureConfirmedUser(email: string, password: string) {
  const supabaseAdmin = getTestSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      testAccount: true,
      testSuite: 'playwright',
      testApp: 'company-deep-dive',
    },
  });

  if (error && !/already|exists|registered/i.test(error.message)) {
    throw error;
  }

  const userId = data?.user?.id ?? (await listManagedTestUsers()).find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!userId) {
    throw new Error(`Unable to resolve auth user id for test account ${email}.`);
  }

  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: true });

  if (upsertError) {
    throw upsertError;
  }

  return userId;
}

export async function signInSeededUser(page: Page, email: string, password: string) {
  await ensureConfirmedUser(email, password);
  await page.goto('/auth');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/deep-dive/);
}

export async function cleanupTestAccounts(): Promise<CleanupSummary> {
  const supabaseAdmin = getTestSupabaseAdmin();
  const testUsers = await listManagedTestUsers();
  const userIds = testUsers.map((user) => user.id);

  if (!userIds.length) {
    return {
      authUsersDeleted: 0,
      publicUsersDeleted: 0,
      requestsDeleted: 0,
      reportsDeleted: 0,
      resumesDeleted: 0,
      feedbackDeleted: 0,
    };
  }

  const { data: requestRows, error: requestError } = await supabaseAdmin
    .from('deep_dive_requests')
    .select('id')
    .in('user_id', userIds);

  if (requestError) {
    throw requestError;
  }

  const requestIds = (requestRows ?? []).map((row) => row.id as string);
  let reportIds: string[] = [];

  if (requestIds.length) {
    const { data: reportRows, error: reportLookupError } = await supabaseAdmin
      .from('reports')
      .select('id')
      .in('request_id', requestIds);

    if (reportLookupError) {
      throw reportLookupError;
    }

    reportIds = (reportRows ?? []).map((row) => row.id as string);
  }

  if (reportIds.length) {
    await deleteInChunks(reportIds, async (chunk) => {
      const { error } = await supabaseAdmin.from('feedback_events').delete().in('report_id', chunk);
      if (error) {
        throw error;
      }
    });

    await deleteInChunks(requestIds, async (chunk) => {
      const { error } = await supabaseAdmin.from('reports').delete().in('request_id', chunk);
      if (error) {
        throw error;
      }
    });
  }

  if (requestIds.length) {
    await deleteInChunks(requestIds, async (chunk) => {
      const { error } = await supabaseAdmin.from('candidate_overlays').delete().in('request_id', chunk);
      if (error) {
        throw error;
      }
    });

    await deleteInChunks(requestIds, async (chunk) => {
      const { error } = await supabaseAdmin.from('sources').delete().in('request_id', chunk);
      if (error) {
        throw error;
      }
    });

    await deleteInChunks(userIds, async (chunk) => {
      const { error } = await supabaseAdmin.from('deep_dive_requests').delete().in('user_id', chunk);
      if (error) {
        throw error;
      }
    });
  }

  await deleteInChunks(userIds, async (chunk) => {
    const { error } = await supabaseAdmin.from('candidate_resumes').delete().in('user_id', chunk);
    if (error) {
      throw error;
    }
  });

  await deleteInChunks(userIds, async (chunk) => {
    const { error } = await supabaseAdmin.from('users').delete().in('id', chunk);
    if (error) {
      throw error;
    }
  });

  for (const userId of userIds) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      throw error;
    }
  }

  return {
    authUsersDeleted: userIds.length,
    publicUsersDeleted: userIds.length,
    requestsDeleted: requestIds.length,
    reportsDeleted: reportIds.length,
    resumesDeleted: userIds.length,
    feedbackDeleted: reportIds.length,
  };
}