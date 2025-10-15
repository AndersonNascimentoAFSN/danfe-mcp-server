import { loadEnv } from './env.schema.js';

export const Config = loadEnv();

// Validate critical config
if (!Config.DISPLAY && Config.NODE_ENV === 'production') {
  console.warn('⚠️  DISPLAY not set. Make sure xvfb is running.');
}

// Log config (redact sensitive)
console.log('📋 Configuration loaded:');
console.log(`   NODE_ENV: ${Config.NODE_ENV}`);
console.log(`   PORT: ${Config.PORT}`);
console.log(`   LOG_LEVEL: ${Config.LOG_LEVEL}`);
console.log(`   BROWSER_POOL_SIZE: ${Config.BROWSER_POOL_SIZE}`);
console.log(`   REDIS: ${Config.REDIS_URL ? 'Enabled' : 'Disabled'}`);
console.log(`   RATE_LIMIT: ${Config.ENABLE_RATE_LIMIT ? 'Enabled' : 'Disabled'}`);
