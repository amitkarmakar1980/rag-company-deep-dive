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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Get users with their last activity date and request count via subquery
    const { data, error, count } = await supabaseAdmin
      .from("users")
      .select(
        `
        id,
        email,
        created_at,
        deep_dive_requests(id, created_at, status)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const users = (data ?? []).map((u: any) => {
      const requests: any[] = u.deep_dive_requests ?? [];
      const lastActivity =
        requests.length > 0
          ? requests.reduce((latest: string, r: any) =>
              r.created_at > latest ? r.created_at : latest,
              requests[0].created_at
            )
          : null;
      const completedCount = requests.filter((r: any) => r.status === "completed").length;

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_activity: lastActivity,
        total_requests: requests.length,
        completed_reports: completedCount,
      };
    }).sort((a: any, b: any) => {
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
