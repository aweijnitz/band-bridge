import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  globalSetup: require.resolve('./playwright.global-setup'),
  globalTeardown: require.resolve('./playwright.global-teardown'),
};

export default config;
