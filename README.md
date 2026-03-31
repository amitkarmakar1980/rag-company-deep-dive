# Company Deep-Dive Engine MVP

A lean, AI-powered web application that helps high-stakes job candidates make informed decisions by analyzing companies and roles before interviews.

## Product Overview

The Company Deep-Dive Engine generates grounded reports answering:
- **What is happening inside this company?** - Current strategy and momentum
- **Why does this role likely exist?** - Role mandate and context
- **What are the hidden risks?** - Execution and organizational risks
- **What are the opportunities?** - Leverage points and upside potential
- **How should the candidate position themselves?** - Specific positioning strategy
- **What smart questions should they ask?** - Interview prep backed by evidence

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes + server actions
- **Database**: Supabase PostgreSQL with pgvector
- **Vector Storage**: pgvector (Supabase embeddings)
- **Auth**: Supabase Auth
- **LLM**: OpenAI (GPT-4 Turbo for generation, text-embedding-3-small for embeddings)
- **Web Extraction**: Firecrawl (with axios fallback)
- **Deployment**: Vercel + Supabase
- **Analytics**: PostHog (optional, ready to integrate)

## Project Structure

```
/app
  /_layout.tsx        # Root layout
  /page.tsx           # Landing page
  /deep-dive/
    /new/page.tsx     # New analysis form
    /[id]/page.tsx    # Report display
  /history/page.tsx   # User report history
  /api/
    /deep-dive/
      /create/route.ts       # Create new analysis
      /status/route.ts       # Check analysis status
    /report/[id]/route.ts    # Fetch report
    /feedback/route.ts       # Submit feedback
    /history/route.ts        # Get user history

/lib
  /types/index.ts          # All TypeScript interfaces
  /db/
    /supabase.ts           # Supabase client initialization
    /operations.ts         # Database operations
  /ai/
    /openai.ts             # OpenAI API client
    /embeddings.ts         # Text embedding generation
    /prompts.ts            # System prompts for each section
  /ingestion/
    /firecrawl.ts          # Web scraping / fetching
    /clean.ts              # Content cleaning
    /chunk.ts              # Semantic chunking
    /ingest.ts             # Main ingestion pipeline
  /retrieval/
    /search.ts             # Vector search + reranking
  /report/
    /generateSection.ts    # Individual section generation
    /assembleReport.ts     # Full report orchestration
  /scoring/
    /scores.ts             # Scoring logic

/components
  /Header.tsx                 # Navigation header
  /DeepDiveForm.tsx          # Main form for analysis
  /RecommendationBanner.tsx  # Top recommendation display
  /ScoreCards.tsx            # Confidence indicator cards
  /ReportSectionCard.tsx     # Individual section display
  /FeedbackButtons.tsx       # Useful/not useful buttons

/database
  /schema.sql                # SQL schema and setup

```

## Database Schema

The MVP uses these core tables:

- **users** - User accounts and auth
- **companies** - Company profiles
- **deep_dive_requests** - Analysis requests
- **sources** - Web pages and documents fetched
- **chunks** - Semantic chunks from sources
- **embeddings** - Vector embeddings for chunks (pgvector)
- **reports** - Generated analysis reports
- **report_sections** - Individual report sections with content
- **feedback_events** - User feedback on sections

See `/database/schema.sql` for full schema with indexes and the vector search RPC function.

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- Firecrawl API key (optional but recommended)

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Firecrawl
FIRECRAWL_API_KEY=your_firecrawl_key

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

### 3. Database Setup

In the Supabase SQL editor, run the SQL from `/database/schema.sql` to:
- Enable pgvector extension
- Create all tables with proper indexes
- Create the vector search RPC function

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Core Workflows

### Analysis Creation Flow

1. User submits company, role, and optional context
2. Frontend calls `/api/deep-dive/create`
3. Backend creates request record and triggers ingestion
4. Ingestion process:
   - Fetches sources (homepage, blog, newsroom, custom URLs)
   - Cleans and chunks content
   - Generates embeddings
   - Stores in database
5. Report generation:
   - Retrieves relevant chunks via vector search
   - Reranksto prioritize high-signal content
   - Generates each section with LLM
   - Calculates scores deterministically
   - Determines recommendation
   - Stores report and sections

### Report Display

User is redirected to report page which:
- Displays recommendation banner
- Shows 5 confidence indicators (scores)
- Renders each analysis section with citations
- Allows feedback on each section
- Lists evidence sources

### Scoring Logic

Scores (1-10) are calculated from:

- **Company Momentum**: Recent announcements, launches, hiring
- **Org Clarity**: Role language clarity, strategic consistency
- **Role Leverage**: Scope, impact potential, platform contribution
- **Execution Risk**: Restructuring signals, leadership changes, conflicts
- **Candidate Fit**: Overlap between JD and candidate context (low by default)

Recommendation logic:
- `Pursue`: Strong signals (avg 7+) and low risk
- `Pursue Cautiously`: Mixed signals or moderate risk
- `Avoid`: Major red flags or poor fit
- `Need More Signal`: Insufficient evidence

## Ingestion & Retrieval

### Content Sources

The system fetches from:
- User-provided job description
- Company homepage
- Company newsroom / press
- Company blog
- User-provided custom URLs
- Hiring manager / recruiter profile text

### Chunking Strategy

Content is chunked semantically:
1. Split by sections (headings, paragraphs)
2. If chunk > 1.5x target size, split by sentences
3. Apply overlap between chunks
4. Target ~500 tokens per chunk

### Retrieval & Reranking

Each report section:
1. Embeds a domain-specific query
2. Semantic search (vector similarity)
3. Rerankby:
   - Recency (boost if < 30 days)
   - Source type (newsroom/blog > generic)
   - Strategic language presence
   - Title/content relevance to query
   - Penalize boilerplate

## Report Generation

The system generates 6 main sections plus recommendation:

1. **Company Snapshot** - Current state and strategy
2. **Role Mandate Hypothesis** - Why this role exists
3. **Risk Flags** - 3-5 execution or org risks
4. **Opportunity Flags** - 3-5 leverage points
5. **How to Position Yourself** - Positioning strategy
6. **Questions to Ask** - 5-7 informed questions
7. **Recommendation** - Pursue / Pursue Cautiously / Avoid / Need More Signal

Each section:
- Uses a focused prompt with relevant evidence
- Returns structured JSON
- Gets formatted to markdown
- Includes citations back to sources
- Has confidence scores

## Feedback System

Users can rate each section as "useful" or "not useful". This data:
- Stores in `feedback_events` table
- Enables report improvement over time
- Signals which content resonates most
- Powers future prioritization

## Error Handling

The system gracefully handles:

- **No sources fetched** - Returns "Need More Signal"
- **Partial ingestion** - Continues with available sources
- **Generation timeout** - Surfaces evidence gaps to user
- **Weak evidence** - Adjusts confidence and recommendation
- **API failures** - Fallback mechanisms (axios if Firecrawl fails)

User-facing errors are clear:
> "We couldn't gather enough signal to produce a confident report. Try providing more context."

## Deployment to Vercel

```bash
# Set environment variables in Vercel dashboard
# Push to your git repository
git push origin main

# Vercel automatically deploys on push
```

Supabase requires:
- Enable "Postgres Extensions" in Database settings
- Enable pgvector extension
- Run schema.sql in SQL editor

## Future Enhancements (Post-MVP)

- Multi-user teams and shared analyses
- Advanced job tracking
- Live interview coaching
- Browser extension for job posting pages
- More sophisticated multi-source reconciliation
- Advanced candidate preference learning
- LinkedIn integration (with permissions)
- Company compensation data integration
- Historical trend analysis

## Architecture Principles

1. **Modular separation of concerns**: Ingestion, retrieval, generation, and scoring are separate
2. **Deterministic scoring**: Grounded in heuristics, not just LLM opinion
3. **Honest uncertainty**: Clear labels on AI-generated vs factual content
4. **Evidence-grounded**: Every claim backed by source citation
5. **Lean MVP**: No microservices, complex queuing, or premature optimization
6. **User-friendly errors**: No stack traces in UI, clear user guidance
7. **Observable processing**: Status tracking and progress indication

## Feedback & Iteration

The report quality improves through:
- User feedback on section quality
- Analysis of "not useful" signals
- Iterating on prompt engineering
- Refining retrieval and reranking
- Tracking which section types drive decisions

## License

MIT
