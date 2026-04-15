import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { isAdmin } from "@/lib/admin";

async function getFirecrawlUsage(): Promise<{ credits_remaining: number | null; error?: string }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return { credits_remaining: null, error: "API key not configured" };
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { credits_remaining: null, error: `HTTP ${res.status}` };
    const json = await res.json();
    const data = json?.data ?? json;
    const remaining =
      data?.remainingCredits ??
      data?.creditsRemaining ??
      (data?.planCredits != null && data?.creditsUsed != null
        ? data.planCredits - data.creditsUsed
        : null) ??
      (data?.creditsLimit != null && data?.creditsUsed != null
        ? data.creditsLimit - data.creditsUsed
        : null);
    return { credits_remaining: remaining };
  } catch (e: any) {
    return { credits_remaining: null, error: e.message ?? "Request failed" };
  }
}

async function getOpenAITrackedUsage() {
  // OpenAI no longer exposes a simple balance endpoint for pay-as-you-go accounts.
  // We return DB-tracked spend as the authoritative source.
  const { data } = await supabaseAdmin
    .from("reports")
    .select("summary_json")
    .not("summary_json", "is", null);

  let totalSpend = 0;
  let totalTokens = 0;
  let reportCount = 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabaseAdmin
    .from("reports")
    .select("summary_json, created_at")
    .not("summary_json", "is", null)
    .gte("created_at", thirtyDaysAgo);

  let spend30d = 0;
  let tokens30d = 0;

  for (const row of data ?? []) {
    const usage = (row.summary_json as any)?.token_usage;
    if (usage) {
      totalSpend += usage.total_cost_usd ?? 0;
      totalTokens += usage.total_tokens ?? 0;
      reportCount++;
    }
  }
  for (const row of recent ?? []) {
    const usage = (row.summary_json as any)?.token_usage;
    if (usage) {
      spend30d += usage.total_cost_usd ?? 0;
      tokens30d += usage.total_tokens ?? 0;
    }
  }

  return {
    tracked_spend_usd_total: totalSpend,
    tracked_tokens_total: totalTokens,
    tracked_spend_usd_30d: spend30d,
    tracked_tokens_30d: tokens30d,
    report_count: reportCount,
  };
}

async function getSupabaseStats() {
  const [
    { count: users },
    { count: requests },
    { count: reports },
    { count: sources },
    { count: chunks },
  ] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("deep_dive_requests").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("reports").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("sources").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("chunks").select("*", { count: "exact", head: true }),
  ]);
  return {
    rows: {
      users: users ?? 0,
      requests: requests ?? 0,
      reports: reports ?? 0,
      sources: sources ?? 0,
      chunks: chunks ?? 0,
    },
    note: "Row counts only — billing data requires Supabase dashboard access",
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [firecrawl, openai, supabaseStats] = await Promise.all([
      getFirecrawlUsage(),
      getOpenAITrackedUsage(),
      getSupabaseStats(),
    ]);

    return NextResponse.json({ firecrawl, openai, supabase: supabaseStats });
  } catch (err) {
    console.error("[admin/usage]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
