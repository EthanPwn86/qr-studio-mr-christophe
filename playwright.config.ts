import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'artifacts/test-results.json' }]],
  use: {
    baseURL: process.env.QR_TEST_URL || 'http://127.0.0.1:4173',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
})
