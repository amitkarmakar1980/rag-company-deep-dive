import { NextRequest, NextResponse, after } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
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

    // Get current user from session cookie
    const supabase = createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get or create company
    const company = await getOrCreateCompany(companyName, companyUrl);

    // Create deep dive request
    const request = await createDeepDiveRequest(
      user.id,
      company.id,
      roleTitle,
      jobDescription,
      companyUrl,
      profileContext
    );

    // Run ingestion + report generation after the response is sent
    // This keeps the function alive on Vercel without blocking the client
    after(async () => {
      await runPipeline(
        request.id,
        company.id,
        companyName,
        companyUrl,
        customUrls,
        jobDescription,
        profileContext
      );
    });

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

async function runPipeline(
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
      const { assembleReport } = await import("@/lib/report/assembleReport");
      await assembleReport(requestId);
      await updateDeepDiveStatus(requestId, "completed");
    } else {
      await updateDeepDiveStatus(requestId, "failed");
    }
  } catch (error) {
    console.error("Pipeline error:", error);
    await updateDeepDiveStatus(requestId, "failed");
  }
}
