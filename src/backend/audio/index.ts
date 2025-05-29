import express, { Request, Response } from 'express';
import fileUpload, { UploadedFile, FileArray } from 'express-fileupload';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';

const app = express();
const PORT = process.env.AUDIO_SERVICE_PORT || 4001;
const FILESTORE_PATH = path.join(process.cwd(), 'public', 'filestore');

app.use(fileUpload());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check');
  res.json({ status: 'ok' });
});

function handleUpload(req: any, res: any) {
  if (!req.files || !(req.files as Record<string, UploadedFile>).file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const file = (req.files as Record<string, UploadedFile>).file;
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = path.join(FILESTORE_PATH, fileName);
  fs.mkdir(FILESTORE_PATH, { recursive: true })
    .then(() => fs.writeFile(filePath, file.data))
    // Precompute waveform
    .then(() => {
      const datPath = `${filePath}.dat`;
      console.log('Precomputing waveform for', filePath);
      return new Promise((resolve, reject) => {
        execFile('audiowaveform', ['-i', filePath, '-o', datPath], (err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
    })
    .then(() => res.status(201).json({ fileName }))
    .catch((err) => res.status(500).json({ error: 'Failed to upload or process file', details: err instanceof Error ? err.message : err }));
}

app.post('/upload', handleUpload);

// Delete audio file and related data
app.delete('/delete/:fileName', (req: Request, res: Response) => {
  const { fileName } = req.params;
  const filePath = path.join(FILESTORE_PATH, fileName);
  fs.unlink(filePath)
    .then(() => fs.unlink(filePath + '.dat').catch(() => {}))
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(500).json({ error: 'Failed to delete file', details: err instanceof Error ? err.message : err }));
});

app.listen(PORT, () => {
  console.log(`Audio microservice listening on port ${PORT}`);
}); 