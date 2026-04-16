# Company Deep Dive — Product Brief

> **Auto-generated.** Do not edit manually.
> Run `npm run docs:update` to regenerate from source.
> Last updated: 2026-04-15

---

## Feature List

### Core Analysis Engine
- **Deep dive report generation** — two-stage LLM synthesis produces a 14-section structured intelligence brief per company + role
- **LLM research planner** — chooses up to 10 web sources before ingestion and targets at least 5 external websites beyond the company domain when possible
- **Automated web ingestion** — Firecrawl scrapes the planned sources with HTML-to-markdown conversion and axios fallback when Firecrawl is unavailable or weak
- **Adaptive multi-topic retrieval** — planner-selected retrieval queries drive semantic search across strategy, role charter, leadership, momentum, risks, and why-now angles
- **Source reranking** — reranks retrieved chunks by recency, source type weight, strategic keyword density, and company/role-name mentions
- **Report regeneration** — one-click re-run clears stale outputs and reuses checkpointed stages when possible

### Report Sections (14)

| Section | Description |
|---|---|
| Interview Decision Summary | Pursue recommendation (Aggressive/Selective/Cautious/Pass), positioning angle, top 3 questions, red flag |
| 5-Minute Brief | Skimmable 6-card pre-interview summary with smart questions |
| Executive Summary | Overall narrative on the opportunity |
| Assessment Snapshot | Scored evaluation across 5 dimensions |
| Strategic Importance of This Role | Why this role exists, scope/visibility/career upside, what could disprove the thesis |
| Likely Interview Agenda | Per-dimension: what they validate, worry about, proof needed, what to demonstrate |
| Questions to Ask | Must Ask (top 3 with follow-ups) + Good Questions |
| Risks & Red Flags | Specific risks with evidence |
| Unknowns to Validate Live | Live questions with reassuring/concerning answer signals |
| Company Snapshot | Company overview and context |
| Company SWOT | Min 5 items per quadrant |
| Role Snapshot | Role charter, success metrics, likely challenges |
| Role SWOT | Min 5 items per quadrant |
| Why This Role Exists Now | Strategic timing and context |

### Candidate Overlay — Resume Personalization (7 sections)
- **Candidate–Role Match** — overall fit (strong/moderate/stretch/mismatch), 1–10 score, key alignments with resume evidence, gaps
- **Strengths to Emphasize** — resume-grounded strengths mapped to hiring manager priorities
- **Objections You Must Overcome** — 3–5 hardest objections, why they arise, how to respond, proof points, what not to say
- **Likely Interviewer Concerns** — specific worries + the probing questions they'll ask, severity-ranked
- **Gap Management** — real gaps named honestly, reframes, verbatim talking points
- **Story Recommendations** — specific resume stories fleshed out + mapped to JD requirements
- **Positioning Strategy** — headline, narrative arc, ready-to-use Tell Me About Yourself, what to avoid

### Resume Handling
- Upload on homepage, new form (both steps), and report page
- Accepts PDF, DOCX, DOC, TXT
- Persists across sessions via localStorage (`useResumeStore`)
- "Resume on file" state with Replace / Remove options
- Auto-triggers overlay generation on report load if resume already stored
- Standalone `/api/resume/parse` endpoint for client-side text extraction

### Report Page UX
- **Full Report / 5-Minute Brief view toggle** — brief mode shows only the 3 decision-critical sections
- **Section collapsing** — deep-context sections (Company/Role SWOT, snapshots) collapsed by default
- **Section ordering** — decision layer first, overlay interleaved after strategic context, deep context at bottom
- **Per-section feedback** — useful / not useful on every section
- **Overall report feedback**
- **Evidence sources panel** — all fetched URLs with citations
- **Score cards** — company momentum, org clarity, role leverage, execution risk, candidate fit (1–10)
- **Pursue recommendation badge** — color-coded (emerald/sky/amber/red)
- **Live overlay status banner** — spinner + "Personalizing your brief…" while overlay generates
- **Locked section placeholders** — visual preview of overlay sections when no resume uploaded

### Job Description Extraction
- Paste a URL → auto-extracts company name, role title, job description via Firecrawl + LLM
- Pre-populates form fields

### Authentication & History
- Email/password + Google OAuth (Supabase Auth)
- History page — last 20 deep dives with company, role, date, recommendation
- All data scoped to authenticated user

---

## Customer Journeys

### Journey 1 — The Pre-Interview Sprint (Resume Available, 30 min before)

1. Opens homepage — resume already on file from previous session
2. Pastes job posting URL → company + role auto-extracted
3. Clicks "Run Deep Dive" — redirected to processing screen
4. Status bar progresses: Fetching sources → Indexing → Generating report (60–90 sec)
5. Report loads — localStorage resume detected, overlay auto-triggers in background
6. Reads Interview Decision Summary immediately (5-sec scan)
7. Switches to "5-Minute Brief" mode → reads 6 cards + top 3 questions
8. Overlay completes ~30 sec later — reads Objections You Must Overcome
9. Copies Tell Me About Yourself verbatim from Positioning Strategy
10. Reviews Must Ask questions with follow-ups — heads into interview

---

### Journey 2 — The Serious Candidate (Deep Research, Days Before)

1. Uploads resume on homepage → saved to localStorage
2. Navigates to /deep-dive/new
3. Enters company URL, adds 2–3 custom URLs (press release, product blog)
4. Pastes job description, adds profile context
5. Submits — overlay triggers alongside base report
6. Reads full report: Executive Summary → Interview Decision Summary → 5-Min Brief → Assessment → Strategic Bet
7. Overlay sections appear — reads Candidate–Role Match (fit + score)
8. Reviews Gap Management → identifies 2 gaps to prep stories for
9. Opens Likely Interview Agenda accordion — sees 4 dimensions with proof needed
10. Bookmarks report URL
11. Day of interview: returns to URL, switches to 5-Min Brief for quick re-read

---

### Journey 3 — The Recruiter / Career Coach (No Resume, Market Research)

1. Pastes LinkedIn job URL on homepage
2. Report generates — reads Executive Summary + Strategic Importance of This Role
3. Reviews Company SWOT + Role SWOT (expands collapsed sections)
4. Reads Why This Role Exists Now — understands strategic timing
5. Checks Evidence Sources — verifies citations
6. Shares report URL with candidate client
7. Client opens URL, uploads resume via ResumeUploadPanel
8. Overlay generates → 7 personalization sections appear for candidate

---

### Journey 4 — The Returning User (Multiple Applications)

1. Opens /history — sees last 20 deep dives with recommendation badges
2. Clicks back into a "Cautious Pursue" report from last week
3. Data feels stale — clicks "Re-run analysis"
4. Full pipeline reruns with fresh web sources
5. Resume overlay re-triggers automatically (resume still in localStorage)
6. Compares new recommendation against previous one

---

### Journey 5 — The Skeptic (Evaluating Accuracy First)

1. Enters a company they know well to test accuracy — no resume uploaded
2. Reads Company SWOT — verifies claims against own knowledge
3. Checks Evidence Sources — confirms URLs are real and recent
4. Gives section-level feedback (useful / not useful)
5. Convinced — uploads resume via ResumeUploadPanel
6. Reads Candidate–Role Match — sees honest gap callouts, not flattery
7. Saves report URL
