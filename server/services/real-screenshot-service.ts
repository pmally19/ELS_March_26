/**
 * Real Screenshot Service - Captures authentic screenshots from live application
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export class RealScreenshotService {
  private browser: any = null;
  private screenshotDir = path.join(process.cwd(), 'uploads', 'screenshots', 'dominos-e2e');

  async initialize() {
    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-security']
      });
      
      console.log('Real Screenshot Service initialized');
    } catch (error) {
      console.error('Failed to initialize screenshot service:', error);
    }
  }

  async captureApplicationScreenshot(route: string, filename: string): Promise<string | null> {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      const url = `http://localhost:5000${route}`;
      console.log(`Capturing screenshot of: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      await page.waitForTimeout(3000); // Wait for page to fully load
      
      const screenshotPath = path.join(this.screenshotDir, `${filename}-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      await page.close();
      
      const relativePath = `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
      console.log(`Screenshot saved: ${relativePath}`);
      
      return relativePath;
    } catch (error) {
      console.error(`Failed to capture screenshot for ${route}:`, error);
      return null;
    }
  }

  async updateTestResultScreenshots() {
    const testRoutes = [
      { route: '/company-codes-management', filename: 'company-code-setup', testNumber: 'DOM-E2E-001' },
      { route: '/plants-management', filename: 'plant-configuration', testNumber: 'DOM-E2E-002' },
      { route: '/sales-organizations-management', filename: 'sales-organization-setup', testNumber: 'DOM-E2E-003' },
      { route: '/distribution-channels-management', filename: 'distribution-channels', testNumber: 'DOM-E2E-004' },
      { route: '/divisions-management', filename: 'division-setup', testNumber: 'DOM-E2E-005' },
      { route: '/condition-types-management', filename: 'condition-types-setup', testNumber: 'DOM-E2E-006' },
      { route: '/products-management', filename: 'product-master-data', testNumber: 'DOM-E2E-007' },
      { route: '/product-costing', filename: 'product-costing', testNumber: 'DOM-E2E-008' },
      { route: '/shipping-management', filename: 'delivery-methods-setup', testNumber: 'DOM-E2E-009' },
      { route: '/customers-management', filename: 'customer-master-data', testNumber: 'DOM-E2E-010' },
      { route: '/sales-orders', filename: 'sales-order-processing', testNumber: 'DOM-E2E-011' },
      { route: '/invoices', filename: 'billing-process', testNumber: 'DOM-E2E-012' },
      { route: '/test-results', filename: 'end-to-end-order-flow', testNumber: 'DOM-E2E-013' }
    ];

    const results = [];
    
    for (const test of testRoutes) {
      const screenshotPath = await this.captureApplicationScreenshot(test.route, test.filename);
      if (screenshotPath) {
        results.push({
          testNumber: test.testNumber,
          screenshotPath: screenshotPath
        });
      }
    }

    return results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('Screenshot service cleaned up');
    }
  }
}