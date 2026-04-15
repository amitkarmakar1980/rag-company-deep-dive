import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { isAdmin } from "@/lib/admin";

type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
};

type UserRequestRow = {
  user_id: string;
  created_at: string;
  status: string | null;
};

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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const { data: userRows, error: usersError, count } = await supabaseAdmin
      .from("users")
      .select("id, email, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (usersError) throw usersError;

    const userIds = (userRows ?? []).map((row: AdminUserRow) => row.id);

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

    const { data: requestRows, error: requestsError } = userIds.length
      ? await supabaseAdmin
          .from("deep_dive_requests")
          .select("user_id, created_at, status")
          .in("user_id", userIds)
      : { data: [], error: null };

    if (requestsError) throw requestsError;

    const requestsByUser = new Map<string, UserRequestRow[]>();
    for (const request of (requestRows ?? []) as UserRequestRow[]) {
      const existing = requestsByUser.get(request.user_id);
      if (existing) {
        existing.push(request);
      } else {
        requestsByUser.set(request.user_id, [request]);
      }
    }

    const users = ((userRows ?? []) as AdminUserRow[]).map((userRow) => {
      const requests = requestsByUser.get(userRow.id) ?? [];
      const profile = authProfiles.get(userRow.id);
      const lastActivity =
        requests.length > 0
          ? requests.reduce((latest: string, request) =>
              request.created_at > latest ? request.created_at : latest,
              requests[0].created_at
            )
          : null;
      const completedCount = requests.filter((request) => request.status === "completed").length;

      return {
        id: userRow.id,
        name: profile?.name ?? fallbackUserName(userRow.email),
        email: userRow.email,
        auth_email: profile?.email ?? userRow.email,
        created_at: userRow.created_at,
        last_activity: lastActivity,
        total_requests: requests.length,
        completed_reports: completedCount,
      };
    }).sort((a, b) => {
      const aDate = a.last_activity ?? a.created_at;
      const bDate = b.last_activity ?? b.created_at;
      return bDate > aDate ? 1 : -1;
    });

    return NextResponse.json({
      users,
      total: count ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
