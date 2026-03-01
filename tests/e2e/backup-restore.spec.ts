import { test, expect } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const ADMIN_BASE_URL = 'http://localhost:4002';
const MEDIA_BASE_URL = 'http://localhost:4001';
const ADMIN_API_KEY = 'test-admin-key-123';
const TEST_AUDIO_FILE = path.join(__dirname, '../../test-data/120bpm-test-track.wav');
const SCRIPT_PATH = path.resolve(process.cwd(), 'bbdata.sh');

const adminHeaders = {
  Authorization: `Bearer ${ADMIN_API_KEY}`,
  'Content-Type': 'application/json',
};

function backupScriptEnv() {
  return {
    ...process.env,
    BBDATA_COMPOSE_FILE: 'docker-compose.test.yml',
    BBDATA_DB_SERVICE: 'test-db',
    BBDATA_MEDIA_SERVICE: 'test-media',
    BBDATA_ADMIN_SERVICE: 'test-admin',
    BBDATA_WEB_SERVICE: 'test-app',
    BBDATA_DB_NAME: 'bandbridge_test',
    BBDATA_DB_USER: 'postgres',
    BBDATA_WEB_HEALTH_URL: 'http://localhost:3000/api/health',
    BBDATA_ADMIN_HEALTH_URL: 'http://localhost:4002/health',
  };
}

function dbScalar(query: string): string {
  const out = execFileSync(
    'docker',
    ['compose', '-f', 'docker-compose.test.yml', 'exec', '-T', 'test-db', 'psql', '-U', 'postgres', '-d', 'bandbridge_test', '-tAc', query],
    { encoding: 'utf8' }
  );
  return out.trim();
}

function dbExec(sql: string): void {
  execFileSync(
    'docker',
    ['compose', '-f', 'docker-compose.test.yml', 'exec', '-T', 'test-db', 'psql', '-U', 'postgres', '-d', 'bandbridge_test', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { stdio: 'pipe' }
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('Backup and Restore E2E', () => {
  test.setTimeout(180000);

  let tmpDir: string;
  let archivePath: string;
  let uploadedFileName: string;

  test.beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbdata-e2e-'));
    archivePath = path.join(tmpDir, 'backup.tar.gz');
  });

  test.afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('export and import restores database and assets', async ({ request }) => {
    const userName = `backup_user_${Date.now()}`;
    const bandName = `backup_band_${Date.now()}`;

    const createUser = await request.post(`${ADMIN_BASE_URL}/admin/users`, {
      headers: adminHeaders,
      data: { username: userName, password: 'backupPass123' },
    });
    expect(createUser.status()).toBe(201);
    const user = await createUser.json();

    const createBand = await request.post(`${ADMIN_BASE_URL}/admin/bands`, {
      headers: adminHeaders,
      data: { name: bandName },
    });
    expect(createBand.status()).toBe(201);
    const band = await createBand.json();

    const assign = await request.post(`${ADMIN_BASE_URL}/admin/bands/${band.id}/users`, {
      headers: adminHeaders,
      data: { userId: user.id },
    });
    expect(assign.status()).toBe(201);

    const fileBuffer = fs.readFileSync(TEST_AUDIO_FILE);
    const upload = await request.post(`${MEDIA_BASE_URL}/upload`, {
      multipart: {
        file: {
          name: 'backup-test.wav',
          mimeType: 'audio/wav',
          buffer: fileBuffer,
        },
      },
    });
    expect(upload.status()).toBe(201);
    const uploadData = await upload.json();
    uploadedFileName = uploadData.fileName;

    expect(dbScalar('SELECT COUNT(*) FROM "User";')).not.toBe('0');

    execFileSync(SCRIPT_PATH, ['--force', 'export', archivePath], {
      env: backupScriptEnv(),
      encoding: 'utf8',
      stdio: 'pipe',
    });
    expect(fs.existsSync(archivePath)).toBe(true);

    const listing = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });
    expect(listing).toContain('manifest.json');
    expect(listing).toContain('database.sql');
    expect(listing).toContain('assets.tar');

    // Existing /admin/reset path is schema-dependent; clear test state directly here.
    dbExec('TRUNCATE TABLE "Comment","Song","Project","UserBand","ApiKey","Session","Band","User" RESTART IDENTITY CASCADE;');
    const mediaReset = await request.post(`${MEDIA_BASE_URL}/reset`, {
      headers: { Authorization: `Bearer ${ADMIN_API_KEY}` },
    });
    expect(mediaReset.status()).toBe(200);

    expect(dbScalar('SELECT COUNT(*) FROM "User";')).toBe('0');

    const notFoundAfterReset = await request.get(`${MEDIA_BASE_URL}/files/${uploadedFileName}`);
    expect(notFoundAfterReset.status()).toBe(404);

    execFileSync(SCRIPT_PATH, ['--yes', 'import', archivePath], {
      env: backupScriptEnv(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const dupUser = await request.post(`${ADMIN_BASE_URL}/admin/users`, {
      headers: adminHeaders,
      data: { username: userName, password: 'backupPass123' },
    });
    expect(dupUser.status()).toBe(409);

    const restoredFile = await request.get(`${MEDIA_BASE_URL}/files/${uploadedFileName}`);
    expect(restoredFile.status()).toBe(200);

    const restoredWaveform = await request.get(`${MEDIA_BASE_URL}/files/${uploadedFileName}.dat`);
    expect(restoredWaveform.status()).toBe(200);

    // Idempotence: importing same archive again should still succeed.
    execFileSync(SCRIPT_PATH, ['--yes', 'import', archivePath], {
      env: backupScriptEnv(),
      encoding: 'utf8',
      stdio: 'pipe',
    });
  });

  test('corrupt archive import fails with non-zero exit', () => {
    const brokenArchive = path.join(tmpDir, 'broken.tar.gz');
    fs.writeFileSync(brokenArchive, 'this is not a gzip tar', 'utf8');

    const result = spawnSync(SCRIPT_PATH, ['--yes', 'import', brokenArchive], {
      env: backupScriptEnv(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(result.status).not.toBe(0);
  });
});
