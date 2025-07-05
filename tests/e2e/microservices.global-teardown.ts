import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up microservices after E2E tests...');
  
  try {
    // Stop and remove containers
    await execAsync('docker compose -f docker-compose.test.yml down --volumes --remove-orphans');
    
    // Remove test volumes
    await execAsync('docker volume rm band-bridge_test_db_data').catch(() => {});
    await execAsync('docker volume rm band-bridge_test_asset_filestore').catch(() => {});
    
    // Remove any dangling images
    await execAsync('docker image prune -f').catch(() => {});
    
    console.log('✅ Microservices cleanup complete');
  } catch (error) {
    console.error('❌ Failed to clean up microservices:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;