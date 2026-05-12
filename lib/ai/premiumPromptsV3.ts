import { getPremiumReportPromptV2 } from "@/lib/ai/premiumPromptsV2";

export async function getPremiumReportPromptV3(
  ...args: Parameters<typeof getPremiumReportPromptV2>
): Promise<string> {
  const prompt = await getPremiumReportPromptV2(...args);

  return prompt
    .replace(
      "You are generating a company deep dive plus interview prep report.",
      "You are generating Report V3: the new primary company deep dive plus interview prep report."
    )
    .replace(
      "Use these existing JSON sections as the implementation contract:",
      "Use this V3 JSON section contract as the implementation baseline:"
    );
}