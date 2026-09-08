import { test, expect } from '@playwright/test';

test('authenticated hosted workspace can add, scan, persist, and remove a public repository', async ({
  page,
}) => {
  const repository = process.env.SLOP_METER_E2E_REPO;
  test.skip(
    !process.env.SLOP_METER_HOSTED_URL || !process.env.SLOP_METER_AUTH_STATE || !repository,
    'Set the hosted URL, a dedicated test-account storage state, and a public test repository.',
  );

  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();

  const added = await page.request.post('/api/repos', {
    data: { source: 'github', location: repository },
  });
  expect(added.status()).toBe(201);
  const repo = (await added.json()) as { id: string };
  let scanId: string | undefined;

  try {
    const started = await page.request.post('/api/scans', {
      data: {
        repoId: repo.id,
        harness: 'static',
        model: '',
        effort: 'medium',
        depth: 'quick',
        profileId: 'balanced',
      },
    });
    expect(started.status()).toBe(202);
    const scan = (await started.json()) as { id: string };
    scanId = scan.id;

    await expect
      .poll(
        async () => {
          const response = await page.request.get('/api/workspace');
          expect(response.ok()).toBeTruthy();
          const workspace = (await response.json()) as {
            scans: { id: string; status: string }[];
          };
          return workspace.scans.find((item) => item.id === scan.id)?.status;
        },
        { timeout: 120_000 },
      )
      .toBe('completed');
  } finally {
    if (scanId) await page.request.post(`/api/scans/${scanId}/cancel`);
    const removed = await page.request.delete(`/api/repos/${repo.id}`);
    expect(removed.ok()).toBeTruthy();
  }
});
