# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- Puppeteer is installed at `C:/Users/amitk/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/amitk/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Output Defaults
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color

## Default mode
- Use the cheapest adequate model first.
- Use low-effort reasoning by default.
- Escalate model or reasoning depth only when the task clearly requires it.
- Prefer patch mode over rewrite mode.

## Model routing
Use this order unless the user explicitly requests otherwise:

### Small / cheap model
Use for:
- formatting
- copy edits
- lint fixes
- small refactors
- boilerplate
- tests for existing behavior
- docs updates
- type fixes
- simple CRUD code
- narrow bug fixes with clear local cause
- grep/summarize/extract tasks
- converting content between formats

### Medium model
Use for:
- multi-file changes
- moderate debugging
- API integration work
- nontrivial refactors
- schema changes
- migration plans
- ambiguous code reading with bounded scope
- test design when behavior is underspecified

### Strong / expensive model
Use only for:
- architecture decisions
- root-cause analysis across many files
- vague or conflicting requirements
- algorithm design
- security/privacy-sensitive logic
- performance bottlenecks with unclear cause
- changes with high blast radius
- tasks requiring tradeoff analysis

## Escalation rules
Escalate only if one of these is true:
- the cheap model failed
- the task spans many files or systems
- requirements are ambiguous or conflicting
- the bug is not locally diagnosable
- correctness risk is high
- the user explicitly asks for deep analysis

Do not escalate just to improve wording or polish.

## Output contract
- Output only the final artifact needed.
- Show only changed files, changed blocks, or exact commands.
- Never restate unchanged code.
- Do not explain obvious changes.
- Keep notes to at most 3 bullets.
- Omit rationale unless it affects correctness, risk, or follow-up.
- Prefer diffs over full-file rewrites.
- Prefer filenames + patches over prose.

## Token discipline
- Be brief by default.
- Do not narrate your process.
- Do not produce long plans unless asked.
- Do not repeat the prompt or requirements.
- Do not generate alternatives unless asked.
- Do not add examples unless needed to implement correctly.
- Do not summarize code the user can already see.
- When listing options, cap at 3.
- When asked a yes/no question, answer yes/no first, then one sentence.

## Code-change policy
- Make the smallest useful change.
- Reuse existing patterns, helpers, and libraries.
- Avoid introducing new dependencies unless necessary.
- Avoid broad renames or large rewrites unless required.
- Preserve public interfaces unless the task requires changing them.
- Prefer backward-compatible changes.

## Spec handling
- Treat the repo and SPEC.md as source of truth.
- If requirements changed, update SPEC.md first.
- If implementation and SPEC.md conflict, follow SPEC.md and flag the mismatch briefly.
- Do not rewrite SPEC.md for minor implementation details.

## Debugging policy
- Start with the most local plausible cause.
- Form one primary hypothesis first.
- Check existing logs, tests, types, and nearby callers before proposing broad changes.
- Prefer one targeted fix over multiple speculative fixes.
- Add or update the narrowest test that proves the fix.

## Editing policy
- For text/doc edits, return only the edited text.
- For code edits, return only the patch or changed blocks.
- For review tasks, list only issues and recommended fixes.
- For summarization, keep to the requested length.

## Command/tool policy
- Prefer existing repo scripts over custom commands.
- Do not run expensive operations unless necessary.
- Avoid full builds when a targeted check will do.
- Prefer targeted tests over full test suites.
- Prefer reading specific files over scanning the whole repo.

## When to ask
Ask only if blocked by a missing decision that materially changes implementation.
Otherwise make the most reasonable assumption from repo patterns and proceed.

## Priorities
1. Correctness
2. Smallest useful change
3. Cost efficiency
4. Maintainability
5. Speed

## Response examples
Good:
- unified diff
- changed function only
- exact command
- short answer plus one constraint

Bad:
- full-file dump when only 3 lines changed
- long explanation of obvious code
- multiple alternative implementations without request
- deep-model use for routine formatting or local edits