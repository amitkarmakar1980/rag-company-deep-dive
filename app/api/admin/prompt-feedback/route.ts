import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { isAdmin } from "@/lib/admin";
import { sanitizeMultiLineText, sanitizeSingleLineText } from "@/lib/ai/untrustedInput";
import {
  listDiagnosticsPromptFeedback,
  saveDiagnosticsPromptFeedbackReview,
  saveDiagnosticsPromptFeedbackReviews,
  type PromptFeedbackArea,
  type PromptFeedbackReviewStatus,
} from "@/lib/admin/diagnostics";

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "200", 10);
    const result = await listDiagnosticsPromptFeedback({
      limit: Number.isFinite(limitParam) ? limitParam : 200,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/prompt-feedback]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const requestId = sanitizeSingleLineText(body?.requestId, 120);
    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
    }

    const rawEntries: unknown[] | null = Array.isArray(body?.entries) ? (body.entries as unknown[]) : null;
    if (rawEntries) {
      const entries = rawEntries.map((entry: unknown) => {
        const record = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
        return {
          rowKey: sanitizeSingleLineText(record.rowKey, 200),
          status: record.status as PromptFeedbackReviewStatus | undefined,
          promptArea: record.promptArea as PromptFeedbackArea | null | undefined,
          reviewNotes: sanitizeMultiLineText(record.reviewNotes, 2000) ?? "",
        };
      });

      if (entries.length === 0 || entries.some((entry) => !entry.rowKey)) {
        return NextResponse.json({ error: "Each review entry requires a row key." }, { status: 400 });
      }

      if (
        entries.some(
          (entry) =>
            entry.status !== "pending" &&
            entry.status !== "approved" &&
            entry.status !== "rejected" &&
            entry.status !== "needs_more_context"
        )
      ) {
        return NextResponse.json({ error: "Each review entry requires a valid review status." }, { status: 400 });
      }

      if (
        entries.some(
          (entry) =>
            entry.promptArea != null &&
            entry.promptArea !== "report_generation" &&
            entry.promptArea !== "evaluation" &&
            entry.promptArea !== "retrieval" &&
            entry.promptArea !== "ingestion" &&
            entry.promptArea !== "overlay" &&
            entry.promptArea !== "other"
        )
      ) {
        return NextResponse.json({ error: "Each review entry requires a valid prompt area." }, { status: 400 });
      }

      const result = await saveDiagnosticsPromptFeedbackReviews({
        requestId,
        entries: entries.map((entry) => ({
          rowKey: entry.rowKey!,
          status: entry.status!,
          promptArea: entry.promptArea ?? null,
          reviewNotes: entry.reviewNotes,
        })),
      });

      return NextResponse.json(result);
    }

    const rowKey = sanitizeSingleLineText(body?.rowKey, 200);
    const status = body?.status as PromptFeedbackReviewStatus | undefined;
    const promptArea = body?.promptArea as PromptFeedbackArea | null | undefined;
    const reviewNotes = sanitizeMultiLineText(body?.reviewNotes, 2000) ?? "";

    if (!rowKey) {
      return NextResponse.json({ error: "Row key is required." }, { status: 400 });
    }

    if (
      status !== "pending" &&
      status !== "approved" &&
      status !== "rejected" &&
      status !== "needs_more_context"
    ) {
      return NextResponse.json({ error: "A valid review status is required." }, { status: 400 });
    }

    if (
      promptArea != null &&
      promptArea !== "report_generation" &&
      promptArea !== "evaluation" &&
      promptArea !== "retrieval" &&
      promptArea !== "ingestion" &&
      promptArea !== "overlay" &&
      promptArea !== "other"
    ) {
      return NextResponse.json({ error: "A valid prompt area is required." }, { status: 400 });
    }

    const result = await saveDiagnosticsPromptFeedbackReview({
      requestId,
      rowKey,
      status,
      promptArea: promptArea ?? null,
      reviewNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/prompt-feedback POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}