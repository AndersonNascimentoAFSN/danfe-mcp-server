# 💻 Guia de Implementação - Code Examples

**Complemento de**: ACTION_PLAN.md  
**Propósito**: Exemplos práticos prontos para implementação

---

## 📚 Índice

1. [Browser Pool](#1-browser-pool)
2. [Configuration Management](#2-configuration-management)
3. [Structured Logging](#3-structured-logging)
4. [Domain Errors](#4-domain-errors)
5. [NFe Validator](#5-nfe-validator)
6. [Use Cases](#6-use-cases)
7. [MCP Integration](#7-mcp-integration)
8. [Tests Examples](#8-tests-examples)

---

## 1. Browser Pool

### `infrastructure/browser/browser-pool.ts`

```typescript
import { Browser, BrowserContext, chromium } from 'playwright';
import { logger } from '@/shared/logger';
import { Config } from '@/config';

export interface BrowserPoolMetrics {
  totalContexts: number;
  availableContexts: number;
  inUseContexts: number;
  createdAt: Date;
}

export class PlaywrightBrowserPool {
  private browser: Browser | null = null;
  private contexts: BrowserContext[] = [];
  private contextInUse = new Set<BrowserContext>();
  private readonly maxContexts: number;
  private isInitialized = false;
  private isShuttingDown = false;

  constructor(maxContexts: number = Config.BROWSER_POOL_SIZE) {
    this.maxContexts = maxContexts;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Browser pool already initialized');
      return;
    }

    logger.info({ maxContexts: this.maxContexts }, 'Initializing browser pool');

    try {
      // Launch browser once
      this.browser = await chromium.launch({
        headless: false, // xvfb handles this
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });

      logger.info('Browser launched successfully');

      // Pre-warm contexts
      for (let i = 0; i < this.maxContexts; i++) {
        const context = await this.createContext();
        this.contexts.push(context);
        logger.debug({ contextIndex: i }, 'Context pre-warmed');
      }

      this.isInitialized = true;
      logger.info(
        { totalContexts: this.contexts.length },
        'Browser pool initialized'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to initialize browser pool');
      throw error;
    }
  }

  private async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Set timeouts
    context.setDefaultTimeout(Config.BROWSER_TIMEOUT_MS);
    context.setDefaultNavigationTimeout(Config.DOWNLOAD_TIMEOUT_MS);

    return context;
  }

  async acquireContext(): Promise<BrowserContext> {
    if (!this.isInitialized) {
      throw new Error('Browser pool not initialized. Call initialize() first');
    }

    if (this.isShuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    // Find available context
    const availableContext = this.contexts.find(
      (ctx) => !this.contextInUse.has(ctx)
    );

    if (availableContext) {
      this.contextInUse.add(availableContext);
      logger.debug(
        {
          inUse: this.contextInUse.size,
          total: this.contexts.length,
        },
        'Context acquired from pool'
      );
      return availableContext;
    }

    // All contexts busy, create temporary one
    logger.warn('All contexts busy, creating temporary context');
    const tempContext = await this.createContext();
    this.contextInUse.add(tempContext);
    return tempContext;
  }

  async releaseContext(context: BrowserContext): Promise<void> {
    if (!this.contextInUse.has(context)) {
      logger.warn('Attempting to release context not in use');
      return;
    }

    try {
      // Clear context state but keep it alive
      await context.clearCookies();
      await context.clearPermissions();

      this.contextInUse.delete(context);

      // If temporary context (not in pool), close it
      if (!this.contexts.includes(context)) {
        await context.close();
        logger.debug('Temporary context closed');
      } else {
        logger.debug(
          {
            inUse: this.contextInUse.size,
            total: this.contexts.length,
          },
          'Context released back to pool'
        );
      }
    } catch (error) {
      logger.error({ error }, 'Error releasing context');
      this.contextInUse.delete(context);
    }
  }

  getMetrics(): BrowserPoolMetrics {
    return {
      totalContexts: this.contexts.length,
      availableContexts: this.contexts.length - this.contextInUse.size,
      inUseContexts: this.contextInUse.size,
      createdAt: new Date(),
    };
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Browser pool already shutting down');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down browser pool');

    try {
      // Close all contexts
      const closePromises = this.contexts.map((ctx) =>
        ctx.close().catch((err) => logger.error({ err }, 'Error closing context'))
      );
      await Promise.all(closePromises);

      // Close browser
      if (this.browser) {
        await this.browser.close();
      }

      this.contexts = [];
      this.contextInUse.clear();
      this.browser = null;
      this.isInitialized = false;

      logger.info('Browser pool shut down successfully');
    } catch (error) {
      logger.error({ error }, 'Error during browser pool shutdown');
      throw error;
    }
  }
}

// Singleton instance
let browserPoolInstance: PlaywrightBrowserPool | null = null;

export function getBrowserPool(): PlaywrightBrowserPool {
  if (!browserPoolInstance) {
    browserPoolInstance = new PlaywrightBrowserPool();
  }
  return browserPoolInstance;
}
```

### `infrastructure/browser/playwright-adapter.ts`

```typescript
import { BrowserContext, Page } from 'playwright';
import { logger } from '@/shared/logger';
import { getBrowserPool } from './browser-pool';
import { BrowserError, DownloadTimeoutError } from '@/shared/errors/domain-errors';

export class PlaywrightAdapter {
  private context: BrowserContext | null = null;

  async downloadDanfeXml(chaveAcesso: string): Promise<string> {
    const pool = getBrowserPool();
    const startTime = Date.now();

    try {
      // Acquire context from pool
      this.context = await pool.acquireContext();
      const page = await this.context.newPage();

      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Starting download');

      // Navigate
      await page.goto('https://www.meudanfe.com.br/danfe/consultar/chave/', {
        waitUntil: 'domcontentloaded',
      });

      // Fill form
      await page.fill('#chave', chaveAcesso);
      await page.click('button[type="submit"]');

      // Wait for download
      const downloadPromise = page.waitForEvent('download', {
        timeout: 30000,
      });

      const download = await downloadPromise;
      const fileName = download.suggestedFilename();
      const filePath = `downloads/${fileName}`;

      await download.saveAs(filePath);

      const duration = Date.now() - startTime;
      logger.info(
        {
          chave: this.maskChave(chaveAcesso),
          fileName,
          duration,
        },
        'Download completed'
      );

      return filePath;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          error,
          chave: this.maskChave(chaveAcesso),
          duration,
        },
        'Download failed'
      );

      if (error.message.includes('timeout')) {
        throw new DownloadTimeoutError(chaveAcesso, duration);
      }

      throw new BrowserError(error.message);
    } finally {
      // Always release context back to pool
      if (this.context) {
        await pool.releaseContext(this.context);
        this.context = null;
      }
    }
  }

  private maskChave(chave: string): string {
    return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
  }
}
```

---

## 2. Configuration Management

### `config/env.schema.ts`

```typescript
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
```

### `config/index.ts`

```typescript
import { loadEnv } from './env.schema';

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
```

---

## 3. Structured Logging

### `shared/logger/index.ts`

```typescript
import pino from 'pino';
import { Config } from '@/config';

export const logger = pino({
  level: Config.LOG_LEVEL,

  formatters: {
    level: (label) => ({ level: label }),
  },

  // Redact sensitive data
  redact: {
    paths: [
      'chaveAcesso',
      '*.chaveAcesso',
      'password',
      '*.password',
      'apiKey',
      '*.apiKey',
    ],
    censor: (value, path) => {
      if (path.includes('chaveAcesso') && typeof value === 'string') {
        return maskChave(value);
      }
      return '***REDACTED***';
    },
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development
  ...(Config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export function withRequestId(requestId: string) {
  return logger.child({ requestId });
}

export function withContext(context: Record<string, unknown>) {
  return logger.child(context);
}

function maskChave(chave: string): string {
  if (chave.length < 8) return '***';
  return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
}

// Usage examples
export const usageExamples = {
  basic: () => {
    logger.info('Server started');
    logger.warn({ port: 3000 }, 'Using default port');
    logger.error({ error: new Error('Failed') }, 'Request failed');
  },

  withRequest: () => {
    const reqLogger = withRequestId('req-123');
    reqLogger.info({ method: 'GET', path: '/health' }, 'Request received');
  },

  withSensitiveData: () => {
    logger.info(
      {
        chaveAcesso: '12345678901234567890123456789012345678901234',
      },
      'Download started'
    );
    // Output: { chaveAcesso: "1234***1234", msg: "Download started" }
  },
};
```

---

## 4. Domain Errors

### `shared/errors/domain-errors.ts`

```typescript
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

// Validation Errors (400)
export class ChaveInvalidaError extends DomainError {
  constructor(chave: string, reason: string) {
    super(
      `Chave de acesso inválida: ${reason}`,
      'CHAVE_INVALIDA',
      400,
      false,
      { chave: maskChave(chave), reason }
    );
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, reason: string) {
    super(
      `Validation failed for ${field}: ${reason}`,
      'VALIDATION_ERROR',
      400,
      false,
      { field, reason }
    );
  }
}

// Browser/Download Errors (503/504)
export class DownloadTimeoutError extends DomainError {
  constructor(chave: string, timeout: number) {
    super(
      `Download timeout após ${timeout}ms`,
      'DOWNLOAD_TIMEOUT',
      504,
      true, // Retryable
      { chave: maskChave(chave), timeout }
    );
  }
}

export class CloudflareBlockedError extends DomainError {
  constructor() {
    super(
      'Acesso bloqueado por Cloudflare',
      'CLOUDFLARE_BLOCKED',
      429,
      true, // Retryable
      { suggestion: 'Aguarde alguns minutos antes de tentar novamente' }
    );
  }
}

export class BrowserError extends DomainError {
  constructor(message: string) {
    super(`Browser error: ${message}`, 'BROWSER_ERROR', 503, true);
  }
}

// Parsing Errors (422)
export class XmlParseError extends DomainError {
  constructor(reason: string) {
    super(
      `Failed to parse XML: ${reason}`,
      'XML_PARSE_ERROR',
      422,
      false,
      { reason }
    );
  }
}

// Session Errors (400)
export class SessionNotFoundError extends DomainError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      'SESSION_NOT_FOUND',
      400,
      false,
      { sessionId }
    );
  }
}

export class InvalidSessionError extends DomainError {
  constructor(reason: string) {
    super(`Invalid session: ${reason}`, 'INVALID_SESSION', 400, false, {
      reason,
    });
  }
}

// Rate Limit (429)
export class RateLimitExceededError extends DomainError {
  constructor(retryAfter: number) {
    super(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      true,
      { retryAfter }
    );
  }
}

// Helper
function maskChave(chave: string): string {
  if (chave.length < 8) return '***';
  return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
}
```

### `presentation/http/middleware/error-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { DomainError } from '@/shared/errors/domain-errors';
import { logger } from '@/shared/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Domain error (expected)
  if (error instanceof DomainError) {
    logger.warn(
      {
        error: error.toJSON(),
        req: {
          id: (req as any).id,
          method: req.method,
          url: req.url,
        },
      },
      'Domain error'
    );

    return res.status(error.statusCode).json({
      jsonrpc: '2.0',
      error: {
        code: error.code,
        message: error.message,
        data: {
          retryable: error.retryable,
          ...error.details,
        },
      },
      id: null,
    });
  }

  // Unexpected error
  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      req: {
        id: (req as any).id,
        method: req.method,
        url: req.url,
      },
    },
    'Unexpected error'
  );

  // Don't leak internal errors
  return res.status(500).json({
    jsonrpc: '2.0',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
    id: null,
  });
}
```

---

## 5. NFe Validator

### `shared/validators/nfe-validator.ts`

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class NFeValidator {
  private static readonly UF_CODES = [
    11, 12, 13, 14, 15, 16, 17, // Norte
    21, 22, 23, 24, 25, 26, 27, 28, 29, // Nordeste
    31, 32, 33, 35, // Sudeste
    41, 42, 43, // Sul
    50, 51, 52, 53, // Centro-Oeste
  ];

  static validateChave(chave: string): ValidationResult {
    // 1. Formato básico
    if (!/^[0-9]{44}$/.test(chave)) {
      return {
        valid: false,
        error: 'Formato inválido (deve ter 44 dígitos numéricos)',
      };
    }

    // 2. UF válida
    const uf = parseInt(chave.substring(0, 2));
    if (!this.UF_CODES.includes(uf)) {
      return { valid: false, error: `UF inválida: ${uf}` };
    }

    // 3. Data válida (AAMM)
    const ano = parseInt(chave.substring(2, 4));
    const mes = parseInt(chave.substring(4, 6));
    if (mes < 1 || mes > 12) {
      return { valid: false, error: `Mês inválido: ${mes}` };
    }

    // 4. CNPJ válido (básico)
    const cnpj = chave.substring(8, 22);
    if (!this.validateCNPJ(cnpj)) {
      return { valid: false, error: 'CNPJ inválido' };
    }

    // 5. Modelo válido (55=NFe, 65=NFCe)
    const modelo = parseInt(chave.substring(22, 24));
    if (![55, 65].includes(modelo)) {
      return {
        valid: false,
        error: `Modelo inválido: ${modelo} (deve ser 55 ou 65)`,
      };
    }

    // 6. Dígito verificador (Módulo 11)
    if (!this.validateChecksum(chave)) {
      return { valid: false, error: 'Dígito verificador inválido' };
    }

    return { valid: true };
  }

  private static validateChecksum(chave: string): boolean {
    // Pesos para módulo 11
    const weights = [
      4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5,
      4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
    ];

    let sum = 0;
    for (let i = 0; i < 43; i++) {
      sum += parseInt(chave[i]) * weights[i];
    }

    const remainder = sum % 11;
    const dv = remainder < 2 ? 0 : 11 - remainder;

    return dv === parseInt(chave[43]);
  }

  private static validateCNPJ(cnpj: string): boolean {
    // Verificar se todos dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Calcular primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const dv1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    // Calcular segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const dv2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return dv1 === parseInt(cnpj[12]) && dv2 === parseInt(cnpj[13]);
  }

  // Parse chave into components
  static parseChave(chave: string) {
    if (!this.validateChave(chave).valid) {
      return null;
    }

    return {
      uf: parseInt(chave.substring(0, 2)),
      ano: parseInt(chave.substring(2, 4)),
      mes: parseInt(chave.substring(4, 6)),
      cnpj: chave.substring(8, 22),
      modelo: parseInt(chave.substring(22, 24)),
      serie: parseInt(chave.substring(24, 27)),
      numero: parseInt(chave.substring(27, 36)),
      formaEmissao: parseInt(chave.substring(36, 37)),
      codigoNumerico: chave.substring(37, 43),
      digitoVerificador: parseInt(chave.substring(43, 44)),
    };
  }
}
```

---

## 6. Use Cases

### `core/usecases/download-danfe.usecase.ts`

```typescript
import retry from 'async-retry';
import { logger } from '@/shared/logger';
import { NFeValidator } from '@/shared/validators/nfe-validator';
import {
  ChaveInvalidaError,
  CloudflareBlockedError,
} from '@/shared/errors/domain-errors';
import { PlaywrightAdapter } from '@/infrastructure/browser/playwright-adapter';
import { DanfeXmlReader } from '@/infrastructure/xml/xml2js-parser';
import { DanfeData } from '@/core/entities/danfe.entity';
import fs from 'fs-extra';

export class DownloadDanfeUseCase {
  constructor(
    private readonly downloader: PlaywrightAdapter,
    private readonly parser: DanfeXmlReader
  ) {}

  async execute(chaveAcesso: string): Promise<DanfeData> {
    const startTime = Date.now();

    // 1. Validate chave
    const validation = NFeValidator.validateChave(chaveAcesso);
    if (!validation.valid) {
      throw new ChaveInvalidaError(chaveAcesso, validation.error!);
    }

    // 2. Download with retry
    const xmlPath = await retry(
      async (bail, attempt) => {
        try {
          logger.info(
            {
              attempt,
              chave: this.maskChave(chaveAcesso),
            },
            'Attempting download'
          );

          return await this.downloader.downloadDanfeXml(chaveAcesso);
        } catch (error) {
          // Don't retry validation errors
          if (error instanceof ChaveInvalidaError) {
            bail(error);
            return '';
          }

          // Retry Cloudflare blocks
          if (error instanceof CloudflareBlockedError) {
            logger.warn('Cloudflare block detected, will retry');
            throw error;
          }

          // Retry other errors
          throw error;
        }
      },
      {
        retries: 3,
        factor: 2, // Exponential backoff
        minTimeout: 1000,
        maxTimeout: 10000,
        onRetry: (error, attempt) => {
          logger.warn(
            {
              error: error.message,
              attempt,
              nextRetry: Math.min(1000 * Math.pow(2, attempt), 10000),
            },
            'Retrying download'
          );
        },
      }
    );

    // 3. Parse XML
    logger.info({ xmlPath }, 'Parsing XML');
    const data = await this.parser.readAndParse(xmlPath);

    // 4. Cleanup
    try {
      await fs.unlink(xmlPath);
      logger.debug({ xmlPath }, 'XML file deleted');
    } catch (error) {
      logger.warn({ error, xmlPath }, 'Failed to delete XML file');
    }

    const duration = Date.now() - startTime;
    logger.info(
      {
        chave: this.maskChave(chaveAcesso),
        duration,
      },
      'Download completed'
    );

    return data;
  }

  private maskChave(chave: string): string {
    return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
  }
}
```

---

## 8. Tests Examples

### `tests/unit/validators/nfe-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { NFeValidator } from '@/shared/validators/nfe-validator';

describe('NFeValidator', () => {
  describe('validateChave', () => {
    it('should accept valid chave', () => {
      const chave = '35210847508411000135550010000109431404848162';
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject chave with wrong length', () => {
      const chave = '123456789';
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Formato inválido');
    });

    it('should reject chave with non-numeric characters', () => {
      const chave = '1234567890123456789012345678901234567890123A';
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Formato inválido');
    });

    it('should reject chave with invalid UF', () => {
      const chave = '99210847508411000135550010000109431404848162';
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UF inválida');
    });

    it('should reject chave with invalid month', () => {
      const chave = '35211347508411000135550010000109431404848162'; // Month 13
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Mês inválido');
    });

    it('should reject chave with invalid modelo', () => {
      const chave = '35210847508411000135560010000109431404848162'; // Modelo 56
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Modelo inválido');
    });

    it('should reject chave with invalid checksum', () => {
      const chave = '35210847508411000135550010000109431404848161'; // Last digit wrong
      const result = NFeValidator.validateChave(chave);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dígito verificador');
    });
  });

  describe('parseChave', () => {
    it('should parse valid chave correctly', () => {
      const chave = '35210847508411000135550010000109431404848162';
      const parsed = NFeValidator.parseChave(chave);

      expect(parsed).toEqual({
        uf: 35,
        ano: 21,
        mes: 8,
        cnpj: '47508411000135',
        modelo: 55,
        serie: 1,
        numero: 10943,
        formaEmissao: 1,
        codigoNumerico: '404848',
        digitoVerificador: 2,
      });
    });

    it('should return null for invalid chave', () => {
      const chave = '123456789';
      const parsed = NFeValidator.parseChave(chave);
      expect(parsed).toBeNull();
    });
  });
});
```

### `tests/integration/browser/browser-pool.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlaywrightBrowserPool } from '@/infrastructure/browser/browser-pool';

describe('PlaywrightBrowserPool', () => {
  let pool: PlaywrightBrowserPool;

  beforeAll(async () => {
    pool = new PlaywrightBrowserPool(2); // Small pool for tests
    await pool.initialize();
  });

  afterAll(async () => {
    await pool.shutdown();
  });

  it('should initialize with specified number of contexts', () => {
    const metrics = pool.getMetrics();
    expect(metrics.totalContexts).toBe(2);
    expect(metrics.availableContexts).toBe(2);
    expect(metrics.inUseContexts).toBe(0);
  });

  it('should acquire and release context', async () => {
    const context = await pool.acquireContext();
    expect(context).toBeDefined();

    const metrics1 = pool.getMetrics();
    expect(metrics1.inUseContexts).toBe(1);
    expect(metrics1.availableContexts).toBe(1);

    await pool.releaseContext(context);

    const metrics2 = pool.getMetrics();
    expect(metrics2.inUseContexts).toBe(0);
    expect(metrics2.availableContexts).toBe(2);
  });

  it('should create temporary context when all busy', async () => {
    const ctx1 = await pool.acquireContext();
    const ctx2 = await pool.acquireContext();

    const metrics1 = pool.getMetrics();
    expect(metrics1.inUseContexts).toBe(2);
    expect(metrics1.availableContexts).toBe(0);

    // Should create temporary
    const ctx3 = await pool.acquireContext();
    expect(ctx3).toBeDefined();

    const metrics2 = pool.getMetrics();
    expect(metrics2.inUseContexts).toBe(3);

    // Cleanup
    await pool.releaseContext(ctx1);
    await pool.releaseContext(ctx2);
    await pool.releaseContext(ctx3);
  });

  it('should handle concurrent acquires', async () => {
    const promises = Array(5)
      .fill(null)
      .map(() => pool.acquireContext());

    const contexts = await Promise.all(promises);
    expect(contexts).toHaveLength(5);

    // Release all
    await Promise.all(contexts.map((ctx) => pool.releaseContext(ctx)));

    const metrics = pool.getMetrics();
    expect(metrics.inUseContexts).toBe(0);
  });
});
```

---

**Fim do Guia de Implementação**

Este guia fornece exemplos práticos prontos para uso. Cada snippet foi baseado nas melhores práticas identificadas na análise arquitetural e está pronto para ser integrado ao projeto.

Para implementação completa, siga o **ACTION_PLAN.md** fase por fase.
