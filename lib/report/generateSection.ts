import { generateStructuredCompletion } from "@/lib/ai/openai";
import {
  getCompanySnapshotPrompt,
  getRoleMandatePrompt,
  getRiskFlagsPrompt,
  getOpportunitiesPrompt,
  getPositioningPrompt,
  getSmartQuestionsPrompt,
  getRecommendationPrompt,
} from "@/lib/ai/prompts";
import { RetrievalContext } from "@/lib/types";

export async function generateCompanySnapshot(
  context: RetrievalContext,
  companyName: string,
  userContext: string
) {
  const prompt = getCompanySnapshotPrompt(context, companyName, userContext);
  return generateStructuredCompletion(prompt);
}

export async function generateRoleMandate(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription?: string
) {
  const prompt = getRoleMandatePrompt(
    context,
    companyName,
    roleTitle,
    jobDescription
  );
  return generateStructuredCompletion(prompt);
}

export async function generateRiskFlags(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  const prompt = getRiskFlagsPrompt(context, companyName, roleTitle);
  return generateStructuredCompletion(prompt);
}

export async function generateOpportunities(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  const prompt = getOpportunitiesPrompt(context, companyName, roleTitle);
  return generateStructuredCompletion(prompt);
}

export async function generatePositioning(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  candidateProfile?: string
) {
  const prompt = getPositioningPrompt(
    context,
    companyName,
    roleTitle,
    candidateProfile
  );
  return generateStructuredCompletion(prompt);
}

export async function generateSmartQuestions(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  const prompt = getSmartQuestionsPrompt(context, companyName, roleTitle);
  return generateStructuredCompletion(prompt);
}

export async function generateRecommendation(
  scores: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  },
  evidenceDensity: number,
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  const prompt = getRecommendationPrompt(
    scores,
    evidenceDensity,
    context,
    companyName,
    roleTitle
  );
  return generateStructuredCompletion(prompt);
}
