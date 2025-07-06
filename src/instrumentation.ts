import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export async function register() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set.');
  }
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  } finally {
    await client.end();
  }

  // Media service connectivity check (non-blocking)
  const mediaServiceUrl = process.env.MEDIA_SERVICE_URL;
  if (!mediaServiceUrl) {
    console.error('❌ MEDIA_SERVICE_URL environment variable is not set.');
    return;
  }
  
  // Check media service availability with timeout and retry
  const checkMediaService = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const res = await fetch(`${mediaServiceUrl}/health`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          console.log('✅ Media service connection successful');
          return;
        } else {
          console.error(`❌ Media service health check failed: HTTP ${res.status}`);
        }
      } catch {
        if (i === retries - 1) {
          console.log('⚠️  Media service not ready yet (this is normal during startup)');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
  };
  
  // Run media service check in background without blocking startup
  checkMediaService().catch(() => {
    console.log('⚠️  Media service will be checked again when needed');
  });
} 