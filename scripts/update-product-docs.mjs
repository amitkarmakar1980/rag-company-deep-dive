/**
 * update-product-docs.mjs
 *
 * Regenerates docs/product-brief.md by reading the source-of-truth files
 * that define the product's features, then asking an LLM to produce an
 * up-to-date feature list and customer journeys.
 *
 * Usage:
 *   npm run docs:update
 *   node scripts/update-product-docs.mjs
 *
 * Triggered automatically by the pre-commit hook (see .husky/pre-commit or
 * package.json "pre-commit" script) when any of the watched source files change.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_FILE = path.join(ROOT, "docs", "product-brief.md");

/**
 * Source files whose content defines what the product can do.
 * Add new entries here when you add a major new module.
 */
const SOURCE_FILES = [
  // Type definitions — every section and data shape lives here
  "lib/types/index.ts",
  // Report section registry — canonical titles and ordering
  "lib/report/assembleReport.ts",
  // LLM prompts — define what each section actually produces
  "lib/ai/prompts.ts",
  "lib/ai/overlayPrompt.ts",
  // API surface — what actions the product exposes
  "app/api/deep-dive/create/route.ts",
  "app/api/resume/upload/route.ts",
  "app/api/overlay/[requestId]/route.ts",
  // Report page — what the user actually sees and can do
  "app/deep-dive/[id]/page.tsx",
  // Form — how users initiate a deep dive
  "components/DeepDiveForm.tsx",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readSource(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠  Skipping missing file: ${relPath}`);
    return null;
  }
  const content = fs.readFileSync(fullPath, "utf8");
  // Trim very large files to avoid blowing the context window
  const MAX_CHARS = 8000;
  const trimmed = content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) + "\n\n[...truncated]" : content;
  return { path: relPath, content: trimmed };
}

function buildContext() {
  const sources = SOURCE_FILES.map(readSource).filter(Boolean);
  return sources
    .map((s) => `### ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join("\n\n");
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── LLM call ────────────────────────────────────────────────────────────────

async function regenerateDocs(context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set in environment");

  const systemPrompt = `You are a technical product writer. You will be given source code files from a Next.js application called "Company Deep Dive" — an AI-powered interview decision-support and candidate-positioning tool.

Your job is to produce an accurate, up-to-date product brief in Markdown with two sections:

1. **Feature List** — a structured enumeration of every user-facing capability derived from the source code. Group by area (Core Analysis, Report Sections, Candidate Overlay, Resume Handling, Page UX, etc.). Be specific about counts, section names, and behaviors. Use a table for report sections. Use bullet lists elsewhere.

2. **Customer Journeys** — 5 distinct journeys covering different user types and scenarios (e.g. pre-interview sprint, serious researcher, recruiter, returning user, skeptic evaluating accuracy). Each journey should be a numbered list of concrete steps. No fluff — focus on what the user actually does, in order.

Rules:
- Derive everything from the source code provided. Do not invent features.
- If a feature exists in the code but you're not sure what it does, describe it accurately at a high level.
- Use present tense throughout.
- Return ONLY the Markdown content — no preamble, no explanation outside the document.
- Start the document with a header and an auto-generated notice including today's date: ${today()}`;

  const userPrompt = `Here are the source files:\n\n${context}\n\nNow produce the product-brief.md content.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📄 update-product-docs — regenerating docs/product-brief.md\n");

  console.log("  Reading source files…");
  const context = buildContext();

  console.log("  Calling LLM to regenerate docs…");
  let content;
  try {
    content = await regenerateDocs(context);
  } catch (err) {
    console.error(`\n  ✗ LLM call failed: ${err.message}`);
    console.error("  docs/product-brief.md was NOT updated.");
    process.exit(1);
  }

  // Ensure docs/ directory exists
  fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, content, "utf8");
  console.log(`\n  ✓ docs/product-brief.md updated (${content.length} chars)`);
}

main();
