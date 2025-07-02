global.Request = global.Request || function () {};
global.Response = global.Response || function () {};

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, { status } = {}) => ({
      status: status || 200,
      json: async () => data,
    }),
  },
}));

process.env.JWT_SECRET = 'testsecret';
const crypto = require('crypto');
function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const base = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(base).digest('base64url');
  return `${base}.${sig}`;
}
const testToken = sign({ sub: 1, type: 'session', exp: Math.floor(Date.now()/1000)+3600 });

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: testToken })),
    set: jest.fn(),
  })),
}));

if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  );
} 