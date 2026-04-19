import { normalizeHttpUrl } from "@/lib/report/sourceLinks";

export type SourceStrategyPlannedSource = {
  url: string;
  type: string;
  priority: number;
  rationale?: string;
  sourceClasses?: string[];
  label?: string;
};

export type SourceStrategyResearchPlan = {
  strategySummary?: string | null;
  selectedSources?: SourceStrategyPlannedSource[] | null;
  retrievalQueries?: string[] | null;
  sourceStrategy?: {
    goal?: string | null;
    requiredSourceClasses?: string[] | null;
    priorityOrder?: string[] | null;
    recommendedSources?: SourceStrategyPlannedSource[] | null;
    notes?: string[] | null;
  } | null;
};

function sourceTypeLabel(type: string): string {
  switch (type) {
    case "company_homepage":
      return "Company Site";
    case "newsroom":
      return "Newsroom";
    case "blog":
      return "Blog";
    case "custom_url":
      return "Search / External";
    case "job_description":
      return "Job Description";
    default:
      return type.replace(/_/g, " ");
  }
}

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sourceDisplayTitle(source: SourceStrategyPlannedSource): string {
  if (source.label?.trim()) {
    return source.label.trim();
  }

  try {
    const parsed = new URL(source.url);
    if (parsed.hostname.includes("google.")) {
      const query = parsed.searchParams.get("q");
      if (query?.trim()) {
        return decodeURIComponent(query);
      }
    }
  } catch {
    return hostnameFrom(source.url);
  }

  return hostnameFrom(source.url);
}

export function SourceStrategyPanel({
  id,
  researchPlan,
  eyebrow = "Source Strategy",
  title = "Planned company-strategy source catalog",
  description,
  compact = false,
  feedback,
}: {
  id?: string;
  researchPlan: SourceStrategyResearchPlan | null | undefined;
  eyebrow?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  feedback?: React.ReactNode;
}) {
  if (!researchPlan) {
    return null;
  }

  const selectedSources = researchPlan.selectedSources ?? [];
  const selectedUrls = new Set(selectedSources.map((source) => normalizeHttpUrl(source.url) ?? source.url));
  const catalogSources = researchPlan.sourceStrategy?.recommendedSources?.length
    ? researchPlan.sourceStrategy.recommendedSources
    : selectedSources;
  const visibleSources = compact ? catalogSources.slice(0, 8) : catalogSources;
  const requiredSourceClasses = researchPlan.sourceStrategy?.requiredSourceClasses ?? [];
  const strategyNotes = researchPlan.sourceStrategy?.notes ?? [];
  const priorityOrder = researchPlan.sourceStrategy?.priorityOrder ?? [];
  const queries = researchPlan.retrievalQueries ?? [];

  return (
    <section id={id} className="rounded-[24px] border border-[#ddd4c8] bg-white/90 px-4 py-5 shadow-[0_14px_30px_rgba(28,23,19,0.05)] sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b5e52]">
            {description ?? researchPlan.strategySummary ?? "The system planned these sources before synthesis so company strategy coverage had to be earned up front."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.68rem]">
          <span className="rounded-full border border-[#d8e5ea] bg-[#eef5f8] px-3 py-1 font-medium text-[#2d5c6a]">
            {selectedSources.length} selected this run
          </span>
          <span className="rounded-full border border-[#e5dbcf] bg-[#faf6ef] px-3 py-1 font-medium text-[#6b5e52]">
            {catalogSources.length} catalog candidates
          </span>
        </div>
      </div>

      {researchPlan.sourceStrategy?.goal ? (
        <div className="mt-4 rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Strategy goal</p>
          <p className="mt-2 text-sm leading-6 text-[#4a3f36]">{researchPlan.sourceStrategy.goal}</p>
        </div>
      ) : null}

      {requiredSourceClasses.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {requiredSourceClasses.map((sourceClass) => (
            <span key={sourceClass} className="rounded-full border border-[#d8e5ea] bg-[#eef5f8] px-3 py-1 text-[0.68rem] font-medium text-[#2d5c6a]">
              {sourceClass.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {visibleSources.map((source, index) => {
          const normalizedUrl = normalizeHttpUrl(source.url) ?? source.url;
          const isSelected = selectedUrls.has(normalizedUrl);

          return (
            <div key={`${source.url}-${index}`} className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full border border-[#e4ddd4] bg-[#faf6ef] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7a6d63]">
                      {sourceTypeLabel(source.type)}
                    </span>
                    <span className="rounded-full border border-[#e4ddd4] bg-white px-2.5 py-1 text-[0.68rem] font-medium text-[#7a6d63]">
                      Priority {source.priority}
                    </span>
                    {isSelected ? (
                      <span className="rounded-full border border-[#cfe1d8] bg-[#edf6f0] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#1a4a3a]">
                        Selected this run
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 min-w-0">
                    <a
                      href={normalizedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm font-medium text-[#1c1713] underline decoration-[#d4cdc4] underline-offset-4 hover:text-[#1a4a3a]"
                    >
                      {sourceDisplayTitle(source)}
                    </a>
                    <p className="mt-1 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[#9c8d81]">{hostnameFrom(normalizedUrl)}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6b5e52]">{source.rationale ?? "Added to strengthen company-strategy coverage."}</p>
                  </div>
                </div>
              </div>
              {source.sourceClasses?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {source.sourceClasses.map((sourceClass) => (
                    <span key={sourceClass} className="rounded-full border border-[#eadfbf] bg-[#fff6e7] px-2.5 py-1 text-[0.68rem] font-medium text-[#8a5a14]">
                      {sourceClass.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {priorityOrder.length > 0 || strategyNotes.length > 0 || queries.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Priority order</p>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-[#4a3f36]">
              {priorityOrder.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Planner notes</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4a3f36]">
              {strategyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Retrieval queries</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4a3f36]">
              {queries.map((query) => (
                <li key={query}>{query}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {feedback ? <div className="mt-5 border-t border-[#eee4d8] pt-4">{feedback}</div> : null}
    </section>
  );
}