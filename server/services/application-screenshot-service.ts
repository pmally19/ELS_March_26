/**
 * Application Screenshot Service
 * Captures actual application interface screenshots showing human data entry workflows
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export class ApplicationScreenshotService {
  private browser: any = null;
  private baseUrl = 'http://localhost:5000';

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    }
  }

  async captureDataEntryWorkflows() {
    await this.initialize();
    const screenshots = [];

    try {
      // 1. Main Dashboard
      const dashboardScreenshot = await this.captureMainDashboard();
      screenshots.push(dashboardScreenshot);

      // 2. Customer Management Interface
      const customerScreenshot = await this.captureCustomerEntry();
      screenshots.push(customerScreenshot);

      // 3. Master Data Overview
      const masterDataScreenshot = await this.captureMasterDataInterface();
      screenshots.push(masterDataScreenshot);

      // 4. Transaction Interface
      const transactionScreenshot = await this.captureTransactionInterface();
      screenshots.push(transactionScreenshot);

      return {
        success: true,
        screenshots,
        message: 'Real application interface screenshots captured successfully'
      };

    } catch (error) {
      console.error('Screenshot capture error:', error);
      return {
        success: false,
        error: error.message,
        screenshots: []
      };
    }
  }

  async captureCustomerEntry() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      // Navigate to the actual Customer Management page
      await page.goto(`${this.baseUrl}/customer-management`, { waitUntil: 'networkidle0' });
      
      // Wait for page to load and take initial screenshot
      await page.waitForTimeout(2000);
      
      // Take screenshot of the actual customer management interface
      const screenshotPath = `uploads/screenshots/real-customer-interface-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      await page.close();

      return {
        type: 'customer-management',
        path: screenshotPath,
        title: 'Real Customer Management Interface',
        description: 'Actual Customer Management page showing Acme Corporation details and interface layout'
      };

    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async captureMasterDataInterface() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(`${this.baseUrl}/master-data`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);
      
      const screenshotPath = `uploads/screenshots/real-master-data-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      await page.close();

      return {
        type: 'master-data',
        path: screenshotPath,
        title: 'Master Data Management Interface',
        description: 'Real Master Data interface showing all master data categories and navigation'
      };

    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async captureTransactionInterface() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(`${this.baseUrl}/transactions`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);
      
      const screenshotPath = `uploads/screenshots/real-transactions-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      await page.close();

      return {
        type: 'transactions',
        path: screenshotPath,
        title: 'Transaction Management Interface',
        description: 'Real Transaction interface showing financial and business transactions'
      };

    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async captureFinancialEntry() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      // Navigate to financial transactions page
      await page.goto(`${this.baseUrl}/journal-entries`, { waitUntil: 'networkidle0' });
      
      // Fill out journal entry form
      await page.waitForSelector('input[name="description"]', { timeout: 5000 });
      await page.type('input[name="description"]', 'Pizza Sales Revenue Entry');
      
      if (await page.$('select[name="account"]')) {
        await page.select('select[name="account"]', 'revenue');
      }

      if (await page.$('input[name="debit"]')) {
        await page.type('input[name="debit"]', '159.90');
      }

      if (await page.$('input[name="credit"]')) {
        await page.type('input[name="credit"]', '159.90');
      }

      // Take screenshot
      const screenshotPath = `uploads/screenshots/app-financial-entry-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      await page.close();

      return {
        type: 'financial-entry',
        path: screenshotPath,
        title: 'Financial Transaction Entry Interface',
        description: 'Shows how users enter financial transactions through the application interface'
      };

    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async captureMainDashboard() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(`${this.baseUrl}/`, { waitUntil: 'networkidle0' });
      
      const screenshotPath = `uploads/screenshots/app-dashboard-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      await page.close();

      return {
        type: 'dashboard',
        path: screenshotPath,
        title: 'Main Application Dashboard',
        description: 'Shows the main dashboard interface where users navigate the application'
      };

    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const applicationScreenshotService = new ApplicationScreenshotService();