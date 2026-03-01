/**
 * @jest-environment node
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

function writeExecutable(filePath: string, content: string) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  fs.chmodSync(filePath, 0o755);
}

function makeTestEnv(tmpDir: string, extraEnv: Record<string, string> = {}) {
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const fakeDockerPath = path.join(binDir, 'docker');
  const fakeCurlPath = path.join(binDir, 'curl');
  const commandLogPath = path.join(tmpDir, 'docker.log');
  const composePath = path.join(tmpDir, 'docker-compose.yml');
  fs.writeFileSync(composePath, 'services: {}\n', 'utf8');

  writeExecutable(
    fakeDockerPath,
    `#!/usr/bin/env bash
set -euo pipefail
LOG_FILE="\${FAKE_LOG_FILE:?missing FAKE_LOG_FILE}"
echo "docker $*" >> "$LOG_FILE"

if [[ "$1" == "info" ]]; then
  exit 0
fi

if [[ "$1" != "compose" ]]; then
  echo "unsupported docker call" >&2
  exit 2
fi
shift
if [[ "$1" == "-f" ]]; then
  shift 2
fi
cmd="$1"
shift

case "$cmd" in
  version)
    echo "Docker Compose version v2"
    exit 0
    ;;
  ps)
    for svc in \${FAKE_RUNNING_SERVICES:-db media admin web}; do
      printf '%s\\n' "$svc"
    done
    exit 0
    ;;
  stop)
    exit 0
    ;;
  start)
    exit 0
    ;;
  exec)
    if [[ "$1" == "-T" ]]; then shift; fi
    svc="$1"; shift
    sub="$1"; shift
    case "$sub" in
      pg_isready)
        exit 0
        ;;
      pg_dump)
        if [[ "\${FAKE_FAIL_ON:-}" == "pg_dump" ]]; then
          echo "pg_dump failed" >&2
          exit 45
        fi
        cat <<'SQL'
-- fake sql
CREATE TABLE "User"(id int);
SQL
        exit 0
        ;;
      psql)
        if [[ "\${FAKE_FAIL_ON:-}" == "psql" ]]; then
          echo "psql failed" >&2
          exit 46
        fi
        cat >/dev/null
        exit 0
        ;;
      *)
        exit 0
        ;;
    esac
    ;;
  run)
    while [[ $# -gt 0 ]]; do
      if [[ "$1" == "-T" || "$1" == "--rm" || "$1" == "--no-deps" ]]; then
        shift
      else
        break
      fi
    done
    svc="$1"; shift
    joined="$*"
    if [[ "$joined" == *"tar -cf -"* ]]; then
      tar -cf - --files-from /dev/null
      exit 0
    fi
    if [[ "$joined" == *"tar -xf -"* ]]; then
      cat >/dev/null
      exit 0
    fi
    if [[ "$joined" == *"find /assetfilestore -mindepth 1 -delete"* ]]; then
      exit 0
    fi
    exit 0
    ;;
  *)
    echo "unsupported compose subcommand: $cmd" >&2
    exit 2
    ;;
esac
`
  );

  writeExecutable(
    fakeCurlPath,
    `#!/usr/bin/env bash
set -euo pipefail
exit 0
`
  );

  return {
    commandLogPath,
    composePath,
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${binDir}:${process.env.PATH || ''}`,
      BBDATA_DOCKER_BIN: fakeDockerPath,
      BBDATA_CURL_BIN: fakeCurlPath,
      BBDATA_COMPOSE_FILE: composePath,
      FAKE_LOG_FILE: commandLogPath,
    },
  };
}

describe('bbdata.sh', () => {
  let tmpDir: string;
  const scriptPath = path.resolve(process.cwd(), 'bbdata.sh');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbdata-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('shows help', () => {
    const { env } = makeTestEnv(tmpDir);
    const out = spawnSync(scriptPath, ['--help'], {
      env,
      encoding: 'utf8',
    });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Usage:');
  });

  test('export creates archive with required files and orchestrates compose calls', () => {
    const { env, commandLogPath } = makeTestEnv(tmpDir);
    const archivePath = path.join(tmpDir, 'backups', 'one.tar.gz');

    execFileSync(scriptPath, ['export', archivePath], { env, encoding: 'utf8' });
    expect(fs.existsSync(archivePath)).toBe(true);

    const listing = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });
    expect(listing).toContain('manifest.json');
    expect(listing).toContain('database.sql');
    expect(listing).toContain('assets.tar');

    const log = fs.readFileSync(commandLogPath, 'utf8');
    expect(log).toContain('compose -f');
    expect(log).toContain(' stop web admin media');
    expect(log).toContain(' exec -T db pg_dump');
    expect(log).toContain(' run --rm --no-deps -T media');
    expect(log).toContain(' start web admin media');
  });

  test('export refuses to overwrite archive without --force', () => {
    const { env } = makeTestEnv(tmpDir);
    const archivePath = path.join(tmpDir, 'existing.tar.gz');
    fs.writeFileSync(archivePath, 'already-here', 'utf8');

    const out = spawnSync(scriptPath, ['export', archivePath], {
      env,
      encoding: 'utf8',
    });
    expect(out.status).not.toBe(0);
    expect(out.stderr).toContain('Archive already exists');
  });

  test('import requires --yes', () => {
    const { env } = makeTestEnv(tmpDir);
    const archivePath = path.join(tmpDir, 'archive.tar.gz');
    fs.writeFileSync(archivePath, 'not-a-real-tar', 'utf8');

    const out = spawnSync(scriptPath, ['import', archivePath], {
      env,
      encoding: 'utf8',
    });
    expect(out.status).not.toBe(0);
    expect(out.stderr).toContain('Import is destructive');
  });

  test('import fails on invalid archive', () => {
    const { env } = makeTestEnv(tmpDir);
    const archivePath = path.join(tmpDir, 'bad.tar.gz');
    fs.writeFileSync(archivePath, 'garbage', 'utf8');

    const out = spawnSync(scriptPath, ['--yes', 'import', archivePath], {
      env,
      encoding: 'utf8',
    });
    expect(out.status).not.toBe(0);
  });

  test('on export failure after stop, services are restarted', () => {
    const { env, commandLogPath } = makeTestEnv(tmpDir, { FAKE_FAIL_ON: 'pg_dump' });
    const archivePath = path.join(tmpDir, 'will-fail.tar.gz');

    const out = spawnSync(scriptPath, ['export', archivePath], {
      env,
      encoding: 'utf8',
    });
    expect(out.status).not.toBe(0);

    const log = fs.readFileSync(commandLogPath, 'utf8');
    const stopIdx = log.indexOf(' stop web admin media');
    const startIdx = log.lastIndexOf(' start web admin media');
    expect(stopIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeGreaterThan(stopIdx);
  });
});
