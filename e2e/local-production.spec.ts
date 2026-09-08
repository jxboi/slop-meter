import { test, expect } from '@playwright/test';

test('local production build supports the primary scan workflow without hosted sign-in', async ({
  page,
}) => {
  test.skip(Boolean(process.env.SLOP_METER_HOSTED_URL), 'This test exercises the local server.');
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A little less slop. A lot more direction.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in to Slop Meter' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add repository' }).first().click();
  const addDialog = page.getByRole('dialog', { name: 'Add a repository' });
  await addDialog.getByRole('button', { name: 'Local directory' }).click();
  await addDialog.getByLabel('Absolute directory path').fill(process.cwd());
  await addDialog.getByRole('button', { name: 'Add repository' }).click();

  await expect(page.getByRole('heading', { name: 'local / slop-meter' })).toBeVisible();
  await page.getByRole('button', { name: 'Run scan' }).click();
  const scanDialog = page.getByRole('dialog', { name: 'Understand your codebase' });
  await expect(scanDialog.getByLabel('AI harness')).toHaveValue('static');
  await scanDialog.getByLabel('AI harness').selectOption('openai');
  const apiKey = scanDialog.getByLabel('API key');
  await expect(apiKey).toBeVisible();
  await expect(scanDialog.getByRole('button', { name: 'Start scan' })).toBeDisabled();
  await apiKey.fill('sk-playwright-byok-test-key');
  await expect(scanDialog.getByRole('button', { name: 'Start scan' })).toBeEnabled();
  await scanDialog.getByLabel('AI harness').selectOption('static');
  await expect(apiKey).toHaveCount(0);
  await scanDialog.getByRole('button', { name: 'Start scan' }).click();

  await expect(page.getByRole('heading', { name: 'Baseline inspection complete' })).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('.priority-card').first().click();
  await expect(page.getByRole('dialog', { name: 'Engineering decision' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.getByRole('button', { name: 'Scan history' }).click();
  await expect(page.getByRole('heading', { name: 'Progress has a history.' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Scan cost' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Cost / finding' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '$0.00' })).toHaveCount(2);

  await page.getByRole('button', { name: 'local/slop-meter', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Scan details' });
  await expect(details).toContainText('Estimated scan cost');
  await expect(details).toContainText('Cost / cited finding');
  await expect(details).toContainText('standard USD rates');
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.table-scroll')).toBeVisible();
  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    tableWidth: document.querySelector('.table-scroll')?.scrollWidth || 0,
    tableViewport: document.querySelector('.table-scroll')?.clientWidth || 0,
  }));
  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.tableWidth).toBeGreaterThan(layout.tableViewport);
});
