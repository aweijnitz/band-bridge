import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up microservices for E2E tests...');
  
  try {
    // Clean up any existing containers
    await execAsync('docker compose -f docker-compose.test.yml down --volumes --remove-orphans').catch(() => {});
    
    // Start services
    console.log('Starting test services...');
    await execAsync('docker compose -f docker-compose.test.yml up -d --build');
    
    // Wait for services to be ready
    console.log('Waiting for services to be ready...');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    while (attempts < maxAttempts) {
      try {
        const { stdout } = await execAsync('docker compose -f docker-compose.test.yml ps');
        if (stdout.includes('healthy')) {
          const healthyServices = (stdout.match(/healthy/g) || []).length;
          if (healthyServices >= 4) { // db, media, admin, app
            console.log('✅ All services are healthy');
            break;
          }
        }
      } catch (error) {
        // Continue waiting
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (attempts >= maxAttempts) {
        throw new Error('Services failed to become healthy in time');
      }
    }
    
    // Run database migrations
    console.log('Running database migrations...');
    await execAsync('docker compose -f docker-compose.test.yml exec -T test-admin npx prisma migrate deploy');
    
    console.log('✅ Microservices setup complete');
  } catch (error) {
    console.error('❌ Failed to set up microservices:', error);
    throw error;
  }
}

export default globalSetup;