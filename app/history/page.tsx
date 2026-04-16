"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDateTimeParts, formatGenerationDuration, useRequestTimeZone } from "@/lib/timezone";

interface HistoryItem {
  requestId: string;
  company: { name: string; website_url?: string | null };
  roleTitle: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  companyUrl: string | null;
  hasJobDescription: boolean;
  hasResume: boolean;
  report?: {
    createdAt: string | null;
    recommendation: string;
    candidateFitScore: number | null;
    sectionKeys: string[];
  } | null;
}

interface HistoryStats {
  totalReports: number;
  websitesSearched: number;
  aiQueries: number;
}

const DEFAULT_STATS: HistoryStats = {
  totalReports: 0,
  websitesSearched: 0,
  aiQueries: 0,
};

const REC_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pursue:            { label: "Aggressive Pursue", bg: "bg-[#1a4a3a]/8",  text: "text-[#1a4a3a]", dot: "bg-[#1a4a3a]" },
  pursue_cautiously: { label: "Cautious Pursue",   bg: "bg-amber-50",     text: "text-amber-700",  dot: "bg-amber-500"  },
  avoid:             { label: "Pass",               bg: "bg-red-50",       text: "text-red-700",    dot: "bg-red-500"    },
  need_more_signal:  { label: "Need More Signal",   bg: "bg-[#f0ece4]",   text: "text-[#7a6d63]",  dot: "bg-[#9c8d81]"  },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  completed:                  { label: "Ready",       dot: "bg-emerald-500" },
  failed:                     { label: "Failed",      dot: "bg-red-500" },
  pending:                    { label: "Queued",      dot: "bg-gray-400" },
  fetching_sources:           { label: "Fetching…",  dot: "bg-sky-500 animate-pulse" },
  indexing:                   { label: "Indexing…",  dot: "bg-sky-500 animate-pulse" },
  generating_report:          { label: "Generating…",dot: "bg-violet-500 animate-pulse" },
  generating_deep_analysis:   { label: "Analysing…", dot: "bg-violet-500 animate-pulse" },
  generating_interview_layer: { label: "Generating…",dot: "bg-violet-500 animate-pulse" },
};

// Only surface the most decision-relevant sections in the card
const SECTION_LABELS: Record<string, string> = {
  interview_decision_summary: "Decision",
  five_minute_brief:          "5-Min Brief",
  strategic_bet_analysis:     "Strategic Bet",
  likely_interview_agenda:    "Interview Agenda",
  risks_red_flags:            "Risks",
  unknowns_to_validate:       "Unknowns",
  questions_to_ask:           "Questions",
};
const SECTION_DISPLAY_ORDER = Object.keys(SECTION_LABELS);

function getFitColor(score: number): { bar: string; text: string } {
  if (score >= 8) return { bar: "bg-[#1a4a3a]",  text: "text-[#1a4a3a]"  };
  if (score >= 6) return { bar: "bg-[#4a7a8a]",  text: "text-[#4a7a8a]"  };
  if (score >= 4) return { bar: "bg-amber-500",   text: "text-amber-700"   };
  return             { bar: "bg-red-400",      text: "text-red-700"     };
}

function getFaviconUrl(domain: string | null): string | null {
  if (!domain) return null;
  try {
    const host = new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return null;
  }
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { timeZone, shortLabel } = useRequestTimeZone();

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
        setStats({
          totalReports: data.filter((item) => item.report).length,
          websitesSearched: 0,
          aiQueries: 0,
        });
        return;
      }

      setHistory(data.items ?? []);
      setStats(data.stats ?? DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (e: React.MouseEvent, requestId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this deep dive? All analysis data will be permanently removed.")) return;
    setDeleting(requestId);
    try {
      const res = await fetch(`/api/history/${requestId}`, { method: "DELETE" });
      if (res.ok) setHistory((prev) => prev.filter((h) => h.requestId !== requestId));
      else alert("Failed to delete. Please try again.");
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f3]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#1c1713]">Your Deep Dives</h1>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <span className="text-xs text-[#9c8d81]">Times shown in {shortLabel}</span>
            <Link
              href="/deep-dive/new"
              className="inline-flex items-center gap-1.5 bg-[#1a4a3a] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#153d30] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Deep Dive
            </Link>
          </div>
        </div>

        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Your deep dive dashboard">
          <div className="rounded-2xl border border-[#d8d0c5] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(28,23,19,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Reports Generated</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1c1713]">{stats.totalReports}</p>
                <p className="mt-1 text-sm text-[#7a6d63]">Completed intelligence briefs in your workspace</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1a4a3a]/8 text-[#1a4a3a]" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d8d0c5] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(28,23,19,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Websites Searched</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1c1713]">{stats.websitesSearched}</p>
                <p className="mt-1 text-sm text-[#7a6d63]">Distinct company, news, and career domains analyzed</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4a7a8a]/10 text-[#4a7a8a]" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 010 18M12 3a15.3 15.3 0 000 18" />
                </svg>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d8d0c5] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(28,23,19,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">AI Queries</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1c1713]">{stats.aiQueries}</p>
                <p className="mt-1 text-sm text-[#7a6d63]">Total model calls used to build your briefs</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#e4ddd4] rounded-xl p-5 shadow-[0_1px_4px_rgba(28,23,19,0.06)] animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#f0ece4]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#f0ece4] rounded w-1/3" />
                    <div className="h-3 bg-[#f0ece4] rounded w-1/2" />
                    <div className="h-3 bg-[#f0ece4] rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#e4ddd4] rounded-xl shadow-[0_2px_12px_rgba(28,23,19,0.05)]">
            <p className="text-[#7a6d63] text-sm mb-5">No deep dives yet.</p>
            <Link
              href="/deep-dive/new"
              className="inline-flex items-center gap-1.5 bg-[#1a4a3a] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#153d30] transition-colors"
            >
              Create Your First Deep Dive
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const createdAtParts = formatDateTimeParts(item.createdAt, timeZone);
              const faviconUrl = getFaviconUrl(item.companyUrl);
              const rec = item.report ? (REC_CONFIG[item.report.recommendation] ?? REC_CONFIG.need_more_signal) : null;
              const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, dot: "bg-gray-400" };
              const isReady = item.status === "completed";
              const isDeleting = deleting === item.requestId;
              const generationDuration = formatGenerationDuration(item.createdAt, item.completedAt);

              const fitScore = item.report?.candidateFitScore ?? null;
              const fitColors = fitScore != null ? getFitColor(fitScore) : null;

              // Sections present in this report, filtered to display set
              const presentSections = (item.report?.sectionKeys ?? [])
                .filter((k) => SECTION_LABELS[k])
                .sort((a, b) => SECTION_DISPLAY_ORDER.indexOf(a) - SECTION_DISPLAY_ORDER.indexOf(b));

              const card = (
                <div className="bg-white border border-[#e4ddd4] rounded-xl p-5 shadow-[0_1px_4px_rgba(28,23,19,0.05),0_4px_16px_rgba(28,23,19,0.04)] hover:shadow-[0_4px_16px_rgba(28,23,19,0.08),0_8px_32px_rgba(28,23,19,0.06)] hover:border-[#c8bfb4] transition-all duration-200 group">
                  <div className="flex items-start gap-4">

                    {/* Favicon */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f0ece4] flex items-center justify-center overflow-hidden mt-0.5">
                      {faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={faviconUrl} alt="" width={20} height={20}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <span className="text-xs font-bold text-[#9c8d81]">
                          {item.company.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2.5">

                      {/* Row 1: company + role + status/rec */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1c1713] truncate">{item.company.name}</p>
                          <p className="text-sm text-[#7a6d63] truncate">{item.roleTitle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {rec && isReady ? (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${rec.bg} ${rec.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rec.dot}`} />
                              {rec.label}
                            </span>
                          ) : !isReady ? (
                            <span className="flex items-center gap-1.5 text-xs text-[#9c8d81]">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Row 2: candidate fit score (only if resume was used) */}
                      {fitScore != null && fitColors && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 flex-shrink-0">Candidate fit</span>
                          <div className="flex-1 max-w-[120px] h-1.5 bg-[#e8e2d8] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${fitColors.bar}`}
                              style={{ width: `${fitScore * 10}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${fitColors.text}`}>{fitScore}/10</span>
                        </div>
                      )}

                      {/* Row 3: sections present */}
                      {presentSections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {presentSections.map((key) => (
                            <span key={key} className="text-xs bg-[#f0ece4] text-[#7a6d63] px-2 py-0.5 rounded-md">
                              {SECTION_LABELS[key]}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Row 4: meta */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-[#9c8d81]">
                          {createdAtParts ? `${createdAtParts.date} · ${createdAtParts.time} ${createdAtParts.shortLabel}` : "—"}
                        </span>
                        {isReady && generationDuration && (
                          <span className="text-xs text-[#1a4a3a] flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Generated in {generationDuration}
                          </span>
                        )}
                        {item.hasJobDescription && (
                          <span className="text-xs text-[#9c8d81] flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            JD included
                          </span>
                        )}
                        {item.hasResume && (
                          <span className="text-xs text-[#1a4a3a] flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Personalized
                          </span>
                        )}
                        {item.companyUrl && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(item.companyUrl!, "_blank", "noopener,noreferrer"); }}
                            className="text-xs text-[#9c8d81] hover:text-[#6b5e52] flex items-center gap-1 underline underline-offset-2 decoration-[#c8bfb4] hover:decoration-[#9c8d81] transition-colors focus:outline-none"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Company site
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete button — hover-reveal */}
                    <button
                      onClick={(e) => handleDelete(e, item.requestId)}
                      disabled={isDeleting}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#c8bfb4] hover:text-red-500 hover:bg-red-50 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400 transition-all disabled:opacity-40"
                      aria-label={`Delete ${item.company.name} – ${item.roleTitle}`}
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
                <Link key={item.requestId} href={`/deep-dive/${item.requestId}`} className="block">
                  {card}
                </Link>
              ) : (
                <div key={item.requestId} className="block">{card}</div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
