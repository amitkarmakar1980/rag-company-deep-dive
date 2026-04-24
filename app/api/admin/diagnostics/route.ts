import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { isAdmin } from "@/lib/admin";
import {
  sanitizeHttpUrl,
  sanitizeMultiLineText,
  sanitizeSingleLineText,
} from "@/lib/ai/untrustedInput";
import {
  createDiagnosticsRequest,
  exportDiagnosticsPromptFeedback,
  extractDiagnosticsJobFromUrl,
  evaluateDiagnosticsDraft,
  getDiagnosticsExpectedOutputs,
  generateDiagnosticsDraft,
  ingestDiagnosticsSources,
  inspectDiagnosticsRetrieval,
  persistDiagnosticsReport,
  runDiagnosticsOverlay,
  saveDiagnosticsExpectedOutputs,
} from "@/lib/admin/diagnostics";

type DiagnosticsAction =
  | "extract_job"
  | "create_request"
  | "export_prompt_feedback"
  | "get_expected_outputs"
  | "save_expected_outputs"
  | "ingest_sources"
  | "inspect_retrieval"
  | "generate_draft"
  | "evaluate_draft"
  | "persist_report"
  | "run_overlay";

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
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
    const action = body?.action as DiagnosticsAction | undefined;

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    switch (action) {
      case "extract_job": {
        const url = sanitizeHttpUrl(body.url);
        if (!url) {
          return NextResponse.json({ error: "A valid job description URL is required." }, { status: 400 });
        }

        return NextResponse.json(await extractDiagnosticsJobFromUrl(url));
      }

      case "create_request": {
        const companyName = sanitizeSingleLineText(body.companyName, 140);
        const roleTitle = sanitizeSingleLineText(body.roleTitle, 180);
        const companyUrl = sanitizeHttpUrl(body.companyUrl);
        const jobDescription = sanitizeMultiLineText(body.jobDescription, 20000);
        const resumeText = sanitizeMultiLineText(body.resumeText, 24000);

        if (!companyName || !roleTitle) {
          return NextResponse.json(
            { error: "Company name and role title are required." },
            { status: 400 }
          );
        }

        const result = await createDiagnosticsRequest({
          userId: user.id,
          email: user.email ?? "",
          companyName,
          roleTitle,
          companyUrl,
          jobDescription,
          resumeText,
        });

        return NextResponse.json(result);
      }

      case "get_expected_outputs": {
        const requestId = requireString(body.requestId, "Request ID");
        return NextResponse.json(await getDiagnosticsExpectedOutputs(requestId));
      }

      case "export_prompt_feedback": {
        const requestId = requireString(body.requestId, "Request ID");
        return NextResponse.json(await exportDiagnosticsPromptFeedback(requestId));
      }

      case "save_expected_outputs": {
        const requestId = requireString(body.requestId, "Request ID");
        if (!Array.isArray(body.entries)) {
          return NextResponse.json({ error: "Entries are required." }, { status: 400 });
        }

        const entries = body.entries.flatMap((entry: unknown) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }

          const candidate = entry as {
            rowKey?: unknown;
            rowLabel?: unknown;
            actionId?: unknown;
            sectionKey?: unknown;
            sectionTitle?: unknown;
            html?: unknown;
          };

          const rowKey = sanitizeSingleLineText(candidate.rowKey, 120);
          const rowLabel = sanitizeSingleLineText(candidate.rowLabel, 180);
          const actionId = sanitizeSingleLineText(candidate.actionId, 120);
          if (!rowKey || !rowLabel || !actionId || typeof candidate.html !== "string") {
            return [];
          }

          return [{
            rowKey,
            rowLabel,
            actionId,
            sectionKey: sanitizeSingleLineText(candidate.sectionKey, 160) ?? null,
            sectionTitle: sanitizeSingleLineText(candidate.sectionTitle, 200) ?? null,
            html: candidate.html,
          }];
        });

        return NextResponse.json(await saveDiagnosticsExpectedOutputs({ requestId, entries }));
      }

      case "ingest_sources": {
        const requestId = requireString(body.requestId, "Request ID");
        return NextResponse.json(await ingestDiagnosticsSources(requestId));
      }

      case "inspect_retrieval": {
        const requestId = requireString(body.requestId, "Request ID");
        return NextResponse.json(await inspectDiagnosticsRetrieval(requestId));
      }

      case "generate_draft": {
        const requestId = requireString(body.requestId, "Request ID");
        return NextResponse.json(await generateDiagnosticsDraft(requestId));
      }

      case "evaluate_draft": {
        const requestId = requireString(body.requestId, "Request ID");
        if (!body.draft || typeof body.draft !== "object") {
          return NextResponse.json({ error: "Draft payload is required." }, { status: 400 });
        }

        return NextResponse.json(
          await evaluateDiagnosticsDraft({
            requestId,
            draft: body.draft,
          })
        );
      }

      case "persist_report": {
        const requestId = requireString(body.requestId, "Request ID");
        if (!body.draft || typeof body.draft !== "object") {
          return NextResponse.json({ error: "Draft payload is required." }, { status: 400 });
        }
        if (!body.evaluation || typeof body.evaluation !== "object") {
          return NextResponse.json({ error: "Evaluation payload is required." }, { status: 400 });
        }

        return NextResponse.json(
          await persistDiagnosticsReport({
            requestId,
            draft: body.draft,
            evaluation: body.evaluation,
          })
        );
      }

      case "run_overlay": {
        const requestId = requireString(body.requestId, "Request ID");
        return NextResponse.json(await runDiagnosticsOverlay(requestId));
      }

      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
  } catch (error) {
    console.error("[admin/diagnostics]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}