import { NextRequest, NextResponse } from "next/server";
import { getDeepDiveRequest, getReport } from "@/lib/db/operations";

export async function GET(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const request = await getDeepDiveRequest(requestId);
    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const report = await getReport(requestId);

    return NextResponse.json({
      requestId,
      status: request.status,
      report: report
        ? {
            id: report.id,
            recommendation: report.recommendation,
            scores: {
              company_momentum: report.company_momentum_score,
              org_clarity: report.org_clarity_score,
              role_leverage: report.role_leverage_score,
              execution_risk: report.execution_risk_score,
              candidate_fit: report.candidate_fit_score,
            },
          }
        : null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
