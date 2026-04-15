import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { isAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: totalRequests },
      { count: completedReports },
      { count: activeUsers30d },
      { data: spendData },
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("deep_dive_requests").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("reports").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("deep_dive_requests")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      supabaseAdmin
        .from("reports")
        .select("summary_json")
        .not("summary_json", "is", null),
    ]);

    // Sum tracked spend from all reports
    let totalSpendUsd = 0;
    let totalTokens = 0;
    for (const row of spendData ?? []) {
      const usage = (row.summary_json as any)?.token_usage;
      if (usage) {
        totalSpendUsd += usage.total_cost_usd ?? 0;
        totalTokens += usage.total_tokens ?? 0;
      }
    }

    return NextResponse.json({
      total_users: totalUsers ?? 0,
      total_requests: totalRequests ?? 0,
      completed_reports: completedReports ?? 0,
      active_users_30d: activeUsers30d ?? 0,
      total_spend_usd: totalSpendUsd,
      total_tokens: totalTokens,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
