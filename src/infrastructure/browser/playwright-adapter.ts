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

      // Wait for search response first
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for search response');
      await this.page.waitForTimeout(3000);

      // Check for error messages first
      const errorMessages = [
        'Chave de acesso não encontrada!',
        'Chave de acesso inválida',
        'NFe não encontrada',
        'Documento não encontrado'
      ];

      for (const errorMessage of errorMessages) {
        const errorElement = await this.page.locator(`text=${errorMessage}`).first();
        if (await errorElement.isVisible()) {
          logger.error({ 
            chave: this.maskChave(chaveAcesso), 
            errorMessage 
          }, 'Invalid access key detected');
          throw new Error(`Invalid access key: ${errorMessage}`);
        }
      }

      // Check for general error indicators
      const hasErrorClass = await this.page.locator('.error, .alert-danger, .text-red-500').first().isVisible();
      if (hasErrorClass) {
        const errorText = await this.page.locator('.error, .alert-danger, .text-red-500').first().textContent();
        logger.error({ 
          chave: this.maskChave(chaveAcesso), 
          errorText 
        }, 'Error message detected on page');
        throw new Error(`Page error: ${errorText}`);
      }

      logger.info({ chave: this.maskChave(chaveAcesso) }, 'No error messages found, proceeding with download');

      // Prepare download listener
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Preparing download listener');
      const downloadPromise = this.page.waitForEvent('download', {
        timeout: 120000,
      });

      // Wait for results with improved logic
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for search results');
      
      // Wait for download button to become visible (simplified logic)
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for download button to appear');
      
      try {
        await this.page.waitForSelector('#downloadXmlBtn', { 
          state: 'visible',
          timeout: 30000 
        });
        
        logger.info({ chave: this.maskChave(chaveAcesso) }, 'Download button is now visible');
        
        // Scroll to button to ensure it's in view
        await this.page.locator('#downloadXmlBtn').scrollIntoViewIfNeeded();
        
        // Wait a bit for any animations
        await this.page.waitForTimeout(1000);
        
      } catch (timeoutError) {
        // If button doesn't appear, check for any additional error messages
        const pageContent = await this.page.content();
        const hasDownloadBtn = pageContent.includes('downloadXmlBtn');
        
        logger.error({ 
          chave: this.maskChave(chaveAcesso),
          hasDownloadBtn,
          pageTitle: await this.page.title()
        }, 'Download button timeout - may indicate invalid key or site changes');
        
        throw new Error('Download button not visible - this usually indicates an invalid access key or the key was not found in the system');
      }

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
    // Detect if we're in a headless environment (Render, Docker, etc.)
    const isHeadlessEnvironment = !process.env.DISPLAY || process.env.NODE_ENV === 'production';
    const headlessMode = isHeadlessEnvironment;
    
    logger.info(`Initializing Chromium browser (${headlessMode ? 'headless' : 'headed'} mode)`);

    this.browser = await chromium.launch({
      headless: headlessMode, // Auto-detect based on environment
      slowMo: 100, // Add delay between actions to appear more human
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled', // Hide automation flags
        '--ignore-certificate-errors',
        // Additional args for headless stability
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps',
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
