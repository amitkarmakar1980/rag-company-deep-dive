"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/admin";
import { formatDateTimeWithZone, useRequestTimeZone } from "@/lib/timezone";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PromptFeedbackQueueItem = {
  requestId: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  companyUrl: string | null;
  requestCreatedAt: string;
  requestUpdatedAt: string | null;
  rowKey: string;
  rowLabel: string;
  actionId: string;
  scope: "draft_section" | "pipeline_step";
  sectionKey: string | null;
  sectionTitle: string | null;
  expectedOutputText: string;
  expectedOutputHtml: string;
  hasResumeContext: boolean;
  capturedAt: string;
  source: "admin_diagnostics";
  promptTarget: "prompt_update_candidate";
  reviewStatus: "pending" | "approved" | "rejected" | "needs_more_context";
  promptArea: "report_generation" | "evaluation" | "retrieval" | "ingestion" | "overlay" | "other" | null;
  reviewNotes: string;
  reviewUpdatedAt: string | null;
};

type PromptFeedbackQueueResponse = {
  fetchedAt: string;
  source: "admin_diagnostics";
  totalRequestsScanned: number;
  totalEntries: number;
  queue: PromptFeedbackQueueItem[];
};

type ReviewStatus = PromptFeedbackQueueItem["reviewStatus"];
type PromptArea = PromptFeedbackQueueItem["promptArea"];
type DraftReviewStateEntry = {
  reviewStatus: ReviewStatus;
  promptArea: PromptArea;
  reviewNotes: string;
};

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export default function AdminPromptFeedbackPage() {
  const router = useRouter();
  const { timeZone, shortLabel } = useRequestTimeZone();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<PromptFeedbackQueueResponse | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [promptAreaFilter, setPromptAreaFilter] = useState("all");
  const [bulkReviewStatus, setBulkReviewStatus] = useState<ReviewStatus>("approved");
  const [bulkPromptArea, setBulkPromptArea] = useState<Exclude<PromptArea, null> | "">("");
  const [exportBusy, setExportBusy] = useState<false | "json" | "jsonl">(false);
  const [draftReviewState, setDraftReviewState] = useState<
    Record<string, DraftReviewStateEntry>
  >({});
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<false | "status" | "promptArea">(false);

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
    if (!authorized) {
      return;
    }

    let cancelled = false;

    async function loadQueue() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/prompt-feedback?limit=300");
        const payload = (await response.json()) as PromptFeedbackQueueResponse | { error?: string };
        if (!response.ok) {
          throw new Error("error" in payload ? payload.error ?? `Request failed with ${response.status}` : `Request failed with ${response.status}`);
        }

        if (!cancelled) {
          const nextPayload = payload as PromptFeedbackQueueResponse;
          setQueueData(nextPayload);
          setDraftReviewState(
            Object.fromEntries(
              nextPayload.queue.map((item) => [
                `${item.requestId}:${item.rowKey}`,
                {
                  reviewStatus: item.reviewStatus,
                  promptArea: item.promptArea,
                  reviewNotes: item.reviewNotes,
                },
              ])
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [authorized]);

  const filteredQueue = useMemo(() => {
    const source = queueData?.queue ?? [];
    const now = Date.now();
    return source.filter((item) => {
      if (actionFilter !== "all" && item.actionId !== actionFilter) {
        return false;
      }
      if (sectionFilter !== "all") {
        if (sectionFilter === "pipeline_step" && item.scope !== "pipeline_step") {
          return false;
        }
        if (sectionFilter !== "pipeline_step" && item.sectionKey !== sectionFilter) {
          return false;
        }
      }
      if (companyFilter.trim() && !`${item.companyName} ${item.roleTitle}`.toLowerCase().includes(companyFilter.trim().toLowerCase())) {
        return false;
      }
      if (reviewStatusFilter !== "all" && item.reviewStatus !== reviewStatusFilter) {
        return false;
      }
      if (promptAreaFilter !== "all" && (item.promptArea ?? "unassigned") !== promptAreaFilter) {
        return false;
      }
      if (dateFilter !== "all") {
        const ageMs = now - new Date(item.capturedAt).getTime();
        const maxAgeMs =
          dateFilter === "7d" ? 7 * 24 * 60 * 60 * 1000 :
          dateFilter === "30d" ? 30 * 24 * 60 * 60 * 1000 :
          90 * 24 * 60 * 60 * 1000;
        if (ageMs > maxAgeMs) {
          return false;
        }
      }
      return true;
    });
  }, [actionFilter, companyFilter, dateFilter, promptAreaFilter, queueData, reviewStatusFilter, sectionFilter]);

  const actionOptions = useMemo(
    () => Array.from(new Set((queueData?.queue ?? []).map((item) => item.actionId))).sort(),
    [queueData]
  );
  const sectionOptions = useMemo(() => {
    const entries = new Map<string, string>();
    for (const item of queueData?.queue ?? []) {
      if (item.sectionKey && item.sectionTitle) {
        entries.set(item.sectionKey, item.sectionTitle);
      }
    }
    return Array.from(entries.entries()).sort((left, right) => left[1].localeCompare(right[1]));
  }, [queueData]);

  const approvedFilteredQueue = useMemo(
    () => filteredQueue.filter((item) => item.reviewStatus === "approved"),
    [filteredQueue]
  );

  function applyLocalReviewUpdates(entries: Array<{ requestId: string; rowKey: string; review: { status: ReviewStatus; promptArea: PromptArea; reviewNotes: string; updatedAt: string } }>) {
    if (entries.length === 0) {
      return;
    }

    const entryMap = new Map(entries.map((entry) => [`${entry.requestId}:${entry.rowKey}`, entry.review]));

    setQueueData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        queue: current.queue.map((queueItem) => {
          const match = entryMap.get(`${queueItem.requestId}:${queueItem.rowKey}`);
          if (!match) {
            return queueItem;
          }

          return {
            ...queueItem,
            reviewStatus: match.status,
            promptArea: match.promptArea,
            reviewNotes: match.reviewNotes,
            reviewUpdatedAt: match.updatedAt,
          };
        }),
      };
    });

    setDraftReviewState((current) => {
      const nextState = { ...current };
      for (const entry of entries) {
        nextState[`${entry.requestId}:${entry.rowKey}`] = {
          reviewStatus: entry.review.status,
          promptArea: entry.review.promptArea,
          reviewNotes: entry.review.reviewNotes,
        };
      }
      return nextState;
    });
  }

  async function saveReviewDecision(item: PromptFeedbackQueueItem) {
    const stateKey = `${item.requestId}:${item.rowKey}`;
    const draft = draftReviewState[stateKey];
    if (!draft) {
      return;
    }

    setSavingRowKey(stateKey);
    setError(null);
    try {
      const response = await fetch("/api/admin/prompt-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: item.requestId,
          rowKey: item.rowKey,
          status: draft.reviewStatus,
          promptArea: draft.promptArea,
          reviewNotes: draft.reviewNotes,
        }),
      });

      const payload = (await response.json()) as {
        review?: {
          status: PromptFeedbackQueueItem["reviewStatus"];
          promptArea: PromptFeedbackQueueItem["promptArea"];
          reviewNotes: string;
          updatedAt: string;
        };
        error?: string;
        rowKey?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed with ${response.status}`);
      }

      if (!payload.review) {
        throw new Error("Review response was missing review data.");
      }

      const savedReview = payload.review;
      applyLocalReviewUpdates([
        {
          requestId: item.requestId,
          rowKey: item.rowKey,
          review: savedReview,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSavingRowKey(null);
    }
  }

  async function applyBulkReviewStatus() {
    if (filteredQueue.length === 0) {
      return;
    }

    setBulkBusy("status");
    setError(null);
    try {
      const grouped = new Map<string, Array<{ item: PromptFeedbackQueueItem; draft: DraftReviewStateEntry }>>();
      for (const item of filteredQueue) {
        const stateKey = `${item.requestId}:${item.rowKey}`;
        const draft = draftReviewState[stateKey] ?? {
          reviewStatus: item.reviewStatus,
          promptArea: item.promptArea,
          reviewNotes: item.reviewNotes,
        };
        const nextEntry = {
          item,
          draft: {
            ...draft,
            reviewStatus: bulkReviewStatus,
          },
        };
        const existing = grouped.get(item.requestId) ?? [];
        existing.push(nextEntry);
        grouped.set(item.requestId, existing);
      }

      const updates: Array<{ requestId: string; rowKey: string; review: { status: ReviewStatus; promptArea: PromptArea; reviewNotes: string; updatedAt: string } }> = [];

      for (const [requestId, entries] of grouped.entries()) {
        const response = await fetch("/api/admin/prompt-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            entries: entries.map(({ item, draft }) => ({
              rowKey: item.rowKey,
              status: draft.reviewStatus,
              promptArea: draft.promptArea,
              reviewNotes: draft.reviewNotes,
            })),
          }),
        });

        const payload = (await response.json()) as {
          reviews?: Record<string, { status: ReviewStatus; promptArea: PromptArea; reviewNotes: string; updatedAt: string }>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? `Request failed with ${response.status}`);
        }

        if (!payload.reviews) {
          throw new Error("Bulk review response was missing review data.");
        }

        for (const { item } of entries) {
          const savedReview = payload.reviews[item.rowKey];
          if (!savedReview) {
            continue;
          }
          updates.push({ requestId, rowKey: item.rowKey, review: savedReview });
        }
      }

      applyLocalReviewUpdates(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function applyBulkPromptArea() {
    if (filteredQueue.length === 0 || !bulkPromptArea) {
      return;
    }

    setBulkBusy("promptArea");
    setError(null);
    try {
      const grouped = new Map<string, Array<{ item: PromptFeedbackQueueItem; draft: DraftReviewStateEntry }>>();
      for (const item of filteredQueue) {
        const stateKey = `${item.requestId}:${item.rowKey}`;
        const draft = draftReviewState[stateKey] ?? {
          reviewStatus: item.reviewStatus,
          promptArea: item.promptArea,
          reviewNotes: item.reviewNotes,
        };
        const nextEntry = {
          item,
          draft: {
            ...draft,
            promptArea: bulkPromptArea,
          },
        };
        const existing = grouped.get(item.requestId) ?? [];
        existing.push(nextEntry);
        grouped.set(item.requestId, existing);
      }

      const updates: Array<{ requestId: string; rowKey: string; review: { status: ReviewStatus; promptArea: PromptArea; reviewNotes: string; updatedAt: string } }> = [];

      for (const [requestId, entries] of grouped.entries()) {
        const response = await fetch("/api/admin/prompt-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            entries: entries.map(({ item, draft }) => ({
              rowKey: item.rowKey,
              status: draft.reviewStatus,
              promptArea: draft.promptArea,
              reviewNotes: draft.reviewNotes,
            })),
          }),
        });

        const payload = (await response.json()) as {
          reviews?: Record<string, { status: ReviewStatus; promptArea: PromptArea; reviewNotes: string; updatedAt: string }>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? `Request failed with ${response.status}`);
        }

        if (!payload.reviews) {
          throw new Error("Bulk review response was missing review data.");
        }

        for (const { item } of entries) {
          const savedReview = payload.reviews[item.rowKey];
          if (!savedReview) {
            continue;
          }
          updates.push({ requestId, rowKey: item.rowKey, review: savedReview });
        }
      }

      applyLocalReviewUpdates(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function exportFilteredQueue(format: "json" | "jsonl", options?: { approvedOnly?: boolean }) {
    setExportBusy(format);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const targetQueue = options?.approvedOnly ? approvedFilteredQueue : filteredQueue;
      const fileBase = options?.approvedOnly ? "prompt-feedback-approved-queue" : "prompt-feedback-review-queue";
      if (format === "json") {
        downloadTextFile(
          `${fileBase}-${timestamp}.json`,
          JSON.stringify(
            {
              fetchedAt: queueData?.fetchedAt ?? new Date().toISOString(),
              filteredCount: targetQueue.length,
              approvedOnly: Boolean(options?.approvedOnly),
              filters: {
                actionFilter,
                sectionFilter,
                companyFilter,
                dateFilter,
                reviewStatusFilter,
                promptAreaFilter,
              },
              queue: targetQueue,
            },
            null,
            2
          ),
          "application/json"
        );
      } else {
        downloadTextFile(
          `${fileBase}-${timestamp}.jsonl`,
          `${targetQueue.map((item) => JSON.stringify(item)).join("\n")}\n`,
          "application/x-ndjson"
        );
      }
    } finally {
      setExportBusy(false);
    }
  }

  if (authorized === null) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] text-[#1c1713]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8c7e73]">Admin only</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1c1713]">Prompt Feedback Queue</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b5e52]">
              Review diagnostics expected-output feedback across requests before folding it into prompt updates. Times shown in {shortLabel}.
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
              href="/admin/diagnostics"
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8]"
            >
              Diagnostics
            </Link>
            <button
              type="button"
              onClick={() => void exportFilteredQueue("json")}
              disabled={exportBusy !== false || filteredQueue.length === 0}
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportBusy === "json" ? "Exporting JSON" : "Export Filtered JSON"}
            </button>
            <button
              type="button"
              onClick={() => void exportFilteredQueue("jsonl")}
              disabled={exportBusy !== false || filteredQueue.length === 0}
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportBusy === "jsonl" ? "Exporting JSONL" : "Export Filtered JSONL"}
            </button>
            <button
              type="button"
              onClick={() => void exportFilteredQueue("jsonl", { approvedOnly: true })}
              disabled={exportBusy !== false || approvedFilteredQueue.length === 0}
              className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportBusy === "jsonl" ? "Exporting JSONL" : "Export Approved JSONL"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 rounded-[1.5rem] border border-[#e4ddd4] bg-white p-6 shadow-[0_18px_40px_rgba(28,25,23,0.06)]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Action</span>
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
              >
                <option value="all">All actions</option>
                {actionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Section</span>
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
              >
                <option value="all">All sections</option>
                <option value="pipeline_step">Pipeline steps only</option>
                {sectionOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Company or role</span>
              <input
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
                placeholder="Filter by company or role"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Captured date</span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Review status</span>
              <select
                value={reviewStatusFilter}
                onChange={(event) => setReviewStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_more_context">Needs more context</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Prompt area</span>
              <select
                value={promptAreaFilter}
                onChange={(event) => setPromptAreaFilter(event.target.value)}
                className="w-full rounded-2xl border border-[#ddd4c8] bg-[#fcfbf8] px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
              >
                <option value="all">All prompt areas</option>
                <option value="unassigned">Unassigned</option>
                <option value="report_generation">Report generation</option>
                <option value="evaluation">Evaluation</option>
                <option value="retrieval">Retrieval</option>
                <option value="ingestion">Ingestion</option>
                <option value="overlay">Overlay</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[220px] flex-1">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">Bulk review status</span>
                <select
                  value={bulkReviewStatus}
                  onChange={(event) => setBulkReviewStatus(event.target.value as ReviewStatus)}
                  className="w-full rounded-2xl border border-[#ddd4c8] bg-white px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="needs_more_context">Needs more context</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => void applyBulkReviewStatus()}
                disabled={bulkBusy !== false || filteredQueue.length === 0}
                className="rounded-full bg-[#1c1713] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              >
                {bulkBusy === "status" ? "Applying status" : `Apply to ${filteredQueue.length} filtered row${filteredQueue.length === 1 ? "" : "s"}`}
              </button>

              <label className="block min-w-[220px] flex-1">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">Bulk prompt area</span>
                <select
                  value={bulkPromptArea}
                  onChange={(event) => setBulkPromptArea(event.target.value as Exclude<PromptArea, null> | "")}
                  className="w-full rounded-2xl border border-[#ddd4c8] bg-white px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
                >
                  <option value="">Select prompt area</option>
                  <option value="report_generation">Report generation</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="retrieval">Retrieval</option>
                  <option value="ingestion">Ingestion</option>
                  <option value="overlay">Overlay</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => void applyBulkPromptArea()}
                disabled={bulkBusy !== false || filteredQueue.length === 0 || !bulkPromptArea}
                className="rounded-full border border-[#ddd4c8] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b5e52] transition-colors hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {bulkBusy === "promptArea" ? "Assigning area" : "Assign area to filtered"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <QueueStat label="Filtered entries" value={filteredQueue.length} />
            <QueueStat label="Requests scanned" value={queueData?.totalRequestsScanned ?? 0} />
            <QueueStat label="Last refresh" value={queueData ? formatDateTimeWithZone(queueData.fetchedAt, timeZone) : "—"} />
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-[1.5rem] bg-[#f0ece4]" />
            ))
          ) : filteredQueue.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[#e4ddd4] bg-white px-6 py-10 text-sm text-[#6b5e52] shadow-[0_18px_40px_rgba(28,25,23,0.06)]">
              No prompt-feedback entries match the current filters.
            </div>
          ) : (
            filteredQueue.map((item) => (
              <article
                key={`${item.requestId}:${item.rowKey}:${item.capturedAt}`}
                className="rounded-[1.5rem] border border-[#e4ddd4] bg-white p-6 shadow-[0_18px_40px_rgba(28,25,23,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f0ece4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b5e52]">
                        {item.actionId}
                      </span>
                      <span className="rounded-full bg-[#eef5f8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2d5c6a]">
                        {item.scope === "draft_section" ? item.sectionTitle ?? item.sectionKey ?? "Draft section" : "Pipeline step"}
                      </span>
                      {item.hasResumeContext && (
                        <span className="rounded-full bg-[#edf6f0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1a4a3a]">
                          Resume context present
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#1c1713]">{item.companyName} / {item.roleTitle}</h2>
                    <p className="mt-1 text-sm text-[#6b5e52]">
                      {item.rowLabel} • Captured {formatDateTimeWithZone(item.capturedAt, timeZone)} • Request {item.requestId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/diagnostics`}
                      className="rounded-full border border-[#ddd4c8] bg-white px-4 py-2 text-xs font-semibold text-[#6b5e52] transition-colors hover:bg-[#f5f1e8]"
                    >
                      Open diagnostics
                    </Link>
                    <Link
                      href={`/deep-dive/${item.requestId}`}
                      className="rounded-full border border-[#cfe1d8] bg-[#edf6f0] px-4 py-2 text-xs font-semibold text-[#1a4a3a] transition-colors hover:bg-[#e4f0e8]"
                    >
                      Open report page
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c7e73]">Expected output text</h3>
                    <div className="mt-2 rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-[#1c1713] whitespace-pre-wrap">
                      {item.expectedOutputText || "No plain-text expected output captured."}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <MetaRow label="Section key" value={item.sectionKey ?? "—"} />
                    <MetaRow label="Prompt target" value={item.promptTarget} />
                    <MetaRow label="Company URL" value={item.companyUrl ?? "—"} />
                    <MetaRow label="Request created" value={formatDateTimeWithZone(item.requestCreatedAt, timeZone)} />
                    <MetaRow label="Request updated" value={item.requestUpdatedAt ? formatDateTimeWithZone(item.requestUpdatedAt, timeZone) : "—"} />
                  </div>
                </div>

                <div className="mt-5 rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] p-4">
                  <div className="grid gap-4 lg:grid-cols-[220px_220px_minmax(0,1fr)_auto] lg:items-start">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">Review status</span>
                      <select
                        value={draftReviewState[`${item.requestId}:${item.rowKey}`]?.reviewStatus ?? item.reviewStatus}
                        onChange={(event) =>
                          setDraftReviewState((current) => ({
                            ...current,
                            [`${item.requestId}:${item.rowKey}`]: {
                              reviewStatus: event.target.value as PromptFeedbackQueueItem["reviewStatus"],
                              promptArea: current[`${item.requestId}:${item.rowKey}`]?.promptArea ?? item.promptArea,
                              reviewNotes: current[`${item.requestId}:${item.rowKey}`]?.reviewNotes ?? item.reviewNotes,
                            },
                          }))
                        }
                        className="w-full rounded-2xl border border-[#ddd4c8] bg-white px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="needs_more_context">Needs more context</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">Prompt area</span>
                      <select
                        value={draftReviewState[`${item.requestId}:${item.rowKey}`]?.promptArea ?? item.promptArea ?? ""}
                        onChange={(event) =>
                          setDraftReviewState((current) => ({
                            ...current,
                            [`${item.requestId}:${item.rowKey}`]: {
                              reviewStatus: current[`${item.requestId}:${item.rowKey}`]?.reviewStatus ?? item.reviewStatus,
                              promptArea: (event.target.value || null) as PromptFeedbackQueueItem["promptArea"],
                              reviewNotes: current[`${item.requestId}:${item.rowKey}`]?.reviewNotes ?? item.reviewNotes,
                            },
                          }))
                        }
                        className="w-full rounded-2xl border border-[#ddd4c8] bg-white px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
                      >
                        <option value="">Unassigned</option>
                        <option value="report_generation">Report generation</option>
                        <option value="evaluation">Evaluation</option>
                        <option value="retrieval">Retrieval</option>
                        <option value="ingestion">Ingestion</option>
                        <option value="overlay">Overlay</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">Review notes</span>
                      <textarea
                        value={draftReviewState[`${item.requestId}:${item.rowKey}`]?.reviewNotes ?? item.reviewNotes}
                        onChange={(event) =>
                          setDraftReviewState((current) => ({
                            ...current,
                            [`${item.requestId}:${item.rowKey}`]: {
                              reviewStatus: current[`${item.requestId}:${item.rowKey}`]?.reviewStatus ?? item.reviewStatus,
                              promptArea: current[`${item.requestId}:${item.rowKey}`]?.promptArea ?? item.promptArea,
                              reviewNotes: event.target.value,
                            },
                          }))
                        }
                        className="min-h-24 w-full rounded-2xl border border-[#ddd4c8] bg-white px-4 py-3 text-sm text-[#1c1713] outline-none focus:border-[#8a5a14]"
                        placeholder="Why should this be accepted, rejected, or sent back for more context?"
                      />
                    </label>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void saveReviewDecision(item)}
                        disabled={savingRowKey === `${item.requestId}:${item.rowKey}`}
                        className="rounded-full bg-[#1c1713] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {savingRowKey === `${item.requestId}:${item.rowKey}` ? "Saving" : "Save review"}
                      </button>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8c7e73]">
                        {item.reviewUpdatedAt ? `Last saved ${formatDateTimeWithZone(item.reviewUpdatedAt, timeZone)}` : "Not reviewed yet"}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function QueueStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#1c1713]">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[#e7dfd5] bg-[#fcfbf8] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c7e73]">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-[#1c1713]">{value}</p>
    </div>
  );
}