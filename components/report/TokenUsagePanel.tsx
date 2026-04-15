"use client";

import { useState } from "react";
import { ReportTokenUsage } from "@/lib/types";

// ─── Pricing reference (must match lib/ai/openai.ts) ────────────────────────

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  o3:            { input: 10.00, output: 40.00 },
  "gpt-4o":      { input:  2.50, output: 10.00 },
  "gpt-4o-mini": { input:  0.15, output:  0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
};

/** Monthly estimate assuming N reports per month */
function monthlyEstimate(costPerReport: number, n = 100) {
  return costPerReport * n;
}

function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Model tier badge ────────────────────────────────────────────────────────

const MODEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  o3: {
    label: "o3 · Deep Analysis",
    color: "text-violet-800",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  "gpt-4o": {
    label: "gpt-4o · Overlay",
    color: "text-sky-800",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  "gpt-4o-mini": {
    label: "gpt-4o-mini · Interview Layer",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

function modelConfig(model: string) {
  return (
    MODEL_CONFIG[model] ?? {
      label: model,
      color: "text-[#4a3f36]",
      bg: "bg-[#f5f1e8]",
      border: "border-[#e4ddd4]",
    }
  );
}

// ─── Single call row ──────────────────────────────────────────────────────────

function CallRow({ call }: { call: ReportTokenUsage["calls"][0] }) {
  const cfg = modelConfig(call.model);
  const totalTokens = call.input_tokens + call.output_tokens;

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-4 py-3`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
            {cfg.label}
          </span>
          <p className="text-xs text-[#7a6d63] mt-0.5">{call.purpose}</p>
        </div>
        <span className="text-sm font-semibold text-[#1c1713] tabular-nums">
          {formatCost(call.estimated_cost_usd)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-[#9c8d81]">Input</p>
          <p className="text-sm font-medium text-[#4a3f36] tabular-nums">
            {formatTokens(call.input_tokens)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#9c8d81]">Output</p>
          <p className="text-sm font-medium text-[#4a3f36] tabular-nums">
            {formatTokens(call.output_tokens)}
          </p>
        </div>
        {call.reasoning_tokens !== undefined && call.reasoning_tokens > 0 ? (
          <div>
            <p className="text-xs text-[#9c8d81]">Reasoning</p>
            <p className="text-sm font-medium text-violet-700 tabular-nums">
              {formatTokens(call.reasoning_tokens)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[#9c8d81]">Total</p>
            <p className="text-sm font-medium text-[#4a3f36] tabular-nums">
              {formatTokens(totalTokens)}
            </p>
          </div>
        )}
      </div>

      {/* Token breakdown bar */}
      {totalTokens > 0 && (
        <div className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full ${call.model === "o3" ? "bg-violet-400" : call.model === "gpt-4o-mini" ? "bg-emerald-400" : "bg-sky-400"}`}
            style={{ width: `${Math.round((call.output_tokens / totalTokens) * 100)}%` }}
          />
        </div>
      )}
      <div className="flex justify-between mt-0.5">
        <p className="text-[10px] text-[#9c8d81]">input</p>
        <p className="text-[10px] text-[#9c8d81]">output</p>
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function TokenUsagePanel({ usage }: { usage: ReportTokenUsage }) {
  const [open, setOpen] = useState(false);

  const monthly100 = monthlyEstimate(usage.total_cost_usd, 100);
  const pricing = MODEL_PRICING;

  return (
    <section className="bg-white border border-[#e4ddd4] rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#f5f1e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1a4a3a]/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-4 h-4 text-[#9c8d81] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#1c1713]">API Usage</p>
            <p className="text-xs text-[#9c8d81] mt-0.5">
              {formatTokens(usage.total_tokens)} tokens · {formatCost(usage.total_cost_usd)} this report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Model tier chips */}
          <div className="hidden sm:flex items-center gap-1.5">
            {usage.calls.map((c, i) => {
              const cfg = modelConfig(c.model);
              return (
                <span
                  key={i}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}
                >
                  {c.model}
                </span>
              );
            })}
          </div>
          <svg
            className={`w-4 h-4 text-[#9c8d81] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-[#f0ece4] px-6 py-5 space-y-4">

          {/* Per-call breakdown */}
          <div className="space-y-3">
            {usage.calls.map((call, i) => (
              <CallRow key={i} call={call} />
            ))}
          </div>

          {/* Totals row */}
          <div className="border-t border-[#f0ece4] pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#9c8d81]">Total tokens</p>
              <p className="text-sm font-semibold text-[#1c1713] tabular-nums">
                {formatTokens(usage.total_tokens)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9c8d81]">This report</p>
              <p className="text-sm font-semibold text-[#1c1713] tabular-nums">
                {formatCost(usage.total_cost_usd)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9c8d81]">Est. 100 reports/mo</p>
              <p className="text-sm font-semibold text-[#1c1713] tabular-nums">
                {formatCost(monthly100)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9c8d81]">Models used</p>
              <p className="text-sm font-semibold text-[#1c1713]">
                {usage.calls.map((c) => c.model).join(" + ")}
              </p>
            </div>
          </div>

          {/* Pricing reference */}
          <div className="bg-[#f5f1e8] rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-[#7a6d63] uppercase tracking-wider mb-2">
              Pricing reference
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
              {Object.entries(pricing).map(([model, p]) => (
                <div key={model} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#7a6d63]">{model}</span>
                  <span className="text-xs text-[#9c8d81] tabular-nums">
                    ${p.input}/${p.output} /1M
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#9c8d81] mt-2">
              input / output per 1M tokens · o3 reasoning tokens billed as output
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
