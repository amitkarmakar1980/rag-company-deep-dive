import Link from "next/link";
import { HomepageResumePanel } from "@/components/HomepageResumePanel";

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative rounded-2xl border border-white/14 bg-white/8 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/12 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]" style={{ backdropFilter: "blur(12px)" }}>
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#22d3ee]/15 text-[#22d3ee] group-hover:bg-[#22d3ee]/22 transition-colors duration-200">
        {icon}
      </div>
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-[#9ba3bf]">{description}</p>
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────

function StepBadge({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#6366f1]/40 bg-[#6366f1]/15 text-sm font-bold text-[#a5b4fc] shadow-[0_0_20px_rgba(99,102,241,0.18)]">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#e2e4ef]">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#7b82a0]">{sub}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden" style={{ background: "linear-gradient(105deg, #040610 0%, #060912 30%, #0c1228 60%, #0f1535 100%)" }}>

      {/* ── Grain texture ── */}
      <svg className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.04]" aria-hidden>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* ── Watercolor background blobs — fixed so they span the whole page ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {/* Large indigo bloom — upper center-right */}
        <div className="absolute -top-40 right-[10%] h-[720px] w-[600px] rounded-full opacity-[0.18]"
          style={{ background: "radial-gradient(ellipse at center, #4f46e5 0%, #6d28d9 30%, transparent 70%)", filter: "blur(90px)" }} />
        {/* Cyan wash — right edge mid */}
        <div className="absolute top-[25%] -right-20 h-[500px] w-[420px] rounded-full opacity-[0.10]"
          style={{ background: "radial-gradient(ellipse at right, #06b6d4 0%, #0891b2 40%, transparent 70%)", filter: "blur(80px)" }} />
        {/* Deep violet pool — left upper */}
        <div className="absolute top-[10%] -left-20 h-[500px] w-[480px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(ellipse at left, #7c3aed 0%, #4c1d95 50%, transparent 70%)", filter: "blur(100px)" }} />
        {/* Soft teal smear — lower left */}
        <div className="absolute bottom-[20%] -left-10 h-[400px] w-[460px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(ellipse at left, #0d9488 0%, #0f766e 50%, transparent 70%)", filter: "blur(100px)" }} />
        {/* Indigo anchor — bottom center */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[360px] w-[700px] rounded-full opacity-[0.10]"
          style={{ background: "radial-gradient(ellipse at center, #4338ca 0%, transparent 65%)", filter: "blur(80px)" }} />
      </div>

      {/* ── Side ring decorations ── */}
      <div className="pointer-events-none fixed inset-y-0 left-0 hidden xl:block overflow-hidden opacity-[0.07]" aria-hidden>
        <div className="absolute top-1/4 -left-20 h-64 w-64 rounded-full border-2 border-[#6366f1]" />
        <div className="absolute top-[30%] -left-10 h-44 w-44 rounded-full border border-[#22d3ee]" />
        <div className="absolute top-[45%] -left-28 h-80 w-80 rounded-full border border-[#6366f1]/50" />
      </div>
      <div className="pointer-events-none fixed inset-y-0 right-0 hidden xl:block overflow-hidden opacity-[0.07]" aria-hidden>
        <div className="absolute top-1/3 -right-20 h-64 w-64 rounded-full border-2 border-[#6366f1]" />
        <div className="absolute top-[38%] -right-10 h-44 w-44 rounded-full border border-[#22d3ee]" />
        <div className="absolute top-[55%] -right-28 h-80 w-80 rounded-full border border-[#6366f1]/50" />
      </div>

      {/* ════════════════════════════════════════════════════════
          HERO — dark navy zone (#080b18)
      ════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <div className="text-center">

          {/* Eyebrow pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/10 px-4 py-1.5 shadow-[0_2px_12px_rgba(99,102,241,0.12)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_6px_rgba(34,211,238,0.7)]" />
            <span className="text-xs font-medium tracking-wide text-[#a5b4fc]">Candidate Decision Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-[-0.04em] text-[#e2e4ef] sm:text-5xl lg:text-7xl">
            Know the company
            <span className="block bg-gradient-to-r from-[#22d3ee] via-[#67e8f9] to-[#22d3ee] bg-clip-text text-transparent">
              before you walk in.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mb-10 max-w-xl text-base leading-[1.7] text-[#7b82a0] sm:text-lg">
            Paste a job description. Get a grounded intelligence brief — company strategy, role mandate, risks, interview prep, and a personalised positioning plan.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/deep-dive/new"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#4338ca] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(109,40,217,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 hover:from-[#7c3aed] hover:to-[#4f46e5] hover:shadow-[0_6px_32px_rgba(109,40,217,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/60 active:scale-[0.98]"
            >
              <IconLightning />
              Generate a Deep Dive
            </Link>
            <Link
              href="/history"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-medium text-[#a5b4fc] transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40"
            >
              View past analyses
            </Link>
          </div>
        </div>

        {/* Report mockup */}
        <div className="relative mx-auto mt-16 sm:mt-20 max-w-3xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#6366f1]/8 via-transparent to-transparent blur-2xl" />
          <div className="relative rounded-2xl border border-white/16 bg-white/8 p-4 sm:p-6 shadow-[0_8px_40px_rgba(0,0,0,0.4),0_32px_80px_rgba(0,0,0,0.3)] backdrop-blur-sm">
            <div className="mb-4 sm:mb-5 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
              <div className="ml-3 h-5 w-32 sm:w-48 rounded-md bg-white/8" />
              <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/6 px-2 sm:px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_5px_rgba(34,211,238,0.7)]" />
                <span className="text-[10px] font-medium text-[#7b82a0] hidden sm:inline">Personalized</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              {[
                { label: "Company Momentum", val: "High", color: "text-[#22d3ee]" },
                { label: "Role Leverage", val: "Strong", color: "text-[#a5b4fc]" },
                { label: "Execution Risk", val: "Low", color: "text-[#34d399]" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/14 bg-white/8 p-2 sm:p-3">
                  <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-[#6b74a0] leading-tight">{s.label}</p>
                  <p className={`mt-1 text-xs sm:text-sm font-bold ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 sm:space-y-2.5">
              {[
                { w: "w-full", label: "Executive Summary" },
                { w: "w-5/6", label: "Strategic Bet Analysis" },
                { w: "w-4/5", label: "Interview Decision Brief" },
              ].map((row) => (
                <div key={row.label} className={`${row.w} rounded-lg border border-white/12 bg-white/7 px-3 sm:px-3.5 py-2 sm:py-2.5`}>
                  <div className="mb-1.5 h-2 w-16 sm:w-24 rounded bg-white/10" />
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded bg-white/6" />
                    <div className="h-1.5 w-4/5 rounded bg-white/6" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 sm:mt-4 flex items-start sm:items-center gap-2 rounded-lg border border-[#22d3ee]/20 bg-[#22d3ee]/6 px-3 sm:px-3.5 py-2 sm:py-2.5">
              <span className="text-[#22d3ee] flex-shrink-0 mt-0.5 sm:mt-0"><IconCheckCircle /></span>
              <p className="text-xs font-medium text-[#22d3ee]">Candidate-Role Match · 82% — Strong fit based on your resume</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-[#080b18] to-transparent" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22d3ee]">How it works</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#e2e4ef]">Three steps to grounded intelligence</h2>
          </div>

          <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            <div className="absolute top-6 left-[16.5%] hidden w-[67%] border-t border-dashed border-white/10 sm:block" aria-hidden />
            <StepBadge n="01" label="Paste the job description" sub="Add the company name and paste the JD. Optionally upload your resume." />
            <StepBadge n="02" label="AI crawls & analyses" sub="We fetch news, earnings docs, company sites, and analyst coverage — then run deep strategic analysis." />
            <StepBadge n="03" label="Get your intelligence brief" sub="A full report with SWOT, interview prep, personalized positioning, and executive-caliber questions." />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          WHAT YOU GET
      ════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22d3ee]">What you get</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#e2e4ef]">Every report includes</h2>
            <p className="mt-3 text-sm text-[#6b74a0]">Generated from public sources — news, earnings reports, job postings, analyst coverage, and company sites.</p>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={<IconBrain />} title="Executive Summary" description="Top-level read on company health, strategic direction, and whether this role is worth pursuing — in one clear view." />
            <FeatureCard icon={<IconLightning />} title="5-Minute Brief" description="Decision-critical sections distilled into a fast-read format. Built for the morning of your interview." />
            <FeatureCard icon={<IconMap />} title="Strategic Bet Analysis" description="Company and role SWOT breakdowns, competitive landscape, why this role exists now, and how central it is to strategy." />
            <FeatureCard icon={<IconShield />} title="Risks & Red Flags" description="Restructuring signals, leadership instability, execution gaps, and unknowns you need to validate before accepting." />
            <FeatureCard icon={<IconChat />} title="Likely Interview Agenda" description="What they'll actually ask based on the role mandate, company context, and known hiring patterns for this type of role." />
            <FeatureCard icon={<IconSearch />} title="Questions to Ask Them" description="Executive-caliber questions that demonstrate strategic fluency and help you evaluate the opportunity — not just look good." />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          PERSONALIZED
      ════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#6366f1]/20 bg-gradient-to-br from-[#1a1040] via-[#150d38] to-[#0f0a28] p-6 sm:p-10 lg:p-12 shadow-[0_24px_60px_rgba(99,102,241,0.15)]">
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#6366f1]/12 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-72 rounded-full bg-[#22d3ee]/8 blur-3xl" aria-hidden />

            <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/15 px-3 py-1">
                  <IconUser />
                  <span className="text-xs font-semibold text-[#a5b4fc]">With your resume</span>
                </div>
                <h2 className="mb-4 text-xl sm:text-2xl lg:text-3xl font-bold tracking-[-0.03em] text-white">
                  Unlock a layer built specifically for you
                </h2>
                <p className="text-sm leading-[1.7] text-[#7b82a0]">
                  Upload your resume once. Every report you generate is then personalised — your fit, your gaps, your angles.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <IconTarget />, title: "Candidate-Role Match", desc: "Scored fit assessment — where you're strong and where you're exposed." },
                  { icon: <IconStar />, title: "Strengths to Emphasize", desc: "Resume-grounded strengths mapped to what this hiring manager cares about." },
                  { icon: <IconShield />, title: "Objections You'll Face", desc: "The toughest interview objections — and exactly how to reframe each one." },
                  { icon: <IconChart />, title: "Gap Management", desc: "Honest gaps with talking points and reframes that don't sound defensive." },
                  { icon: <IconChat />, title: "Story Recommendations", desc: "Specific stories from your background mapped to this role's requirements." },
                  { icon: <IconBriefcase />, title: "Positioning Strategy", desc: 'Your headline, narrative arc, and a ready-to-use "Tell Me About Yourself."' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/14 bg-white/9 p-3.5">
                    <div className="mb-2 flex items-center gap-2 text-[#a5b4fc]">
                      {item.icon}
                      <span className="text-xs font-semibold text-white/90">{item.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#6b74a0]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          RESUME PANEL + CTA
      ════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12 sm:px-6 lg:px-8">
          <HomepageResumePanel />

          <div className="mt-10 text-center">
            <Link
              href="/deep-dive/new"
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#4338ca] px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(109,40,217,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 hover:from-[#7c3aed] hover:to-[#4f46e5] hover:shadow-[0_6px_32px_rgba(109,40,217,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/60 active:scale-[0.98]"
            >
              <IconLightning />
              Generate your first Deep Dive
            </Link>
            <p className="mt-3 text-xs text-[#6b74a0]">Builds in stages from live sources · Sources cited throughout</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          DISCLAIMER
      ════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:pb-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/12 bg-white/6 px-5 sm:px-6 py-5">
            <p className="text-xs font-semibold text-[#7b82a0] mb-1.5">Decision support, not career advice</p>
            <p className="text-xs leading-relaxed text-[#6b74a0]">
              The Deep-Dive Engine analyses publicly available information using AI to surface signals worth considering.
              Scores and recommendations are based on patterns in public data — use them to sharpen your thinking, not replace it.
              Always validate with real conversations.
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
