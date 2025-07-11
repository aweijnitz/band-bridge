import { POST } from '../../src/app/api/project/[id]/media/route';

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

// Mock requireSession
jest.mock('../../src/app/api/auth/requireSession', () => ({
  requireSession: jest.fn().mockResolvedValue(undefined),
}));

// Mock text validation
jest.mock('../../src/lib/textValidation', () => ({
  validateDescription: jest.fn().mockImplementation((desc) => ({
    isValid: true,
    sanitized: desc,
  })),
}));

// Mock PrismaClient to avoid real DB calls
jest.mock('../../src/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      media: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 123,
            projectId: data.projectId,
            title: data.title,
            description: data.description,
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

describe('POST /api/project/[id]/media (unit)', () => {
  beforeEach(() => {
    ((fetch as any) as jest.Mock).mockReset();
  });

  function mockFile(name: string, content: string): MockFile {
    return {
      name,
      arrayBuffer: async () => Buffer.from(content).buffer,
    };
  }

  function mockFormData(file: MockFile | null, title?: string, description?: string) {
    return {
      get: (key: string) => {
        if (key === 'file') return file;
        if (key === 'title') return title || null;
        if (key === 'description') return description || null;
        return null;
      },
    } as any;
  }

  it('should upload a media with file and projectId', async () => {
    ((fetch as any) as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ fileName: '1710000000000_mymedia.mp3' }),
      statusText: 'OK',
    });
    const file = mockFile('mymedia.mp3', 'dummydata');
    const req = { 
      formData: async () => mockFormData(file),
      headers: {
        get: (name: string) => name === 'content-length' ? '1000' : null
      }
    } as any;
    const params = Promise.resolve({ id: '1' });
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe('mymedia');
    expect(data.projectId).toBe(1);
    expect(data.filePath).toContain('mymedia.mp3');
  });

  it('should upload media with description', async () => {
    ((fetch as any) as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ fileName: '1710000000000_mymedia.mp3' }),
      statusText: 'OK',
    });
    const file = mockFile('mymedia.mp3', 'dummydata');
    const description = '<b>Test</b> description';
    const req = { 
      formData: async () => mockFormData(file, undefined, description),
      headers: {
        get: (name: string) => name === 'content-length' ? '1000' : null
      }
    } as any;
    const params = Promise.resolve({ id: '1' });
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.description).toBe('<b>Test</b> description');
  });

  it('should return 400 for missing file', async () => {
    const req = { 
      formData: async () => mockFormData(null),
      headers: {
        get: (name: string) => name === 'content-length' ? '1000' : null
      }
    } as any;
    const params = Promise.resolve({ id: '1' });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing file');
  });
}); 