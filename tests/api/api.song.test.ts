import { POST } from '../../src/app/api/project/[id]/song/route';

// Mock fs/promises to avoid writing files during tests
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock PrismaClient to avoid real DB calls
jest.mock('../../src/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      song: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 123,
            projectId: data.projectId,
            title: data.title,
            filePath: data.filePath,
            uploadDate: new Date().toISOString(),
          })
        ),
      },
    })),
  };
});

type MockFile = {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

describe('POST /api/project/[id]/song (unit)', () => {
  function mockFile(name: string, content: string): MockFile {
    return {
      name,
      arrayBuffer: async () => Buffer.from(content).buffer,
    };
  }

  function mockFormData(file: MockFile | null, title?: string) {
    return {
      get: (key: string) => {
        if (key === 'file') return file;
        if (key === 'title') return title || null;
        return null;
      },
    } as any;
  }

  it('should upload a song with file and projectId', async () => {
    const file = mockFile('mysong.mp3', 'dummydata');
    const req = { formData: async () => mockFormData(file) } as any;
    const params = { id: '1' };
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe('mysong');
    expect(data.projectId).toBe(1);
    expect(data.filePath).toContain('mysong.mp3');
  });

  it('should return 400 for missing file', async () => {
    const req = { formData: async () => mockFormData(null) } as any;
    const params = { id: '1' };
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing file or invalid project id');
  });
}); 