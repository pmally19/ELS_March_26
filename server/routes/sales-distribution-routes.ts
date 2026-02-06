import { Router } from "express";
import { salesDistributionService } from "../services/sales-distribution-service";
import { Request, Response } from "express";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = Router();

// Enterprise Structure Routes

// Sales Organizations
router.get("/sales-organizations", async (req: Request, res: Response) => {
  try {
    const salesOrgs = await salesDistributionService.getAllSalesOrganizations();
    res.json(salesOrgs);
  } catch (error) {
    console.error("Error fetching sales organizations:", error);
    res.status(500).json({ message: "Failed to fetch sales organizations" });
  }
});

router.post("/sales-organizations", async (req: Request, res: Response) => {
  try {
    const { code, name, companyCode, currency, address } = req.body;
    const salesOrg = await salesDistributionService.createSalesOrganization({
      code,
      name,
      companyCode,
      currency,
      address
    });
    res.status(201).json(salesOrg);
  } catch (error) {
    console.error("Error creating sales organization:", error);
    res.status(500).json({ message: "Failed to create sales organization" });
  }
});

// Distribution Channels
router.get("/distribution-channels", async (req: Request, res: Response) => {
  try {
    const channels = await salesDistributionService.getAllDistributionChannels();
    res.json(channels);
  } catch (error) {
    console.error("Error fetching distribution channels:", error);
    res.status(500).json({ message: "Failed to fetch distribution channels" });
  }
});

router.post("/distribution-channels", async (req: Request, res: Response) => {
  try {
    const { code, name, description } = req.body;
    const channel = await salesDistributionService.createDistributionChannel({
      code,
      name,
      description
    });
    res.status(201).json(channel);
  } catch (error) {
    console.error("Error creating distribution channel:", error);
    res.status(500).json({ message: "Failed to create distribution channel" });
  }
});

// Divisions
router.get("/divisions", async (req: Request, res: Response) => {
  try {
    const divisions = await salesDistributionService.getAllDivisions();
    res.json(divisions);
  } catch (error) {
    console.error("Error fetching divisions:", error);
    res.status(500).json({ message: "Failed to fetch divisions" });
  }
});

router.post("/divisions", async (req: Request, res: Response) => {
  try {
    const { code, name, description } = req.body;
    const division = await salesDistributionService.createDivision({
      code,
      name,
      description
    });
    res.status(201).json(division);
  } catch (error) {
    console.error("Error creating division:", error);
    res.status(500).json({ message: "Failed to create division" });
  }
});

// Sales Offices
router.post("/sales-offices", async (req: Request, res: Response) => {
  try {
    const { code, name, description, region, country } = req.body;
    const office = await salesDistributionService.createSalesOffice({
      code,
      name,
      description,
      region,
      country
    });
    res.status(201).json(office);
  } catch (error) {
    console.error("Error creating sales office:", error);
    res.status(500).json({ message: "Failed to create sales office" });
  }
});

router.get("/sales-offices", async (req: Request, res: Response) => {
  try {
    const offices = await salesDistributionService.getAllSalesOffices();
    res.json(offices);
  } catch (error) {
    console.error("Error fetching sales offices:", error);
    res.status(500).json({ message: "Failed to fetch sales offices" });
  }
});

router.put("/sales-offices/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await salesDistributionService.updateSalesOffice(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating sales office:", error);
    res.status(500).json({ message: "Failed to update sales office" });
  }
});

router.delete("/sales-offices/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await salesDistributionService.deleteSalesOffice(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting sales office:", error);
    res.status(500).json({ message: "Failed to delete sales office" });
  }
});

router.post("/sales-offices/bulk-import", async (req: Request, res: Response) => {
  try {
    const { offices } = req.body;
    if (!offices || !Array.isArray(offices)) {
      return res.status(400).json({ message: "Invalid request body. 'offices' array is required." });
    }
    const results = await salesDistributionService.bulkImportSalesOffices(offices);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error bulk importing sales offices:", error);
    res.status(500).json({ message: "Failed to import sales offices" });
  }
});

// Shipping Points
router.get("/shipping-points", async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sd_shipping_points ORDER BY code');
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching shipping points:", error);
    res.status(500).json({ message: "Failed to fetch shipping points" });
  }
});

router.post("/shipping-points", async (req: Request, res: Response) => {
  try {
    const { code, name, plantCode, factoryCalendar } = req.body;
    const shippingPoint = await salesDistributionService.createShippingPoint({
      code,
      name,
      plantCode,
      factoryCalendar
    });
    res.status(201).json(shippingPoint);
  } catch (error) {
    console.error("Error creating shipping point:", error);
    res.status(500).json({ message: "Failed to create shipping point" });
  }
});

// Sales Areas
router.get("/sales-areas", async (req: Request, res: Response) => {
  try {
    const salesAreas = await salesDistributionService.getAllSalesAreas();
    res.json(salesAreas);
  } catch (error) {
    console.error("Error fetching sales areas:", error);
    res.status(500).json({ message: "Failed to fetch sales areas" });
  }
});

router.post("/sales-areas", async (req: Request, res: Response) => {
  try {
    const { salesOrgCode, distributionChannelCode, divisionCode, name } = req.body;

    // Validate configuration first
    const validation = await salesDistributionService.validateSalesAreaConfiguration(
      salesOrgCode,
      distributionChannelCode,
      divisionCode
    );

    if (!validation.isValid) {
      return res.status(400).json({
        message: "Invalid sales area configuration",
        errors: validation.errors
      });
    }

    const salesArea = await salesDistributionService.createSalesArea({
      salesOrgCode,
      distributionChannelCode,
      divisionCode,
      name
    });
    res.status(201).json(salesArea);
  } catch (error) {
    console.error("Error creating sales area:", error);
    res.status(500).json({ message: "Failed to create sales area" });
  }
});

router.get("/sales-areas/validate", async (req: Request, res: Response) => {
  try {
    const { salesOrgCode, distributionChannelCode, divisionCode } = req.query;

    if (!salesOrgCode || !distributionChannelCode || !divisionCode) {
      return res.status(400).json({
        message: "Missing required parameters: salesOrgCode, distributionChannelCode, divisionCode"
      });
    }

    const validation = await salesDistributionService.validateSalesAreaConfiguration(
      salesOrgCode as string,
      distributionChannelCode as string,
      divisionCode as string
    );

    res.json(validation);
  } catch (error) {
    console.error("Error validating sales area:", error);
    res.status(500).json({ message: "Failed to validate sales area" });
  }
});

// Sales Office Assignments
router.post("/sales-office-assignments", async (req: Request, res: Response) => {
  try {
    const { salesOfficeCode, salesAreaId } = req.body;
    const assignment = await salesDistributionService.assignSalesOfficeToSalesArea(
      salesOfficeCode,
      salesAreaId
    );
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating sales office assignment:", error);
    res.status(500).json({ message: "Failed to create sales office assignment" });
  }
});

router.get("/sales-office-assignments/:salesAreaId", async (req: Request, res: Response) => {
  try {
    const salesAreaId = parseInt(req.params.salesAreaId);
    const assignments = await salesDistributionService.getSalesOfficeAssignments(salesAreaId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching sales office assignments:", error);
    res.status(500).json({ message: "Failed to fetch sales office assignments" });
  }
});

router.delete("/sales-office-assignments/:salesAreaId/:salesOfficeCode", async (req: Request, res: Response) => {
  try {
    const salesAreaId = parseInt(req.params.salesAreaId);
    const salesOfficeCode = req.params.salesOfficeCode;
    await salesDistributionService.deleteSalesOfficeAssignment(salesAreaId, salesOfficeCode);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting sales office assignment:", error);
    res.status(500).json({ message: "Failed to delete sales office assignment" });
  }
});

// Document Configuration Routes

// Document Types
router.get("/document-types", async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const docTypes = await salesDistributionService.getAllDocumentTypes(category as string);

    // Filter out any document types with empty or null codes
    const validDocTypes = (Array.isArray(docTypes) ? docTypes : []).filter(
      (dt: any) => dt && dt.code && dt.code.trim() !== '' && dt.isActive !== false
    );

    res.json(validDocTypes);
  } catch (error) {
    console.error("Error fetching document types:", error);
    res.status(500).json({ message: "Failed to fetch document types" });
  }
});

router.post("/document-types", async (req: Request, res: Response) => {
  try {
    const { code, name, category, numberRange, documentFlow } = req.body;
    const docType = await salesDistributionService.createDocumentType({
      code,
      name,
      category,
      numberRange,
      documentFlow
    });
    res.status(201).json(docType);
  } catch (error) {
    console.error("Error creating document type:", error);
    res.status(500).json({ message: "Failed to create document type" });
  }
});

// Item Categories
router.post("/item-categories", async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      documentCategory,
      itemType,
      deliveryRelevant,
      billingRelevant,
      pricingRelevant
    } = req.body;

    const itemCategory = await salesDistributionService.createItemCategory({
      code,
      name,
      documentCategory,
      itemType,
      deliveryRelevant,
      billingRelevant,
      pricingRelevant
    });
    res.status(201).json(itemCategory);
  } catch (error) {
    console.error("Error creating item category:", error);
    res.status(500).json({ message: "Failed to create item category" });
  }
});

// Pricing Configuration Routes

// Condition Types
router.get("/condition-types", async (req: Request, res: Response) => {
  try {
    // Query the condition_types table
    const result = await pool.query(`
      SELECT id, condition_code as code, condition_name as name, 
             calculation_type as "calculationType",
             is_active
      FROM condition_types
      WHERE is_active = true
      ORDER BY condition_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching condition types:", error);
    res.status(500).json({ message: "Failed to fetch condition types" });
  }
});

// Pricing Procedures
router.get("/pricing-procedures", async (req: Request, res: Response) => {
  try {
    const procedures = await salesDistributionService.getAllPricingProcedures();
    res.json(procedures);
  } catch (error) {
    console.error("Error fetching pricing procedures:", error);
    res.status(500).json({ message: "Failed to fetch pricing procedures" });
  }
});

router.post("/pricing-procedures", async (req: Request, res: Response) => {
  try {
    const { code, name, steps } = req.body;
    const procedure = await salesDistributionService.createPricingProcedure({
      code,
      name,
      steps
    });
    res.status(201).json(procedure);
  } catch (error) {
    console.error("Error creating pricing procedure:", error);
    res.status(500).json({ message: "Failed to create pricing procedure" });
  }
});

// Shipping Conditions
router.get("/shipping-conditions", async (req: Request, res: Response) => {
  try {
    const conditions = await salesDistributionService.getAllShippingConditions();
    res.json(conditions);
  } catch (error) {
    console.error("Error fetching shipping conditions:", error);
    res.status(500).json({ message: "Failed to fetch shipping conditions" });
  }
});

router.post("/shipping-conditions", async (req: Request, res: Response) => {
  try {
    console.log("Creating shipping condition with data:", req.body);
    const condition = await salesDistributionService.createShippingCondition(req.body);
    res.status(201).json(condition);
  } catch (error) {
    console.error("Error creating shipping condition:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });
    res.status(500).json({
      message: "Failed to create shipping condition",
      error: error.message,
      details: error.detail || error.constraint
    });
  }
});

router.get("/shipping-conditions/propose", async (req: Request, res: Response) => {
  try {
    const { documentTypeCode } = req.query as { documentTypeCode?: string };
    const proposal = await salesDistributionService.proposeShippingCondition({ documentTypeCode });
    res.json(proposal);
  } catch (error) {
    console.error("Error proposing shipping condition:", error);
    res.status(500).json({ message: "Failed to propose shipping condition" });
  }
});

router.patch("/shipping-conditions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await salesDistributionService.updateShippingCondition(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating shipping condition:", error);
    res.status(500).json({ message: "Failed to update shipping condition" });
  }
});

router.delete("/shipping-conditions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await salesDistributionService.deleteShippingCondition(id);
    res.json(deleted || { success: true });
  } catch (error) {
    console.error("Error deleting shipping condition:", error);
    res.status(500).json({ message: "Failed to delete shipping condition" });
  }
});

router.post("/shipping-conditions/seed-basic", async (_req: Request, res: Response) => {
  try {
    const seeds = [
      {
        conditionCode: 'STND',
        description: 'Standard Shipping',
        loadingGroup: '0001',
        plantCode: '1001',
        proposedShippingPoint: 'SP01',
        manualShippingPointAllowed: true,
        countryOfDeparture: 'US',
        transportationGroup: '0001',
        countryOfDestination: 'US',
        proposedRoute: 'R001',
        isActive: true,
      },
      {
        conditionCode: 'EXPR',
        description: 'Express Shipping',
        loadingGroup: '0002',
        plantCode: '1001',
        proposedShippingPoint: 'SP02',
        manualShippingPointAllowed: true,
        countryOfDeparture: 'US',
        transportationGroup: '0002',
        countryOfDestination: 'US',
        proposedRoute: 'R002',
        isActive: true,
      },
      {
        conditionCode: 'PICK',
        description: 'Customer Pickup',
        loadingGroup: '0003',
        plantCode: '1001',
        proposedShippingPoint: 'SPPU',
        manualShippingPointAllowed: true,
        countryOfDeparture: 'US',
        transportationGroup: '0003',
        countryOfDestination: 'US',
        proposedRoute: 'R003',
        isActive: true,
      },
    ];
    const created: any[] = [];
    for (const s of seeds) {
      try {
        const c = await salesDistributionService.createShippingCondition(s);
        created.push(c);
      } catch (_e) {
        // ignore duplicates
      }
    }
    res.status(201).json({ count: created.length, data: created });
  } catch (error) {
    console.error("Error seeding shipping conditions:", error);
    res.status(500).json({ message: "Failed to seed shipping conditions" });
  }
});

// Number Range Management Routes

router.post("/number-range-objects", async (req: Request, res: Response) => {
  try {
    const { objectCode, name, description } = req.body;
    const object = await salesDistributionService.createNumberRangeObject({
      objectCode,
      name,
      description
    });
    res.status(201).json(object);
  } catch (error) {
    console.error("Error creating number range object:", error);
    res.status(500).json({ message: "Failed to create number range object" });
  }
});

router.post("/number-ranges", async (req: Request, res: Response) => {
  try {
    const { rangeNumber, objectCode, fromNumber, toNumber, currentNumber, external } = req.body;
    const range = await salesDistributionService.createNumberRange({
      rangeNumber,
      objectCode,
      fromNumber,
      toNumber,
      currentNumber,
      external
    });
    res.status(201).json(range);
  } catch (error) {
    console.error("Error creating number range:", error);
    res.status(500).json({ message: "Failed to create number range" });
  }
});

router.get("/number-ranges/:objectCode/:rangeNumber/next", async (req: Request, res: Response) => {
  try {
    const { objectCode, rangeNumber } = req.params;
    const nextNumber = await salesDistributionService.getNextNumber(objectCode, rangeNumber);
    res.json({ nextNumber });
  } catch (error) {
    console.error("Error getting next number:", error);
    res.status(500).json({ message: "Failed to get next number" });
  }
});

// Copy Control Routes

router.post("/copy-control-headers", async (req: Request, res: Response) => {
  try {
    const { sourceDocType, targetDocType, copyRequirements, dataTransfer } = req.body;
    const control = await salesDistributionService.createCopyControlHeader({
      sourceDocType,
      targetDocType,
      copyRequirements,
      dataTransfer
    });
    res.status(201).json(control);
  } catch (error) {
    console.error("Error creating copy control header:", error);
    res.status(500).json({ message: "Failed to create copy control header" });
  }
});

router.post("/copy-control-items", async (req: Request, res: Response) => {
  try {
    const {
      sourceDocType,
      sourceItemCategory,
      targetDocType,
      targetItemCategory,
      copyRequirements,
      dataTransfer
    } = req.body;

    const control = await salesDistributionService.createCopyControlItem({
      sourceDocType,
      sourceItemCategory,
      targetDocType,
      targetItemCategory,
      copyRequirements,
      dataTransfer
    });
    res.status(201).json(control);
  } catch (error) {
    console.error("Error creating copy control item:", error);
    res.status(500).json({ message: "Failed to create copy control item" });
  }
});

// System Configuration Routes

router.post("/initialize-basic-config", async (req: Request, res: Response) => {
  try {
    const result = await salesDistributionService.initializeBasicConfiguration();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error initializing basic configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize basic configuration",
      error: error.message
    });
  }
});

// Configuration Status and Health Check
router.get("/config-status", async (req: Request, res: Response) => {
  try {
    const salesOrgs = await salesDistributionService.getAllSalesOrganizations();
    const channels = await salesDistributionService.getAllDistributionChannels();
    const divisions = await salesDistributionService.getAllDivisions();
    const salesAreas = await salesDistributionService.getAllSalesAreas();
    const docTypes = await salesDistributionService.getAllDocumentTypes();
    const conditionTypes = await salesDistributionService.getAllConditionTypes();
    const procedures = await salesDistributionService.getAllPricingProcedures();

    const status = {
      salesOrganizations: salesOrgs.length,
      distributionChannels: channels.length,
      divisions: divisions.length,
      salesAreas: salesAreas.length,
      documentTypes: docTypes.length,
      conditionTypes: conditionTypes.length,
      pricingProcedures: procedures.length,
      configurationHealth: {
        enterpriseStructure: salesOrgs.length > 0 && channels.length > 0 && divisions.length > 0,
        salesAreas: salesAreas.length > 0,
        documentConfig: docTypes.length > 0,
        pricingConfig: conditionTypes.length > 0 && procedures.length > 0
      }
    };

    res.json(status);
  } catch (error) {
    console.error("Error fetching configuration status:", error);
    res.status(500).json({ message: "Failed to fetch configuration status" });
  }
});

// Incoterms Management Routes

// Get all incoterms
router.get("/incoterms", async (req: Request, res: Response) => {
  try {
    const incotermsList = await salesDistributionService.getAllIncoterms();
    res.json(incotermsList);
  } catch (error) {
    console.error("Error fetching incoterms:", error);
    res.status(500).json({ message: "Failed to fetch incoterms" });
  }
});

// Create new incoterms
router.post("/incoterms", async (req: Request, res: Response) => {
  try {
    const {
      incotermsKey,
      description,
      category,
      applicableVersion,
      riskTransferPoint,
      costResponsibility,
      applicableTransport,
      isActive
    } = req.body;

    if (!incotermsKey || !description || !category) {
      return res.status(400).json({
        message: "Incoterms key, description, and category are required"
      });
    }

    const incoterms = await salesDistributionService.createIncoterms({
      incotermsKey,
      description,
      category,
      applicableVersion: applicableVersion || "2020",
      riskTransferPoint,
      costResponsibility,
      applicableTransport: applicableTransport || "MULTIMODAL",
      isActive: isActive !== false
    });

    res.status(201).json(incoterms);
  } catch (error) {
    console.error("Error creating incoterms:", error);
    res.status(500).json({ message: "Failed to create incoterms" });
  }
});

// Get incoterms by category
router.get("/incoterms/category/:category", async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const incotermsList = await salesDistributionService.getIncotermsByCategory(category);
    res.json(incotermsList);
  } catch (error) {
    console.error("Error fetching incoterms by category:", error);
    res.status(500).json({ message: "Failed to fetch incoterms by category" });
  }
});

// Get incoterms by category and subcategory (e.g., Sea/Inland Waterway)
router.get("/incoterms/category/:category/:subcategory", async (req: Request, res: Response) => {
  try {
    const { category, subcategory } = req.params;
    const incotermsList = await salesDistributionService.getIncotermsByCategoryAndSubcategory(category, subcategory);
    res.json(incotermsList);
  } catch (error) {
    console.error("Error fetching incoterms by category and subcategory:", error);
    res.status(500).json({ message: "Failed to fetch incoterms by category and subcategory" });
  }
});

// Get customer incoterms defaults
router.get("/incoterms/customer/:customerId/defaults", async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const defaults = await salesDistributionService.getCustomerIncotermsDefaults(customerId);
    res.json(defaults);
  } catch (error) {
    console.error("Error fetching customer incoterms defaults:", error);
    res.status(500).json({ message: "Failed to fetch customer incoterms defaults" });
  }
});

// Get all customer incoterms defaults
router.get("/incoterms/all-customer-defaults", async (req: Request, res: Response) => {
  try {
    const defaults = await salesDistributionService.getAllCustomerIncotermsDefaults();
    res.json(defaults);
  } catch (error) {
    console.error("Error fetching all customer incoterms defaults:", error);
    res.status(500).json({ message: "Failed to fetch all customer incoterms defaults" });
  }
});

// Set customer incoterms defaults
router.post("/incoterms/customer/:customerId/defaults", async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { incotermsKey, incotermsLocation } = req.body;

    if (!incotermsKey || !incotermsLocation) {
      return res.status(400).json({ message: "Incoterms key and location are required" });
    }

    const result = await salesDistributionService.setCustomerIncotermsDefaults(customerId, incotermsKey, incotermsLocation);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error setting customer incoterms defaults:", error);
    res.status(500).json({ message: "Failed to set customer incoterms defaults" });
  }
});

// Propose incoterms for customer
router.get("/incoterms/customer/:customerId/propose", async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const proposal = await salesDistributionService.proposeIncotermsForCustomer(customerId);
    res.json(proposal);
  } catch (error) {
    console.error("Error proposing incoterms for customer:", error);
    res.status(500).json({ message: "Failed to propose incoterms for customer" });
  }
});

// Get sales order incoterms
router.get("/incoterms/sales-order/:salesOrderId", async (req: Request, res: Response) => {
  try {
    const salesOrderId = parseInt(req.params.salesOrderId);
    const orderIncoterms = await salesDistributionService.getSalesOrderIncoterms(salesOrderId);
    res.json(orderIncoterms);
  } catch (error) {
    console.error("Error fetching sales order incoterms:", error);
    res.status(500).json({ message: "Failed to fetch sales order incoterms" });
  }
});

// Set sales order incoterms
router.post("/incoterms/sales-order/:salesOrderId", async (req: Request, res: Response) => {
  try {
    const salesOrderId = parseInt(req.params.salesOrderId);
    const { incotermsKey, incotermsLocation, isDefaulted = false, isUserOverride = false } = req.body;

    if (!incotermsKey || !incotermsLocation) {
      return res.status(400).json({ message: "Incoterms key and location are required" });
    }

    const result = await salesDistributionService.setSalesOrderIncoterms(
      salesOrderId,
      incotermsKey,
      incotermsLocation,
      isDefaulted,
      isUserOverride
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Error setting sales order incoterms:", error);
    res.status(500).json({ message: "Failed to set sales order incoterms" });
  }
});

export default router;