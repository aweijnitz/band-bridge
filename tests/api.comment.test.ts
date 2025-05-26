import { GET, POST } from '../src/app/api/project/[id]/song/[songId]/comment/route';

// Mock PrismaClient to avoid real DB calls
jest.mock('../src/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      comment: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(where.songId === 1 ? [
            { id: 1, songId: 1, text: 'Test comment', createdAt: new Date().toISOString() },
          ] : [])
        ),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 2,
            songId: data.songId,
            text: data.text,
            createdAt: new Date().toISOString(),
          })
        ),
      },
    })),
  };
});

describe('Comment API', () => {
  it('GET returns comments for a song', async () => {
    const req = {} as any;
    const params = { songId: '1' };
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].text).toBe('Test comment');
  });

  it('GET returns 400 for invalid songId', async () => {
    const req = {} as any;
    const params = { songId: 'abc' };
    const res = await GET(req, { params });
    expect(res.status).toBe(400);
  });

  it('POST adds a comment', async () => {
    const req = { json: async () => ({ text: 'New comment' }) } as any;
    const params = { songId: '1' };
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.text).toBe('New comment');
    expect(data.songId).toBe(1);
  });

  it('POST returns 400 for invalid songId', async () => {
    const req = { json: async () => ({ text: 'New comment' }) } as any;
    const params = { songId: 'abc' };
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it('POST returns 400 for missing text', async () => {
    const req = { json: async () => ({}) } as any;
    const params = { songId: '1' };
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });
}); 