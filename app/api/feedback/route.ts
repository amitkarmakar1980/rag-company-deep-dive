import { NextRequest, NextResponse } from "next/server";
import { submitFeedback } from "@/lib/db/operations";

export async function POST(req: NextRequest) {
  try {
    const { reportId, sectionKey, feedbackType } = await req.json();

    if (!["useful", "not_useful"].includes(feedbackType)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    await submitFeedback(reportId, sectionKey, feedbackType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
