/**
 * Sales Distribution Customization Service
 * Handles dynamic table creation for customer-specific SD configurations
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export interface CustomizationRequest {
  clientId: string;
  configType: 'sales_org' | 'distribution_channel' | 'division' | 'document_type' | 'pricing_procedure';
  tablePrefix?: string;
  createSeparateTables?: boolean;
}

export class SDCustomizationService {
  
  /**
   * Create customer-specific Sales Distribution tables
   */
  async createCustomerTables(clientId: string, tablePrefix?: string): Promise<void> {
    const prefix = tablePrefix || `client_${clientId}_sd`;
    
    // Create customer-specific organizational tables
    await this.createCustomSalesOrgTable(prefix);
    await this.createCustomDistributionChannelTable(prefix);
    await this.createCustomDivisionTable(prefix);
    await this.createCustomSalesAreaTable(prefix);
    
    // Create customer-specific configuration tables
    await this.createCustomDocumentTypeTable(prefix);
    await this.createCustomConditionTypeTable(prefix);
    await this.createCustomPricingProcedureTable(prefix);
    
    // Log customization
    await this.logCustomization(clientId, prefix);
  }

  /**
   * Create customer-specific sales organization table
   */
  private async createCustomSalesOrgTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_sales_organizations`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        company_code_id INTEGER,
        currency VARCHAR(3) NOT NULL,
        region VARCHAR(50),
        distribution_channel VARCHAR(50),
        industry VARCHAR(50),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        country VARCHAR(50),
        postal_code VARCHAR(20),
        phone VARCHAR(30),
        email VARCHAR(100),
        manager VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by INTEGER,
        version INTEGER DEFAULT 1,
        active BOOLEAN DEFAULT true,
        custom_fields JSONB
      )
    `);
  }

  /**
   * Create customer-specific distribution channel table
   */
  private async createCustomDistributionChannelTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_distribution_channels`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        code VARCHAR(5) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        custom_fields JSONB
      )
    `);
  }

  /**
   * Create customer-specific division table
   */
  private async createCustomDivisionTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_divisions`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        code VARCHAR(5) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        custom_fields JSONB
      )
    `);
  }

  /**
   * Create customer-specific sales area table
   */
  private async createCustomSalesAreaTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_sales_areas`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        sales_org_code VARCHAR(20) NOT NULL,
        distribution_channel_code VARCHAR(5) NOT NULL,
        division_code VARCHAR(5) NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        custom_fields JSONB
      )
    `);
  }

  /**
   * Create customer-specific document type table
   */
  private async createCustomDocumentTypeTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_document_types`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(10) NOT NULL,
        number_range VARCHAR(2),
        document_flow JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        custom_fields JSONB
      )
    `);
  }

  /**
   * Create customer-specific condition type table
   */
  private async createCustomConditionTypeTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_condition_types`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        condition_class VARCHAR(1) NOT NULL,
        calculation_type VARCHAR(1) NOT NULL,
        access_sequence VARCHAR(10),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        custom_fields JSONB
      )
    `);
  }

  /**
   * Create customer-specific pricing procedure table
   */
  private async createCustomPricingProcedureTable(prefix: string): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(`${prefix}_pricing_procedures`)} (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        code VARCHAR(6) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        steps JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        custom_fields JSONB
      )
    `);
  }

  /**
   * Log customization activity
   */
  private async logCustomization(clientId: string, prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO sd_customization_log (
        client_id, 
        table_prefix, 
        customization_type, 
        status, 
        created_at
      ) VALUES (
        ${clientId}, 
        ${prefix}, 
        'table_creation', 
        'completed', 
        NOW()
      )
    `);
  }

  /**
   * Copy standard configuration to customer tables
   */
  async copyStandardToCustomer(clientId: string, configTypes: string[]): Promise<void> {
    const prefix = `client_${clientId}_sd`;
    
    for (const configType of configTypes) {
      switch (configType) {
        case 'sales_organizations':
          await this.copyStandardSalesOrgs(prefix);
          break;
        case 'distribution_channels':
          await this.copyStandardChannels(prefix);
          break;
        case 'divisions':
          await this.copyStandardDivisions(prefix);
          break;
        case 'document_types':
          await this.copyStandardDocumentTypes(prefix);
          break;
        case 'condition_types':
          await this.copyStandardConditionTypes(prefix);
          break;
        case 'pricing_procedures':
          await this.copyStandardPricingProcedures(prefix);
          break;
      }
    }
  }

  /**
   * Copy standard sales organizations to customer table
   */
  private async copyStandardSalesOrgs(prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(`${prefix}_sales_organizations`)} 
      (code, name, description, company_code_id, currency, region, address, city, country, is_active)
      SELECT code, name, description, company_code_id, currency, region, address, city, country, is_active
      FROM sd_sales_organizations
      WHERE is_active = true
    `);
  }

  /**
   * Copy standard distribution channels to customer table
   */
  private async copyStandardChannels(prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(`${prefix}_distribution_channels`)} 
      (code, name, description, is_active)
      SELECT code, name, description, is_active
      FROM sd_distribution_channels
      WHERE is_active = true
    `);
  }

  /**
   * Copy standard divisions to customer table
   */
  private async copyStandardDivisions(prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(`${prefix}_divisions`)} 
      (code, name, description, is_active)
      SELECT code, name, description, is_active
      FROM sd_divisions
      WHERE is_active = true
    `);
  }

  /**
   * Copy standard document types to customer table
   */
  private async copyStandardDocumentTypes(prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(`${prefix}_document_types`)} 
      (code, name, category, number_range, document_flow, is_active)
      SELECT code, name, category, number_range, document_flow, is_active
      FROM sd_document_types
      WHERE is_active = true
    `);
  }

  /**
   * Copy standard condition types to customer table
   */
  private async copyStandardConditionTypes(prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(`${prefix}_condition_types`)} 
      (code, name, condition_class, calculation_type, access_sequence, is_active)
      SELECT code, name, condition_class, calculation_type, access_sequence, is_active
      FROM sd_condition_types
      WHERE is_active = true
    `);
  }

  /**
   * Copy standard pricing procedures to customer table
   */
  private async copyStandardPricingProcedures(prefix: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(`${prefix}_pricing_procedures`)} 
      (code, name, description, steps, is_active)
      SELECT code, name, description, steps, is_active
      FROM sd_pricing_procedures
      WHERE is_active = true
    `);
  }

  /**
   * Check if customer has customized tables
   */
  async hasCustomTables(clientId: string): Promise<boolean> {
    const prefix = `client_${clientId}_sd`;
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${`${prefix}_sales_organizations`}
      ) as exists
    `);
    return result[0]?.exists || false;
  }

  /**
   * Get customer table prefix
   */
  getCustomerPrefix(clientId: string): string {
    return `client_${clientId}_sd`;
  }

  /**
   * Route to appropriate tables (standard vs custom)
   */
  getTableName(baseTable: string, clientId?: string): string {
    if (clientId && this.hasCustomTables(clientId)) {
      return `${this.getCustomerPrefix(clientId)}_${baseTable}`;
    }
    return `sd_${baseTable}`;
  }
}

export const sdCustomizationService = new SDCustomizationService();