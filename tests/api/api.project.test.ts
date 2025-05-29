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
            bandName: data.bandName,
            owner: data.owner,
            status: data.status,
            createdAt: new Date().toISOString(),
          })
        ),
        findMany: jest.fn().mockResolvedValue([]),
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
      bandName: 'Test Band',
      owner: 'Alice',
      status: 'open',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Test Project');
    expect(data.bandName).toBe('My Band');
    expect(data.owner).toBe('Alice');
    expect(data.status).toBe('open');
  });

  it('should return 400 for missing fields', async () => {
    const req = mockRequest({
      name: 'Test Project',
      bandName: 'Test Band',
      // owner missing
      status: 'open',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing required fields');
  });
}); 