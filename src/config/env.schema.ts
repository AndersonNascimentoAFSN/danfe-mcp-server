import { z } from 'zod';

const envSchema = z.object({
  // Node
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Display (xvfb)
  DISPLAY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Session
  SESSION_TTL_MS: z.coerce
    .number()
    .positive()
    .default(30 * 60 * 1000), // 30 min

  // Browser
  BROWSER_POOL_SIZE: z.coerce.number().int().positive().default(3),
  BROWSER_TIMEOUT_MS: z.coerce.number().positive().default(30000),

  // Download
  DOWNLOAD_TIMEOUT_MS: z.coerce.number().positive().default(60000),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  DOWNLOADS_DIR: z.string().default('downloads'),

  // Security
  ENABLE_RATE_LIMIT: z.coerce.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // MCP
  MCP_DNS_REBINDING_PROTECTION: z.coerce.boolean().default(true),
  MCP_ALLOWED_HOSTS: z
    .string()
    .transform((s) => s.split(',').map((h) => h.trim()))
    .default('127.0.0.1,localhost'),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
  REDIS_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}
