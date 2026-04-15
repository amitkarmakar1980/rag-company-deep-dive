"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/admin";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function fmtUsd(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toFixed(4)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, icon, iconClassName }: { title: string; icon: ReactNode; iconClassName: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${iconClassName}`}>
        {icon}
      </span>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{title}</h2>
    </div>
  );
}

function SparkChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5 9 12l3 3 7.5-8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6.75h1.5v1.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M13.25 2.75 6.9 12.1a.75.75 0 0 0 .62 1.17h3.82l-1.1 7.19a.75.75 0 0 0 1.36.51l6.5-9.68a.75.75 0 0 0-.62-1.17h-3.86l1-6.44a.75.75 0 0 0-1.37-.93Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 18.75v-.75A3.75 3.75 0 0 0 12 14.25H7.5A3.75 3.75 0 0 0 3.75 18v.75" />
      <circle cx="9.75" cy="7.5" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 18.75v-.75a3 3 0 0 0-2.25-2.902" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 4.78a3 3 0 0 1 0 5.44" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3.5l2-4.5 4.5 9 2.25-4.5h4.25" />
    </svg>
  );
}

const REC_COLORS: Record<string, string> = {
  pursue: "bg-emerald-100 text-emerald-800",
  pursue_cautiously: "bg-amber-100 text-amber-800",
  avoid: "bg-red-100 text-red-800",
  need_more_signal: "bg-gray-100 text-gray-600",
};

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchAll = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, activityRes, usageRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch(`/api/admin/users?page=${p}`),
        fetch("/api/admin/activity"),
        fetch("/api/admin/usage"),
      ]);

      const failed: string[] = [];
      if (!statsRes.ok) failed.push(`stats (${statsRes.status})`);
      if (!usersRes.ok) failed.push(`users (${usersRes.status})`);
      if (!activityRes.ok) failed.push(`activity (${activityRes.status})`);
      if (!usageRes.ok) failed.push(`usage (${usageRes.status})`);
      if (failed.length > 0) {
        // Try to extract error messages from failed responses
        const msgs = await Promise.all(
          [
            !statsRes.ok ? statsRes.json().catch(() => ({})) : null,
            !usersRes.ok ? usersRes.json().catch(() => ({})) : null,
            !activityRes.ok ? activityRes.json().catch(() => ({})) : null,
            !usageRes.ok ? usageRes.json().catch(() => ({})) : null,
          ].filter(Boolean)
        );
        const errDetails = msgs.map((m: any) => m?.error).filter(Boolean).join("; ");
        throw new Error(`Failed: ${failed.join(", ")}${errDetails ? ` — ${errDetails}` : ""}`);
      }

      const [s, u, a, us] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        activityRes.json(),
        usageRes.json(),
      ]);

      setStats(s);
      setUsers(u);
      setActivity(a);
      setUsage(us);
    } catch (e: any) {
      setError(e.message ?? "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) fetchAll(page);
  }, [authorized, page, fetchAll]);

  if (authorized === null) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
        <button
          onClick={() => fetchAll(page)}
          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ── Overview stats ── */}
      <section>
        <SectionHeader title="Overview" icon={<SparkChartIcon />} iconClassName="bg-emerald-100 text-emerald-700" />
        {loading || !stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Users" value={fmt(stats.total_users, 0)} />
            <StatCard label="Active (30d)" value={fmt(stats.active_users_30d, 0)} sub="distinct users" />
            <StatCard label="Total Requests" value={fmt(stats.total_requests, 0)} />
            <StatCard label="Completed Reports" value={fmt(stats.completed_reports, 0)} />
            <StatCard
              label="Total AI Spend"
              value={fmtUsd(stats.total_spend_usd)}
              sub="tracked in DB"
            />
            <StatCard
              label="Total Tokens"
              value={fmt(stats.total_tokens, 0)}
              sub="all time"
            />
          </div>
        )}
      </section>

      {/* ── API Usage ── */}
      <section>
        <SectionHeader title="API Usage & Balances" icon={<BoltIcon />} iconClassName="bg-amber-100 text-amber-700" />
        {loading || !usage ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* OpenAI */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-gray-900">OpenAI</p>
              </div>
              <p className="text-xs text-gray-400">Balance not available via API — showing tracked spend from DB</p>
              <div className="space-y-1.5">
                <Row label="Tracked spend (all time)" value={fmtUsd(usage.openai?.tracked_spend_usd_total)} />
                <Row label="Tracked spend (30d)" value={fmtUsd(usage.openai?.tracked_spend_usd_30d)} />
                <Row label="Total tokens (all time)" value={fmt(usage.openai?.tracked_tokens_total, 0)} />
                <Row label="Total tokens (30d)" value={fmt(usage.openai?.tracked_tokens_30d, 0)} />
              </div>
            </div>

            {/* Firecrawl */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <p className="text-sm font-semibold text-gray-900">Firecrawl</p>
              </div>
              {usage.firecrawl?.error ? (
                <p className="text-xs text-amber-600">
                  Could not fetch balance: {usage.firecrawl.error}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Row
                    label="Credits remaining"
                    value={
                      usage.firecrawl?.credits_remaining != null
                        ? fmt(usage.firecrawl.credits_remaining, 0)
                        : "—"
                    }
                  />
                </div>
              )}
            </div>

            {/* Supabase */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <p className="text-sm font-semibold text-gray-900">Supabase</p>
              </div>
              <p className="text-xs text-gray-400">{usage.supabase?.note}</p>
              <div className="space-y-1.5">
                <Row label="Users" value={fmt(usage.supabase?.rows?.users, 0)} />
                <Row label="Requests" value={fmt(usage.supabase?.rows?.requests, 0)} />
                <Row label="Reports" value={fmt(usage.supabase?.rows?.reports, 0)} />
                <Row label="Sources" value={fmt(usage.supabase?.rows?.sources, 0)} />
                <Row label="Chunks" value={fmt(usage.supabase?.rows?.chunks, 0)} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Users table ── */}
      <section>
        <SectionHeader title="Users" icon={<PeopleIcon />} iconClassName="bg-sky-100 text-sky-700" />
        {loading || !users ? (
          <div className="bg-gray-100 rounded-xl h-64 animate-pulse" />
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Name</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Email</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Joined</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Last Activity</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Requests</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-900 font-medium whitespace-nowrap">{u.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{u.auth_email ?? u.email}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(u.last_activity)}</td>
                      <td className="px-5 py-3 text-gray-900 text-right">{u.total_requests}</td>
                      <td className="px-5 py-3 text-gray-900 text-right">{u.completed_reports}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">
                  Showing {((users.page - 1) * users.page_size) + 1}–
                  {Math.min(users.page * users.page_size, users.total)} of {users.total} users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {page} of {users.total_pages}
                  </span>
                  <button
                    disabled={page === users.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Recent activity ── */}
      <section>
        <SectionHeader title="Last 10 Activities (All Users)" icon={<ActivityIcon />} iconClassName="bg-fuchsia-100 text-fuchsia-700" />
        {loading || !activity ? (
          <div className="bg-gray-100 rounded-xl h-64 animate-pulse" />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[1040px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">User Name</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">User Email</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Company / Role</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Recommendation</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Cost</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Tokens</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-5 py-3">Models</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activity.activities?.map((a: any) => (
                  <tr key={a.report_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmtDate(a.created_at)}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium whitespace-nowrap">{a.user_name ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{a.user_email ?? "—"}</td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900 font-medium">{a.company}</p>
                      <p className="text-gray-400 text-xs">{a.role_title}</p>
                    </td>
                    <td className="px-5 py-3">
                      {a.recommendation ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${REC_COLORS[a.recommendation] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.recommendation.replace(/_/g, " ")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-900 text-right font-mono text-xs">
                      {fmtUsd(a.total_cost_usd)}
                    </td>
                    <td className="px-5 py-3 text-gray-900 text-right font-mono text-xs">
                      {fmt(a.total_tokens, 0)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        {(a.calls ?? []).map((c: any, i: number) => (
                          <span key={i} className="text-xs text-gray-400">
                            {c.model} — {fmt(c.input_tokens, 0)}in / {fmt(c.output_tokens, 0)}out
                            {c.reasoning_tokens ? ` / ${fmt(c.reasoning_tokens, 0)}r` : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-900">{value}</span>
    </div>
  );
}
