import { chromium, Browser, Page, Download } from 'playwright';
import fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../../shared/logger/index.js';
import { BrowserError, DownloadTimeoutError, XmlParseError } from '../../shared/errors/domain-errors.js';

/**
 * PlaywrightAdapter - Browser automation for DANFE XML downloads
 * 
 * Uses ISOLATED browser instances (not pool) to avoid state contamination issues
 * that can occur with Cloudflare-protected sites.
 * 
 * Key learnings from production debugging:
 * - Shared browser contexts can cause download button visibility issues
 * - Isolated instances are more reliable for sites with anti-bot protection
 * - Each download gets a fresh browser state
 */
export class PlaywrightAdapter {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async downloadDanfeXml(chaveAcesso: string): Promise<string> {
    const startTime = Date.now();

    try {
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Starting download');

      // Initialize isolated browser instance
      await this.initBrowser();

      if (!this.page) {
        throw new BrowserError('Failed to initialize browser');
      }

      // Navigate to homepage
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Navigating to meudanfe.com.br');
      await this.page.goto('https://meudanfe.com.br/', {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // Wait for Cloudflare check
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for Cloudflare verification');
      await this.page.waitForTimeout(5000);

      // Fill search input
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Filling access key');
      const inputSelector = '#searchTxt';
      await this.page.waitForSelector(inputSelector, { timeout: 10000 });
      await this.page.fill(inputSelector, chaveAcesso);

      // Click search button
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Clicking search button');
      const searchButtonSelector = '#searchBtn';
      await this.page.click(searchButtonSelector);

      // Prepare download listener
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Preparing download listener');
      const downloadPromise = this.page.waitForEvent('download', {
        timeout: 120000,
      });

      // Wait for results
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for search results');
      await this.page.waitForSelector('#downloadXmlBtn', {
        state: 'visible',
        timeout: 60000,
      });

      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Results found');

      // Wait to ensure page is fully loaded
      await this.page.waitForTimeout(3000);

      // Click download XML button
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Clicking download XML button');
      await this.page.click('#downloadXmlBtn');

      // Wait for download
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for download to start');
      const download: Download = await downloadPromise;
      const suggestedFilename = download.suggestedFilename();

      // Save to downloads directory
      const projectDownloadsDir = path.join(process.cwd(), 'downloads');
      await fs.ensureDir(projectDownloadsDir);
      const finalPath = path.join(projectDownloadsDir, suggestedFilename);

      await download.saveAs(finalPath);
      logger.info({ chave: this.maskChave(chaveAcesso), fileName: suggestedFilename }, 'File saved');

      // Validate XML
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Validating downloaded XML');
      const isValid = await this.validateDanfeXml(finalPath);
      if (!isValid) {
        throw new XmlParseError('Downloaded XML is not valid');
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          chave: this.maskChave(chaveAcesso),
          fileName: suggestedFilename,
          duration,
        },
        'Download completed and validated'
      );

      return finalPath;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          error: error.message,
          chave: this.maskChave(chaveAcesso),
          duration,
        },
        'Download failed'
      );

      if (error.message && error.message.includes('timeout')) {
        throw new DownloadTimeoutError(chaveAcesso, duration);
      }

      throw new BrowserError(error.message || 'Unknown browser error');
    } finally {
      // Always cleanup resources
      await this.cleanup();
    }
  }

  /**
   * Initialize isolated browser instance in headed mode
   * Headed mode is required to bypass Cloudflare protection
   */
  private async initBrowser(): Promise<void> {
    logger.info('Initializing Chromium browser (headed mode)');

    this.browser = await chromium.launch({
      headless: false, // Headed mode to avoid Cloudflare detection
      slowMo: 100, // Add delay between actions to appear more human
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled', // Hide automation flags
        '--ignore-certificate-errors',
      ],
    });

    const context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
    });

    // Remove properties that indicate automation
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    this.page = await context.newPage();

    // Log API requests for debugging
    this.page.on('request', (request) => {
      if (request.url().includes('/v2/fiscal-doc/')) {
        logger.debug({ url: request.url() }, 'API request detected');
      }
    });

    this.page.on('response', (response) => {
      if (response.url().includes('/v2/fiscal-doc/')) {
        logger.debug({ url: response.url(), status: response.status() }, 'API response');
      }
    });

    logger.info('Browser initialized successfully');
  }

  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.debug('Browser resources cleaned up');
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Error cleaning up browser resources');
    }
  }

  private maskChave(chave: string): string {
    return `${chave.substring(0, 4)}***${chave.slice(-4)}`;
  }

  /**
   * Validates if the downloaded XML file is valid
   */
  private async validateDanfeXml(filePath: string): Promise<boolean> {
    try {
      if (!(await fs.pathExists(filePath))) {
        logger.error({ filePath }, 'File not found');
        return false;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      // Basic validations
      const isXml = content.trim().startsWith('<?xml');
      const hasNFe = content.includes('<NFe') || content.includes('<nfeProc');

      if (!isXml) {
        logger.error('File is not a valid XML');
        return false;
      }

      if (!hasNFe) {
        logger.error('XML does not contain NFe data');
        return false;
      }

      const fileSize = (await fs.stat(filePath)).size;
      logger.info({ fileSize }, 'XML file size');

      if (fileSize < 100) {
        logger.error('XML file is too small');
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error validating XML');
      return false;
    }
  }
}
