import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, PageBreak, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TableOfContents
} from "docx";
import { writeFileSync } from "fs";

const BRAND = "5B6EE1"; // indigo
const DARK = "1E1E2E";
const LIGHT_BG = "F0F2FF";
const ACCENT = "E8EAFE";

// ── helpers ────────────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    run: { color: DARK, bold: true },
  });
}
function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    run: { color: BRAND },
  });
}
function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: "333333", ...opts })],
    spacing: { after: 120 },
  });
}
function bold(text) {
  return new TextRun({ text, bold: true, size: 22, color: DARK });
}
function mono(text) {
  return new TextRun({ text, font: "Courier New", size: 18, color: "444444" });
}
function codeBlock(lines) {
  return lines.map(
    (line) =>
      new Paragraph({
        children: [mono(line)],
        spacing: { before: 0, after: 0 },
        indent: { left: 360 },
        shading: { type: ShadingType.CLEAR, fill: "F4F4F8" },
      })
  );
}
function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: "333333" })],
    bullet: { level },
    spacing: { after: 80 },
  });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function rule() {
  return new Paragraph({
    border: { bottom: { color: BRAND, style: BorderStyle.SINGLE, size: 4 } },
    spacing: { after: 200 },
  });
}
function tableRow(cells, header = false) {
  return new TableRow({
    children: cells.map(
      (txt) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: txt, bold: header, size: header ? 20 : 18, color: header ? "FFFFFF" : "333333" })],
              spacing: { before: 60, after: 60 },
              indent: { left: 80, right: 80 },
            }),
          ],
          shading: header ? { type: ShadingType.CLEAR, fill: BRAND } : undefined,
        })
    ),
  });
}
function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      tableRow(headers, true),
      ...rows.map((r) => tableRow(r, false)),
    ],
  });
}
// ── cover page ─────────────────────────────────────────────────────────────
function coverPage() {
  return [
    new Paragraph({ spacing: { before: 1200 } }),
    new Paragraph({
      children: [new TextRun({ text: "Company Deep Dive Engine", bold: true, size: 64, color: BRAND })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: "System Design Document", size: 40, color: "666666" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Logical Diagram · Sequence Diagrams · Architecture · Prompts", size: 24, color: "999999", italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Version 2.0  |  April 2026", size: 22, color: "AAAAAA" })],
      alignment: AlignmentType.CENTER,
    }),
    pageBreak(),
  ];
}
// ── section 1: executive summary ──────────────────────────────────────────
function section1() {
  return [
    h1("1. Executive Summary"),
    rule(),
    p("Company Deep Dive Engine is an AI-powered interview decision-support tool for senior product, strategy, and GM candidates (Director / VP+ level). Rather than generic research, it answers a single question:"),
    new Paragraph({
      children: [new TextRun({ text: "\"Should you pursue this role — and if so, how do you win the interview?\"", bold: true, italics: true, size: 24, color: BRAND })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 160 },
    }),
    p("The system combines multi-tier LLM reasoning, retrieval-augmented generation (RAG), persona-aware report construction, and explicit quality gates to produce deeply contextualized, evidence-backed interview preparation briefs."),
    h2("1.1 Technology Stack"),
    makeTable(
      ["Layer", "Technology", "Notes"],
      [
        ["Framework", "Next.js 16 (App Router)", "Full-stack TypeScript"],
        ["Database", "Supabase PostgreSQL + pgvector", "Vector embeddings (1536-dim)"],
        ["Auth", "Supabase Auth", "Email/password + Google OAuth"],
        ["LLM", "OpenAI-compatible (primary + fallback)", "o3, o4-mini, gpt-4o, gpt-4o-mini"],
        ["Embeddings", "text-embedding-3-small", "Batch generation via OpenAI API"],
        ["Web Scraping", "Firecrawl v2 API (axios fallback)", "Markdown + HTML extraction"],
        ["File Parsing", "pdf-parse + mammoth", "PDF, DOCX, DOC, TXT resume support"],
        ["Resume State", "localStorage via useResumeStore", "Client-side persistence across sessions"],
        ["Styling", "Tailwind CSS v4", "Component-driven, mobile-first"],
      ]
    ),
  ];
}
// ── section 2: logical diagram ────────────────────────────────────────────
function section2() {
  return [
    pageBreak(),
    h1("2. Logical Architecture Diagram"),
    rule(),
    p("The system is divided into six logical layers. Data flows top-down from the user interface through the ingestion and retrieval layers, into LLM synthesis, and finally to a quality-gated report."),
    ...codeBlock([
      "┌─────────────────────────────────────────────────────────────────────┐",
      "│                        PRESENTATION LAYER                          │",
      "│  Next.js App Router  ·  React 19  ·  Tailwind CSS v4              │",
      "│                                                                     │",
      "│  Pages: Homepage · DeepDive Form · Report View · History · Admin  │",
      "└───────────────────────────────┬─────────────────────────────────────┘",
      "                                │ HTTP (REST)                          ",
      "┌───────────────────────────────▼─────────────────────────────────────┐",
      "│                          API GATEWAY LAYER                         │",
      "│  /api/deep-dive/create    /api/deep-dive/status                    │",
      "│  /api/report/[id]         /api/overlay/[id]                        │",
      "│  /api/resume/upload       /api/feedback                            │",
      "│  /api/history             /api/admin/*                             │",
      "│  /api/cron/retry-queue                                             │",
      "└──────┬────────────────────────┬────────────────────────────────────┘",
      "       │                        │                                      ",
      "┌──────▼───────────┐  ┌─────────▼──────────────────────────────────┐ ",
      "│  INGESTION LAYER │  │           RETRIEVAL & SYNTHESIS LAYER      │ ",
      "│                  │  │                                             │ ",
      "│  buildSourceUrls │  │  inferPremiumPersona()                      │ ",
      "│  Firecrawl fetch │  │  buildPersonaAwareRetrievalQueries()        │ ",
      "│  cleanContent()  │  │  multiTopicSearch() → semanticSearch()     │ ",
      "│  chunkContent()  │  │  rerank() → deduplicateChunks()            │ ",
      "│  generateEmbed.  │  │  assemblePremiumReportV2()                  │ ",
      "│  Bulk insert     │  │  generatePremiumEvaluation()                │ ",
      "└──────┬───────────┘  │  applyQualityGateToSections()              │ ",
      "       │              └────────────────────┬───────────────────────┘ ",
      "       │                                   │                          ",
      "┌──────▼───────────────────────────────────▼───────────────────────┐  ",
      "│                        DATA LAYER                                │  ",
      "│  Supabase PostgreSQL (RLS-enforced)                              │  ",
      "│                                                                   │  ",
      "│  users · companies · deep_dive_requests · sources · chunks       │  ",
      "│  embeddings(pgvector) · reports · report_sections                │  ",
      "│  candidate_overlays · feedback_events                            │  ",
      "└──────────────────────────────────────────────────────────────────┘  ",
      "                                                                        ",
      "┌──────────────────────────────────────────────────────────────────┐   ",
      "│                      EXTERNAL SERVICES LAYER                    │   ",
      "│  OpenAI API  (o3, o4-mini, gpt-4o, gpt-4o-mini, embeddings)     │   ",
      "│  Firecrawl v2 API  (web scraping + markdown extraction)         │   ",
      "│  Supabase Auth  (session management + JWT)                       │   ",
      "└──────────────────────────────────────────────────────────────────┘   ",
    ]),
  ];
}
// ── section 3: sequence diagrams ─────────────────────────────────────────
function section3() {
  return [
    pageBreak(),
    h1("3. Sequence Diagrams"),
    rule(),
    h2("3.1 Deep Dive Creation & Async Pipeline"),
    ...codeBlock([
      "  Browser          API Route           Pipeline               Supabase / OpenAI",
      "    │                  │                  │                         │",
      "    │─POST /create────►│                  │                         │",
      "    │  {company,role,  │                  │                         │",
      "    │   JD, resume}    │                  │                         │",
      "    │                  │─sanitize inputs  │                         │",
      "    │                  │─getOrCreateUser  │                         │",
      "    │                  │─createDeepDive───────────────────────────►│",
      "    │                  │◄─── requestId ───────────────────────────►│",
      "    │◄─200 {requestId}─│                  │                         │",
      "    │                  │                  │                         │",
      "    │  [server.after() fires async]        │                         │",
      "    │                  │─runPipeline()───►│                         │",
      "    │                  │                  │                         │",
      "    │                  │              ┌───┴─── INGESTION ────────┐  │",
      "    │                  │              │ buildSourceUrls(LLM)     │  │",
      "    │                  │              │ Firecrawl ×8-15 sources  │  │",
      "    │                  │              │ cleanContent()           │  │",
      "    │                  │              │ chunkContent()           │  │",
      "    │                  │              │ generateEmbeddings()     │──►│",
      "    │                  │              │ bulkInsertChunks()       │──►│",
      "    │                  │              └───────────────────────────┘  │",
      "    │                  │              ┌───┴─── SYNTHESIS ───────┐    │",
      "    │                  │              │ inferPersona()           │    │",
      "    │                  │              │ multiTopicSearch()      │◄──►│",
      "    │                  │              │ generatePremiumReport() │──►OpenAI",
      "    │                  │              │ generateEvaluation()    │──►OpenAI",
      "    │                  │              │ applyQualityGate()       │    │",
      "    │                  │              │ createReportSections()  │──►│",
      "    │                  │              └───────────────────────────┘  │",
      "    │                  │              ┌───┴─── OVERLAY ────────┐     │",
      "    │                  │              │ getCandidateOverlay()   │──►OpenAI",
      "    │                  │              │ updateCandidateOverlay │──►│",
      "    │                  │              └───────────────────────────┘  │",
      "    │                  │◄─ status=completed ──────────────────────►  │",
      "    │                  │                  │                         │",
      "  [polling]            │                  │                         │",
      "    │─GET /status──────►│                  │                         │",
      "    │◄─{status}────────│                  │                         │",
      "    │  (repeat 3s)     │                  │                         │",
      "    │─GET /report/[id]─►│                  │                         │",
      "    │◄─{14 sections}───│                  │                         │",
      "    │─GET /overlay/[id]►│                  │                         │",
      "    │◄─{overlay_json}──│                  │                         │",
    ]),
    h2("3.2 Retrieval & Reranking Sequence"),
    ...codeBlock([
      "  assemblePremiumReportV2()         semanticSearch()        Supabase RPC",
      "        │                                │                       │",
      "        │─inferPremiumPersona()          │                       │",
      "        │  → role_family, seniority      │                       │",
      "        │                                │                       │",
      "        │─buildPersonaAwareQueries()     │                       │",
      "        │  → 6+ topic-specific queries   │                       │",
      "        │                                │                       │",
      "        │─multiTopicSearch(queries[])    │                       │",
      "        │  ─ for each query:             │                       │",
      "        │    ─generateEmbedding(query)──►│                       │",
      "        │                  │◄─vector(1536)                       │",
      "        │    ─search_embeddings(rpc)─────────────────────────────►│",
      "        │                  │◄─top-15 chunks────────────────────────│",
      "        │                                │                       │",
      "        │─merge results (deduplicate by Jaccard >60%)            │",
      "        │─rerank()                                               │",
      "        │   freshness boost (+0.15 if <30 days)                 │",
      "        │   source_type weights (job_desc +0.25)                │",
      "        │   keyword density (+0.02/match, cap 0.1)              │",
      "        │   company/role match (+0.1)                           │",
      "        │   diversity cap (max 3 chunks/source)                 │",
      "        │                                                        │",
      "        │◄─ 18 ranked chunks [1]…[18] with citations           │",
    ]),
    h2("3.3 Quality Gate Sequence"),
    ...codeBlock([
      "  assemblePremiumReportV2()     generatePremiumEvaluation()    LLM (gpt-4o-mini)",
      "        │                               │                            │",
      "        │─ [Parallel calls]             │                            │",
      "        │                               │                            │",
      "        │──────────────────────────────►│                            │",
      "        │  (report sections)            │─getPremiumEvalPrompt()────►│",
      "        │                               │◄─{section_verdicts}────────│",
      "        │                               │  met/partial/insufficient  │",
      "        │                               │  high/medium/low/suppress  │",
      "        │◄──── evaluation_result ───────│                            │",
      "        │                               │                            │",
      "        │─applyQualityGateToSections()  │                            │",
      "        │   suppress insufficient sections                           │",
      "        │   mark partial sections                                    │",
      "        │                               │                            │",
      "        │─finalizePremiumQualityGate()  │                            │",
      "        │   approve / conditional / hold                             │",
      "        │                               │                            │",
      "        │─createReportSections() ───────────────────────────────────►│",
      "        │  (only gate-passed sections)                               │",
    ]),
    h2("3.4 Candidate Overlay Sequence"),
    ...codeBlock([
      "  API Route             generateOverlay()         LLM (gpt-4o)",
      "     │                        │                        │",
      "     │─POST /resume/upload─►  │                        │",
      "     │  {file: PDF/DOCX}      │                        │",
      "     │─extract text           │                        │",
      "     │─createCandidateResume  │                        │",
      "     │                        │                        │",
      "     │─generateOverlay()─────►│                        │",
      "     │                        │─getCandidateOverlayPrompt()          ",
      "     │                        │  {resume, JD, base context}          ",
      "     │                        │─────────────────────────►│",
      "     │                        │◄──── overlay_json ────────│",
      "     │                        │  candidate_role_match     │",
      "     │                        │  strengths_to_emphasize   │",
      "     │                        │  interviewer_concerns     │",
      "     │                        │  gap_management           │",
      "     │                        │  story_recommendations    │",
      "     │                        │  positioning_strategy     │",
      "     │                        │  objection_handling       │",
      "     │                        │─updateCandidateOverlay()  │",
      "     │◄──── status=completed ─│                        │",
    ]),
  ];
}
// ── section 4: pipeline phases ────────────────────────────────────────────
function section4() {
  return [
    pageBreak(),
    h1("4. Pipeline Phases & Data Flow"),
    rule(),
    p("The pipeline is fully asynchronous and non-blocking. The frontend receives a requestId immediately and polls for status every 3 seconds."),
    h2("4.1 Phase Overview"),
    makeTable(
      ["Phase", "Status Shown", "Duration", "Key Operations"],
      [
        ["Validation", "pending", "<100ms", "Input sanitization, auth, company lookup"],
        ["Source Planning", "fetching_sources", "2–5s", "LLM research planner (1 call) → 10 sources"],
        ["Web Fetch", "fetching_sources", "20–40s", "Firecrawl ×8-15 sources (concurrency=3)"],
        ["Clean & Chunk", "fetching_sources", "2–5s", "HTML strip, chunking, deduplication"],
        ["Embedding", "fetching_sources", "5–10s", "OpenAI text-embedding-3-small (batch)"],
        ["Vector Storage", "fetching_sources", "1–2s", "Bulk insert to Supabase pgvector"],
        ["Report Synthesis", "generating_report", "30–60s", "Parallel: o3 + gpt-4o-mini + evaluator"],
        ["Overlay (optional)", "completed", "10–20s", "gpt-4o personalization if resume exists"],
      ]
    ),
    h2("4.2 Ingestion Sub-Pipeline"),
    bullet("Stage 1 — Source Planning: LLM planner selects ≤10 sources: company homepage, newsroom, blog, careers, investor, press, leadership, product, developer, custom URLs"),
    bullet("Stage 2 — Web Fetch: Firecrawl v2 scrape API (or axios fallback); extracts markdown + HTML; resolves redirects; stores raw content"),
    bullet("Stage 3 — Cleaning: Strip HTML, boilerplate, navigation; normalize whitespace; compute SHA256 content hash for deduplication"),
    bullet("Stage 4 — Chunking: ~500-token semantic chunks, 50-token overlap; calculated token count per chunk"),
    bullet("Stage 5 — Embedding: OpenAI text-embedding-3-small, 1536 dimensions; batch requests for cost efficiency"),
    bullet("Stage 6 — Storage: Bulk insert to sources → chunks → embeddings tables with pgvector index"),
    p("Result: Typically 30–100 chunks across 8–15 sources per request."),
    h2("4.3 Retrieval Sub-Pipeline"),
    bullet("Persona inference → role_family (product/engineering/design/data/marketing/sales/ops/executive) + seniority"),
    bullet("Persona-aware query generation: 6+ topic queries tailored to role family"),
    bullet("Vector similarity search via pgvector RPC (top-15 per query, threshold ≥0.5)"),
    bullet("Reranking: freshness boost, source-type weights, keyword density, company/role match, diversity cap"),
    bullet("Deduplication: Jaccard similarity >60% = near-duplicate; keep higher-ranked"),
    bullet("Final output: ~18 ranked chunks with citation indexes [1]…[18]"),
  ];
}
// ── section 5: system design / component map ──────────────────────────────
function section5() {
  return [
    pageBreak(),
    h1("5. Component Architecture"),
    rule(),
    h2("5.1 API Routes"),
    makeTable(
      ["Route", "Method", "Purpose"],
      [
        ["/api/deep-dive/create", "POST", "Create request; fire async pipeline via server.after()"],
        ["/api/deep-dive/status", "GET", "Poll pipeline status (pending→fetching_sources→generating_report→completed)"],
        ["/api/deep-dive/[id]/regenerate", "POST", "Re-run full pipeline for existing request"],
        ["/api/deep-dive/extract-jd", "POST", "Extract JD fields from a URL using Firecrawl"],
        ["/api/report/[id]", "GET", "Fetch full report + all 14 sections + token usage"],
        ["/api/overlay/[requestId]", "GET", "Poll candidate overlay status + data (every 3s)"],
        ["/api/resume/upload", "POST", "Upload resume; extract text; trigger overlay generation"],
        ["/api/resume/parse", "POST", "Client-side text extraction from PDF/DOCX/DOC"],
        ["/api/feedback", "POST", "Log useful/not_useful per section for QA"],
        ["/api/history", "GET", "User's last 20 deep dives (paginated)"],
        ["/api/admin/*", "GET", "Activity, stats, usage, users, diagnostics, prompt-feedback"],
        ["/api/cron/retry-queue", "POST", "Vercel Cron every 5 min: retry stuck requests"],
      ]
    ),
    h2("5.2 AI & LLM Modules"),
    makeTable(
      ["File", "Key Function", "Purpose"],
      [
        ["lib/ai/openai.ts", "generatePremiumReport()", "Model routing + cost accounting (o3, gpt-4o, etc.)"],
        ["lib/ai/openaiClient.ts", "executeWithOpenAIProviders()", "Primary + fallback provider abstraction + auto-retry"],
        ["lib/ai/prompts.ts", "getDeepAnalysisPrompt()", "Legacy SWOT + strategy analysis prompt (o4-mini)"],
        ["lib/ai/prompts.ts", "getInterviewLayerPrompt()", "Interview prep + decision prompt (gpt-4o-mini)"],
        ["lib/ai/premiumPromptsV2.ts", "getPremiumReportPromptV2()", "Premium synthesis prompt (o3) with governance artifacts"],
        ["lib/ai/premiumEvaluationPrompt.ts", "getPremiumEvaluationPrompt()", "Quality gate evaluation prompt (gpt-4o-mini)"],
        ["lib/ai/overlayPrompt.ts", "getCandidateOverlayPrompt()", "Candidate personalization prompt (gpt-4o)"],
        ["lib/ai/embeddings.ts", "generateEmbeddings()", "Batch vector generation (text-embedding-3-small)"],
        ["lib/ai/untrustedInput.ts", "sanitize*() / formatUntrustedTextBlock()", "Prompt injection hardening for all user inputs"],
      ]
    ),
    h2("5.3 Report Assembly Modules"),
    makeTable(
      ["File", "Purpose"],
      [
        ["lib/report/assemblePremiumReportV2.ts", "Orchestrates full report generation (persona→retrieve→synthesize→gate)"],
        ["lib/report/premiumPersona.ts", "Infers role family + seniority; builds persona-aware retrieval queries"],
        ["lib/report/premiumQualityGate.ts", "Runs evaluator; suppresses insufficient sections; final release decision"],
        ["lib/report/premiumTelemetry.ts", "Scores evidence quality; builds source coverage summary + cost ledger"],
        ["lib/report/generateOverlay.ts", "Calls overlay LLM + stores 7 personalization sections"],
        ["lib/report/citationMetadata.ts", "Maps evidence chunks to source links with citation indexes"],
        ["lib/report/recommendation.ts", "Resolves unified pursue recommendation (0=pass → 4=aggressive pursue)"],
      ]
    ),
    h2("5.4 Database Schema"),
    makeTable(
      ["Table", "Key Columns", "Purpose"],
      [
        ["users", "id, email, created_at", "User identity (Supabase Auth)"],
        ["companies", "id, name, normalized_name, website_url", "Company deduplication"],
        ["deep_dive_requests", "id, user_id, company_id, role_title, job_description, status, error_message, metadata_json", "Per-request state machine"],
        ["sources", "id, request_id, source_type, url, cleaned_content, content_hash, trust_score", "Fetched web sources"],
        ["chunks", "id, source_id, chunk_index, text, token_count", "Semantic text chunks"],
        ["embeddings", "id, chunk_id, embedding vector(1536)", "pgvector embeddings for cosine search"],
        ["reports", "id, request_id, recommendation, [5 scores], ai_query_count, summary_json", "Aggregated report metadata"],
        ["report_sections", "id, report_id, section_key, content_markdown, citations_json, display_order", "Individual report sections (14 per report)"],
        ["candidate_overlays", "id, request_id, resume_id, overlay_json, status", "Resume-personalized overlay data"],
        ["feedback_events", "id, report_id, section_key, feedback_type", "Section-level usefulness feedback"],
      ]
    ),
  ];
}
// ── section 6: AI prompts ─────────────────────────────────────────────────
function section6() {
  return [
    pageBreak(),
    h1("6. AI Prompts — All Phases"),
    rule(),
    p("Every LLM prompt in the system is documented below with its purpose, model, input, output schema, and the key reasoning framework enforced."),
    h2("6.1 Source Planning Prompt"),
    makeTable(
      ["Attribute", "Value"],
      [
        ["File", "lib/ingestion/firecrawl.ts → buildSourceUrls()"],
        ["Model", "gpt-4o-mini"],
        ["Phase", "Phase 1 — Ingestion (Source Planning)"],
        ["Purpose", "Generate a research plan: select up to 10 URLs to scrape and produce retrieval queries for later semantic search"],
        ["Input", "company name, role title, job description (optional), company URL (optional)"],
        ["Output Schema", "{ sources: [{url, source_type, rationale}], retrieval_queries: string[] }"],
        ["Key Rules", "Target ≥5 external sources beyond company domain; prioritize careers, newsroom, blog, investor pages; avoid login-walled pages; return only fetchable public URLs"],
      ]
    ),
    h2("6.2 Deep Analysis Prompt (Legacy / Baseline)"),
    makeTable(
      ["Attribute", "Value"],
      [
        ["File", "lib/ai/prompts.ts → getDeepAnalysisPrompt()"],
        ["Model", "o4-mini (deep reasoning)"],
        ["Phase", "Phase 2 — Report Synthesis (legacy route)"],
        ["Purpose", "Generate SWOT analysis, strategic positioning, and risk assessment"],
        ["Input", "Retrieved evidence chunks [1]…[N], company metadata, role metadata"],
        ["Output Schema", "JSON: { company_swot, role_swot, strategic_bet_analysis, why_role_exists_now, risks_red_flags }"],
      ]
    ),
    p("Reasoning Framework (6 layers enforced by prompt):"),
    bullet("Layer 1 — Source Reliability Audit: classify each source (company-authored, third-party, user-supplied)"),
    bullet("Layer 2 — Competitive Position Mapping: Porter's Five Forces + value chain analysis"),
    bullet("Layer 3 — Org Health Signals: leadership changes, hiring patterns, reorg signals"),
    bullet("Layer 4 — Strategic Inflection Point Detection: what changed in last 12–18 months?"),
    bullet("Layer 5 — Fact / Inference / Hypothesis Tracing: explicitly label each claim"),
    bullet("Layer 6 — Stress Test: specificity check, named-signal check, circularity check"),
    p("Quality Standards: Specificity > completeness. No category-level risks. Anti-hallucination. Prefer omission over invention."),
    h2("6.3 Interview Layer Prompt (Legacy / Baseline)"),
    makeTable(
      ["Attribute", "Value"],
      [
        ["File", "lib/ai/prompts.ts → getInterviewLayerPrompt()"],
        ["Model", "gpt-4o-mini"],
        ["Phase", "Phase 2 — Report Synthesis (legacy route)"],
        ["Purpose", "Generate interview preparation framework: agenda, questions, decision recommendation"],
        ["Input", "Company overview, role context, deep analysis output, candidate profile (optional)"],
        ["Output Schema", "JSON: 12 sections — company_overview, mission_vision_leadership, executive_summary, assessment_snapshot, likely_interview_agenda, questions_to_ask, unknowns_to_validate, company_snapshot, role_snapshot, interview_decision_summary, five_minute_brief, evidence_contract"],
      ]
    ),
    p("Reasoning Framework (5 layers):"),
    bullet("Layer 1 — Hiring Criteria Reconstruction: infer 5 key hiring dimensions from JD + context"),
    bullet("Layer 2 — Interviewer Concern Mapping: per interviewer type + interview themes"),
    bullet("Layer 3 — Candidate Positioning: if resume provided; omitted otherwise"),
    bullet("Layer 4 — Question Quality Bar: diagnostic questions that send positive signals, hard to deflect"),
    bullet("Layer 5 — Stress Test: role-specific, company-specific, usable in 5 minutes"),
    p("Pursue Decision Thresholds (embedded in prompt):"),
    makeTable(
      ["Verdict", "Criteria"],
      [
        ["Aggressive Pursue (4)", "Strong evidence, high-leverage role, low execution risk, no unresolved red flags"],
        ["Selective Pursue (3)", "Clear upside, ≥1 meaningful concern; highest allowed without resume present"],
        ["Cautious Pursue (2)", "Plausible but uncertain; multiple ambiguities, meaningful risk, unclear charter"],
        ["Pass (0)", "Downside ≥ upside, unresolved core red flag, insufficient leverage or evidence"],
      ]
    ),
    h2("6.4 Premium Synthesis Prompt"),
    makeTable(
      ["Attribute", "Value"],
      [
        ["File", "lib/ai/premiumPromptsV2.ts → getPremiumReportPromptV2()"],
        ["Model", "o3 (fallback: o4-mini)"],
        ["Phase", "Phase 2 — Report Synthesis (premium pipeline)"],
        ["Purpose", "High-fidelity, persona-aware, quality-gated full report generation"],
        ["Input", "18 ranked evidence chunks with citations, inferred persona, source coverage summary, user profile, JD, resume (optional)"],
        ["Output Schema", "JSON: { decision_memo, five_minute_brief, company_context, why_role_exists_now, company_role_strategy, candidate_fit, interview_prep, credibility_layer }"],
        ["Governance", "Loads external spec files: report_generation_spec.md, pipeline_architecture.md, cost_ledger_schema.json"],
      ]
    ),
    p("Non-Negotiable Prompt Rules:"),
    bullet("No fabricated metrics, org structures, reporting lines, stakeholder maps, timelines, or KPIs"),
    bullet("Use INSUFFICIENT_EVIDENCE escape string when evidence bar is not met"),
    bullet("Hide weak specificity rather than invent certainty"),
    bullet("Separate: verified facts | cited synthesis | informed inference | unknowns"),
    bullet("No cross-section repetition allowed"),
    bullet("Generic PM coaching language = failure (must be role-and-company-specific)"),
    bullet("Restating JD as role strategy = failure"),
    p("Persona-Aware Constraints:"),
    bullet("Use inferred role family as analytical lens (product/engineering/design/data/marketing/sales/ops/executive)"),
    bullet("Do not auto-upgrade to executive unless P&L or business-unit authority is evidenced"),
    bullet("Candidate-fit scoring: evaluate transferability dimension-by-dimension"),
    p("Section-Level Requirements:"),
    makeTable(
      ["Section", "Minimum Requirement"],
      [
        ["company_context", "≥150 words; explicit blocks: Company Snapshot, Vision & Mission, Culture Signals"],
        ["company_role_strategy", "≥300 words; SWOT (×4 quadrants), Current Strategy, Strategic Tensions"],
        ["interview_prep", "Interviewer-specific + theme-specific questions; not generic coaching"],
        ["credibility_layer", "Verified facts, cited synthesis, informed inference, conflicts, unknowns"],
        ["decision_memo", "Pursue recommendation with explicit rationale and evidence citations"],
      ]
    ),
    h2("6.5 Quality Gate Evaluation Prompt"),
    makeTable(
      ["Attribute", "Value"],
      [
        ["File", "lib/ai/premiumEvaluationPrompt.ts → getPremiumEvaluationPrompt()"],
        ["Model", "gpt-4o-mini"],
        ["Phase", "Phase 2 — Quality Gate (runs in parallel with synthesis)"],
        ["Purpose", "Independently assess section strength; identify repair targets; gate final release"],
        ["Input", "Generated report sections from synthesis step"],
        ["Output Schema", "JSON: { sections: [{key, verdict: met|partial|insufficient, confidence: high|medium|low|suppressed, repair_instructions}], release_decision: approve|conditional|hold }"],
      ]
    ),
    bullet("met — section meets specificity, evidence grounding, and actionability bar"),
    bullet("partial — section present but has named weaknesses requiring repair"),
    bullet("insufficient — section must be suppressed; not shown to user"),
    bullet("suppressed — evidence below floor; section hidden with placeholder message"),
    h2("6.6 Candidate Overlay Prompt"),
    makeTable(
      ["Attribute", "Value"],
      [
        ["File", "lib/ai/overlayPrompt.ts → getCandidateOverlayPrompt()"],
        ["Model", "gpt-4o"],
        ["Phase", "Phase 3 — Candidate Personalization (post-report)"],
        ["Purpose", "Generate resume-grounded personalization layer: fit assessment, stories, positioning, objection handling"],
        ["Input", "Resume text, job description, base report context (company_context + role_snapshot + positioning summary)"],
        ["Output Schema", "JSON: { candidate_role_match, strengths_to_emphasize, interviewer_concerns, gap_management, story_recommendations, positioning_strategy, objection_handling }"],
      ]
    ),
    p("Reasoning Framework (5 steps):"),
    bullet("Step 1 — Input Classification: classify resume, JD, and base positioning by reliability"),
    bullet("Step 2 — Coverage Map: expertise, scope, leadership, metrics, trajectory, gaps"),
    bullet("Step 3 — Missingness Retrieval: what JD requires but resume lacks?"),
    bullet("Step 4 — Fact/Inference/Hypothesis Separation: explicit labeling"),
    bullet("Step 5 — Stress Test: grounding check, gap honesty check, candidate-specificity check"),
    p("Hard Rules:"),
    bullet("Every insight must be grounded in actual resume evidence"),
    bullet("Be direct about genuine gaps; do not minimize or ignore"),
    bullet("Empty proof_points acceptable; fabricated proof points are NOT acceptable"),
    bullet("Objection_handling.what_not_to_say is required for every objection"),
    h2("6.7 Prompt Injection Hardening"),
    p("All user-supplied inputs are sanitized before inclusion in any LLM prompt:"),
    makeTable(
      ["Input", "Sanitization Function", "Constraints"],
      [
        ["Company Name", "sanitizeSingleLineText()", "Max 140 chars; strip newlines, control chars"],
        ["Role Title", "sanitizeSingleLineText()", "Max 180 chars"],
        ["Job Description", "sanitizeMultiLineText()", "Max 20,000 chars; block injection patterns"],
        ["Profile Context", "sanitizeMultiLineText()", "Max 24,000 chars"],
        ["Resume Text", "sanitizeMultiLineText()", "Max 50,000 chars"],
        ["Company URL", "sanitizeHttpUrl()", "Validate + normalize URL format"],
        ["All untrusted blocks", "formatUntrustedTextBlock()", "Wrap in <<<BEGIN_*>>> / <<<END_*>>> delimiters"],
      ]
    ),
    p("The system prompt explicitly instructs models to treat wrapped user content as evidence, never as directives."),
  ];
}
// ── section 7: quality & safety ───────────────────────────────────────────
function section7() {
  return [
    pageBreak(),
    h1("7. Quality & Safety Architecture"),
    rule(),
    h2("7.1 Hallucination Prevention"),
    bullet("All LLM synthesis grounded in ranked evidence chunks (maximum ~18 chunks, all cited)"),
    bullet("INSUFFICIENT_EVIDENCE escape hatch: model omits rather than invents weak sections"),
    bullet("Specificity over completeness: no category-level risks, no generic bullets"),
    bullet("Fact/inference/hypothesis tracing: every claim labeled with epistemic confidence"),
    bullet("Parallel quality-gate evaluator independently assesses section strength before release"),
    h2("7.2 Provider Failover"),
    bullet("Primary + fallback OpenAI-compatible API providers (configured via env vars)"),
    bullet("executeWithOpenAIProviders() retries across all provider combinations on transient errors"),
    bullet("Per-provider model name mapping (fallback may alias o3 to different model ID)"),
    bullet("Vercel Cron retry queue: every 5 minutes, re-runs stuck/failed requests"),
    h2("7.3 Data Isolation"),
    bullet("Supabase Row-Level Security (RLS) enforces user-to-report isolation at DB layer"),
    bullet("All semantic searches filtered by request_id — no cross-user data leakage"),
    bullet("Auth middleware validates Supabase JWT on all routes"),
    h2("7.4 Graceful Degradation"),
    bullet("Overlay failure does not fail the report — logged but surfaced only as 'pending'"),
    bullet("Quality-gate partial sections shown with confidence indicator rather than suppressed"),
    bullet("If Firecrawl unavailable, falls back to axios for web fetching"),
  ];
}
// ── assemble doc ──────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Company Deep Dive Engine",
  title: "Company Deep Dive Engine — System Design Document",
  description: "Logical diagram, sequence diagrams, architecture, and all AI prompts",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: "333333" },
        paragraph: { spacing: { line: 276 } },
      },
      heading1: {
        run: { font: "Calibri", size: 36, bold: true, color: DARK },
      },
      heading2: {
        run: { font: "Calibri", size: 28, bold: true, color: BRAND },
      },
      heading3: {
        run: { font: "Calibri", size: 24, bold: true, color: "555555" },
      },
    },
  },
  sections: [
    {
      children: [
        ...coverPage(),
        ...section1(),
        ...section2(),
        ...section3(),
        ...section4(),
        ...section5(),
        ...section6(),
        ...section7(),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("Company-Deep-Dive-System-Design.docx", buffer);
console.log("✓ Generated: Company-Deep-Dive-System-Design.docx");
