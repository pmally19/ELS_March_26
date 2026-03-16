/**
 * Sales Distribution Customization Routes
 * Handles customer-specific SD configuration creation and management
 */

import { Router } from "express";
import { sdCustomizationService } from "../services/sd-customization-service";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * Initialize customer-specific SD tables
 */
router.post("/initialize-customer/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { copyFromStandard = true, configTypes = [] } = req.body;

    // Check if customer already has custom tables
    const hasCustom = await sdCustomizationService.hasCustomTables(clientId);
    if (hasCustom) {
      return res.status(400).json({ 
        message: "Customer already has customized tables",
        clientId 
      });
    }

    // Create customer-specific tables
    await sdCustomizationService.createCustomerTables(clientId);

    // Copy standard configuration if requested
    if (copyFromStandard && configTypes.length > 0) {
      await sdCustomizationService.copyStandardToCustomer(clientId, configTypes);
    }

    // Update client configuration
    await db.execute(sql`
      INSERT INTO sd_client_configurations (client_id, table_prefix, uses_custom_tables, configuration_status)
      VALUES (${clientId}, ${`client_${clientId}_sd`}, true, 'customized')
      ON CONFLICT (client_id) DO UPDATE SET
        uses_custom_tables = true,
        configuration_status = 'customized',
        last_customization_date = NOW(),
        updated_at = NOW()
    `);

    res.json({
      message: "Customer SD tables initialized successfully",
      clientId,
      tablePrefix: `client_${clientId}_sd`,
      copiedConfigurations: copyFromStandard ? configTypes : []
    });

  } catch (error) {
    console.error("Error initializing customer SD tables:", error);
    res.status(500).json({ 
      message: "Failed to initialize customer tables",
      error: error.message 
    });
  }
});

/**
 * Get customer configuration status
 */
router.get("/customer-status/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await db.execute(sql`
      SELECT * FROM sd_client_configurations 
      WHERE client_id = ${clientId}
    `);

    const config = result[0];
    const hasCustomTables = await sdCustomizationService.hasCustomTables(clientId);

    res.json({
      clientId,
      hasCustomTables,
      configuration: config || {
        client_id: clientId,
        uses_custom_tables: false,
        configuration_status: 'standard',
        table_prefix: 'sd'
      }
    });

  } catch (error) {
    console.error("Error checking customer status:", error);
    res.status(500).json({ 
      message: "Failed to check customer status",
      error: error.message 
    });
  }
});

/**
 * Copy specific configuration from standard to customer
 */
router.post("/copy-standard/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { configTypes } = req.body;

    if (!configTypes || !Array.isArray(configTypes)) {
      return res.status(400).json({ 
        message: "configTypes array is required" 
      });
    }

    // Ensure customer has custom tables
    const hasCustom = await sdCustomizationService.hasCustomTables(clientId);
    if (!hasCustom) {
      await sdCustomizationService.createCustomerTables(clientId);
    }

    // Copy configurations
    await sdCustomizationService.copyStandardToCustomer(clientId, configTypes);

    res.json({
      message: "Standard configurations copied successfully",
      clientId,
      copiedConfigurations: configTypes
    });

  } catch (error) {
    console.error("Error copying standard configurations:", error);
    res.status(500).json({ 
      message: "Failed to copy standard configurations",
      error: error.message 
    });
  }
});

/**
 * Get customer-specific data from appropriate tables
 */
router.get("/data/:clientId/:dataType", async (req, res) => {
  try {
    const { clientId, dataType } = req.params;
    
    // Determine which tables to use
    const tableName = sdCustomizationService.getTableName(dataType, clientId);
    
    // Query the appropriate table
    const result = await db.execute(sql`
      SELECT * FROM ${sql.identifier(tableName)} 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `);

    res.json({
      clientId,
      dataType,
      tableName,
      data: result
    });

  } catch (error) {
    console.error("Error fetching customer data:", error);
    res.status(500).json({ 
      message: "Failed to fetch customer data",
      error: error.message 
    });
  }
});

/**
 * Create new entry in customer-specific table
 */
router.post("/data/:clientId/:dataType", async (req, res) => {
  try {
    const { clientId, dataType } = req.params;
    const data = req.body;

    // Get appropriate table name
    const tableName = sdCustomizationService.getTableName(dataType, clientId);
    
    // Build dynamic insert based on data type
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const result = await db.execute(sql`
      INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columns)})
      VALUES (${sql.join(values, sql`, `)})
      RETURNING *
    `);

    res.json({
      message: "Entry created successfully",
      clientId,
      dataType,
      tableName,
      data: result[0]
    });

  } catch (error) {
    console.error("Error creating customer data:", error);
    res.status(500).json({ 
      message: "Failed to create customer data",
      error: error.message 
    });
  }
});

/**
 * Get customization history for a client
 */
router.get("/history/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    const result = await db.execute(sql`
      SELECT * FROM sd_customization_log 
      WHERE client_id = ${clientId}
      ORDER BY timestamp DESC
    `);

    res.json({
      clientId,
      history: result
    });

  } catch (error) {
    console.error("Error fetching customization history:", error);
    res.status(500).json({ 
      message: "Failed to fetch customization history",
      error: error.message 
    });
  }
});

/**
 * List all available data types that can be customized
 */
router.get("/available-types", async (req, res) => {
  try {
    res.json({
      availableTypes: [
        { 
          key: 'sales_organizations',
          name: 'Sales Organizations',
          description: 'Company sales organization structure'
        },
        {
          key: 'distribution_channels',
          name: 'Distribution Channels',
          description: 'Sales distribution channel definitions'
        },
        {
          key: 'divisions',
          name: 'Divisions',
          description: 'Product/business divisions'
        },
        {
          key: 'sales_areas',
          name: 'Sales Areas',
          description: 'Combinations of sales org, channel, and division'
        },
        {
          key: 'document_types',
          name: 'Document Types',
          description: 'Order, delivery, and billing document types'
        },
        {
          key: 'condition_types',
          name: 'Condition Types',
          description: 'Pricing condition types and calculations'
        },
        {
          key: 'pricing_procedures',
          name: 'Pricing Procedures',
          description: 'Pricing calculation procedures'
        }
      ]
    });
  } catch (error) {
    console.error("Error fetching available types:", error);
    res.status(500).json({ 
      message: "Failed to fetch available types",
      error: error.message 
    });
  }
});

export default router;