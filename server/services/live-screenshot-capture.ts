/**
 * Live Screenshot Capture Service
 * Captures authentic screenshots from actual application pages
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db';

export class LiveScreenshotCapture {
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });
      
      console.log('Live Screenshot Capture initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Live Screenshot Capture:', error);
      return false;
    }
  }

  async captureApplicationPage(route: string, filename: string): Promise<string | null> {
    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      const url = `http://localhost:5000${route}`;
      console.log(`Capturing live screenshot: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const timestamp = Date.now();
      const screenshotPath = path.join(this.screenshotDir, `${filename}-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      await page.close();
      
      const relativePath = `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
      console.log(`Live screenshot saved: ${relativePath}`);
      
      return relativePath;
    } catch (error) {
      console.error(`Failed to capture ${route}:`, error);
      return null;
    }
  }

  async updateAllTestScreenshots() {
    const testPages = [
      { route: '/company-codes-management', filename: 'company-code-live', testNumber: 'DOM-E2E-001' },
      { route: '/plants-management', filename: 'plant-config-live', testNumber: 'DOM-E2E-002' },
      { route: '/sales-organizations-management', filename: 'sales-org-live', testNumber: 'DOM-E2E-003' },
      { route: '/distribution-channels-management', filename: 'distribution-live', testNumber: 'DOM-E2E-004' },
      { route: '/divisions-management', filename: 'division-live', testNumber: 'DOM-E2E-005' },
      { route: '/condition-types-management', filename: 'condition-types-live', testNumber: 'DOM-E2E-006' },
      { route: '/products-management', filename: 'products-live', testNumber: 'DOM-E2E-007' },
      { route: '/product-costing', filename: 'costing-live', testNumber: 'DOM-E2E-008' },
      { route: '/shipping-management', filename: 'shipping-live', testNumber: 'DOM-E2E-009' },
      { route: '/customers-management', filename: 'customers-live', testNumber: 'DOM-E2E-010' },
      { route: '/sales-orders', filename: 'sales-orders-live', testNumber: 'DOM-E2E-011' },
      { route: '/invoices', filename: 'invoices-live', testNumber: 'DOM-E2E-012' },
      { route: '/test-results', filename: 'test-results-live', testNumber: 'DOM-E2E-013' }
    ];

    const results = [];
    const currentTime = new Date();
    const estTime = new Date(currentTime.getTime() - (5 * 60 * 60 * 1000)); // EST is UTC-5
    
    for (const test of testPages) {
      console.log(`Capturing live screenshot for ${test.testNumber}...`);
      const screenshotPath = await this.captureApplicationPage(test.route, test.filename);
      
      if (screenshotPath) {
        // Update database with new screenshot path
        await pool.query(
          'UPDATE dominos_test_results SET screenshot = $1, timestamp = $2 WHERE test_number = $3',
          [screenshotPath, currentTime.toISOString(), test.testNumber]
        );
        
        results.push({
          testNumber: test.testNumber,
          screenshotPath: screenshotPath,
          captureTime: estTime.toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        });
        
        console.log(`✓ Updated ${test.testNumber} with live screenshot`);
      } else {
        console.log(`✗ Failed to capture ${test.testNumber}`);
      }
      
      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('Live Screenshot Capture cleaned up');
    }
  }
}