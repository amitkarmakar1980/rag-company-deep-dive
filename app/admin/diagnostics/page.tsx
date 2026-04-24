"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/admin";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HARD_CODED_JOB_URL = "https://apply.careers.microsoft.com/careers/job/1970393556855306?domain=microsoft.com";

type DiagnosticsPayload = Record<string, unknown> | null;
type HumanReadablePayload = Record<string, unknown> | null;

type ActionId =
  | "extract_job"
  | "parse_resume_file"
  | "create_request"
  | "ingest_sources"
  | "inspect_retrieval"
  | "generate_draft"
  | "evaluate_draft"
  | "persist_report"
  | "run_overlay";

type ActionOutput = {
  readable: HumanReadablePayload;
  raw: DiagnosticsPayload;
  updatedAt: string;
};

type PersistedExpectedOutputEntry = {
  rowKey: string;
  rowLabel: string;
  actionId: string;
  sectionKey: string | null;
  sectionTitle: string | null;
  html: string;
  plainText: string;
  updatedAt: string;
  feedbackStatus: "captured";
  promptTarget: "prompt_update_candidate";
  source: "admin_diagnostics";
};

type ActionRowDescriptor = {
  kind: "action";
  key: ActionId;
  actionId: ActionId;
  label: string;
  detail: string;
};

type DraftSectionRowDescriptor = {
  kind: "draft_section";
  key: string;
  actionId: "generate_draft";
  label: string;
  detail: string;
  sectionKey: string;
  sectionTitle: string;
  section: Record<string, unknown>;
  updatedAt: string | null;
};

type DiagnosticsRowDescriptor = ActionRowDescriptor | DraftSectionRowDescriptor;

type SaveState = "idle" | "saving" | "saved" | "error";

type PromptFeedbackExportItem = {
  recordType: "prompt_feedback_review_item";
  requestId: string;
  companyName: string;
  roleTitle: string;
  companyUrl: string | null;
  hasResumeContext: boolean;
  rowKey: string;
  rowLabel: string;
  actionId: string;
  scope: "draft_section" | "pipeline_step";
  sectionKey: string | null;
  sectionTitle: string | null;
  expectedOutputText: string;
  expectedOutputHtml: string;
  promptTarget: "prompt_update_candidate";
  feedbackStatus: "captured";
  source: "admin_diagnostics";
  capturedAt: string;
  requestContext: {
    normalizedQueries: string[];
    persona: Record<string, unknown>;
    jobDescriptionExcerpt: string | null;
  };
};

type PromptFeedbackExportPayload = {
  requestId: string;
  exportedAt: string;
  source: "admin_diagnostics";
  purpose: "prompt_update_review_queue";
  companyName: string;
  roleTitle: string;
  entryCount: number;
  reviewQueue: PromptFeedbackExportItem[];
};

const ACTION_ROWS: ActionRowDescriptor[] = [
  {
    kind: "action",
    key: "extract_job",
    actionId: "extract_job",
    label: "Extract",
    detail: "Extract company, role, company URL, and job description from the job posting link.",
  },
  {
    kind: "action",
    key: "parse_resume_file",
    actionId: "parse_resume_file",
    label: "Upload Resume",
    detail: "Parse the selected resume file into text and load it into the request.",
  },
  {
    kind: "action",
    key: "create_request",
    actionId: "create_request",
    label: "Create Request",
    detail: "Create the diagnostics deep-dive request using the current JD and resume context.",
  },
  {
    kind: "action",
    key: "ingest_sources",
    actionId: "ingest_sources",
    label: "Ingest Sources",
    detail: "Run the planner, fetch sources, clean content, chunk, and embed.",
  },
  {
    kind: "action",
    key: "inspect_retrieval",
    actionId: "inspect_retrieval",
    label: "Inspect Retrieval",
    detail: "Inspect retrieval queries, evidence quality, strongest sources, and top chunks.",
  },
  {
    kind: "action",
    key: "generate_draft",
    actionId: "generate_draft",
    label: "Generate Draft",
    detail: "Generate the premium draft, then inspect each generated section in its own row.",
  },
  {
    kind: "action",
    key: "evaluate_draft",
    actionId: "evaluate_draft",
    label: "Evaluate Draft",
    detail: "Run the quality-gate evaluation against the generated draft.",
  },
  {
    kind: "action",
    key: "persist_report",
    actionId: "persist_report",
    label: "Persist Report",
    detail: "Write the evaluated draft to reports and report sections.",
  },
  {
    kind: "action",
    key: "run_overlay",
    actionId: "run_overlay",
    label: "Run Overlay",
    detail: "Generate the candidate overlay from the parsed resume text.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePersistedExpectedOutputs(value: unknown): Record<string, PersistedExpectedOutputEntry> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([rowKey, candidate]) => {
      if (!isRecord(candidate) || typeof candidate.html !== "string") {
        return [];
      }

      return [[
        rowKey,
        {
          rowKey,
          rowLabel: typeof candidate.rowLabel === "string" ? candidate.rowLabel : rowKey,
          actionId: typeof candidate.actionId === "string" ? candidate.actionId : rowKey,
          sectionKey: typeof candidate.sectionKey === "string" ? candidate.sectionKey : null,
          sectionTitle: typeof candidate.sectionTitle === "string" ? candidate.sectionTitle : null,
          html: candidate.html,
          plainText: typeof candidate.plainText === "string" ? candidate.plainText : "",
          updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date(0).toISOString(),
          feedbackStatus: "captured",
          promptTarget: "prompt_update_candidate",
          source: "admin_diagnostics",
        },
      ]] as const;
    })
  );
}

function extractDraftSectionRows(output: ActionOutput | undefined): DraftSectionRowDescriptor[] {
  const readable = output?.readable;
  const sections = Array.isArray(readable?.sections) ? (readable.sections as Array<Record<string, unknown>>) : [];

  return sections.map((section, index) => {
    const sectionKey = String(section.key ?? `section-${index + 1}`);
    const sectionTitle = String(section.title ?? `Draft section ${index + 1}`);
    return {
      kind: "draft_section",
      key: `draft_section:${sectionKey}`,
      actionId: "generate_draft",
      label: `Draft / ${sectionTitle}`,
      detail: "Derived section output from the Generate Draft step. Capture the expected structure and wording for this specific section.",
      sectionKey,
      sectionTitle,
      section,
      updatedAt: output?.updatedAt ?? null,
    };
  });
}

export default function AdminDiagnosticsPage() {
  const router = useRouter();
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [busyAction, setBusyAction] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [jobUrl, setJobUrl] = useState(HARD_CODED_JOB_URL);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [draftBundle, setDraftBundle] = useState<DiagnosticsPayload>(null);
  const [evaluationBundle, setEvaluationBundle] = useState<DiagnosticsPayload>(null);
  const [actionOutputs, setActionOutputs] = useState<Record<string, ActionOutput>>({});
  const [expectedOutputs, setExpectedOutputs] = useState<Record<string, string>>({});
  const [persistedExpectedOutputs, setPersistedExpectedOutputs] = useState<Record<string, PersistedExpectedOutputEntry>>({});
  const [expectedOutputSaveState, setExpectedOutputSaveState] = useState<Record<string, SaveState>>({});
  const [exportBusy, setExportBusy] = useState<false | "json" | "jsonl">(false);
  const [form, setForm] = useState({
    jdUrl: HARD_CODED_JOB_URL,
    companyName: "",
    roleTitle: "",
    companyUrl: "",
    jobDescription: "",
    resumeText: "",
  });

  const draftSectionRows = useMemo(() => extractDraftSectionRows(actionOutputs.generate_draft), [actionOutputs]);

  const orderedRows = useMemo<DiagnosticsRowDescriptor[]>(() => {
    const rows: DiagnosticsRowDescriptor[] = [];
    for (const row of ACTION_ROWS) {
      rows.push(row);
      if (row.key === "generate_draft") {
        rows.push(...draftSectionRows);
      }
    }
    return rows;
  }, [draftSectionRows]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? "";
      if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
        router.replace("/");
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  useEffect(() => {
    const trimmedRequestId = requestId.trim();
    if (!trimmedRequestId) {
      setPersistedExpectedOutputs({});
      return;
    }

    let cancelled = false;

    async function loadPersistedExpectedOutputs() {
      try {
        const response = await fetch("/api/admin/diagnostics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "get_expected_outputs", requestId: trimmedRequestId }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? `Request failed with ${response.status}`);
        }

        if (cancelled) {
          return;
        }

        const normalized = normalizePersistedExpectedOutputs(payload.expectedOutputs);
        setPersistedExpectedOutputs(normalized);
        setExpectedOutputs((current) => ({
          ...current,
          ...Object.fromEntries(Object.entries(normalized).map(([key, entry]) => [key, entry.html])),
        }));
        setExpectedOutputSaveState((current) => ({
          ...current,
          ...Object.fromEntries(Object.keys(normalized).map((key) => [key, "saved"])),
        }));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unexpected error");
        }
      }
    }

    void loadPersistedExpectedOutputs();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  function setActionOutput(actionId: ActionId, raw: DiagnosticsPayload, readable: HumanReadablePayload) {
    setActionOutputs((current) => ({
      ...current,
      [actionId]: {
        raw,
        readable,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function deriveReadablePayload(action: ActionId, payload: DiagnosticsPayload): HumanReadablePayload {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const maybeHumanReadable = payload.humanReadable;
    if (maybeHumanReadable && typeof maybeHumanReadable === "object") {
      return maybeHumanReadable as HumanReadablePayload;
    }

    switch (action) {
      case "extract_job":
        return {
          kind: "extract_job",
          sourceUrl: payload.sourceUrl,
          companyName: payload.companyName,
          roleTitle: payload.roleTitle,
          companyUrl: payload.companyUrl,
          jobDescription: payload.jobDescription,
          extractionWarning: payload.extractionWarning,
        };

      case "parse_resume_file":
        return {
          kind: "resume_upload",
          fileName: payload.fileName,
          parsedCharacters: payload.parsedCharacters,
          preview: payload.preview,
          text: payload.text,
        };

      case "create_request":
        return {
          kind: "request_created",
          requestId: payload.requestId,
          companyName: payload.companyName,
          roleTitle: payload.roleTitle,
          status: payload.status,
          createdAt: payload.createdAt,
        };

      case "evaluate_draft":
        return {
          kind: "evaluation",
          durationMs: payload.durationMs,
          qualityGate: payload.qualityGate,
          evaluation: payload.evaluation,
          usage: payload.usage,
        };

      case "persist_report":
        return {
          kind: "persist_report",
          requestId: payload.requestId,
          reportId: payload.reportId,
          recommendation: payload.recommendation,
          createdAt: payload.createdAt,
        };

      case "run_overlay":
        return {
          kind: "overlay",
          overlayId: payload.overlayId,
          status: payload.status,
          updatedAt: payload.updatedAt,
          error: payload.error,
          overlay: payload.overlay,
        };

      default:
        return {
          kind: "generic",
          payload,
        };
    }
  }

  async function persistExpectedOutputEntries(
    nextRequestId: string,
    rows: DiagnosticsRowDescriptor[],
    htmlOverrides?: Record<string, string>
  ) {
    const entries = rows.map((row) => ({
      rowKey: row.key,
      rowLabel: row.label,
      actionId: row.actionId,
      sectionKey: row.kind === "draft_section" ? row.sectionKey : null,
      sectionTitle: row.kind === "draft_section" ? row.sectionTitle : null,
      html: htmlOverrides?.[row.key] ?? expectedOutputs[row.key] ?? "",
    }));

    if (!entries.length) {
      return;
    }

    setExpectedOutputSaveState((current) => ({
      ...current,
      ...Object.fromEntries(rows.map((row) => [row.key, "saving"])),
    }));

    try {
      const response = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_expected_outputs",
          requestId: nextRequestId,
          entries,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed with ${response.status}`);
      }

      const normalized = normalizePersistedExpectedOutputs(payload.expectedOutputs);
      setPersistedExpectedOutputs((current) => ({ ...current, ...normalized }));
      setExpectedOutputs((current) => ({
        ...current,
        ...Object.fromEntries(rows.map((row) => [row.key, normalized[row.key]?.html ?? current[row.key] ?? ""])),
      }));
      setExpectedOutputSaveState((current) => ({
        ...current,
        ...Object.fromEntries(rows.map((row) => [row.key, "saved"])),
      }));
    } catch (err) {
      setExpectedOutputSaveState((current) => ({
        ...current,
        ...Object.fromEntries(rows.map((row) => [row.key, "error"])),
      }));
      throw err;
    }
  }

  async function handleExpectedOutputCommit(row: DiagnosticsRowDescriptor, nextValue: string) {
    setExpectedOutputs((current) => {
      if ((current[row.key] ?? "") === nextValue) {
        return current;
      }

      return {
        ...current,
        [row.key]: nextValue,
      };
    });

    const trimmedRequestId = requestId.trim();
    if (!trimmedRequestId) {
      setExpectedOutputSaveState((current) => ({ ...current, [row.key]: "idle" }));
      return;
    }

    try {
      await persistExpectedOutputEntries(trimmedRequestId, [row], { [row.key]: nextValue });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  async function exportPromptFeedback(format: "json" | "jsonl") {
    const trimmedRequestId = requestId.trim();
    if (!trimmedRequestId) {
      setError("Create or load a request before exporting prompt feedback.");
      return;
    }

    setExportBusy(format);
    setError(null);

    try {
      const response = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "export_prompt_feedback", requestId: trimmedRequestId }),
      });

      const payload = (await response.json()) as PromptFeedbackExportPayload | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? `Request failed with ${response.status}` : `Request failed with ${response.status}`);
      }

      const exportPayload = payload as PromptFeedbackExportPayload;
      const fileStem = `${exportPayload.companyName}-${exportPayload.roleTitle}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "diagnostics-prompt-feedback";
      const fileName = `${fileStem}-${trimmedRequestId}.${format === "jsonl" ? "jsonl" : "json"}`;
      const body = format === "jsonl"
        ? `${exportPayload.reviewQueue.map((entry) => JSON.stringify(entry)).join("\n")}\n`
        : JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([body], { type: format === "jsonl" ? "application/x-ndjson" : "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setExportBusy(false);
    }
  }

  async function parseSelectedResumeFile() {
    if (!selectedResumeFile) {
      setError("Choose a resume file first.");
      resumeFileInputRef.current?.click();
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedResumeFile);

    setBusyAction("parse_resume_file");
    setError(null);

    try {
      const response = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed with ${response.status}`);
      }

      const normalizedPayload = {
        fileName: selectedResumeFile.name,
        parsedCharacters: String(payload.text ?? "").length,
        preview: String(payload.text ?? "").slice(0, 1600),
        text: String(payload.text ?? ""),
      };

      setResumeFileName(selectedResumeFile.name);
      setForm((current) => ({ ...current, resumeText: String(payload.text ?? "") }));
      setActionOutput("parse_resume_file", normalizedPayload, deriveReadablePayload("parse_resume_file", normalizedPayload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusyAction(null);
    }
  }

  async function runApiAction(action: Exclude<ActionId, "parse_resume_file">, extra: Record<string, unknown> = {}) {
    setBusyAction(action);
    setError(null);

    try {
      const response = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...extra }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed with ${response.status}`);
      }

      setActionOutput(action, payload, deriveReadablePayload(action, payload));

      if (action === "extract_job") {
        setJobUrl(String(payload.sourceUrl ?? jobUrl));
        setForm((current) => ({
          ...current,
          jdUrl: String(payload.sourceUrl ?? jobUrl),
          companyName: String(payload.companyName ?? current.companyName),
          roleTitle: String(payload.roleTitle ?? current.roleTitle),
          companyUrl: String(payload.companyUrl ?? current.companyUrl),
          jobDescription: String(payload.jobDescription ?? current.jobDescription),
        }));
      }

      if (action === "create_request") {
        const nextRequestId = String(payload.requestId ?? "");
        setRequestId(nextRequestId);
        setReportId(null);
        setDraftBundle(null);
        setEvaluationBundle(null);

        const rowsWithoutDerivedDraftSections = orderedRows.filter((row) => row.kind !== "draft_section");
        if (nextRequestId) {
          try {
            await persistExpectedOutputEntries(nextRequestId, rowsWithoutDerivedDraftSections);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error");
          }
        }
      }

      if (action === "generate_draft") {
        setDraftBundle((payload.draft as DiagnosticsPayload) ?? null);
        setEvaluationBundle(null);
      }

      if (action === "evaluate_draft") {
        setEvaluationBundle({
          qualityGate: payload.qualityGate,
          usage: payload.usage,
        });
      }

      if (action === "persist_report") {
        setReportId(typeof payload.reportId === "string" ? payload.reportId : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusyAction(null);
    }
  }

  async function runAction(action: ActionId) {
    if (action === "extract_job") {
      if (!jobUrl.trim()) {
        setError("Enter a job description link first.");
        return;
      }

      await runApiAction("extract_job", { url: jobUrl.trim() });
      return;
    }

    if (action === "parse_resume_file") {
      await parseSelectedResumeFile();
      return;
    }

    if (action === "create_request") {
      await runApiAction("create_request", {
        companyName: form.companyName,
        roleTitle: form.roleTitle,
        companyUrl: form.companyUrl,
        jobDescription: form.jobDescription,
        resumeText: form.resumeText,
      });
      return;
    }

    if (action === "evaluate_draft") {
      if (!draftBundle) {
        setError("Generate the draft before evaluating it.");
        return;
      }

      await runApiAction("evaluate_draft", { requestId, draft: draftBundle });
      return;
    }

    if (action === "persist_report") {
      if (!draftBundle || !evaluationBundle) {
        setError("Generate and evaluate the draft before persisting it.");
        return;
      }

      await runApiAction("persist_report", { requestId, draft: draftBundle, evaluation: evaluationBundle });
      return;
    }

    await runApiAction(action, { requestId });
  }

  function isActionDisabled(action: ActionId): boolean {
    if (busyAction !== null) {
      return true;
    }

    if (action === "extract_job") {
      return jobUrl.trim().length === 0;
    }

    if (action === "parse_resume_file") {
      return !selectedResumeFile;
    }

    if (action === "create_request") {
      return form.companyName.trim().length === 0 || form.roleTitle.trim().length === 0;
    }

    if (action === "evaluate_draft") {
      return requestId.trim().length === 0 || !draftBundle;
    }

    if (action === "persist_report") {
      return requestId.trim().length === 0 || !draftBundle || !evaluationBundle;
    }

    return requestId.trim().length === 0;
  }

  if (authorized === null) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] text-[#1c1713]">
      <div className="mx-auto max-w-[1800px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8c7e73]">Admin only</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1c1713]">Diagnostics</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b5e52]">
              Drive the pipeline action by action. Expected-view notes are stored on the request as prompt-update candidates, and draft sections expand into their own derived rows after generation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8]"
            >
              Back to admin
            </Link>
            <Link
              href="/admin/prompt-feedback"
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8]"
            >
              Prompt Feedback Queue
            </Link>
            <button
              type="button"
              onClick={() => void exportPromptFeedback("json")}
              disabled={!requestId.trim() || exportBusy !== false}
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportBusy === "json" ? "Exporting JSON" : "Export Review JSON"}
            </button>
            <button
              type="button"
              onClick={() => void exportPromptFeedback("jsonl")}
              disabled={!requestId.trim() || exportBusy !== false}
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportBusy === "jsonl" ? "Exporting JSONL" : "Export JSONL"}
            </button>
            {reportId && (
              <Link
                href={`/api/report/${reportId}`}
                target="_blank"
                className="rounded-full border border-[#cfe1d8] bg-[#edf6f0] px-4 py-2 text-xs font-semibold text-[#1a4a3a] transition-colors hover:bg-[#e4f0e8]"
              >
                Open report JSON
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-[1.5rem] border border-[#e4ddd4] bg-white p-6 shadow-[0_18px_40px_rgba(28,25,23,0.06)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6d63]">Inputs</h2>
          <div className="mt-4 grid gap-5 xl:grid-cols-2">
            <Field label="Job description link">
              <input
                value={jobUrl}
                readOnly
                aria-readonly="true"
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#f2ede5] px-4 py-3 text-sm text-[#1c1713] outline-none"
              />
            </Field>
            <Field label="Existing request ID">
              <input
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 font-mono text-sm text-[#1c1713] outline-none transition-colors focus:border-[#8a5a14]"
                placeholder="Paste an existing request ID to resume from this step"
              />
            </Field>
            <Field label="Company name">
              <input
                value={form.companyName}
                onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none transition-colors focus:border-[#8a5a14]"
                placeholder="Microsoft"
              />
            </Field>
            <Field label="Role title">
              <input
                value={form.roleTitle}
                onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none transition-colors focus:border-[#8a5a14]"
                placeholder="Senior Product Manager"
              />
            </Field>
            <Field label="Company URL">
              <input
                value={form.companyUrl}
                onChange={(event) => setForm((current) => ({ ...current, companyUrl: event.target.value }))}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none transition-colors focus:border-[#8a5a14]"
                placeholder="https://www.microsoft.com"
              />
            </Field>
            <Field label="Resume file">
              <div className="space-y-3">
                <input
                  ref={resumeFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedResumeFile(file);
                    setResumeFileName(file?.name ?? null);
                  }}
                  className="block w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] file:mr-4 file:rounded-full file:border-0 file:bg-[#1c1713] file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.14em] file:text-white"
                />
                <div className="rounded-2xl border border-[#ebe4da] bg-[#fcfbf8] px-4 py-3 text-sm text-[#6b5e52]">
                  {resumeFileName ? `Selected ${resumeFileName}. Run Upload Resume to parse it.` : "Choose a resume file, then run Upload Resume from the table below."}
                </div>
              </div>
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Job description text">
              <textarea
                value={form.jobDescription}
                onChange={(event) => setForm((current) => ({ ...current, jobDescription: event.target.value }))}
                className="min-h-36 w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none transition-colors focus:border-[#8a5a14]"
                placeholder="The extracted job description will land here. You can still edit it before creating the request."
              />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Resume text preview">
              <textarea
                value={form.resumeText}
                onChange={(event) => setForm((current) => ({ ...current, resumeText: event.target.value }))}
                className="min-h-36 w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none transition-colors focus:border-[#8a5a14]"
                placeholder="Parsed resume text will land here after you run Upload Resume."
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-[#e4ddd4] bg-white shadow-[0_18px_40px_rgba(28,25,23,0.06)]">
          <div className="grid min-w-[1650px] grid-cols-[280px_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)] border-b border-[#e7dfd5] bg-[#f5f1e8]">
            <HeaderCell title="Action" />
            <HeaderCell title="Readable View" />
            <HeaderCell title="Expected View" />
            <HeaderCell title="Latest Output" />
          </div>

          {orderedRows.map((row) => {
            const expectedHtml = expectedOutputs[row.key] ?? persistedExpectedOutputs[row.key]?.html ?? "";
            const persistedEntry = persistedExpectedOutputs[row.key] ?? null;
            const output = row.kind === "action" ? actionOutputs[row.actionId] : actionOutputs.generate_draft;
            const latestPayload = row.kind === "draft_section" ? row.section : output?.raw ?? null;

            return (
              <div key={row.key} className="grid min-w-[1650px] grid-cols-[280px_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)] border-b border-[#efe8de] last:border-b-0">
                <div className="border-r border-[#efe8de] p-5">
                  <p className="text-sm font-semibold text-[#1c1713]">{row.label}</p>
                  <p className="mt-2 text-xs leading-5 text-[#7a6d63]">{row.detail}</p>
                  {row.kind === "action" ? (
                    <button
                      type="button"
                      onClick={() => void runAction(row.actionId)}
                      disabled={isActionDisabled(row.actionId)}
                      className="mt-4 inline-flex rounded-full bg-[#1c1713] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {busyAction === row.actionId ? "Running" : row.label}
                    </button>
                  ) : (
                    <p className="mt-4 inline-flex rounded-full bg-[#eef5f8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2d5c6a]">
                      Derived row
                    </p>
                  )}
                  {(row.kind === "draft_section" ? row.updatedAt : output?.updatedAt) && (
                    <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[#8c7e73]">
                      Updated {new Date((row.kind === "draft_section" ? row.updatedAt : output?.updatedAt) ?? "").toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="border-r border-[#efe8de] p-5">
                  {row.kind === "draft_section" ? (
                    <SectionCard section={row.section} />
                  ) : (
                    <RowReadableView actionId={row.actionId} payload={output?.readable ?? null} />
                  )}
                </div>

                <div className="border-r border-[#efe8de] p-5">
                  <ExpectedOutputEditor
                    rowKey={row.key}
                    value={expectedHtml}
                    saveState={expectedOutputSaveState[row.key] ?? "idle"}
                    persistedEntry={persistedEntry}
                    requestReady={requestId.trim().length > 0}
                    onCommit={(nextValue) => void handleExpectedOutputCommit(row, nextValue)}
                  />
                </div>

                <div className="p-5">
                  <LatestOutputCell payload={latestPayload} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function HeaderCell({ title }: { title: string }) {
  return <div className="border-r border-[#e7dfd5] p-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6d63] last:border-r-0">{title}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{label}</span>
      {children}
    </label>
  );
}

function LatestOutputCell({ payload }: { payload: DiagnosticsPayload | Record<string, unknown> }) {
  const prettyPayload = useMemo(() => {
    if (!payload) {
      return "No output recorded yet.";
    }

    return JSON.stringify(payload, null, 2);
  }, [payload]);

  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[#1c1713]/10 bg-[#111827]">
      <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-6 text-[#d9e2f1]">
        <code>{prettyPayload}</code>
      </pre>
    </div>
  );
}

function ExpectedOutputEditor({
  rowKey,
  value,
  saveState,
  persistedEntry,
  requestReady,
  onCommit,
}: {
  rowKey: string;
  value: string;
  saveState: SaveState;
  persistedEntry: PersistedExpectedOutputEntry | null;
  requestReady: boolean;
  onCommit: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  const insertPlainTextAtCursor = (text: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index > 0) {
        fragment.appendChild(document.createElement("br"));
      }

      if (line.length > 0) {
        fragment.appendChild(document.createTextNode(line));
      }
    });

    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    return true;
  };

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (document.activeElement === editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className="rounded-[1.15rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Expected output</p>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-row-key={rowKey}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          if (!insertPlainTextAtCursor(text)) {
            document.execCommand("insertText", false, text);
          }
        }}
        onBlur={(event) => onCommit(event.currentTarget.innerHTML)}
        className="mt-3 min-h-[220px] max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-[0.95rem] border border-[#ddd4c8] bg-white px-4 py-3 text-sm leading-6 text-[#1c1713] outline-none [overflow-wrap:anywhere]"
      />
      {!value && (
        <p className="mt-3 text-xs text-[#7a6d63]">
          Capture what a good result should look like for this row. The note is stored against the request as prompt-update feedback once a request ID exists.
        </p>
      )}
      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[#8c7e73]">
        {saveState === "saving"
          ? "Saving prompt feedback"
          : saveState === "saved" && persistedEntry
            ? `Saved for prompt updates at ${new Date(persistedEntry.updatedAt).toLocaleTimeString()}`
            : saveState === "error"
              ? "Save failed"
              : requestReady
                ? "Blur to save this note to the request"
                : "Create or load a request to persist this note"}
      </p>
    </div>
  );
}

function RowReadableView({ actionId, payload }: { actionId: ActionId; payload: HumanReadablePayload }) {
  if (!payload) {
    return <p className="text-sm leading-6 text-[#6b5e52]">No readable output recorded for this action yet.</p>;
  }

  const kind = typeof payload.kind === "string" ? payload.kind : actionId;

  if (kind === "extract_job") {
    return <ExtractSummary payload={payload} />;
  }

  if (kind === "resume_upload") {
    return <ResumeUploadSummary payload={payload} />;
  }

  if (kind === "request_created") {
    return <RequestCreatedSummary payload={payload} />;
  }

  if (kind === "ingest") {
    return <IngestionSummary payload={payload} />;
  }

  if (kind === "retrieval") {
    return <RetrievalSummary payload={payload} />;
  }

  if (kind === "draft") {
    return <DraftOverviewSummary payload={payload} />;
  }

  if (kind === "evaluation") {
    return <EvaluationSummary payload={payload} />;
  }

  if (kind === "persist_report") {
    return <PersistSummary payload={payload} />;
  }

  if (kind === "overlay") {
    return <OverlaySummary payload={payload} />;
  }

  return <GenericSummary payload={payload} />;
}

function ExtractSummary({ payload }: { payload: HumanReadablePayload }) {
  const jobDescription = String(payload?.jobDescription ?? "");
  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricCard label="Company" value={String(payload?.companyName ?? "—")} />
      <MetricCard label="Role" value={String(payload?.roleTitle ?? "—")} />
      <MetricCard label="Company URL" value={String(payload?.companyUrl ?? "—")} />
      <MetricCard label="Source URL" value={String(payload?.sourceUrl ?? "—")} />
      <TextPanel title="Job description preview" text={jobDescription || "No job description text extracted."} />
    </div>
  );
}

function ResumeUploadSummary({ payload }: { payload: HumanReadablePayload }) {
  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricCard label="File" value={String(payload?.fileName ?? "—")} />
      <MetricCard label="Parsed characters" value={String(payload?.parsedCharacters ?? "0")} />
      <TextPanel title="Extracted resume text" text={String(payload?.text ?? payload?.preview ?? "No extracted text available.")} />
    </div>
  );
}

function RequestCreatedSummary({ payload }: { payload: HumanReadablePayload }) {
  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricCard label="Request ID" value={String(payload?.requestId ?? "—")} />
      <MetricCard label="Company" value={String(payload?.companyName ?? "—")} />
      <MetricCard label="Role" value={String(payload?.roleTitle ?? "—")} />
      <MetricCard label="Status" value={String(payload?.status ?? "—")} />
    </div>
  );
}

function EvaluationSummary({ payload }: { payload: HumanReadablePayload }) {
  const qualityGate = (payload?.qualityGate as Record<string, unknown> | undefined) ?? {};
  const warnings = Array.isArray(qualityGate.warning_flags) ? (qualityGate.warning_flags as string[]) : [];
  const blockedReasons = Array.isArray(qualityGate.blocked_release_reasons)
    ? (qualityGate.blocked_release_reasons as string[])
    : [];

  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricCard label="Release decision" value={String(qualityGate.release_decision ?? "—")} />
      <MetricCard label="Overall quality score" value={String(qualityGate.overall_quality_score ?? "—")} />
      <MetricCard label="Depth score" value={String(qualityGate.depth_score ?? "—")} />
      <ListSection title="Warnings" items={warnings} />
      <ListSection title="Blocked reasons" items={blockedReasons} />
    </div>
  );
}

function PersistSummary({ payload }: { payload: HumanReadablePayload }) {
  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricCard label="Report ID" value={String(payload?.reportId ?? "—")} />
      <MetricCard label="Recommendation" value={String(payload?.recommendation ?? "—")} />
      <MetricCard label="Created at" value={String(payload?.createdAt ?? "—")} />
    </div>
  );
}

function OverlaySummary({ payload }: { payload: HumanReadablePayload }) {
  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricCard label="Overlay ID" value={String(payload?.overlayId ?? "—")} />
      <MetricCard label="Status" value={String(payload?.status ?? "—")} />
      <MetricCard label="Updated at" value={String(payload?.updatedAt ?? "—")} />
      <TextPanel title="Overlay preview" text={JSON.stringify(payload?.overlay ?? {}, null, 2)} mono />
    </div>
  );
}

function GenericSummary({ payload }: { payload: HumanReadablePayload }) {
  return <TextPanel title="Readable summary" text={JSON.stringify(payload ?? {}, null, 2)} mono />;
}

function IngestionSummary({ payload }: { payload: HumanReadablePayload }) {
  const overview = (payload?.overview as Record<string, unknown> | undefined) ?? {};
  const qualityChecks = Array.isArray(payload?.qualityChecks) ? (payload.qualityChecks as string[]) : [];
  const plannedSources = Array.isArray(payload?.plannedSources)
    ? (payload.plannedSources as Array<Record<string, unknown>>)
    : [];
  const actualSources = Array.isArray(payload?.actualSources)
    ? (payload.actualSources as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricGrid
        items={[
          { label: "Strategy summary", value: String(overview.strategySummary ?? "—") },
          { label: "Goal", value: String(overview.goal ?? "—") },
          { label: "Sources created", value: String(overview.sourcesCreated ?? "0") },
          { label: "Chunks created", value: String(overview.chunksCreated ?? "0") },
          { label: "Covered classes", value: String(overview.coveredSourceClasses ?? "—") },
          { label: "Missing classes", value: String(overview.missingSourceClasses ?? "None") },
          { label: "Second-pass adds", value: String(overview.secondPassAddedCount ?? "0") },
          { label: "Independent domains", value: `${String(overview.independentDomainsActual ?? "0")} / ${String(overview.independentDomainsTarget ?? "0")}` },
        ]}
      />
      <ListSection title="Quality checks" items={qualityChecks} />
      <SourceTable title="Planned sources and purpose" rows={plannedSources} showIngested />
      <SourceTable title="Actually ingested sources" rows={actualSources} />
    </div>
  );
}

function RetrievalSummary({ payload }: { payload: HumanReadablePayload }) {
  const overview = (payload?.overview as Record<string, unknown> | undefined) ?? {};
  const queries = Array.isArray(payload?.queries) ? (payload.queries as string[]) : [];
  const warnings = Array.isArray(payload?.warnings) ? (payload.warnings as string[]) : [];
  const topSources = Array.isArray(payload?.topSources) ? (payload.topSources as Array<Record<string, unknown>>) : [];
  const topChunks = Array.isArray(payload?.topChunks) ? (payload.topChunks as Array<Record<string, unknown>>) : [];

  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricGrid
        items={[
          { label: "Evidence rating", value: String(overview.evidenceRating ?? "—") },
          { label: "Distinct sources", value: String(overview.distinctSourceCount ?? "0") },
          { label: "Distinct types", value: String(overview.distinctSourceTypes ?? "0") },
          { label: "Retrieved chunks", value: String(overview.totalRetrievedChunks ?? "0") },
        ]}
      />
      <ListSection title="Queries used" items={queries} />
      <ListSection title="Warnings" items={warnings.length ? warnings : ["No retrieval warnings reported."]} />
      <SourceTable title="Strongest sources in retrieval" rows={topSources} mode="retrieval" />
      <ChunkList title="Top retrieved chunks" rows={topChunks} />
    </div>
  );
}

function DraftOverviewSummary({ payload }: { payload: HumanReadablePayload }) {
  const overview = (payload?.overview as Record<string, unknown> | undefined) ?? {};
  const sections = Array.isArray(payload?.sections) ? (payload.sections as Array<Record<string, unknown>>) : [];

  return (
    <div className="space-y-4 text-sm text-[#1c1713]">
      <MetricGrid
        items={[
          { label: "Recommendation", value: String(overview.recommendation ?? "—") },
          { label: "Sections returned", value: String(overview.sectionCount ?? "0") },
          { label: "Input tokens", value: String((overview.usage as Record<string, unknown> | undefined)?.input_tokens ?? "—") },
          { label: "Output tokens", value: String((overview.usage as Record<string, unknown> | undefined)?.output_tokens ?? "—") },
        ]}
      />
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Generated section rows</h4>
        <div className="mt-2 space-y-2">
          {sections.map((section, index) => (
            <div key={`draft-overview-${index}`} className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] px-4 py-3 text-sm leading-6 text-[#1c1713]">
              {String(section.title ?? section.key ?? `Section ${index + 1}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
      {items.map((item) => (
        <MetricCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-[#1c1713]">{value}</p>
    </div>
  );
}

function TextPanel({ title, text, mono = false }: { title: string; text: string; mono?: boolean }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{title}</h4>
      <div className={`mt-2 max-h-[320px] overflow-auto rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] px-4 py-3 text-sm leading-6 text-[#1c1713] ${mono ? "font-mono text-xs" : ""}`}>
        {text}
      </div>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{title}</h4>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] px-4 py-3 text-sm leading-6 text-[#1c1713]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceTable({
  title,
  rows,
  showIngested = false,
  mode = "ingest",
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  showIngested?: boolean;
  mode?: "ingest" | "retrieval";
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{title}</h4>
      <div className="mt-2 space-y-3">
        {rows.length === 0 && <p className="text-sm text-[#6b5e52]">No source details available.</p>}
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#1c1713]">{String(row.title ?? row.label ?? "Untitled source")}</p>
              <span className="rounded-full bg-[#f0ece4] px-2 py-0.5 text-[11px] font-medium text-[#6b5e52]">{String(row.type ?? "Source")}</span>
              {Boolean(row.party) && <span className="rounded-full bg-[#eef5f8] px-2 py-0.5 text-[11px] font-medium text-[#2d5c6a]">{String(row.party).replace(/_/g, " ")}</span>}
              {Boolean(row.trustTier) && <span className="rounded-full bg-[#edf6f0] px-2 py-0.5 text-[11px] font-medium text-[#1a4a3a]">Trust: {String(row.trustTier)}</span>}
              {Boolean(row.origin) && <span className="rounded-full bg-[#fbf3e6] px-2 py-0.5 text-[11px] font-medium text-[#8a5a14]">{String(row.origin).replace(/_/g, " ")}</span>}
              {showIngested && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${row.ingested ? "bg-[#edf6f0] text-[#1a4a3a]" : "bg-[#fbefeb] text-[#8a3d2f]"}`}>
                  {row.ingested ? "Ingested" : "Planned only"}
                </span>
              )}
              {mode === "retrieval" && row.chunkCount != null && (
                <span className="rounded-full bg-[#eef5f8] px-2 py-0.5 text-[11px] font-medium text-[#2d5c6a]">
                  {String(row.chunkCount)} chunks surfaced
                </span>
              )}
              {row.score != null && mode === "ingest" && (
                <span className="rounded-full bg-[#f4f0fb] px-2 py-0.5 text-[11px] font-medium text-[#5a4b87]">
                  Score {String(row.score)}
                </span>
              )}
            </div>
            {Boolean(row.url) && <p className="mt-2 break-all text-xs text-[#7a6d63]">{String(row.url)}</p>}
            {Array.isArray(row.sourceClasses) && row.sourceClasses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(row.sourceClasses as unknown[]).map((sourceClass, badgeIndex) => (
                  <span key={`${title}-${index}-class-${badgeIndex}`} className="rounded-full bg-[#f7f3ed] px-2 py-0.5 text-[11px] font-medium text-[#6b5e52]">
                    {String(sourceClass)}
                  </span>
                ))}
              </div>
            )}
            {Boolean(row.purpose) && <p className="mt-3 text-sm leading-6 text-[#1c1713]">{String(row.purpose)}</p>}
            {Boolean(row.selectionReason) && <p className="mt-3 text-xs leading-6 text-[#6b5e52]">{String(row.selectionReason)}</p>}
            {Array.isArray(row.gapCoverage) && row.gapCoverage.length > 0 && (
              <p className="mt-2 text-xs leading-6 text-[#8a5a14]">Covers missing classes: {(row.gapCoverage as unknown[]).map(String).join(", ")}</p>
            )}
            {Boolean(row.bestExcerpt) && <p className="mt-3 text-xs leading-6 text-[#6b5e52]">{String(row.bestExcerpt)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChunkList({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{title}</h4>
      <div className="mt-2 space-y-3">
        {rows.length === 0 && <p className="text-sm text-[#6b5e52]">No chunk details available.</p>}
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#111827] px-2 py-0.5 text-[11px] font-semibold text-white">#{String(row.rank ?? index + 1)}</span>
              <p className="text-sm font-semibold text-[#1c1713]">{String(row.title ?? "Untitled chunk")}</p>
            </div>
            <p className="mt-2 text-xs text-[#7a6d63]">{String(row.type ?? "Chunk")}</p>
            <p className="mt-3 text-sm leading-6 text-[#1c1713]">{String(row.excerpt ?? "")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: Record<string, unknown> }) {
  const evidence = (section.evidence as Record<string, unknown> | null | undefined) ?? null;
  const facts = Array.isArray(section.facts) ? (section.facts as Array<Record<string, unknown>>) : [];
  const callouts = Array.isArray(section.callouts) ? (section.callouts as Array<Record<string, unknown>>) : [];
  const bullets = Array.isArray(section.bullets) ? (section.bullets as string[]) : [];
  const blocks = Array.isArray(section.blocks) ? (section.blocks as Array<Record<string, unknown>>) : [];

  return (
    <div className="rounded-[1.1rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[#1c1713]">{String(section.title ?? "Untitled section")}</p>
        <span className="rounded-full bg-[#f0ece4] px-2 py-0.5 text-[11px] font-medium text-[#6b5e52]">{String(section.group ?? "Section")}</span>
        {evidence && (
          <span className="rounded-full bg-[#eef5f8] px-2 py-0.5 text-[11px] font-medium text-[#2d5c6a]">
            {String(evidence.status ?? "unknown")} / {String(evidence.confidence ?? "unknown")}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">{String(section.question ?? "")}</p>
      <p className="mt-3 text-sm leading-6 text-[#1c1713]">{String(section.summary ?? "")}</p>
      {Boolean(evidence?.note) && <p className="mt-3 text-xs leading-6 text-[#6b5e52]">{String(evidence?.note)}</p>}
      {facts.length > 0 && <FactList title="Facts" rows={facts} />}
      {callouts.length > 0 && <FactList title="Callouts" rows={callouts} />}
      {bullets.length > 0 && <ListSection title="Bullets" items={bullets} />}
      {blocks.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Section blocks</h4>
          {blocks.map((block, index) => (
            <div key={`block-${index}`} className="rounded-[1rem] border border-[#e7dfd5] bg-white px-4 py-3">
              <p className="text-sm font-semibold text-[#1c1713]">{String(block.title ?? `Block ${index + 1}`)}</p>
              {Boolean(block.body) && <p className="mt-2 text-sm leading-6 text-[#1c1713]">{String(block.body)}</p>}
              {Array.isArray(block.bullets) && (block.bullets as string[]).length > 0 && (
                <div className="mt-2 space-y-1">
                  {(block.bullets as string[]).map((bullet, bulletIndex) => (
                    <p key={`block-bullet-${bulletIndex}`} className="text-sm leading-6 text-[#6b5e52]">{bullet}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FactList({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">{title}</h4>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className="rounded-[1rem] border border-[#e7dfd5] bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">{String(row.label ?? `Item ${index + 1}`)}</p>
            <p className="mt-2 text-sm leading-6 text-[#1c1713]">{String(row.value ?? "")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}