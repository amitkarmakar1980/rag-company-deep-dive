"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface HistoryItem {
  requestId: string;
  company: { name: string; website_url?: string | null };
  roleTitle: string;
  status: string;
  createdAt: string;
  companyUrl: string | null;
  hasJobDescription: boolean;
  hasResume: boolean;
  report?: { recommendation: string } | null;
}

const REC_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pursue:           { label: "Aggressive Pursue", bg: "bg-emerald-100", text: "text-emerald-800" },
  pursue_cautiously:{ label: "Cautious Pursue",   bg: "bg-amber-100",   text: "text-amber-800" },
  avoid:            { label: "Pass",               bg: "bg-red-100",     text: "text-red-800" },
  need_more_signal: { label: "More Signal Needed", bg: "bg-gray-100",    text: "text-gray-600" },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  completed:                  { label: "Ready",       dot: "bg-emerald-500" },
  failed:                     { label: "Failed",       dot: "bg-red-500" },
  pending:                    { label: "Queued",       dot: "bg-gray-400" },
  fetching_sources:           { label: "Fetching…",   dot: "bg-sky-500 animate-pulse" },
  indexing:                   { label: "Indexing…",   dot: "bg-sky-500 animate-pulse" },
  generating_report:          { label: "Generating…", dot: "bg-violet-500 animate-pulse" },
  generating_deep_analysis:   { label: "Analysing…",  dot: "bg-violet-500 animate-pulse" },
  generating_interview_layer: { label: "Generating…", dot: "bg-violet-500 animate-pulse" },
};

function getFaviconUrl(domain: string | null): string | null {
  if (!domain) return null;
  try {
    const host = new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return null;
  }
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) setHistory(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (e: React.MouseEvent, requestId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this deep dive? This cannot be undone.")) return;
    setDeleting(requestId);
    try {
      const res = await fetch(`/api/history/${requestId}`, { method: "DELETE" });
      if (res.ok) setHistory((prev) => prev.filter((h) => h.requestId !== requestId));
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Deep Dives</h1>
          <Link
            href="/deep-dive/new"
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Deep Dive
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <p className="text-gray-500 text-sm mb-5">No deep dives yet.</p>
            <Link
              href="/deep-dive/new"
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create Your First Deep Dive
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const { date, time } = formatDateTime(item.createdAt);
              const faviconUrl = getFaviconUrl(item.companyUrl);
              const rec = item.report ? (REC_CONFIG[item.report.recommendation] ?? REC_CONFIG.need_more_signal) : null;
              const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, dot: "bg-gray-400" };
              const isReady = item.status === "completed";
              const isDeleting = deleting === item.requestId;

              const card = (
                <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-4">
                    {/* Company favicon / placeholder */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden mt-0.5">
                      {faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={faviconUrl}
                          alt={item.company.name}
                          width={20}
                          height={20}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">
                          {item.company.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.company.name}</p>
                          <p className="text-sm text-gray-500 truncate">{item.roleTitle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {rec && isReady && (
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${rec.bg} ${rec.text}`}>
                              {rec.label}
                            </span>
                          )}
                          {!isReady && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-gray-400">{date} · {time}</span>
                        {item.hasJobDescription && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            JD included
                          </span>
                        )}
                        {item.hasResume && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Personalized
                          </span>
                        )}
                        {item.companyUrl && (
                          <a
                            href={item.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Company site
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, item.requestId)}
                      disabled={isDeleting}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all disabled:opacity-40"
                      aria-label={`Delete ${item.company.name} deep dive`}
                    >
                      {isDeleting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );

              return isReady ? (
                <Link key={item.requestId} href={`/deep-dive/${item.requestId}`}>
                  {card}
                </Link>
              ) : (
                <div key={item.requestId}>{card}</div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
