import { POST } from '../../src/app/api/project/[id]/song/route';

// Mock node-fetch to simulate audio microservice
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';

// Mock form-data to avoid actual FormData usage
jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({}),
  }));
});

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
  beforeEach(() => {
    ((fetch as any) as jest.Mock).mockReset();
  });

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
    ((fetch as any) as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ fileName: '1710000000000_mysong.mp3' }),
      statusText: 'OK',
    });
    const file = mockFile('mysong.mp3', 'dummydata');
    const req = { formData: async () => mockFormData(file) } as any;
    const params = Promise.resolve({ id: '1' });
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe('mysong');
    expect(data.projectId).toBe(1);
    expect(data.filePath).toContain('mysong.mp3');
  });

  it('should return 400 for missing file', async () => {
    const req = { formData: async () => mockFormData(null) } as any;
    const params = Promise.resolve({ id: '1' });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing file or invalid project id');
  });
}); 