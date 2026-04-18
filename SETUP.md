# Company Deep-Dive Engine - Setup & Deployment Guide

## Quick Start

### 1. Clone and Install

```bash
cd "Company Deep Dive"
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI  
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=
OPENAI_FALLBACK_API_KEY=
OPENAI_FALLBACK_BASE_URL=

# Firecrawl (optional)
FIRECRAWL_API_KEY=fc-...
```

Get these values from:
- **Supabase**: Project Settings → API
- **OpenAI**: [Platform API Keys](https://platform.openai.com/api-keys)
- **Firecrawl**: [Firecrawl Dashboard](https://www.firecrawl.dev/)

### 3. Database Setup

1. Go to Supabase Dashboard
2. Create a new PostgreSQL database
3. Run the SQL from `/database/schema.sql`:
   - Go to SQL Editor
   - Paste and execute `/database/schema.sql`
   - This creates all tables, indexes, and the vector search function

### 4. Enable pgvector

In Supabase Dashboard → SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Local Development

```bash
npm run dev
```

Visit `http://localhost:3000`

The app will:
- Show a landing page
- Allow users to create analyses
- Display processing status
- Generate and show reports
- Track user history

## Architecture

The MVP is organized into clear modules:

```
Physical Code                          Logical Layer
├── /lib/db/*                          Database Access
├── /lib/ai/*                          LLM & Embeddings
├── /lib/ingestion/*                   Content Fetching & Processing
├── /lib/retrieval/*                   Vector Search & Ranking
├── /lib/report/*                      Report Generation
├── /lib/scoring/*                     Scoring Logic
├── /app/api/*                         HTTP Endpoints
├── /components/*                      UI Components
└── /app/*/page.tsx                    Page Routes
```

## Key Features Implemented

### ✅ Core MVP Features

- **Landing Page** - Clear value prop and entry point
- **Analysis Form** - Company, role, and optional context input
- **Progress Tracking** - Real-time status updates during processing
- **Report Generation** - 6 analysis sections + recommendation
- **Confidence Scoring** - 5 indicators based on available signals
- **Evidence Citations** - Every claim traced back to a source
- **User Feedback** - Rate sections as useful/not useful
- **Report History** - List of all analyses by user

### ✅ Technical Features

- **Vector Search** - pgvector-powered semantic retrieval
- **Smart Reranking** - Heuristic ranking for high-signal content
- **Semantic Chunking** - Text split by sections and sentences
- **Content Cleaning** - Removes boilerplate, nav, footers
- **Source Deduplication** - Content hash-based duplicate detection
- **Error Handling** - Graceful fallbacks and user-friendly messages
- **TypeScript** - Full type safety throughout
- **Server-Side Processing** - Ingestion and generation happen server-side
- **Streaming Status** - Polling-based progress updates

## API Endpoints

### Create Analysis
```
POST /api/deep-dive/create
{
  "companyName": "string",
  "roleTitle": "string",
  "jobDescription": "string (optional)",
  "companyUrl": "string (optional)",
  "profileContext": "string (optional)",
  "customUrls": ["string"]
}
→ { requestId: string, status: string }
```

### Check Status
```
GET /api/deep-dive/status?id=<requestId>
→ { requestId: string, status: string, report?: {...} }
```

### Fetch Report
```
GET /api/report/<reportId>
→ { 
    id, recommendation, scores, 
    sections: [...], sources: [...], 
    createdAt 
  }
```

### Submit Feedback
```
POST /api/feedback
{
  "reportId": "string",
  "sectionKey": "string",
  "feedbackType": "useful" | "not_useful"
}
```

### Get History
```
GET /api/history
→ [{ requestId, company, roleTitle, createdAt, report }]
```

## Deployment to Vercel

### 1. Push to Git

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo>
git push origin main
```

### 2. Connect to Vercel

1. Go to [Vercel](https://vercel.com)
2. "New Project" → Import your repo
3. Next.js is auto-detected
4. Click Deploy

### 3. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_BASE_URL=...
OPENAI_FALLBACK_API_KEY=...
OPENAI_FALLBACK_BASE_URL=...
FIRECRAWL_API_KEY=...
```

### 4. Trigger Deploy

Push to main branch → Automatic deploy

Your app is now live at `<your-project>.vercel.app`

## Monitoring & Debugging

### Check Build Status
```bash
npm run build
npm run lint
```

### Development with Hot Reload
```bash
npm run dev
```

### Check Environment
```bash
echo $NEXT_PUBLIC_SUPABASE_URL  # Should be set
echo $OPENAI_API_KEY           # Should be set
```

## Customization

### Modify Report Sections

1. Update section names in `/lib/ai/prompts.ts`
2. Add section generation in `/lib/report/generateSection.ts`
3. Register section in `/lib/report/assembleReport.ts` → SECTION_QUERIES
4. Update component in `/app/deep-dive/[id]/page.tsx`

### Adjust Scoring Logic

Edit `/lib/scoring/scores.ts`:
- Modify keyword weights
- Adjust score boundaries
- Change recommendation thresholds

### Change UI Style

Tailwind CSS can be customized in `tailwind.config.ts` and `app/globals.css`

## Troubleshooting

### "supabaseUrl is required"
Make sure `.env.local` is created with all Supabase values.

### "No content in response"
OpenAI API call failed. Check:
- API key is valid
- Account has credits
- Rate limits not exceeded

### OpenAI DNS or egress failures
If `api.openai.com` is unreachable from your environment, configure an OpenAI-compatible fallback provider:
- `OPENAI_FALLBACK_API_KEY`
- `OPENAI_FALLBACK_BASE_URL`
- Optional per-provider model overrides such as `OPENAI_FALLBACK_PREMIUM_MODEL` or `OPENAI_FALLBACK_EMBEDDING_MODEL`

### Vector search returns 0 results
- Ensure embeddings were stored (check database)
- Try lower similarity threshold in search

### Report generation timeout
- Check if Supabase is responding
- Verify OpenAI API is accessible
- Check server-side logs in Vercel

## Next Steps for Production

### Post-MVP Enhancements

- [ ] Add user authentication UI
- [ ] Implement real-time progress with WebSockets
- [ ] Add report export (PDF/markdown)
- [ ] Integrate PostHog analytics
- [ ] Advanced filtering/search in history
- [ ] Team collaboration features
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] Usage analytics dashboard

### Scale Considerations

- Use job queue (Bull, RQ) for async processing
- Add caching (Redis) for frequently accessed data
- Implement database connection pooling
- Monitor vector search performance
- Set up error tracking (Sentry)
- Create audit logs for compliance

## Support

For issues:
1. Check error message in browser console
2. Check server logs: `npm run dev` terminal output
3. Verify environment variables are set
4. Check Supabase dashboard for data
5. Verify OpenAI API quota

Questions? Review the comprehensive README.md in the project root.
