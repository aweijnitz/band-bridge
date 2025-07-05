import { test, expect } from '@playwright/test';

const ADMIN_BASE_URL = 'http://localhost:4002';
const ADMIN_API_KEY = 'test-admin-key-123';

const adminHeaders = {
  'Authorization': `Bearer ${ADMIN_API_KEY}`,
  'Content-Type': 'application/json'
};

test.describe('Admin Server E2E Tests', () => {
  let createdUserId: number;
  let createdBandId: number;
  let createdApiKeyId: number;

  test('health check responds', async ({ request }) => {
    const response = await request.get(`${ADMIN_BASE_URL}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('admin endpoints require authentication', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/users`, {
      data: {
        username: 'testuser',
        password: 'testpass123'
      }
    });
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  test('create user with valid data', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/users`, {
      headers: adminHeaders,
      data: {
        username: 'testuser123',
        password: 'testpass123'
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.username).toBe('testuser123');
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe('number');
    
    createdUserId = data.id;
  });

  test('create user with invalid data fails validation', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/users`, {
      headers: adminHeaders,
      data: {
        username: 'ab', // too short
        password: '123' // too short
      }
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.errors).toBeDefined();
    expect(Array.isArray(data.errors)).toBe(true);
  });

  test('create user with duplicate username fails', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/users`, {
      headers: adminHeaders,
      data: {
        username: 'testuser123', // same as before
        password: 'testpass123'
      }
    });
    
    expect(response.status()).toBe(409);
    
    const data = await response.json();
    expect(data.error).toBe('Username already exists');
  });

  test('create band with valid data', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/bands`, {
      headers: adminHeaders,
      data: {
        name: 'Test Band'
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.name).toBe('Test Band');
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe('number');
    
    createdBandId = data.id;
  });

  test('create band with invalid data fails validation', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/bands`, {
      headers: adminHeaders,
      data: {
        name: 'a' // too short
      }
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.errors).toBeDefined();
    expect(Array.isArray(data.errors)).toBe(true);
  });

  test('assign user to band', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/bands/${createdBandId}/users`, {
      headers: adminHeaders,
      data: {
        userId: createdUserId
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.userId).toBe(createdUserId);
    expect(data.bandId).toBe(createdBandId);
  });

  test('assign user to band with invalid data fails', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/bands/${createdBandId}/users`, {
      headers: adminHeaders,
      data: {
        userId: 'invalid' // not a number
      }
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.errors).toBeDefined();
  });

  test('assign user to band twice fails', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/bands/${createdBandId}/users`, {
      headers: adminHeaders,
      data: {
        userId: createdUserId
      }
    });
    
    expect(response.status()).toBe(409);
    
    const data = await response.json();
    expect(data.error).toBe('User already in band');
  });

  test('create API key for user', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/users/${createdUserId}/apikeys`, {
      headers: adminHeaders
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe('number');
    expect(data.apiKey).toBeDefined();
    expect(typeof data.apiKey).toBe('string');
    expect(data.apiKey.length).toBeGreaterThan(0);
    
    createdApiKeyId = data.id;
  });

  test('rate limit API key creation', async ({ request }) => {
    // Create multiple API keys to test rate limiting
    for (let i = 0; i < 5; i++) {
      const response = await request.post(`${ADMIN_BASE_URL}/admin/users/${createdUserId}/apikeys`, {
        headers: adminHeaders
      });
      expect([201, 429]).toContain(response.status());
    }
    
    // This should definitely be rate limited
    const response = await request.post(`${ADMIN_BASE_URL}/admin/users/${createdUserId}/apikeys`, {
      headers: adminHeaders
    });
    expect(response.status()).toBe(429);
    
    const data = await response.json();
    expect(data.error).toBe('Too many keys');
  });

  test('revoke API key', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/apikeys/${createdApiKeyId}/revoke`, {
      headers: adminHeaders
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.id).toBe(createdApiKeyId);
    expect(data.revokedAt).toBeDefined();
  });

  test('revoke non-existent API key fails', async ({ request }) => {
    const response = await request.post(`${ADMIN_BASE_URL}/admin/apikeys/999999/revoke`, {
      headers: adminHeaders
    });
    
    expect(response.status()).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Failed to revoke API key');
  });
});