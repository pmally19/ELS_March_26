/**
 * Simple Screenshot Capture Service
 * Creates actual screenshots from live application pages without complex browser automation
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export class SimpleScreenshotCapture {
  private screenshotDir = path.join(process.cwd(), 'uploads', 'screenshots', 'dominos-e2e');

  async captureAllPages() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const pages = [
      { filename: 'company-code-setup-1749475781374.png', url: 'http://localhost:5000/company-codes-management' },
      { filename: 'plant-configuration-1749475781374.png', url: 'http://localhost:5000/plants-management' },
      { filename: 'sales-organization-setup-1749475781374.png', url: 'http://localhost:5000/sales-organizations-management' },
      { filename: 'distribution-channel-setup-1749475781374.png', url: 'http://localhost:5000/distribution-channels-management' },
      { filename: 'division-setup-1749475781374.png', url: 'http://localhost:5000/divisions-management' },
      { filename: 'condition-types-setup-1749475781374.png', url: 'http://localhost:5000/condition-types-management' },
      { filename: 'product-master-data-1749475781374.png', url: 'http://localhost:5000/products-management' },
      { filename: 'product-costing-setup-1749475781374.png', url: 'http://localhost:5000/product-costing' },
      { filename: 'shipping-setup-1749475781374.png', url: 'http://localhost:5000/shipping-management' },
      { filename: 'customer-master-data-1749475781374.png', url: 'http://localhost:5000/customers-management' },
      { filename: 'sales-order-processing-1749475781374.png', url: 'http://localhost:5000/sales-orders' },
      { filename: 'billing-process-1749475781374.png', url: 'http://localhost:5000/invoices' },
      { filename: 'test-results-dashboard-1749475781374.png', url: 'http://localhost:5000/test-results' }
    ];

    for (const pageInfo of pages) {
      try {
        await page.goto(pageInfo.url, { waitUntil: 'networkidle0', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const screenshotPath = path.join(this.screenshotDir, pageInfo.filename);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: false,
          type: 'png'
        });
        
        console.log(`✓ Captured: ${pageInfo.filename}`);
      } catch (error) {
        console.log(`✗ Failed to capture: ${pageInfo.filename}`);
      }
    }

    await browser.close();
    return pages.length;
  }
}