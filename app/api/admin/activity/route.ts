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

    // Last 10 completed reports across all users, with cost and token data
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select(`
        id,
        created_at,
        recommendation,
        summary_json,
        deep_dive_requests(
          id,
          role_title,
          status,
          created_at,
          user_id,
          companies(name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const activities = (data ?? []).map((r: any) => {
      const req = r.deep_dive_requests;
      const usage = (r.summary_json as any)?.token_usage ?? null;
      const calls: any[] = usage?.calls ?? [];

      return {
        report_id: r.id,
        request_id: req?.id ?? null,
        created_at: r.created_at,
        company: req?.companies?.name ?? "Unknown",
        role_title: req?.role_title ?? "Unknown",
        recommendation: r.recommendation,
        user_id: req?.user_id ?? null,
        total_cost_usd: usage?.total_cost_usd ?? null,
        total_tokens: usage?.total_tokens ?? null,
        calls: calls.map((c: any) => ({
          model: c.model,
          purpose: c.purpose,
          input_tokens: c.input_tokens,
          output_tokens: c.output_tokens,
          reasoning_tokens: c.reasoning_tokens ?? null,
          estimated_cost_usd: c.estimated_cost_usd,
        })),
      };
    });

    return NextResponse.json({ activities });
  } catch (err) {
    console.error("[admin/activity]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
