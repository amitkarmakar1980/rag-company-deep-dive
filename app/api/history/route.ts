import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function GET(_req: NextRequest) {
  try {
    const {
      data: { session },
    } = await supabaseAdmin.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("deep_dive_requests")
      .select(
        `
        id:id,
        role_title,
        created_at,
        company_id:company_id,
        companies(name),
        reports(recommendation)
      `
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json(
      data?.map((item: any) => ({
        requestId: item.id,
        company: item.companies || { name: "Unknown" },
        roleTitle: item.role_title,
        createdAt: item.created_at,
        report: item.reports?.[0] || null,
      })) || []
    );
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
