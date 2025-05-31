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

  // Audio service connectivity check
  const audioServiceUrl = process.env.AUDIO_SERVICE_URL;
  if (!audioServiceUrl) {
    console.error('❌ AUDIO_SERVICE_URL environment variable is not set.');
  }
  try {
    const res = await fetch(`${audioServiceUrl}/health`);
    if (res.ok) {
      console.log('✅ Audio service connection successful');
    } else {
      console.error(`❌ Audio service health check failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Audio service connection failed:', err);
  }
} 