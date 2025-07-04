import { DELETE } from '../../src/app/api/project/[id]/route';

jest.mock('../../src/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      media: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, filePath: 'song1.mp3' },
          { id: 2, filePath: 'song2.mp3' },
        ]),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      comment: {
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      project: {
        findUnique: (...args: any[]) => findUniqueImpl(...args),
        delete: jest.fn().mockResolvedValue({ id: 123, name: 'Test', bandName: 'Band', owner: 'Owner', status: 'archived', createdAt: new Date().toISOString() }),
      },
    })),
  };
});

jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockUnlink = require('fs/promises').unlink;

const makeReq = (id = '123') => ({
  params: { id },
});

let findUniqueImpl = jest.fn().mockResolvedValue({ id: 123, name: 'Test', bandName: 'Band', owner: 'Owner', status: 'archived', createdAt: new Date().toISOString() });

describe('DELETE /api/project/[id]', () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });
  afterAll(() => {
    // @ts-ignore
    delete global.fetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // By default, return a valid project
    findUniqueImpl = jest.fn().mockResolvedValue({ id: 123, name: 'Test', bandName: 'Band', owner: 'Owner', status: 'archived', createdAt: new Date().toISOString() });
  });

  it('deletes project, songs, comments, and files', async () => {
    const req = {} as any;
    const params = Promise.resolve({ id: '123' });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/delete-media'),
      expect.objectContaining({
        method: 'DELETE',
        body: expect.stringContaining('song1.mp3'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/delete-media'),
      expect.objectContaining({
        method: 'DELETE',
        body: expect.stringContaining('song2.mp3'),
      })
    );
  });

  it('returns 404 if project not found', async () => {
    const req = {} as any;
    const params = Promise.resolve({ id: '999' });
    // Patch findUnique to return null
    findUniqueImpl = jest.fn().mockResolvedValue(null);
    // Patch project.delete to throw
    const { PrismaClient } = require('../../src/generated/prisma');
    PrismaClient.mockImplementationOnce(() => ({
      media: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      comment: {
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      project: {
        findUnique: (...args: any[]) => findUniqueImpl(...args),
        delete: jest.fn().mockRejectedValue(new Error('Record to delete does not exist.')), // Simulate not found
      },
    }));
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it('ignores file deletion errors', async () => {
    mockUnlink.mockRejectedValueOnce(new Error('File not found'));
    const req = {} as any;
    const params = Promise.resolve({ id: '123' });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(200);
    // Should still succeed
    const data = await res.json();
    expect(data.success).toBe(true);
  });
}); 