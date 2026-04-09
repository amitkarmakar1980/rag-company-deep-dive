import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("deep_dive_requests")
      .select(`
        id,
        role_title,
        status,
        created_at,
        company_url,
        job_description,
        companies(name, website_url),
        reports(recommendation, candidate_fit_score, report_sections(section_key)),
        candidate_overlays(id, status)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((item: any) => ({
        requestId: item.id,
        company: item.companies || { name: "Unknown", website_url: null },
        roleTitle: item.role_title,
        status: item.status,
        createdAt: item.created_at,
        companyUrl: item.company_url || item.companies?.website_url || null,
        hasJobDescription: !!item.job_description,
        hasResume: (item.candidate_overlays ?? []).some(
          (o: any) => o.status === "completed" || o.status === "generating"
        ),
        report: item.reports?.[0]
          ? {
              recommendation: item.reports[0].recommendation,
              candidateFitScore: item.reports[0].candidate_fit_score ?? null,
              sectionKeys: (item.reports[0].report_sections ?? []).map((s: any) => s.section_key),
            }
          : null,
      }))
    );
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
