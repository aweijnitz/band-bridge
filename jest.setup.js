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