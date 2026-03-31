import { NextRequest, NextResponse, after } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  getDeepDiveRequest,
  updateDeepDiveStatus,
  deleteReportForRequest,
  deleteSourcesForRequest,
} from "@/lib/db/operations";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;

    // Verify auth
    const supabase = createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const request = await getDeepDiveRequest(requestId);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (request.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don't allow re-triggering if already in progress
    if (
      ["pending", "fetching_sources", "indexing", "generating_report"].includes(
        request.status
      )
    ) {
      return NextResponse.json(
        { error: "Analysis is already in progress" },
        { status: 409 }
      );
    }

    // Get company details for re-ingestion
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", request.company_id)
      .single();

    // Reset state before responding
    await deleteReportForRequest(requestId);
    await deleteSourcesForRequest(requestId);
    await updateDeepDiveStatus(requestId, "pending");

    // Run full pipeline after response is sent
    after(async () => {
      try {
        await updateDeepDiveStatus(requestId, "fetching_sources");
        const { ingestSources } = await import("@/lib/ingestion/ingest");
        const result = await ingestSources(
          requestId,
          request.company_id,
          company?.name ?? "",
          request.company_url ?? undefined,
          [],
          request.job_description ?? undefined,
          request.profile_context ?? undefined
        );
        if (result.success) {
          await updateDeepDiveStatus(requestId, "generating_report");
          const { assembleReport } = await import(
            "@/lib/report/assembleReport"
          );
          await assembleReport(requestId);
          await updateDeepDiveStatus(requestId, "completed");
        } else {
          await updateDeepDiveStatus(requestId, "failed");
        }
      } catch (err) {
        console.error("Regeneration pipeline error:", err);
        await updateDeepDiveStatus(requestId, "failed");
      }
    });

    return NextResponse.json({ requestId, status: "pending" });
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to start regeneration" },
      { status: 500 }
    );
  }
}
