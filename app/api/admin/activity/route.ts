import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { isAdmin } from "@/lib/admin";

function fallbackUserName(email: string | null | undefined) {
  if (!email) return "Unknown User";
  const localPart = email.split("@")[0] ?? "user";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getMetadataName(metadata: Record<string, unknown> | undefined, email: string | null | undefined) {
  const name =
    (typeof metadata?.name === "string" && metadata.name) ||
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.display_name === "string" && metadata.display_name);

  return name || fallbackUserName(email);
}

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

    const userIds = Array.from(
      new Set(
        (data ?? [])
          .map((report: any) => report.deep_dive_requests?.user_id)
          .filter((userId: string | null | undefined): userId is string => !!userId)
      )
    );

    const authProfiles = new Map<string, { name: string; email: string | null }>();
    if (userIds.length > 0) {
      const profileEntries = await Promise.all(
        userIds.map(async (userId) => {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (error || !data.user) {
            return [userId, null] as const;
          }

          return [
            userId,
            {
              name: getMetadataName(data.user.user_metadata, data.user.email),
              email: data.user.email ?? null,
            },
          ] as const;
        })
      );

      for (const [userId, profile] of profileEntries) {
        if (profile) {
          authProfiles.set(userId, profile);
        }
      }
    }

    const activities = (data ?? []).map((r: any) => {
      const req = r.deep_dive_requests;
      const profile = req?.user_id ? authProfiles.get(req.user_id) : null;
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
        user_name: profile?.name ?? fallbackUserName(profile?.email ?? null),
        user_email: profile?.email ?? null,
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
