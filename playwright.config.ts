import { defineConfig } from '@playwright/test';

const hostedUrl = process.env.SLOP_METER_HOSTED_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: hostedUrl || 'http://127.0.0.1:4310',
    storageState: hostedUrl ? process.env.SLOP_METER_AUTH_STATE : undefined,
    trace: 'retain-on-failure',
  },
  webServer: hostedUrl
    ? undefined
    : {
        command:
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2xvcC1tZXRlci50ZXN0JA npm run build && SLOP_DATA_DIR=$(mktemp -d) npm start',
        url: 'http://127.0.0.1:4310/api/health',
        timeout: 120_000,
        reuseExistingServer: false,
      },
});
