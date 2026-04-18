import { test, expect } from '@playwright/test';
import { randomTestEmail, signInSeededUser } from './support/testAccounts';

test.describe('Resume create regression', () => {
  test.setTimeout(420_000);

  test('create flow persists resume context and keeps persona inference anchored to title plus JD while candidate-fit refresh still uses the resume', async ({ page }) => {
    const email = randomTestEmail('resume-create');
    const password = 'TestPass123!';
    await signInSeededUser(page, email, password);

    const createResponse = await page.request.post('/api/deep-dive/create', {
      data: {
        companyName: 'Microsoft',
        roleTitle: 'Solutions Architect',
        companyUrl: 'https://www.microsoft.com',
        jobDescription: 'Drive technical discovery and architect partner integrations for enterprise customers.',
        resumeText: 'Senior Product Manager with 8 years owning roadmap, prioritization, experimentation, user research, and platform strategy across B2B SaaS products.',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createJson = await createResponse.json();
    const requestId = createJson.requestId as string;
    expect(requestId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const response = await page.request.get(`/api/deep-dive/status?id=${requestId}`);
          expect(response.ok()).toBeTruthy();
          const statusJson = await response.json();
          return statusJson.status;
        },
        {
          timeout: 300_000,
          intervals: [1_000, 2_000, 5_000],
        }
      )
      .toBe('completed');

    const statusResponse = await page.request.get(`/api/deep-dive/status?id=${requestId}`);
    expect(statusResponse.ok()).toBeTruthy();
    const statusJson = await statusResponse.json();

    const reportId = statusJson.report?.id as string;
    expect(reportId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const response = await page.request.get(`/api/overlay/${requestId}`);
          expect(response.ok()).toBeTruthy();
          const overlayJson = await response.json();
          return overlayJson.status ?? (overlayJson.exists ? 'pending' : 'missing');
        },
        {
          timeout: 180_000,
          intervals: [1_000, 2_000, 5_000],
        }
      )
      .toBe('completed');

    const reportResponse = await page.request.get(`/api/report/${reportId}`);
    expect(reportResponse.ok()).toBeTruthy();
    const reportJson = await reportResponse.json();

    expect(reportJson.resumeProvided).toBe(true);
    expect(reportJson.personaProfile?.primaryRoleFamilyLabel ?? reportJson.personaProfile?.roleFamilyLabel).toBe('Engineering');
    expect(reportJson.personaProfile?.confidence).toMatch(/high|medium|low/);

    const candidateFitSection = reportJson.sections.find((section: { key: string }) => section.key === 'candidate_fit');
    expect(candidateFitSection).toBeTruthy();

    const candidateFitContent = JSON.parse(candidateFitSection.content);
    expect(candidateFitContent.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Resume provided?', value: 'true' }),
      ])
    );
    expect(candidateFitContent.evidence).toEqual(
      expect.objectContaining({ threshold: 'resume overlay', status: 'met' })
    );
    expect(reportJson.scores.candidate_fit).toBeGreaterThan(0);
  });
});