import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data, error }, { data: statsRows, error: statsError }] = await Promise.all([
      supabaseAdmin
        .from("deep_dive_requests")
        .select(`
          *,
          companies(name, website_url),
          reports(created_at, recommendation, candidate_fit_score, report_sections(section_key)),
          candidate_overlays(id, status)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("deep_dive_requests")
        .select(`
          id,
          reports(summary_json),
          sources(url)
        `)
        .eq("user_id", user.id),
    ]);

    if (error) throw error;
    if (statsError) throw statsError;

    const websiteHosts = new Set<string>();
    let totalReports = 0;
    let aiQueries = 0;

    for (const row of statsRows ?? []) {
      const report = row.reports?.[0];
      if (report) {
        totalReports += 1;
        const calls = report.summary_json?.token_usage?.calls;
        if (Array.isArray(calls)) {
          aiQueries += calls.length;
        }
      }

      for (const source of row.sources ?? []) {
        const host = getHostname(source.url);
        if (host) {
          websiteHosts.add(host);
        }
      }
    }

    return NextResponse.json(
      {
        items: (data ?? []).map((item: any) => ({
          requestId: item.id,
          company: item.companies || { name: "Unknown", website_url: null },
          roleTitle: item.role_title,
          status: item.status,
          createdAt: item.created_at,
          completedAt: item.status === "completed"
            ? (item.updated_at ?? item.reports?.[0]?.created_at ?? null)
            : null,
          companyUrl: item.company_url || item.companies?.website_url || null,
          hasJobDescription: !!item.job_description,
          hasResume: (item.candidate_overlays ?? []).some(
            (o: any) => o.status === "completed" || o.status === "generating"
          ),
          report: item.reports?.[0]
            ? {
                createdAt: item.reports[0].created_at ?? null,
                recommendation: item.reports[0].recommendation,
                candidateFitScore: item.reports[0].candidate_fit_score ?? null,
                sectionKeys: (item.reports[0].report_sections ?? []).map((s: any) => s.section_key),
              }
            : null,
        })),
        stats: {
          totalReports,
          websitesSearched: websiteHosts.size,
          aiQueries,
        },
      }
    );
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
