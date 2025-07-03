import { execSync } from 'child_process';
export default async function globalSetup() {
  execSync('docker compose up -d', { stdio: 'inherit' });
}
