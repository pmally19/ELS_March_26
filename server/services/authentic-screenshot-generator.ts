/**
 * Authentic Screenshot Generator for Dominos E2E Test Results
 * Generates real screenshots with actual business data instead of placeholders
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export class AuthenticScreenshotGenerator {
  private browser: any = null;
  private page: any = null;
  private screenshotDir = path.join(process.cwd(), 'uploads', 'screenshots', 'dominos-e2e');

  async initialize() {
    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }

      // Use system Chromium browser
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-security']
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      console.log('Authentic Screenshot Generator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Authentic Screenshot Generator:', error);
      throw error;
    }
  }

  async generateCompanyCodeScreenshot(): Promise<string> {
    try {
      // Navigate to the actual application
      await this.page.goto('http://localhost:5000/company-codes-management');
      await this.page.waitForTimeout(2000);

      // Take screenshot of actual company code page
      const screenshotPath = path.join(this.screenshotDir, `company-code-setup-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate company code screenshot:', error);
      return null;
    }
  }

  async generatePlantConfigurationScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/plants-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `plant-configuration-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate plant configuration screenshot:', error);
      return null;
    }
  }

  async generateSalesOrganizationScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/sales-organizations-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `sales-organization-setup-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate sales organization screenshot:', error);
      return null;
    }
  }

  async generateDistributionChannelsScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/distribution-channels-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `distribution-channels-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate distribution channels screenshot:', error);
      return null;
    }
  }

  async generateDivisionSetupScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/divisions-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `division-setup-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate division setup screenshot:', error);
      return null;
    }
  }

  async generateConditionTypesScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/condition-types-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `condition-types-setup-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate condition types screenshot:', error);
      return null;
    }
  }

  async generateProductMasterDataScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/products-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `product-master-data-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate product master data screenshot:', error);
      return null;
    }
  }

  async generateProductCostingScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/product-costing');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `product-costing-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate product costing screenshot:', error);
      return null;
    }
  }

  async generateDeliveryMethodsScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/shipping-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `delivery-methods-setup-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate delivery methods screenshot:', error);
      return null;
    }
  }

  async generateCustomerMasterDataScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/customers-management');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `customer-master-data-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate customer master data screenshot:', error);
      return null;
    }
  }

  async generateSalesOrderProcessingScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/sales-orders');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `sales-order-processing-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate sales order processing screenshot:', error);
      return null;
    }
  }

  async generateBillingProcessScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/invoices');
      await this.page.waitForTimeout(2000);

      const screenshotPath = path.join(this.screenshotDir, `billing-process-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate billing process screenshot:', error);
      return null;
    }
  }

  async generateEndToEndOrderFlowScreenshot(): Promise<string> {
    try {
      await this.page.goto('http://localhost:5000/test-results');
      await this.page.waitForTimeout(3000);

      const screenshotPath = path.join(this.screenshotDir, `end-to-end-order-flow-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return `/uploads/screenshots/dominos-e2e/${path.basename(screenshotPath)}`;
    } catch (error) {
      console.error('Failed to generate end-to-end order flow screenshot:', error);
      return null;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('Authentic Screenshot Generator cleaned up successfully');
  }
}