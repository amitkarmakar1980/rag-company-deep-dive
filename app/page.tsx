import Link from "next/link";
import { HomepageResumePanel } from "@/components/HomepageResumePanel";

// ─── Icon components ──────────────────────────────────────────────────────────

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <rect x="2.75" y="7.75" width="18.5" height="13.5" rx="2.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.25 7.75V6a2.25 2.25 0 0 0-2.25-2.25h-4A2.25 2.25 0 0 0 7.75 6v1.75" />
      <path strokeLinecap="round" d="M2.75 13h18.5" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 3.75A4.75 4.75 0 0 0 4.75 8.5c0 .97.29 1.87.79 2.62A3.75 3.75 0 0 0 3.75 15c0 1.77 1.23 3.25 2.89 3.63.3.07.61.12.93.12H12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 3.75A4.75 4.75 0 0 1 19.25 8.5c0 .97-.29 1.87-.79 2.62A3.75 3.75 0 0 1 20.25 15c0 1.77-1.23 3.25-2.89 3.63-.3.07-.61.12-.93.12H12" />
      <path strokeLinecap="round" d="M12 3.75v15.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 15.5 20.25 20.25" />
    </svg>
  );
}

function IconLightning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3.75 4.75 13.25H12l-1 7 8.25-9.5H12l1-7Z" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c2.693 1.49 5.527 2.332 8.25 2.458v5.117c0 4.29-2.4 8.218-6.2 10.15L12 22.5l-2.05-1.025c-3.8-1.932-6.2-5.86-6.2-10.15V6.208c2.723-.126 5.557-.968 8.25-2.458Z" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9M7.5 12h5.25M4.75 4.75h14.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.5l-4.5 2.5V6.75a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 18.25a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.25 10.75 14.5 15.5 9.5" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 14.25 9 20.25 9.75l-4.25 4.25 1 6-5-2.75-5 2.75 1-6L3.75 9.75 9.75 9 12 3.75Z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 19.25h14.5M7.75 19.25V12.5M12 19.25V7.75M16.25 19.25V10.5" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.75 4.75 6.5v12.75L9 17.5l6 2 4.25-1.75V5.25L15 7l-6-2.25Z" />
      <path strokeLinecap="round" d="M9 4.75v12.75M15 7v12.5" />
    </svg>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
        accent
          ? "border-[#1a4a3a]/20 bg-[#1a4a3a]/5 shadow-[0_8px_32px_rgba(26,74,58,0.07)]"
          : "border-[#e4ddd4] bg-white shadow-[0_2px_12px_rgba(28,23,19,0.06),0_8px_24px_rgba(28,23,19,0.04)] hover:border-[#c8bfb4] hover:shadow-[0_4px_16px_rgba(28,23,19,0.08),0_12px_32px_rgba(28,23,19,0.06)]"
      }`}
    >
      <div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          accent
            ? "bg-[#1a4a3a]/12 text-[#1a4a3a]"
            : "bg-[#f0ece4] text-[#1a4a3a] group-hover:bg-[#e6e0d6]"
        } transition-colors duration-200`}
      >
        {icon}
      </div>
      <h3 className={`mb-2 text-sm font-semibold ${accent ? "text-[#1a4a3a]" : "text-[#1c1713]"}`}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[#7a6d63]">{description}</p>
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────

function StepBadge({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1a4a3a]/25 bg-[#1a4a3a]/8 text-sm font-bold text-[#1a4a3a] shadow-[0_0_20px_rgba(26,74,58,0.08)]">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1c1713]">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#9c8d81]">{sub}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf8f3]">

      {/* ── Subtle warm texture overlay ── */}
      <svg className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.018]" aria-hidden>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* ── Ambient warm glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#1a4a3a]/4 blur-[140px]" />
        <div className="absolute top-1/3 -right-60 h-[400px] w-[400px] rounded-full bg-[#c8a96e]/6 blur-[120px]" />
        <div className="absolute bottom-1/4 -left-40 h-[400px] w-[500px] rounded-full bg-[#1a4a3a]/3 blur-[120px]" />
      </div>

      <div className="relative">

        {/* ════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8">
          <div className="text-center">

            {/* Eyebrow pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1a4a3a]/20 bg-[#1a4a3a]/6 px-4 py-1.5 shadow-[0_2px_12px_rgba(26,74,58,0.08)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1a4a3a] shadow-[0_0_6px_rgba(26,74,58,0.5)]" />
              <span className="text-xs font-medium tracking-wide text-[#1a4a3a]">Candidate Decision Intelligence</span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-bold leading-[1.1] tracking-[-0.04em] text-[#1c1713] sm:text-6xl lg:text-7xl">
              Know the company
              <span className="block bg-gradient-to-r from-[#1a4a3a] via-[#2d7a62] to-[#1a4a3a] bg-clip-text text-transparent">
                before you walk in.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mx-auto mb-10 max-w-xl text-lg leading-[1.7] text-[#6b5e52] sm:text-xl">
              Paste a job description. Get a grounded intelligence brief — company strategy, role mandate, risks, interview prep, and a personalised positioning plan.
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/deep-dive/new"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-[#1a4a3a] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(26,74,58,0.28),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:bg-[#153d30] hover:shadow-[0_6px_28px_rgba(26,74,58,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/50 active:scale-[0.98]"
              >
                <IconLightning />
                Generate a Deep Dive
              </Link>
              <Link
                href="/history"
                className="inline-flex items-center gap-2 rounded-xl border border-[#d4cdc4] bg-white px-6 py-3.5 text-sm font-medium text-[#4a3f36] shadow-[0_2px_8px_rgba(28,23,19,0.06)] transition-all duration-200 hover:border-[#c0b8ae] hover:bg-[#f7f4ee] hover:text-[#1c1713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
              >
                View past analyses
              </Link>
            </div>
          </div>

          {/* Decorative report mockup */}
          <div className="relative mx-auto mt-20 max-w-3xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#1a4a3a]/6 via-transparent to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-[#d4cdc4] bg-white p-6 shadow-[0_8px_40px_rgba(28,23,19,0.1),0_32px_80px_rgba(28,23,19,0.07)]">
              {/* Mock header bar */}
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
                <div className="ml-3 h-5 w-48 rounded-md bg-[#f0ece4]" />
                <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#f0ece4] px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a4a3a] shadow-[0_0_5px_rgba(26,74,58,0.6)]" />
                  <span className="text-[10px] font-medium text-[#6b5e52]">Personalized</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Company Momentum", val: "High", color: "text-[#1a4a3a]" },
                  { label: "Role Leverage", val: "Strong", color: "text-[#b5861a]" },
                  { label: "Execution Risk", val: "Low", color: "text-[#4a7a8a]" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[#e4ddd4] bg-[#faf8f3] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[#9c8d81]">{s.label}</p>
                    <p className={`mt-1 text-sm font-bold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                {[
                  { w: "w-full", label: "Executive Summary" },
                  { w: "w-5/6", label: "Strategic Bet Analysis" },
                  { w: "w-4/5", label: "Interview Decision Brief" },
                ].map((row) => (
                  <div key={row.label} className={`${row.w} rounded-lg border border-[#e4ddd4] bg-[#faf8f3] px-3.5 py-2.5`}>
                    <div className="mb-1.5 h-2 w-24 rounded bg-[#ddd6cc]" />
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded bg-[#e8e2d8]" />
                      <div className="h-1.5 w-4/5 rounded bg-[#e8e2d8]" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#1a4a3a]/20 bg-[#1a4a3a]/5 px-3.5 py-2.5">
                <span className="text-[#1a4a3a]"><IconCheckCircle /></span>
                <p className="text-xs font-medium text-[#1a4a3a]">Candidate-Role Match · 82% — Strong fit based on your resume</p>
              </div>
            </div>

            {/* Fade-out gradient at bottom of mockup */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-[#faf8f3] to-transparent" />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            HOW IT WORKS
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1a4a3a]">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#1c1713]">Three steps to grounded intelligence</h2>
          </div>

          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Connector line */}
            <div className="absolute top-6 left-1/6 hidden w-2/3 border-t border-dashed border-[#c8bfb4] sm:block" aria-hidden />
            <StepBadge
              n="01"
              label="Paste the job description"
              sub="Add the company name and paste the JD. Optionally upload your resume."
            />
            <StepBadge
              n="02"
              label="AI crawls & analyses"
              sub="We fetch news, earnings docs, company sites, and analyst coverage — then run deep strategic analysis."
            />
            <StepBadge
              n="03"
              label="Get your intelligence brief"
              sub="A full report with SWOT, interview prep, personalized positioning, and executive-caliber questions."
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            WHAT YOU GET
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1a4a3a]">What you get</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#1c1713]">Every report includes</h2>
            <p className="mt-3 text-sm text-[#9c8d81]">Generated from public sources — news, earnings reports, job postings, analyst coverage, and company sites.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<IconBrain />}
              title="Executive Summary"
              description="Top-level read on company health, strategic direction, and whether this role is worth pursuing — in one clear view."
            />
            <FeatureCard
              icon={<IconLightning />}
              title="5-Minute Brief"
              description="Decision-critical sections distilled into a fast-read format. Built for the morning of your interview."
            />
            <FeatureCard
              icon={<IconMap />}
              title="Strategic Bet Analysis"
              description="Company and role SWOT breakdowns, competitive landscape, why this role exists now, and how central it is to strategy."
            />
            <FeatureCard
              icon={<IconShield />}
              title="Risks & Red Flags"
              description="Restructuring signals, leadership instability, execution gaps, and unknowns you need to validate before accepting."
            />
            <FeatureCard
              icon={<IconChat />}
              title="Likely Interview Agenda"
              description="What they'll actually ask based on the role mandate, company context, and known hiring patterns for this type of role."
            />
            <FeatureCard
              icon={<IconSearch />}
              title="Questions to Ask Them"
              description="Executive-caliber questions that demonstrate strategic fluency and help you evaluate the opportunity — not just look good."
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            PERSONALIZED LAYER
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#1a4a3a]/18 bg-gradient-to-br from-[#1a4a3a] via-[#1e5542] to-[#153d30] p-8 shadow-[0_24px_60px_rgba(26,74,58,0.22)] sm:p-12">
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-72 rounded-full bg-[#c8a96e]/10 blur-3xl" aria-hidden />

            <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  <IconUser />
                  <span className="text-xs font-semibold text-white/90">With your resume</span>
                </div>
                <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
                  Unlock a layer built specifically for you
                </h2>
                <p className="text-sm leading-[1.7] text-white/70">
                  Upload your resume once. Every report you generate is then personalised — your fit, your gaps, your angles.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: <IconTarget />, title: "Candidate-Role Match", desc: "Scored fit assessment — where you're strong and where you're exposed." },
                  { icon: <IconStar />, title: "Strengths to Emphasize", desc: "Resume-grounded strengths mapped to what this hiring manager cares about." },
                  { icon: <IconShield />, title: "Objections You'll Face", desc: "The toughest interview objections — and exactly how to reframe each one." },
                  { icon: <IconChart />, title: "Gap Management", desc: "Honest gaps with talking points and reframes that don't sound defensive." },
                  { icon: <IconChat />, title: "Story Recommendations", desc: "Specific stories from your background mapped to this role's requirements." },
                  { icon: <IconBriefcase />, title: "Positioning Strategy", desc: 'Your headline, narrative arc, and a ready-to-use "Tell Me About Yourself."' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/12 bg-white/8 p-3.5">
                    <div className="mb-2 flex items-center gap-2 text-white/80">{item.icon}<span className="text-xs font-semibold text-white/90">{item.title}</span></div>
                    <p className="text-xs leading-relaxed text-white/55">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            RESUME PANEL + CTA
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <HomepageResumePanel />

          <div className="mt-10 text-center">
            <Link
              href="/deep-dive/new"
              className="inline-flex items-center gap-2.5 rounded-xl bg-[#1a4a3a] px-8 py-4 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(26,74,58,0.28),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:bg-[#153d30] hover:shadow-[0_6px_28px_rgba(26,74,58,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/50 active:scale-[0.98]"
            >
              <IconLightning />
              Generate your first Deep Dive
            </Link>
            <p className="mt-3 text-xs text-[#9c8d81]">Builds in stages from live sources · Sources cited throughout</p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            DISCLAIMER
        ════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-3xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#e4ddd4] bg-[#f5f1e8] px-6 py-5">
            <p className="text-xs font-semibold text-[#7a6d63] mb-1.5">Decision support, not career advice</p>
            <p className="text-xs leading-relaxed text-[#9c8d81]">
              The Deep-Dive Engine analyses publicly available information using AI to surface signals worth considering.
              Scores and recommendations are based on patterns in public data — use them to sharpen your thinking, not replace it.
              Always validate with real conversations.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
