import { Browser, BrowserContext, chromium } from 'playwright';
import { logger } from '../../shared/logger/index.js';
import { Config } from '../../config/index.js';

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
