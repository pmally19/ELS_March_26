/**
 * Screenshot Service for Human-like Testing
 * Captures actual screenshots during testing scenarios
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class ScreenshotService {
  private browser: any = null;
  private page: any = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1200, height: 800 });
  }

  async captureFormScreenshot(formUrl: string, formData: Record<string, string>, testType: 'positive' | 'negative' = 'positive') {
    if (!this.page) {
      await this.initialize();
    }

    try {
      // Navigate to the form
      await this.page.goto(formUrl);
      await this.page.waitForSelector('form', { timeout: 5000 });

      // Fill form fields with test data
      for (const [field, value] of Object.entries(formData)) {
        const selector = `input[name="${field}"], select[name="${field}"], textarea[name="${field}"]`;
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.type(selector, value);
        } catch (error) {
          console.log(`Field ${field} not found, trying alternative selectors`);
        }
      }

      // Take screenshot
      const timestamp = new Date().getTime();
      const filename = `test-${testType}-${timestamp}.png`;
      const screenshotPath = path.join('uploads', 'screenshots', filename);
      
      // Ensure directory exists
      const screenshotDir = path.dirname(screenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      return {
        success: true,
        screenshotPath,
        filename,
        formData,
        testType,
        timestamp
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return {
        success: false,
        error: error.message,
        formData,
        testType
      };
    }
  }

  async captureTestingScenarios() {
    const scenarios = [
      {
        name: 'Customer Creation - Valid Data',
        url: 'http://localhost:5173/finance/customers',
        data: {
          name: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '+1-555-123-4567',
          address: '123 Business Ave, Suite 100'
        },
        type: 'positive' as const
      },
      {
        name: 'Customer Creation - Invalid Email',
        url: 'http://localhost:5173/finance/customers',
        data: {
          name: 'Test Corp',
          email: 'invalid-email-format',
          phone: '+1-555-999-0000'
        },
        type: 'negative' as const
      },
      {
        name: 'Invoice Creation - Valid Data',
        url: 'http://localhost:5173/finance/invoices',
        data: {
          customer: 'Acme Corp',
          amount: '1500.00',
          dueDate: '2024-07-15',
          items: 'Software License (1x)'
        },
        type: 'positive' as const
      },
      {
        name: 'Product Form - Negative Price',
        url: 'http://localhost:5173/inventory/products',
        data: {
          name: 'Test Product',
          price: '-50.00',
          sku: '',
          category: ''
        },
        type: 'negative' as const
      },
      {
        name: 'SQL Injection Test',
        url: 'http://localhost:5173/finance/customers',
        data: {
          name: "Robert'; DROP TABLE customers; --",
          email: 'hacker@malicious.com',
          phone: '+1-555-HACK-123'
        },
        type: 'negative' as const
      }
    ];

    const results = [];
    
    for (const scenario of scenarios) {
      console.log(`Capturing screenshot for: ${scenario.name}`);
      const result = await this.captureFormScreenshot(scenario.url, scenario.data, scenario.type);
      results.push({
        scenario: scenario.name,
        ...result
      });
      
      // Wait between screenshots
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export const screenshotService = new ScreenshotService();