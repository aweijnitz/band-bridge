import { execSync } from 'child_process';
export default async function globalTeardown() {
  if (process.env.NO_DOCKER !== '1') {
    execSync('docker compose down', { stdio: 'inherit' });
  }
}
