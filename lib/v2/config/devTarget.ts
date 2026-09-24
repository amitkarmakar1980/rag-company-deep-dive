/**
 * Fixed development target.
 *
 * Every V2 step is built and eyeballed against one company, so that a change in
 * output is attributable to the change in code rather than to a different
 * subject. Swapping companies while iterating on prompts makes it impossible to
 * tell which variable moved.
 *
 * TEMPORARY. Delete at cutover — see BACKLOG B12.
 */

export const DEV_TARGET = {
  companyName: "Microsoft",
  companyUrl: "https://www.microsoft.com",
  /** Role context focuses research; it does not trigger fit analysis in V2's
   *  company sections. */
  roleTitle: "Principal Product Manager",
  jobDescription: undefined as string | undefined,
} as const;

/**
 * Microsoft is the easiest case in the golden set's taxonomy: a large public
 * company with dense filings, abundant press, and an enormous web footprint. It
 * tests synthesis — can the system pick the load-bearing facts out of far too
 * many of them — and it will make the researcher loop look better than it is,
 * because almost any query returns something usable.
 *
 * Two failure modes it will NOT surface, and which therefore cannot be called
 * fixed on the strength of Microsoft output alone:
 *
 *   1. Thin coverage. A company with a sparse footprint is where the researcher
 *      has to decide it has failed and say so, rather than padding. Microsoft
 *      never forces that branch.
 *
 *   2. Scope collapse. Microsoft is many businesses. A report that stays at
 *      holding-company altitude reads as competent while being useless to a
 *      candidate for one specific role — the exact failure V1 shipped. Section
 *      output should be checked for whether it actually narrows to the role's
 *      product area.
 *
 * Both are covered by the golden set, not by the dev loop.
 */
export const DEV_TARGET_CAVEATS = [
  "easiest retrieval case — do not read researcher-loop success as proven",
  "conglomerate — watch for holding-company altitude instead of role-relevant scope",
] as const;
