import { chromium } from '@playwright/test';
import { cleanupTestAccounts, randomTestEmail, signInSeededUser } from '../tests/support/testAccounts.ts';

type ReportSection = {
  key: string;
  title: string;
  content: string;
};

type ParsedSection = {
  summary?: string;
  blocks?: Array<{ title: string; body?: string; bullets?: string[] }>;
  evidence?: { status?: string; confidence?: string; note?: string };
};

function parseSection(sections: ReportSection[], key: string): ParsedSection | null {
  const section = sections.find((entry) => entry.key === key);
  if (!section) {
    return null;
  }

  try {
    return JSON.parse(section.content) as ParsedSection;
  } catch {
    return null;
  }
}

async function pollForCompletion(request: ReturnType<typeof chromium.launch> extends Promise<infer _> ? any : never, requestId: string) {
  const deadline = Date.now() + 420_000;

  while (Date.now() < deadline) {
    const response = await request.get(`/api/deep-dive/status?id=${requestId}`);
    if (!response.ok()) {
      throw new Error(`Status request failed with ${response.status()}.`);
    }

    const payload = await response.json();
    if (payload.status === 'completed') {
      return payload;
    }

    if (payload.status === 'failed') {
      throw new Error(`Live validation failed: ${payload.error ?? 'unknown pipeline failure'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  throw new Error('Timed out waiting for live deep-dive completion.');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const page = await context.newPage();
  const email = randomTestEmail('live-company-strategy');
  const password = 'TestPass123!';

  try {
    await signInSeededUser(page, email, password);

    const createResponse = await page.request.post('/api/deep-dive/create', {
      data: {
        companyName: 'Microsoft',
        roleTitle: 'Senior Product Manager',
        companyUrl: 'https://www.microsoft.com',
        jobDescription: 'Lead product strategy, prioritization, competitive analysis, market research, and cross-functional execution for a platform product serving enterprise customers.',
      },
    });

    if (!createResponse.ok()) {
      throw new Error(`Create request failed with ${createResponse.status()}.`);
    }

    const createJson = await createResponse.json();
    const requestId = createJson.requestId as string | undefined;
    if (!requestId) {
      throw new Error('Live validation did not return a request id.');
    }

    console.log(JSON.stringify({ phase: 'created', requestId }, null, 2));

    const statusPayload = await pollForCompletion(page.request, requestId);
    const reportId = statusPayload.report?.id as string | undefined;
    if (!reportId) {
      throw new Error('Completed request did not include a report id.');
    }

    const reportResponse = await page.request.get(`/api/report/${reportId}`);
    if (!reportResponse.ok()) {
      throw new Error(`Report fetch failed with ${reportResponse.status()}.`);
    }

    const report = await reportResponse.json();
    const companyContext = parseSection(report.sections as ReportSection[], 'company_context');
    const companyRoleStrategy = parseSection(report.sections as ReportSection[], 'company_role_strategy');

    const summary = {
      phase: 'completed',
      requestId,
      reportId,
      recommendation: report.recommendation,
      qualityGate: report.qualityGate
        ? {
            releaseDecision: report.qualityGate.release_decision,
            warningFlags: report.qualityGate.warning_flags,
            blockedReasons: report.qualityGate.blocked_release_reasons,
            suppressedSections: report.qualityGate.suppressed_sections,
          }
        : null,
      researchPlan: report.researchPlan
        ? {
            retrievalQueries: report.researchPlan.retrievalQueries,
            requiredSourceClasses: report.researchPlan.sourceStrategy?.requiredSourceClasses,
            recommendedSourceCount: report.researchPlan.sourceStrategy?.recommendedSources?.length,
          }
        : null,
      sourceCoverage: report.sourceCoverage
        ? {
            totalSources: report.sourceCoverage.total_sources,
            distinctHosts: report.sourceCoverage.distinct_hosts,
            sourceTypes: report.sourceCoverage.source_type_breakdown,
            missingMandatory: report.sourceCoverage.persona_source_class_audit?.missingMandatory,
          }
        : null,
      companyContext: companyContext
        ? {
            evidence: companyContext.evidence,
            blockTitles: companyContext.blocks?.map((block) => block.title) ?? [],
            summaryLength: companyContext.summary?.length ?? 0,
          }
        : null,
      companyRoleStrategy: companyRoleStrategy
        ? {
            evidence: companyRoleStrategy.evidence,
            blockTitles: companyRoleStrategy.blocks?.map((block) => block.title) ?? [],
            summaryLength: companyRoleStrategy.summary?.length ?? 0,
          }
        : null,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await cleanupTestAccounts();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});