import { test, expect } from '@playwright/test';

const OK_OR_REDIRECT = [200, 301, 302, 303, 307, 308];

test('web app responds', async ({ request }) => {
  const response = await request.get('http://localhost:3000');
  expect(OK_OR_REDIRECT).toContain(response.status());
});

test('audio service health', async ({ request }) => {
  const response = await request.get('http://localhost:4001/health');
  expect(response.status()).toBe(200);
});

test('admin service health', async ({ request }) => {
  const response = await request.get('http://localhost:4002/health');
  expect(response.status()).toBe(200);
});

