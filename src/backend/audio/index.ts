import express, { Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';

const app = express();
const PORT = process.env.AUDIO_SERVICE_PORT || 4001;
const FILESTORE_PATH = process.env.AUDIO_FILESTORE_PATH
  ? path.isAbsolute(process.env.AUDIO_FILESTORE_PATH)
    ? process.env.AUDIO_FILESTORE_PATH
    : path.join(process.cwd(), process.env.AUDIO_FILESTORE_PATH)
  : path.join(process.cwd(), 'public', 'filestore');

app.use(fileUpload());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check');
  res.json({ status: 'ok' });
});

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
    // Precompute waveform
    const datPath = `${filePath}.dat`;
    await new Promise<void>((resolve, reject) => {
      execFile('audiowaveform', ['-i', filePath, '-o', datPath, '--pixels-per-second', '1024'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    res.status(201).json({ fileName });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to upload or process file', details: err instanceof Error ? err.message : err });
  }
}

app.post('/upload', handleUpload);

// Delete a single song file and its .dat file
app.delete('/delete-song', async (req: Request, res: Response) => {
  const { fileName } = req.body;
  console.log('Deleting song', fileName);
  if (!fileName) {
    res.status(400).json({ error: 'Missing fileName' });
    return;
  }
  const filePath = path.join(FILESTORE_PATH, fileName);
  try {
    await fs.unlink(filePath);
    try {
      await fs.unlink(filePath + '.dat');
    } catch {}
    res.json({ success: true, deleted: fileName });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete file', details: err instanceof Error ? err.message : String(err) });
  }
});

// Serve static files (audio and waveform data)
app.get('/files/:fileName', (req: Request, res: Response) => {
  const { fileName } = req.params;
  const filePath = path.join(FILESTORE_PATH, fileName);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Serve waveform data files
app.get('/files/:fileName.dat', (req: Request, res: Response) => {
  const { fileName } = req.params;
  const datPath = path.join(FILESTORE_PATH, fileName + '.dat');
  res.sendFile(datPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Waveform data not found' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Audio microservice listening on port ${PORT}`);
}); 