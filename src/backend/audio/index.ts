import express, { Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { parseSize } from './parseSize';

const app = express();
const PORT = process.env.AUDIO_SERVICE_PORT || 4001;
const FILESTORE_PATH = '/assetfilestore'; // Mapped to volume in docker-compose.yml
const MAX_UPLOAD_SIZE = parseSize(process.env.MAX_UPLOAD_SIZE || '1GB');

app.use(fileUpload({ 
  limits: { fileSize: MAX_UPLOAD_SIZE },
  limitHandler: (req, res) => {
    res.status(413).json({ error: 'File too large' });
  }
}));
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  console.log('Audio Service Health check');
  res.json({ status: 'ok' });
});

const AUDIO_EXTS = ['.mp3', '.wav'];

async function handleUpload(req: Request, res: Response): Promise<void> {
  if (!req.files || !(req.files as Record<string, UploadedFile>).file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const file = (req.files as Record<string, UploadedFile>).file;
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = path.join(FILESTORE_PATH, fileName);
  try {
    await fs.mkdir(FILESTORE_PATH, { recursive: true });
    await fs.writeFile(filePath, file.data);
    const ext = path.extname(file.name).toLowerCase();
    if (AUDIO_EXTS.includes(ext)) {
      const datPath = `${filePath}.dat`;
      await new Promise<void>((resolve, reject) => {
        execFile('audiowaveform', ['-i', filePath, '-o', datPath, '--pixels-per-second', '1024'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    res.status(201).json({ fileName });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to upload or process file', details: err instanceof Error ? err.message : err });
  }
}


app.post('/upload', handleUpload);

// Delete a single media file and its .dat file if audio
app.delete('/delete-media', async (req: Request, res: Response) => {
  const { fileName } = req.body;
  console.log('Deleting media', fileName);
  if (!fileName) {
    res.status(400).json({ error: 'Missing fileName' });
    return;
  }
  const filePath = path.join(FILESTORE_PATH, fileName);
  try {
    await fs.unlink(filePath);
    const ext = path.extname(fileName).toLowerCase();
    if (AUDIO_EXTS.includes(ext)) {
      try {
        await fs.unlink(filePath + '.dat');
      } catch {}
    }
    res.json({ success: true, deleted: fileName });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete file', details: err instanceof Error ? err.message : String(err) });
  }
});

// Serve static files (audio and waveform data)
app.get('/files/:fileName', (req: Request, res: Response) => {
  const { fileName } = req.params;
  const filePath = path.join(FILESTORE_PATH, fileName);
  
  // Check if this is a waveform data request
  if (fileName.endsWith('.dat')) {
    res.sendFile(filePath, (err) => {
      if (err) {
        console.log('Waveform file not found:', filePath);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Waveform data not found' });
        }
      }
    });
  } else {
    res.sendFile(filePath, (err) => {
      if (err) {
        console.log('File not found:', filePath);
        if (!res.headersSent) {
          res.status(404).json({ error: 'File not found' });
        }
      }
    });
  }
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Audio microservice listening on port ${PORT}`);
  });
}

export default app;
