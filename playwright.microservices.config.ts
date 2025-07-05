import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/admin-server.spec.ts', '**/media-server.spec.ts'],
  fullyParallel: false, // Run tests sequentially to avoid resource conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker for microservices tests
  reporter: 'html',
  globalSetup: require.resolve('./tests/e2e/microservices.global-setup'),
  globalTeardown: require.resolve('./tests/e2e/microservices.global-teardown'),
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'microservices',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});