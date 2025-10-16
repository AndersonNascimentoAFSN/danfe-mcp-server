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

      // Wait for search response and check for error messages
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for search response');
      
      // Give more time for the error message to appear if the key is invalid
      await this.page.waitForTimeout(5000);

      // Check for error messages that appear when access key is invalid
      const errorMessages = [
        'Chave de acesso não encontrada!',
        'Chave de acesso inválida',
        'NFe não encontrada',
        'Documento não encontrado',
        'Chave não encontrada',
        'Dados não encontrados'
      ];

      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Checking for error messages');
      
      for (const errorMessage of errorMessages) {
        try {
          const errorElement = await this.page.locator(`text=${errorMessage}`).first();
          const isVisible = await errorElement.isVisible();
          if (isVisible) {
            logger.error({ 
              chave: this.maskChave(chaveAcesso), 
              errorMessage 
            }, 'Invalid access key detected - error message found');
            throw new Error(`Invalid access key: ${errorMessage}`);
          }
        } catch (locatorError) {
          // Continue checking other error messages if this one fails
          logger.debug({ errorMessage }, 'Error message not found, continuing check');
        }
      }

      // Check for general error indicators by CSS classes and common error containers
      const errorSelectors = [
        '.error',
        '.alert-danger', 
        '.text-red-500',
        '.alert-error',
        '.error-message',
        '.invalid-key',
        '[class*="error"]',
        '[class*="danger"]'
      ];

      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.page.locator(selector).first();
          const isVisible = await errorElement.isVisible();
          if (isVisible) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.trim().length > 0) {
              logger.error({ 
                chave: this.maskChave(chaveAcesso), 
                errorText: errorText.trim(),
                selector 
              }, 'Error indicator detected on page');
              throw new Error(`Page error: ${errorText.trim()}`);
            }
          }
        } catch (selectorError) {
          // Continue checking other selectors if this one fails
          logger.debug({ selector }, 'Error selector not found, continuing check');
        }
      }

      logger.info({ chave: this.maskChave(chaveAcesso) }, 'No error messages found, proceeding with download');

      // Wait for results with improved logic
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for search results');
      
      // Wait for download button to become visible with enhanced logic for Render.com
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Waiting for download button to appear');
      
      // Enhanced button detection with multiple strategies
      let buttonFound = false;
      const maxAttempts = 12; // 60 seconds total (5s per attempt)
      
      for (let attempt = 1; attempt <= maxAttempts && !buttonFound; attempt++) {
        try {
          logger.debug({ 
            chave: this.maskChave(chaveAcesso), 
            attempt, 
            maxAttempts 
          }, `Checking for download button (attempt ${attempt}/${maxAttempts})`);
          
          // Check if button exists in DOM
          const buttonExists = await this.page.locator('#downloadXmlBtn').count() > 0;
          
          if (buttonExists) {
            // Check if button is visible and enabled
            const isVisible = await this.page.locator('#downloadXmlBtn').isVisible();
            const isEnabled = await this.page.locator('#downloadXmlBtn').isEnabled();
            
            logger.debug({ 
              chave: this.maskChave(chaveAcesso), 
              buttonExists, 
              isVisible, 
              isEnabled 
            }, 'Button state check');
            
            if (isVisible && isEnabled) {
              buttonFound = true;
              logger.info({ chave: this.maskChave(chaveAcesso) }, 'Download button is now visible and enabled');
              break;
            } else if (isVisible && !isEnabled) {
              // Button is visible but disabled, wait a bit more
              logger.debug({ chave: this.maskChave(chaveAcesso) }, 'Button visible but disabled, waiting...');
            }
          } else {
            // Button doesn't exist yet, check for loading indicators
            const hasLoading = await this.page.locator('.loading, .spinner, [class*="loading"]').count() > 0;
            logger.debug({ 
              chave: this.maskChave(chaveAcesso), 
              hasLoading 
            }, 'Button not found, checking loading state');
          }
          
          // Wait before next attempt
          await this.page.waitForTimeout(5000);
          
        } catch (checkError: any) {
          logger.debug({ 
            chave: this.maskChave(chaveAcesso), 
            attempt, 
            error: checkError.message 
          }, 'Error during button check attempt');
          
          await this.page.waitForTimeout(5000);
        }
      }
      
      if (!buttonFound) {
        // Final diagnostic before throwing error
        const pageContent = await this.page.content();
        const hasDownloadBtn = pageContent.includes('downloadXmlBtn');
        const pageTitle = await this.page.title();
        const url = this.page.url();
        
        logger.error({ 
          chave: this.maskChave(chaveAcesso),
          hasDownloadBtn,
          pageTitle,
          url,
          totalAttempts: maxAttempts
        }, 'Download button timeout after enhanced detection - may indicate invalid key or site changes');
        
        throw new Error('Download button not visible after 60 seconds - this usually indicates an invalid access key or the key was not found in the system');
      }
      
      // Scroll to button to ensure it's in view
      await this.page.locator('#downloadXmlBtn').scrollIntoViewIfNeeded();
      
      // Wait for any animations to complete
      await this.page.waitForTimeout(2000);

      // Prepare download listener AFTER button is confirmed visible
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Preparing download listener');
      const downloadPromise = this.page.waitForEvent('download', {
        timeout: 180000, // Increased to 3 minutes for Render.com environment
      });

      // Click download XML button with retry logic
      logger.info({ chave: this.maskChave(chaveAcesso) }, 'Clicking download XML button');
      
      let clickSuccess = false;
      const maxClickAttempts = 3;
      
      for (let clickAttempt = 1; clickAttempt <= maxClickAttempts && !clickSuccess; clickAttempt++) {
        try {
          logger.debug({ 
            chave: this.maskChave(chaveAcesso), 
            clickAttempt, 
            maxClickAttempts 
          }, `Attempting to click download button (attempt ${clickAttempt}/${maxClickAttempts})`);
          
          // Ensure button is still visible and enabled before clicking
          const isStillVisible = await this.page.locator('#downloadXmlBtn').isVisible();
          const isStillEnabled = await this.page.locator('#downloadXmlBtn').isEnabled();
          
          if (!isStillVisible || !isStillEnabled) {
            logger.warn({ 
              chave: this.maskChave(chaveAcesso), 
              isStillVisible, 
              isStillEnabled 
            }, 'Button state changed, waiting before retry');
            await this.page.waitForTimeout(2000);
            continue;
          }
          
          // Try click with force option for better reliability
          await this.page.locator('#downloadXmlBtn').click({ force: true });
          clickSuccess = true;
          
          logger.info({ 
            chave: this.maskChave(chaveAcesso), 
            clickAttempt 
          }, 'Download button clicked successfully');
          
        } catch (clickError: any) {
          logger.warn({ 
            chave: this.maskChave(chaveAcesso), 
            clickAttempt, 
            error: clickError.message 
          }, 'Click attempt failed, will retry if attempts remain');
          
          if (clickAttempt < maxClickAttempts) {
            await this.page.waitForTimeout(3000); // Wait before retry
          }
        }
      }
      
      if (!clickSuccess) {
        throw new Error('Failed to click download button after multiple attempts');
      }

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

      // Cleanup after successful completion
      await this.cleanup();

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

      // Cleanup immediately on error to prevent resource leaks
      await this.cleanup();

      if (error.message && error.message.includes('timeout')) {
        throw new DownloadTimeoutError(chaveAcesso, duration);
      }

      throw new BrowserError(error.message || 'Unknown browser error');
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
