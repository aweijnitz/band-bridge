import { execSync } from 'child_process';
export default async function globalSetup() {
  if (process.env.NO_DOCKER !== '1') {
    execSync('docker compose up -d', { stdio: 'inherit' });
  }
}
