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

type AuthProfile = {
  name: string;
  email: string | null;
};

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
        report_sections(id),
        deep_dive_requests(
          *,
          companies(name),
          candidate_overlays(id, status)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const userIds: string[] = Array.from(
      new Set(
        (data ?? [])
          .map((report: any) => report.deep_dive_requests?.user_id)
          .filter((userId: string | null | undefined): userId is string => !!userId)
      )
    );

    const authProfiles = new Map<string, AuthProfile>();
    if (userIds.length > 0) {
      const profileEntries: ReadonlyArray<readonly [string, AuthProfile | null]> = await Promise.all(
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
      const overlays: any[] = Array.isArray(req?.candidate_overlays) ? req.candidate_overlays : [];
      const sections: any[] = Array.isArray(r.report_sections) ? r.report_sections : [];
      const personalizationStatus = overlays.some((overlay) => overlay?.status === "completed")
        ? "completed"
        : overlays.some((overlay) => overlay?.status === "generating" || overlay?.status === "pending")
          ? "in_progress"
          : overlays.some((overlay) => overlay?.status === "failed")
            ? "failed"
            : "none";
      const requestStatus = req?.status ?? null;
      const sectionCount = sections.length;

      return {
        report_id: r.id,
        request_id: req?.id ?? null,
        created_at: r.created_at,
        activity_at: requestStatus === "completed"
          ? (req?.updated_at ?? r.created_at)
          : r.created_at,
        company: req?.companies?.name ?? "Unknown",
        role_title: req?.role_title ?? "Unknown",
        recommendation: r.recommendation,
        user_id: req?.user_id ?? null,
        user_name: profile?.name ?? fallbackUserName(profile?.email ?? null),
        user_email: profile?.email ?? null,
        request_status: requestStatus,
        section_count: sectionCount,
        job_successful: requestStatus === "completed" && sectionCount > 0,
        personalization_status: personalizationStatus,
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
