# Report Simplification Audit

## Current code ownership

- Company retrieval: [app/api/deep-dive/create/route.ts](app/api/deep-dive/create/route.ts), [lib/ingestion/ingest.ts](lib/ingestion/ingest.ts), [lib/ingestion/firecrawl.ts](lib/ingestion/firecrawl.ts)
- Role and JD retrieval: [lib/ingestion/ingest.ts](lib/ingestion/ingest.ts), [lib/report/assemblePremiumReportV2.ts](lib/report/assemblePremiumReportV2.ts)
- Candidate resume and profile ingestion: [app/api/resume/upload/route.ts](app/api/resume/upload/route.ts), [lib/report/generateOverlay.ts](lib/report/generateOverlay.ts)
- Synthesis and generation: [lib/report/assemblePremiumReportV2.ts](lib/report/assemblePremiumReportV2.ts), [lib/ai/premiumPromptsV2.ts](lib/ai/premiumPromptsV2.ts), [lib/ai/premiumEvaluationPrompt.ts](lib/ai/premiumEvaluationPrompt.ts), [lib/ai/openai.ts](lib/ai/openai.ts)
- Final UI and report rendering: [app/api/report/[id]/route.ts](app/api/report/[id]/route.ts), [components/report/PremiumReportView.tsx](components/report/PremiumReportView.tsx), [lib/report/premiumPresentationViewModel.ts](lib/report/premiumPresentationViewModel.ts)

## What is broken today

- The report contract is too fragmented. The product goal is four things, but the premium flow still spreads content across many sections and appendix-style layers.
- Retrieval is too persona-shaped and does not always guarantee baseline coverage for company basics, product lines, role charter, and employee sentiment.
- The prompt is overloaded with governance and structure requirements, which increases token usage and encourages padded writing.
- Candidate fit is not presented as a simple, interpretable decision layer.
- Interview prep can become generic because it is not forced tightly enough to connect company context, role context, and candidate evidence.
- The UI still feels like a premium memo rather than a practical company-and-role prep tool.

## Why it is broken

- Too many sections create overlap, repetition, and weak transitions.
- Weak retrieval can still flow into rich synthesis, so the system sounds more certain than the evidence deserves.
- Candidate-fit and interview-prep logic are not the clear center of the product even though they drive user value.
- Legacy credibility and operations surfaces still shape the reading experience even when they are not the main user job.

## What should change

- Keep the existing pipeline, but make the visible product align to exactly 4 categories: Company Deep Dive, About the Role, Candidate-Skill Match, Interview Preparation.
- Add deterministic baseline retrieval for company, role, candidate-fit, and employee-sentiment coverage.
- Simplify prompts around the four user jobs and explicitly reject generic filler.
- Keep uncertainty explicit when evidence is weak.
- Make candidate-fit scoring and final pursue decision easier to interpret.
- Render the main report as 4 categories and move legacy appendix-style material out of the primary flow.

## Implemented in this pass

- Added deterministic baseline retrieval queries in [lib/report/assemblePremiumReportV2.ts](lib/report/assemblePremiumReportV2.ts)
- Simplified synthesis prompt in [lib/ai/premiumPromptsV2.ts](lib/ai/premiumPromptsV2.ts)
- Simplified evaluation prompt in [lib/ai/premiumEvaluationPrompt.ts](lib/ai/premiumEvaluationPrompt.ts)
- Collapsed the visible report into 4 categories in [lib/report/premiumPresentationViewModel.ts](lib/report/premiumPresentationViewModel.ts)
- Updated UI language in [components/report/PremiumReportView.tsx](components/report/PremiumReportView.tsx)

## Next practical follow-ups

- Move the candidate overlay prompt to the same scoring dimensions used by the main report
- Reduce or retire legacy appendix sections from persistence if they are no longer needed for QA
- Add one live fixture test that checks the rendered report groups and labels against the 4-category contract