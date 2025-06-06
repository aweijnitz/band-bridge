import { POST } from '../../src/app/api/project/route';

// Mock PrismaClient to avoid real DB calls
jest.mock('../../src/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      project: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 1,
            name: data.name,
            bandId: data.bandId,
            ownerId: data.ownerId,
            status: data.status,
            createdAt: new Date().toISOString(),
          })
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
      session: {
        findUnique: jest.fn().mockResolvedValue({ userId: 1, user: { id: 1, username: 'testuser' }, expiresAt: new Date(Date.now() + 1000000) }),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    })),
    ProjectStatus: { open: 'open', released: 'released', archived: 'archived' },
  };
});

function mockRequest(body: any) {
  return {
    json: async () => body,
  } as any;
}

describe('POST /api/project (unit)', () => {
  it('should create a new project with valid data', async () => {
    const req = mockRequest({
      name: 'Test Project',
      bandId: 1,
      ownerId: 1,
      status: 'open',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Test Project');
    expect(data.bandId).toBe(1);
    expect(data.ownerId).toBe(1);
    expect(data.status).toBe('open');
  });

  it('should return 400 for missing fields', async () => {
    const req = mockRequest({
      name: 'Test Project',
      bandId: 1,
      // ownerId missing
      status: 'open',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing required fields');
  });
}); 