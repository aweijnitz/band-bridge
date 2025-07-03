import { execSync } from 'child_process';
export default async function globalTeardown() {
  execSync('docker compose down', { stdio: 'inherit' });
}
