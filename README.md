# Company Deep Dive Engine

An AI-powered interview decision-support and candidate-positioning tool for senior product, strategy, and GM candidates at Director+ and VP level.

Rather than producing a generic research report, the engine answers one question: **should you pursue this role, and if so, how do you win the interview?**

## Current Highlights

- Admin dashboard with tracked OpenAI spend/tokens, Firecrawl remaining credits, and Supabase row-count visibility
- Admin user and activity views enriched with resolved auth names and emails for clearer attribution
- Branded app icon and social preview metadata for link unfurls and browser surfaces

---

## What It Does

### For every company + role, it generates:

- **Interview Decision Summary** — Pursue recommendation (Aggressive / Selective / Cautious / Pass), positioning angle, top 3 questions, red flag to validate
- **5-Minute Brief** — Skimmable pre-interview card set with smart questions
- **Executive Summary** — Overall opportunity narrative with pursuit stance
- **Assessment Snapshot** — Scored across 5 dimensions (company momentum, org clarity, role leverage, execution risk, candidate fit)
- **Strategic Importance of This Role** — Classification of strategic weight, evidence, what could disprove it, career upside
- **Likely Interview Agenda** — What interviewers validate, worry about, and need to see per dimension
- **Questions to Ask** — Must Ask (top 3 with follow-ups) + Good Questions, each with strong/weak answer signals
- **Risks & Red Flags** — Evidence-grounded, severity-ranked
- **Unknowns to Validate Live** — Live interview questions with reassuring vs. concerning answer patterns
- **Company Snapshot + SWOT** — Min 5 items per quadrant, all evidence-linked
- **Role Snapshot + SWOT** — Charter, success metrics, Y1 expectations, structural risks
- **Why This Role Exists Now** — Original thesis on what changed to create this hire

### When a resume is uploaded, it also generates:

- **Candidate–Role Match** — Fit level (strong / moderate / stretch / mismatch), 1–10 score, alignments with resume evidence, gaps
- **Strengths to Emphasize** — Resume-grounded, mapped to what this hiring manager actually cares about
- **Objections You Must Overcome** — The 3–5 hardest objections with how to respond, proof points, what not to say
- **Likely Interviewer Concerns** — Severity-ranked worries + the probing questions they'll ask
- **Gap Management** — Real gaps named honestly, reframes, verbatim talking points
- **Story Recommendations** — Specific resume stories fleshed out + mapped to JD requirements
- **Positioning Strategy** — Headline, narrative arc, and a ready-to-use Tell Me About Yourself

---

## Architecture

### Two-tier LLM pipeline (parallel)

Report generation fires two LLM calls simultaneously and merges the results:

| Tier | Model | Sections |
|---|---|---|
| Deep Analysis | `o4-mini` (fallback: `gpt-4o`) | company_swot, role_swot, strategic_bet_analysis, why_role_exists_now, risks_red_flags |
| Interview Layer | `gpt-4o-mini` | executive_summary, assessment_snapshot, likely_interview_agenda, questions_to_ask, unknowns_to_validate, company_snapshot, role_snapshot, interview_decision_summary, five_minute_brief |
| Candidate Overlay | `gpt-4o` | All 7 resume-personalization sections |

`o4-mini` handles sections requiring multi-step strategic reasoning and non-obvious SWOT synthesis. `gpt-4o-mini` handles synthesis and formatting. Both base calls run in parallel via `Promise.all` — latency is bounded by the slower of the two, not their sum. If `o4-mini` fails, the pipeline automatically retries with `gpt-4o`.

### Ingestion pipeline

```
URL / JD input
    → Firecrawl (v2 scrape API, axios fallback) — max 3 web sources
    → cleanContent()  — strip HTML, boilerplate, normalize
    → chunkContent()  — semantic + token-based, ~500 tokens/chunk, 50-token overlap
    → generateEmbeddings()  — OpenAI text-embedding-3-small, 1536 dims
    → Supabase (bulk chunk insert + pgvector embeddings)
    Sources processed with concurrency=3 (not sequentially)
```

### Retrieval

```
Broad retrieval query embedding
    → semanticSearch()  — Supabase RPC (cosine distance, ivfflat index)
    → rerank()  — recency boost, source type weights, strategic keyword density,
                  company/role name mentions
    → Top 18 chunks → RetrievalContext (batch DB queries, not sequential)
```

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL + pgvector |
| Auth | Supabase Auth (email/password + Google OAuth) |
| LLM | OpenAI (`o4-mini`, `gpt-4o`, `gpt-4o-mini`, `text-embedding-3-small`) |
| Web scraping | Firecrawl v2 API (axios fallback) |
| File parsing | pdf-parse (v1), mammoth (DOCX/DOC) |
| Resume persistence | localStorage (`useResumeStore` hook) |

---

## Project Structure

```
app/
  icon.svg                         # App icon used by Next metadata
  page.tsx                         # Homepage with resume panel
  admin/page.tsx                   # Admin dashboard for usage and activity monitoring
  auth/page.tsx                    # Email/password + Google OAuth
  deep-dive/
    new/page.tsx                   # New deep dive form
    [id]/page.tsx                  # Report page (polling, overlay, view modes)
  history/page.tsx                 # User's last 20 deep dives
  api/
    admin/
      activity/                    # Recent report activity with user identity + model usage
      stats/                       # Aggregate usage and adoption metrics
      usage/                       # OpenAI spend, Firecrawl credits, Supabase row counts
      users/                       # Paginated user list with resolved profile details
    deep-dive/
      create/                      # Create request + fire async pipeline
      status/                      # Poll processing status
      extract-jd/                  # Extract JD fields from a URL
      [id]/regenerate/             # Re-run full pipeline
    cron/
      retry-queue/                 # Vercel Cron (every 5 min) — retry stuck/failed requests
    report/[id]/                   # Fetch report + sections + token usage
    overlay/[requestId]/           # Poll overlay status + data
    resume/
      upload/                      # Upload resume → trigger overlay
      parse/                       # Client-side file → text extraction
    feedback/                      # Per-section useful/not_useful
    history/                       # User report history

lib/
  types/index.ts                   # All domain types + LLMCallUsage + ReportTokenUsage
  ai/
    openai.ts                      # generateDeepAnalysis (o3) + generateInterviewLayer (mini) + generateCandidateOverlay (4o)
    prompts.ts                     # getDeepAnalysisPrompt + getInterviewLayerPrompt
    overlayPrompt.ts               # getCandidateOverlayPrompt (7 sections)
    embeddings.ts                  # generateEmbedding / generateEmbeddings
  db/
    supabase.ts                    # Admin client
    operations.ts                  # ~40 CRUD functions for all entities
  ingestion/
    ingest.ts                      # Main ingestion orchestrator
    firecrawl.ts                   # URL fetch + buildSourceUrls
    clean.ts                       # HTML cleaning + content hash
    chunk.ts                       # Semantic chunking
  retrieval/
    search.ts                      # semanticSearch + rerank
  report/
    assembleReport.ts              # Parallel LLM calls → merge → store
    generateOverlay.ts             # Candidate overlay generation
  hooks/
    useResumeStore.ts              # localStorage resume persistence

components/
  DeepDiveForm.tsx                 # Multi-step form with inline resume panel
  ReportSectionCard.tsx            # Section dispatcher → typed renderer
  HomepageResumePanel.tsx          # Homepage resume upload/display
  report/
    InterviewDecisionSummary.tsx   # Color-coded pursue recommendation card
    FiveMinuteBrief.tsx            # 6-card skimmable brief
    StrategicImportanceCard.tsx    # Strategic bet classification
    LikelyInterviewAgenda.tsx      # Accordion interview dimensions
    QuestionsCard.tsx              # Must Ask + Good Questions
    UnknownsToValidate.tsx         # Amber accordion with answer signals
    CandidateOverlaySections.tsx   # Base overlay section renderers (6)
    ObjectionHandling.tsx          # Red accordion objection handling
    TokenUsagePanel.tsx            # Collapsible API usage + cost breakdown
    SourcesPanel.tsx               # Evidence sources with citations
    SectionShell.tsx               # Collapsible section wrapper

database/
  schema.sql                       # Full schema + pgvector + RPC function

docs/
  product-brief.md                 # Auto-generated feature list + customer journeys

public/
  social-preview.svg               # Open Graph / Twitter preview image

scripts/
  update-product-docs.mjs          # Regenerates docs/product-brief.md from source files
```

---

## Database Schema

```
users
companies
deep_dive_requests    status: pending → fetching_sources → indexing → generating_report → completed | failed
sources               source_type: job_description | company_homepage | newsroom | blog | custom_url | profile_text
chunks
embeddings            vector(1536), ivfflat index, cosine distance
reports               5 scores + recommendation + summary_json (token usage)
report_sections       14 section keys, content stored as JSON string
candidate_resumes
candidate_overlays    overlay_json JSONB, status: pending | generating | completed | failed
feedback_events
```

Custom PostgreSQL function:
```sql
search_embeddings(query_embedding vector, request_id uuid, match_count int, similarity_threshold float)
```

---

## Setup

### Prerequisites

- Node.js 18+
- Supabase project (pgvector enabled)
- OpenAI API key
- Firecrawl API key (optional — falls back to axios)

### Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Firecrawl (optional)
FIRECRAWL_API_KEY=

# Optional site metadata base URL
NEXT_PUBLIC_APP_URL=
# or
NEXT_PUBLIC_SITE_URL=

# Cron job protection (set to any secret string)
CRON_SECRET=
```

### Database setup

Run `database/schema.sql` in your Supabase SQL editor. This enables the pgvector extension, creates all tables and indexes, and sets up the `search_embeddings` RPC function.

### Install and run

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Key Behaviors

### Report page view modes

| Mode | Sections shown |
|---|---|
| **Full Report** | All 14 sections + overlay + sources + token usage |
| **5-Minute Brief** | `interview_decision_summary`, `five_minute_brief`, `assessment_snapshot` only |

Toggle is in the page header. Brief mode shows an amber banner with a link back to full.

### Admin dashboard

Admins get a dedicated dashboard at `/admin` with four server-backed views:

- Overview totals for users, requests, completed reports, tracked AI spend, and total token usage
- API usage cards for OpenAI tracked spend, Firecrawl remaining credits, and Supabase table row counts
- Paginated user table with resolved auth profile name/email plus request and completion counts
- Recent activity feed showing company, role, recommendation, token usage, and per-model call details

### Resume handling

- Accepted: PDF, DOCX, DOC, TXT
- Parsed client-side via `/api/resume/parse` → stored in localStorage
- Persists across sessions via `useResumeStore`
- Auto-triggers overlay on report load if resume already on file
- Available on homepage, both form steps, and report page

### Token usage panel

Every report shows a collapsible breakdown of:
- Per-call: model name, purpose, input/output/reasoning tokens, estimated cost, token bar
- Totals: tokens this report, cost per report, estimated 100-reports/month cost
- Pricing reference table (o3, gpt-4o, gpt-4o-mini, gpt-4-turbo)

### Auto-updating product docs

```bash
npm run docs:update
```

Reads 8 source-of-truth files, calls `gpt-4o` to regenerate `docs/product-brief.md` (feature list + 5 customer journeys). The pre-commit hook at `.git/hooks/pre-commit` runs this automatically when feature-defining files are staged and adds the result to the commit. Fails gracefully if `OPENAI_API_KEY` is unavailable.

---

## Data Flow

```
Form submit
  → POST /api/deep-dive/create
      → createDeepDiveRequest()
      → setImmediate(() => runPipeline())    ← non-blocking
      ← { requestId }

runPipeline()
  → ingestSources()
      → Firecrawl × N URLs → clean → chunk → embed → store
  → assembleReport()
      → semanticSearch() + rerank()
      → Promise.all([
          generateDeepAnalysis(o4-mini),      ← SWOT + strategy + risks
          generateInterviewLayer(gpt-4o-mini) ← prep + synthesis sections
        ])
      → merge StructuredReport
      → store 14 report_sections + token_usage
  → if resume: generateOverlay(gpt-4o)
      → store overlay_json in candidate_overlays

Frontend
  → poll GET /api/deep-dive/status every 3s until completed
  → fetch GET /api/report/[id]
  → poll GET /api/overlay/[requestId] every 3s (if resume present)
```

---

## License

ISC
