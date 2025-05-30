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

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'mock-session-id' })),
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