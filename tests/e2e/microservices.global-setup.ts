import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const composeFile = 'docker-compose.test.yml';
const testMediaImage = process.env.TEST_MEDIA_IMAGE || 'band-bridge-test-media:local';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up microservices for E2E tests...');
  
  try {
    // Clean up any existing containers
    await execAsync(`docker compose -f ${composeFile} down --volumes --remove-orphans`).catch(() => {});

    if (process.env.E2E_BUILD_TEST_MEDIA_IMAGE === '1') {
      console.log(`Building test media image (${testMediaImage})...`);
      await execAsync('bash ./scripts/build-test-media-image.sh', { env: process.env });
    } else {
      try {
        await execAsync(`docker image inspect ${testMediaImage}`);
      } catch {
        throw new Error(
          `Missing prebuilt test media image "${testMediaImage}". ` +
          'Build it first with `npm run build:test-media-image` or set E2E_BUILD_TEST_MEDIA_IMAGE=1.'
        );
      }
    }
    
    // Start services
    console.log('Starting test services...');
    const composeUp = process.env.E2E_BUILD_COMPOSE_IMAGES === '1'
      ? `docker compose -f ${composeFile} up -d --build`
      : `docker compose -f ${composeFile} up -d`;
    await execAsync(composeUp);
    
    // Wait for services to be ready
    console.log('Waiting for services to be ready...');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    while (attempts < maxAttempts) {
      try {
        const { stdout } = await execAsync(`docker compose -f ${composeFile} ps`);
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
    await execAsync(`docker compose -f ${composeFile} exec -T test-admin npx prisma migrate deploy`);
    
    console.log('✅ Microservices setup complete');
  } catch (error) {
    console.error('❌ Failed to set up microservices:', error);
    throw error;
  }
}

export default globalSetup;
