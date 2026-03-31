import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  getOrCreateCompany,
  createDeepDiveRequest,
  updateDeepDiveStatus,
} from "@/lib/db/operations";

export async function POST(req: NextRequest) {
  try {
    const {
      companyName,
      roleTitle,
      jobDescription,
      companyUrl,
      profileContext,
      customUrls,
    } = await req.json();

    // Get current user
    const {
      data: { session },
    } = await supabaseAdmin.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get or create company
    const company = await getOrCreateCompany(companyName, companyUrl);

    // Create deep dive request
    const request = await createDeepDiveRequest(
      session.user.id,
      company.id,
      roleTitle,
      jobDescription,
      companyUrl,
      profileContext
    );

    // Trigger ingestion in background (you'd queue this)
    // For MVP, we'll do it synchronously but this should be async
    triggerIngestion(request.id, company.id, companyName, companyUrl, customUrls, jobDescription, profileContext);

    return NextResponse.json({
      requestId: request.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Create deep dive error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create deep dive" },
      { status: 500 }
    );
  }
}

// Start ingestion process
async function triggerIngestion(
  requestId: string,
  companyId: string,
  companyName: string,
  companyUrl: string | undefined,
  customUrls: string[] | undefined,
  jobDescription: string | undefined,
  profileContext: string | undefined
) {
  try {
    await updateDeepDiveStatus(requestId, "fetching_sources");

    // This would normally be a background job
    // For MVP, we'll import inline
    const { ingestSources } = await import("@/lib/ingestion/ingest");

    const result = await ingestSources(
      requestId,
      companyId,
      companyName,
      companyUrl,
      customUrls || [],
      jobDescription,
      profileContext
    );

    if (result.success) {
      await updateDeepDiveStatus(requestId, "generating_report");

      // Trigger report generation
      const { assembleReport } = await import("@/lib/report/assembleReport");
      await assembleReport(requestId);

      await updateDeepDiveStatus(requestId, "completed");
    } else {
      await updateDeepDiveStatus(requestId, "failed");
    }
  } catch (error) {
    console.error("Ingestion trigger error:", error);
    await updateDeepDiveStatus(requestId, "failed");
  }
}
