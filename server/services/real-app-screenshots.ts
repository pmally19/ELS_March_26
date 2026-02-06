/**
 * Real Application Screenshot Capture
 * Captures authentic screenshots from live application pages
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db';

export class RealAppScreenshots {
  private screenshotDir = path.join(process.cwd(), 'uploads', 'screenshots', 'dominos-e2e');

  async captureAllBusinessProcesses() {
    // Ensure screenshots directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 900 });

      const businessProcesses = [
        { 
          testNumber: 'DOM-E2E-001', 
          route: '/company-codes-management',
          filename: 'company-code-setup',
          description: 'Company Code Management'
        },
        { 
          testNumber: 'DOM-E2E-002', 
          route: '/plants-management',
          filename: 'plant-configuration',
          description: 'Plant Configuration'
        },
        { 
          testNumber: 'DOM-E2E-003', 
          route: '/sales-organizations-management',
          filename: 'sales-organization-setup',
          description: 'Sales Organization Setup'
        },
        { 
          testNumber: 'DOM-E2E-004', 
          route: '/distribution-channels-management',
          filename: 'distribution-channel-setup',
          description: 'Distribution Channel Setup'
        },
        { 
          testNumber: 'DOM-E2E-005', 
          route: '/divisions-management',
          filename: 'division-setup',
          description: 'Division Setup'
        },
        { 
          testNumber: 'DOM-E2E-006', 
          route: '/condition-types-management',
          filename: 'condition-types-setup',
          description: 'Condition Types Management'
        },
        { 
          testNumber: 'DOM-E2E-007', 
          route: '/products-management',
          filename: 'product-master-data',
          description: 'Product Master Data'
        },
        { 
          testNumber: 'DOM-E2E-008', 
          route: '/product-costing',
          filename: 'product-costing-setup',
          description: 'Product Costing'
        },
        { 
          testNumber: 'DOM-E2E-009', 
          route: '/shipping-management',
          filename: 'shipping-setup',
          description: 'Shipping Management'
        },
        { 
          testNumber: 'DOM-E2E-010', 
          route: '/customers-management',
          filename: 'customer-master-data',
          description: 'Customer Master Data'
        },
        { 
          testNumber: 'DOM-E2E-011', 
          route: '/sales-orders',
          filename: 'sales-order-processing',
          description: 'Sales Order Processing'
        },
        { 
          testNumber: 'DOM-E2E-012', 
          route: '/invoices',
          filename: 'billing-process',
          description: 'Billing Process'
        },
        { 
          testNumber: 'DOM-E2E-013', 
          route: '/test-results',
          filename: 'test-results-dashboard',
          description: 'Test Results Dashboard'
        }
      ];

      const results = [];
      const timestamp = Date.now();
      const currentTime = new Date();
      const estTime = new Date(currentTime.getTime() - (5 * 60 * 60 * 1000));

      for (const process of businessProcesses) {
        try {
          console.log(`Capturing live screenshot: ${process.description}`);
          
          const url = `http://localhost:5000${process.route}`;
          await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
          });

          // Wait for page to fully load
          await new Promise(resolve => setTimeout(resolve, 3000));

          const screenshotFilename = `${process.filename}-${timestamp}.png`;
          const screenshotPath = path.join(this.screenshotDir, screenshotFilename);
          const dbPath = `/uploads/screenshots/dominos-e2e/${screenshotFilename}`;

          // Capture actual application screenshot
          await page.screenshot({
            path: screenshotPath,
            fullPage: false
          });

          // Update database with new screenshot path and timestamp
          await pool.query(
            'UPDATE dominos_test_results SET screenshot = $1, timestamp = $2 WHERE test_number = $3',
            [dbPath, currentTime.toISOString(), process.testNumber]
          );

          results.push({
            testNumber: process.testNumber,
            description: process.description,
            screenshotPath: dbPath,
            captureTime: estTime.toLocaleString('en-US', { 
              timeZone: 'America/New_York',
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            status: 'SUCCESS'
          });

          console.log(`✓ Captured: ${process.description}`);
          
        } catch (error) {
          console.error(`Failed to capture ${process.description}:`, error);
          results.push({
            testNumber: process.testNumber,
            description: process.description,
            status: 'FAILED',
            error: error.message
          });
        }

        // Small delay between captures
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return results;

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}