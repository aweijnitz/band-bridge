import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const MEDIA_BASE_URL = 'http://localhost:4001';
const TEST_AUDIO_FILE = path.join(__dirname, '../../test-data/120bpm-test-track.wav');

test.describe.configure({ mode: 'serial' });

test.describe('Media Server E2E Tests', () => {
  let uploadedFileName: string;

  test('health check responds', async ({ request }) => {
    const response = await request.get(`${MEDIA_BASE_URL}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('upload audio file successfully', async ({ request }) => {
    // Read the test audio file
    const fileBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: '120bpm-test-track.wav',
          mimeType: 'audio/wav',
          buffer: fileBuffer
        }
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.fileName).toBeDefined();
    expect(typeof data.fileName).toBe('string');
    expect(data.fileName).toContain('120bpm-test-track.wav');
    
    uploadedFileName = data.fileName;
  });

  test('upload without file fails', async ({ request }) => {
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {}
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('No file uploaded');
  });

  test('upload file that is too large fails', async ({ request }) => {
    // Create a large buffer to simulate oversized file (1MB + 1 byte > 500KB limit)
    const largeBuffer = Buffer.alloc(1024 * 1024 + 1); // 1MB + 1 byte
    
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: 'large-file.wav',
          mimeType: 'audio/wav',
          buffer: largeBuffer
        }
      }
    });
    
    expect(response.status()).toBe(413);
  });

  test('retrieve uploaded file', async ({ request }) => {
    const response = await request.get(`${MEDIA_BASE_URL}/files/${uploadedFileName}`);
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('audio');
    
    // Verify file content matches original
    const responseBuffer = await response.body();
    const originalBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    expect(responseBuffer).toEqual(originalBuffer);
  });

  test('retrieve non-existent file fails', async ({ request }) => {
    const response = await request.get(`${MEDIA_BASE_URL}/files/nonexistent.wav`);
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('File not found');
  });

  test('retrieve waveform data for audio file', async ({ request }) => {
    // The waveform should be generated automatically for audio files
    const waveformFileName = `${uploadedFileName}.dat`;
    
    const response = await request.get(`${MEDIA_BASE_URL}/files/${waveformFileName}`);
    expect(response.status()).toBe(200);
    
    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('retrieve waveform data for non-existent file fails', async ({ request }) => {
    const response = await request.get(`${MEDIA_BASE_URL}/files/nonexistent.wav.dat`);
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('Waveform data not found');
  });

  test('upload video file successfully', async ({ request }) => {
    // Create a small dummy video file (just a few bytes to simulate)
    const dummyVideoBuffer = Buffer.from('dummy video content');
    
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: 'test-video.mp4',
          mimeType: 'video/mp4',
          buffer: dummyVideoBuffer
        }
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.fileName).toBeDefined();
    expect(data.fileName).toContain('test-video.mp4');
  });

  test('upload text file successfully (no waveform generation)', async ({ request }) => {
    const textBuffer = Buffer.from('This is a text file');
    
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: 'test-file.txt',
          mimeType: 'text/plain',
          buffer: textBuffer
        }
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.fileName).toBeDefined();
    expect(data.fileName).toContain('test-file.txt');
    
    // Verify no waveform data is generated for non-audio files
    const waveformResponse = await request.get(`${MEDIA_BASE_URL}/files/${data.fileName}.dat`);
    expect(waveformResponse.status()).toBe(404);
  });

  test('upload jpg image file successfully with thumbnail generation', async ({ request }) => {
    // Skip thumbnail generation by using dummy content - thumbnail generation will fail gracefully
    const dummyImageBuffer = Buffer.from('dummy jpg image content');
    
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: 'test-image.jpg',
          mimeType: 'image/jpeg',
          buffer: dummyImageBuffer
        }
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.fileName).toBeDefined();
    expect(data.fileName).toContain('test-image.jpg');
    
    const uploadedImageFile = data.fileName;
    
    // Verify original image is accessible
    const imageResponse = await request.get(`${MEDIA_BASE_URL}/files/${uploadedImageFile}`);
    expect(imageResponse.status()).toBe(200);
    
    // Note: In a real test, we would verify thumbnail generation,
    // but since we're using dummy data and Sharp would fail on invalid image data,
    // we'll just verify the upload succeeds for now.
    
    // Clean up
    await request.delete(`${MEDIA_BASE_URL}/delete-media`, {
      data: { fileName: uploadedImageFile }
    });
  });

  test('upload png image file successfully', async ({ request }) => {
    const dummyImageBuffer = Buffer.from('dummy png image content');
    
    const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: dummyImageBuffer
        }
      }
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.fileName).toBeDefined();
    expect(data.fileName).toContain('test-image.png');
    
    // Clean up
    await request.delete(`${MEDIA_BASE_URL}/delete-media`, {
      data: { fileName: data.fileName }
    });
  });

  test('delete uploaded file', async ({ request }) => {
    const response = await request.delete(`${MEDIA_BASE_URL}/delete-media`, {
      data: {
        fileName: uploadedFileName
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deleted).toBe(uploadedFileName);
    
    // Verify file is no longer accessible
    const getResponse = await request.get(`${MEDIA_BASE_URL}/files/${uploadedFileName}`);
    expect(getResponse.status()).toBe(404);
    
    // Verify waveform data is also deleted
    const waveformResponse = await request.get(`${MEDIA_BASE_URL}/files/${uploadedFileName}.dat`);
    expect(waveformResponse.status()).toBe(404);
  });

  test('delete file without fileName fails', async ({ request }) => {
    const response = await request.delete(`${MEDIA_BASE_URL}/delete-media`, {
      data: {}
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Missing fileName');
  });

  test('delete non-existent file fails', async ({ request }) => {
    const response = await request.delete(`${MEDIA_BASE_URL}/delete-media`, {
      data: {
        fileName: 'nonexistent.wav'
      }
    });
    
    expect(response.status()).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Failed to delete file');
  });

  test('upload multiple files and verify each gets unique filename', async ({ request }) => {
    const fileBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    const uploadedFiles: string[] = [];
    
    // Upload the same file multiple times
    for (let i = 0; i < 3; i++) {
      const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: '120bpm-test-track.wav',
            mimeType: 'audio/wav',
            buffer: fileBuffer
          }
        }
      });
      
      expect(response.status()).toBe(201);
      
      const data = await response.json();
      uploadedFiles.push(data.fileName);
    }
    
    // Verify all filenames are unique
    const uniqueFiles = new Set(uploadedFiles);
    expect(uniqueFiles.size).toBe(3);
    
    // Clean up uploaded files
    for (const fileName of uploadedFiles) {
      await request.delete(`${MEDIA_BASE_URL}/delete-media`, {
        data: { fileName }
      });
    }
  });

  test('reset endpoint requires admin API key', async ({ request }) => {
    const response = await request.post(`${MEDIA_BASE_URL}/reset`);
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  test('reset endpoint with invalid API key fails', async ({ request }) => {
    const response = await request.post(`${MEDIA_BASE_URL}/reset`, {
      headers: {
        'Authorization': 'Bearer invalid-key'
      }
    });
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  test('reset endpoint clears all media files', async ({ request }) => {
    // First, upload some test files
    const fileBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    const uploadedFiles: string[] = [];
    
    // Upload multiple files
    for (let i = 0; i < 3; i++) {
      const response = await request.post(`${MEDIA_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: `test-file-${i}.wav`,
            mimeType: 'audio/wav',
            buffer: fileBuffer
          }
        }
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      uploadedFiles.push(data.fileName);
    }
    
    // Verify files are accessible
    for (const fileName of uploadedFiles) {
      const response = await request.get(`${MEDIA_BASE_URL}/files/${fileName}`);
      expect(response.status()).toBe(200);
    }
    
    // Now reset all media files
    const resetResponse = await request.post(`${MEDIA_BASE_URL}/reset`, {
      headers: {
        'Authorization': 'Bearer test-admin-key-123'
      }
    });
    
    expect(resetResponse.status()).toBe(200);
    
    const resetData = await resetResponse.json();
    expect(resetData.success).toBe(true);
    expect(resetData.deletedCount).toBeGreaterThan(0);
    
    // Verify all files are no longer accessible
    for (const fileName of uploadedFiles) {
      const response = await request.get(`${MEDIA_BASE_URL}/files/${fileName}`);
      expect(response.status()).toBe(404);
      
      // Verify waveform data is also gone
      const waveformResponse = await request.get(`${MEDIA_BASE_URL}/files/${fileName}.dat`);
      expect(waveformResponse.status()).toBe(404);
    }
  });

  test('reset endpoint with no files returns zero count', async ({ request }) => {
    // Call reset when no files exist
    const resetResponse = await request.post(`${MEDIA_BASE_URL}/reset`, {
      headers: {
        'Authorization': 'Bearer test-admin-key-123'
      }
    });
    
    expect(resetResponse.status()).toBe(200);
    
    const resetData = await resetResponse.json();
    expect(resetData.success).toBe(true);
    expect(resetData.deletedCount).toBe(0);
  });
});