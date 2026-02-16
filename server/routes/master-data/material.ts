import express from 'express';
import { z } from 'zod';
import { db, pool } from '../../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Validation schema for material
// Note: Using .nullable() and .optional() to handle both undefined and null values
// Also using .or(z.literal('')) to allow empty strings which we'll convert to null
const materialSchema = z.object({
  code: z.string().min(1, "Material code is required").max(20, "Material code must be 20 characters or less"),
  name: z.string().min(1, "Material name is required").max(100, "Material name must be 100 characters or less"),
  type: z.string().min(1, "Material type is required").max(50, "Material type must be 50 characters or less"),
  description: z.string().max(100, "Description must be 100 characters or less").optional().nullable(),
  baseUnit: z.string().min(1, "Base unit of measure is required").max(10, "Base unit must be 10 characters or less"),
  mrpType: z.string().max(2, "MRP type must be 2 characters or less").optional().nullable().or(z.literal('')),
  procurementType: z.string().max(1, "Procurement type must be 1 character (F/E/X)").optional().nullable().or(z.literal('')),
  lotSize: z.string().max(2, "Lot size must be 2 characters or less").optional().nullable().or(z.literal('')),
  reorderPoint: z.coerce.number().min(0, "Reorder point must be non-negative").optional().nullable(),
  safetyStock: z.coerce.number().min(0, "Safety stock must be non-negative").optional().nullable(),
  minStock: z.coerce.number().min(0, "Min stock must be non-negative").optional().nullable(),
  maxStock: z.coerce.number().min(0, "Max stock must be non-negative").optional().nullable(),
  leadTime: z.coerce.number().min(0, "Lead time must be non-negative").optional().nullable(),
  plannedDeliveryTime: z.coerce.number().min(0, "Planned delivery time must be non-negative").optional().nullable(),
  productionTime: z.coerce.number().min(0, "Production time must be non-negative").optional().nullable(),
  mrpController: z.string().max(10, "MRP controller must be 10 characters or less").optional().nullable().or(z.literal('')),
  price: z.coerce.number().min(0, "Price must be non-negative").optional().nullable(),
  weight: z.coerce.number().min(0, "Weight must be non-negative").optional().nullable(),
  grossWeight: z.coerce.number().min(0, "Gross weight must be non-negative").optional().nullable(),
  netWeight: z.coerce.number().min(0, "Net weight must be non-negative").optional().nullable(),
  weightUnit: z.string().max(10, "Weight unit must be 10 characters or less").optional().nullable().or(z.literal('')),
  volume: z.coerce.number().min(0, "Volume must be non-negative").optional().nullable(),
  volumeUnit: z.string().max(10, "Volume unit must be 10 characters or less").optional().nullable().or(z.literal('')),
  valuationClass: z.string().max(10, "Valuation class must be 10 characters or less").optional().nullable().or(z.literal('')),
  industrySector: z.string().max(10, "Industry sector must be 10 characters or less").optional().nullable().or(z.literal('')),
  materialGroup: z.string().max(50, "Material group must be 50 characters or less").optional().nullable().or(z.literal('')),
  priceControl: z.string().max(1, "Price control must be 1 character (S/V)").optional().nullable().or(z.literal('')),
  salesOrganization: z.string().max(10, "Sales organization must be 10 characters or less").optional().nullable().or(z.literal('')),
  distributionChannel: z.string().max(10, "Distribution channel must be 10 characters or less").optional().nullable().or(z.literal('')),
  division: z.string().max(20, "Division must be 20 characters or less").optional().nullable().or(z.literal('')),
  purchasingGroup: z.string().max(10, "Purchasing group must be 10 characters or less").optional().nullable().or(z.literal('')),
  productionStorageLocation: z.string().max(10, "Production storage location must be 10 characters or less").optional().nullable().or(z.literal('')),
  plantCode: z.string().max(4, "Plant code must be 4 characters or less").optional().nullable().or(z.literal('')),
  profitCenter: z.string().max(20, "Profit center must be 20 characters or less").optional().nullable().or(z.literal('')),
  costCenter: z.string().max(20, "Cost center must be 20 characters or less").optional().nullable().or(z.literal('')),
  itemCategoryGroup: z.string().max(4, "Item category group must be 4 characters or less").optional().nullable().or(z.literal('')),
  materialAssignmentGroupCode: z.string().max(4, "Material assignment group must be 4 characters or less").optional().nullable().or(z.literal('')),
  loadingGroup: z.string().max(4, "Loading group must be 4 characters or less").optional().nullable().or(z.literal('')), // New field
  isActive: z.boolean().optional().nullable(),
});

// Get all materials
router.get('/', async (req, res) => {
  try {
    console.log('Fetching materials from database...');

    // Return ALL fields including mrp_type, valuation_class, etc.
    const result = await pool.query(`
      SELECT 
        id,
        code as material_code,
        name as description,
        type as material_type,
        description as long_description,
        base_uom as base_unit,
        base_unit_price as base_price,
        mrp_type,
        procurement_type,
        lot_size,
        reorder_point,
        safety_stock,
        min_stock,
        max_stock,
        lead_time,
        planned_delivery_time,
        production_time,
        mrp_controller,
        gross_weight,
        net_weight,
        weight_unit,
        volume,
        volume_unit,
        valuation_class,
        industry_sector,
        item_category_group,
        material_group,
        material_assignment_group_code,
        loading_group,
        price_control,
        sales_organization,
        distribution_channel,
        division,
        purchase_organization,
        purchasing_group,
        production_storage_location,
        plant_code,
        profit_center,
        cost_center,
        is_active,
        created_at,
        updated_at
      FROM materials 
      WHERE is_active = true
      ORDER BY code
    `);

    console.log('Materials query result:', result.rows.length, 'rows');
    if (result.rows.length > 0) {
      console.log('First material sample:', JSON.stringify(result.rows[0], null, 2));
      console.log('First material - valuation_class:', result.rows[0].valuation_class, 'mrp_type:', result.rows[0].mrp_type, 'division:', result.rows[0].division);
    }

    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get finished products only (for sales orders)
router.get('/finished-products', async (req, res) => {
  try {
    console.log('Fetching finished products from database...');

    // Query for finished products only - include all fields
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        type,
        description,
        base_uom,
        base_unit_price,
        mrp_type,
        gross_weight,
        net_weight,
        weight_unit,
        volume,
        volume_unit,
        valuation_class,
        industry_sector,
        item_category_group,
        material_group,
        division,
        is_active,
        created_at,
        updated_at
      FROM materials 
      WHERE is_active = true 
        AND type IN ('FERT', 'FINISHED_GOOD', 'FER')
      ORDER BY code
    `);

    console.log('Finished products query result:', result.rows.length, 'rows');
    console.log('First finished product sample:', result.rows[0]);

    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching finished products:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get top-selling materials
router.get('/top-selling', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit.toString()) : 5;
    console.log(`Fetching top ${limit} selling materials...`);

    // Query to get top-selling materials based on sales order items
    const result = await pool.query(`
      SELECT 
        m.id,
        m.code,
        m.name,
        m.type,
        m.base_uom,
        m.base_unit_price,
        COALESCE(SUM(soi.ordered_quantity), 0) as total_sold,
        COALESCE(SUM(soi.net_amount), 0) as total_revenue,
        COUNT(DISTINCT soi.sales_order_id) as order_count
      FROM materials m
      LEFT JOIN sales_order_items soi ON m.id = soi.material_id
      LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE m.is_active = true
        AND (so.status IS NULL OR so.status NOT IN ('Cancelled', 'Rejected'))
      GROUP BY m.id, m.code, m.name, m.type, m.base_uom, m.base_unit_price
      ORDER BY total_sold DESC, total_revenue DESC
      LIMIT $1
    `, [limit]);

    console.log('Top-selling materials query result:', result.rows.length, 'rows');
    if (result.rows.length > 0) {
      console.log('Top material:', result.rows[0]);
    }

    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching top-selling materials:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get material by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        code as material_code,
        name as description,
        type as material_type,
        description,
        base_uom as base_unit,
        base_unit_price as base_price,
        mrp_type,
        procurement_type,
        lot_size,
        reorder_point,
        safety_stock,
        min_stock,
        max_stock,
        lead_time,
        planned_delivery_time,
        production_time,
        mrp_controller,
        gross_weight,
        net_weight,
        weight_unit,
        volume,
        volume_unit,
        valuation_class,
        industry_sector,
        item_category_group,
        material_group,
        material_assignment_group_code,
        price_control,
        sales_organization,
        distribution_channel,
        division,
        purchase_organization,
        purchasing_group,
        production_storage_location,
        plant_code,
        profit_center,
        cost_center,
        is_active,
        created_at,
        updated_at
      FROM materials 
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching material:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// CREATE Material
router.post('/', async (req: any, res: any) => {
  console.log('🚀 SERVER RESTART - Fixes Active (Fields + Auto-Inc)');
  console.log('📥 CREATE Material - Raw Request Body:', JSON.stringify(req.body, null, 2));
  console.log('📥 CREATE Material - Content-Type:', req.headers['content-type']);
  console.log('📥 CREATE Material - Request Headers:', JSON.stringify(req.headers, null, 2));

  // Robustness: Manually parse string bodies if express.json() was skipped (e.g. content-type text/plain)
  if (typeof req.body === 'string') {
    try {
      console.log('⚠️ Manual parsing of string body initiated...');
      req.body = JSON.parse(req.body);
      console.log('✅ Manual parsing successful. Body:', JSON.stringify(req.body, null, 2));
    } catch (e) {
      console.error('❌ Failed to manually parse string body:', e);
    }
  }

  // Validate that body is not empty
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      message: "Request body is empty",
      error: "VALIDATION_ERROR"
    });
  }


  const client = await pool.connect();
  try {
    // Debug: Log raw request body
    console.log('📥 CREATE Material - Request Body Keys:', Object.keys(req.body));
    console.log('📥 CREATE Material - Specific fields:', {
      'req.body.mrp_type': req.body.mrp_type,
      'req.body.mrpType': req.body.mrpType,
      'req.body.valuation_class': req.body.valuation_class,
      'req.body.valuationClass': req.body.valuationClass,
      'req.body.material_code': req.body.material_code,
      'req.body.description': req.body.description
    });

    // Transform snake_case to camelCase for validation
    // Handle all fields explicitly - no defaults, no hardcoded values
    const transformedBody = {
      ...req.body,
      code: req.body.code !== undefined ? req.body.code : req.body.material_code,
      name: req.body.name !== undefined ? req.body.name : req.body.description,
      type: req.body.type !== undefined ? req.body.type : req.body.material_type,
      description: req.body.description,
      baseUnit: req.body.baseUnit !== undefined ? req.body.baseUnit : req.body.base_unit,
      mrpType: req.body.mrpType !== undefined ? req.body.mrpType : req.body.mrp_type,
      procurementType: req.body.procurementType !== undefined ? req.body.procurementType : req.body.procurement_type,
      lotSize: req.body.lotSize !== undefined ? req.body.lotSize : req.body.lot_size,
      reorderPoint: req.body.reorderPoint !== undefined ? req.body.reorderPoint : req.body.reorder_point,
      safetyStock: req.body.safetyStock !== undefined ? req.body.safetyStock : req.body.safety_stock,
      minStock: req.body.minStock !== undefined ? req.body.minStock : req.body.min_stock,
      maxStock: req.body.maxStock !== undefined ? req.body.maxStock : req.body.max_stock,
      leadTime: req.body.leadTime !== undefined ? req.body.leadTime : req.body.lead_time,
      plannedDeliveryTime: req.body.plannedDeliveryTime !== undefined ? req.body.plannedDeliveryTime : req.body.planned_delivery_time,
      productionTime: req.body.productionTime !== undefined ? req.body.productionTime : req.body.production_time,
      mrpController: req.body.mrpController !== undefined ? req.body.mrpController : req.body.mrp_controller,
      price: req.body.price !== undefined ? req.body.price : req.body.base_price,
      weight: req.body.weight !== undefined ? req.body.weight : req.body.gross_weight,
      grossWeight: req.body.grossWeight !== undefined ? req.body.grossWeight : req.body.gross_weight,
      netWeight: req.body.netWeight !== undefined ? req.body.netWeight : req.body.net_weight,
      weightUnit: req.body.weightUnit !== undefined ? req.body.weightUnit : req.body.weight_unit,
      volume: req.body.volume,
      volumeUnit: req.body.volumeUnit !== undefined ? req.body.volumeUnit : req.body.volume_unit,
      valuationClass: req.body.valuationClass !== undefined ? req.body.valuationClass : req.body.valuation_class,
      industrySector: req.body.industrySector !== undefined ? req.body.industrySector : req.body.industry_sector,
      materialGroup: req.body.materialGroup !== undefined ? req.body.materialGroup : req.body.material_group,
      priceControl: req.body.priceControl !== undefined ? req.body.priceControl : req.body.price_control,
      salesOrganization: req.body.salesOrganization !== undefined ? req.body.salesOrganization : req.body.sales_organization,
      distributionChannel: req.body.distributionChannel !== undefined ? req.body.distributionChannel : req.body.distribution_channel,
      division: req.body.division !== undefined ? req.body.division : req.body.division,
      purchasingGroup: req.body.purchasingGroup !== undefined ? req.body.purchasingGroup : req.body.purchasing_group,
      purchaseOrganization: req.body.purchaseOrganization !== undefined ? req.body.purchaseOrganization : req.body.purchase_organization,
      productionStorageLocation: req.body.productionStorageLocation !== undefined ? req.body.productionStorageLocation : req.body.production_storage_location,
      plantCode: req.body.plantCode !== undefined ? req.body.plantCode : req.body.plant_code,
      profitCenter: req.body.profitCenter !== undefined ? req.body.profitCenter : req.body.profit_center,
      costCenter: req.body.costCenter !== undefined ? req.body.costCenter : req.body.cost_center,
      itemCategoryGroup: req.body.itemCategoryGroup !== undefined ? req.body.itemCategoryGroup : req.body.item_category_group,
      materialAssignmentGroupCode: req.body.materialAssignmentGroupCode !== undefined ? req.body.materialAssignmentGroupCode : req.body.material_assignment_group_code,
      loadingGroup: req.body.loadingGroup !== undefined ? req.body.loadingGroup : req.body.loading_group,
      isActive: req.body.isActive !== undefined ? req.body.isActive : (req.body.is_active !== undefined ? req.body.is_active : true)
    };

    // Debug: Log transformed body before validation
    console.log('🔍 CREATE Material - Transformed Body:', {
      mrpType: transformedBody.mrpType,
      purchaseOrganization: transformedBody.purchaseOrganization,
      mrpTypeType: typeof transformedBody.mrpType,
      valuationClass: transformedBody.valuationClass,
      valuationClassType: typeof transformedBody.valuationClass,
      hasMrpType: transformedBody.mrpType !== undefined,
      hasValuationClass: transformedBody.valuationClass !== undefined,
      mrpTypeEmpty: transformedBody.mrpType === '',
      valuationClassEmpty: transformedBody.valuationClass === ''
    });

    const validation = materialSchema.safeParse(transformedBody);

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      return res.status(400).json({
        error: "Validation failed",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Debug: Log validated data
    console.log('✅ CREATE Material - Validated Data:', {
      mrpType: data.mrpType,
      mrpTypeType: typeof data.mrpType,
      valuationClass: data.valuationClass,
      valuationClassType: typeof data.valuationClass,
      hasMrpType: data.mrpType !== undefined,
      hasValuationClass: data.valuationClass !== undefined
    });

    // Check if material code already exists
    const existingResult = await db.execute(sql`SELECT id FROM materials WHERE code = ${data.code}`);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Material code already exists" });
    }

    // Validate MRP type if provided
    if (data.mrpType) {
      const mrpTypeCheck = await pool.query(
        'SELECT code FROM mrp_types WHERE code = $1 AND is_active = true',
        [data.mrpType]
      );
      if (mrpTypeCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Validation failed",
          message: `Invalid MRP type: ${data.mrpType}. Must be a valid code from mrp_types table.`
        });
      }
    }

    // Get uom_id from base_uom code (required foreign key)
    // baseUnit is now required by schema validation, so it should always exist
    if (!data.baseUnit) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Base unit of measure is required."
      });
    }

    const uomResult = await pool.query(
      'SELECT id FROM units_of_measure WHERE code = $1 LIMIT 1',
      [data.baseUnit]
    );

    if (uomResult.rows.length === 0) {
      return res.status(400).json({
        error: "Validation failed",
        message: `Invalid base unit: ${data.baseUnit}. Must be a valid code from units_of_measure table.`
      });
    }

    const uomId = uomResult.rows[0].id;

    // Validate material type is provided (now required)
    if (!data.type) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Material type is required."
      });
    }

    // Prepare values for INSERT - handle empty strings and undefined
    // Use validated data first, fall back to transformedBody if not in validated data
    // Use req.body values directly to avoid Zod filtering issues
    const mrpTypeValue = req.body.mrp_type || data.mrpType || transformedBody.mrpType || null;

    // Use req.body values directly to avoid Zod filtering issues  
    const valuationClassValue = req.body.valuation_class || data.valuationClass || transformedBody.valuationClass || null;

    console.log('🔧 INSERT - Prepared values:', {
      'data.mrpType': data.mrpType,
      'transformedBody.mrpType': transformedBody.mrpType,
      mrpTypeValue,
      mrpTypeValueType: typeof mrpTypeValue,
      'data.valuationClass': data.valuationClass,
      'transformedBody.valuationClass': transformedBody.valuationClass,
      valuationClassValue,
      valuationClassValueType: typeof valuationClassValue
    });

    // Prepare MRP field values
    const procurementTypeValue = (data.procurementType !== undefined && data.procurementType !== null && data.procurementType !== '')
      ? data.procurementType
      : ((transformedBody.procurementType !== undefined && transformedBody.procurementType !== null && transformedBody.procurementType !== '')
        ? transformedBody.procurementType
        : null);

    const lotSizeValue = (data.lotSize !== undefined && data.lotSize !== null && data.lotSize !== '')
      ? data.lotSize
      : ((transformedBody.lotSize !== undefined && transformedBody.lotSize !== null && transformedBody.lotSize !== '')
        ? transformedBody.lotSize
        : null);

    const reorderPointValue = (data.reorderPoint !== undefined && data.reorderPoint !== null)
      ? data.reorderPoint
      : ((transformedBody.reorderPoint !== undefined && transformedBody.reorderPoint !== null)
        ? transformedBody.reorderPoint
        : null);

    const safetyStockValue = (data.safetyStock !== undefined && data.safetyStock !== null)
      ? data.safetyStock
      : ((transformedBody.safetyStock !== undefined && transformedBody.safetyStock !== null)
        ? transformedBody.safetyStock
        : null);

    const minStockValue = (data.minStock !== undefined && data.minStock !== null)
      ? data.minStock
      : ((transformedBody.minStock !== undefined && transformedBody.minStock !== null)
        ? transformedBody.minStock
        : null);

    const maxStockValue = (data.maxStock !== undefined && data.maxStock !== null)
      ? data.maxStock
      : ((transformedBody.maxStock !== undefined && transformedBody.maxStock !== null)
        ? transformedBody.maxStock
        : null);

    const leadTimeValue = (data.leadTime !== undefined && data.leadTime !== null)
      ? data.leadTime
      : ((transformedBody.leadTime !== undefined && transformedBody.leadTime !== null)
        ? transformedBody.leadTime
        : null);

    const plannedDeliveryTimeValue = (data.plannedDeliveryTime !== undefined && data.plannedDeliveryTime !== null)
      ? data.plannedDeliveryTime
      : ((transformedBody.plannedDeliveryTime !== undefined && transformedBody.plannedDeliveryTime !== null)
        ? transformedBody.plannedDeliveryTime
        : null);

    const productionTimeValue = (data.productionTime !== undefined && data.productionTime !== null)
      ? data.productionTime
      : ((transformedBody.productionTime !== undefined && transformedBody.productionTime !== null)
        ? transformedBody.productionTime
        : null);

    const mrpControllerValue = (data.mrpController !== undefined && data.mrpController !== null && data.mrpController !== '')
      ? data.mrpController
      : ((transformedBody.mrpController !== undefined && transformedBody.mrpController !== null && transformedBody.mrpController !== '')
        ? transformedBody.mrpController
        : null);

    // Prepare new field values
    const priceControlValue = (data.priceControl !== undefined && data.priceControl !== null && data.priceControl !== '')
      ? data.priceControl
      : ((transformedBody.priceControl !== undefined && transformedBody.priceControl !== null && transformedBody.priceControl !== '')
        ? transformedBody.priceControl
        : null);

    const salesOrganizationValue = (data.salesOrganization !== undefined && data.salesOrganization !== null && data.salesOrganization !== '')
      ? data.salesOrganization
      : ((transformedBody.salesOrganization !== undefined && transformedBody.salesOrganization !== null && transformedBody.salesOrganization !== '')
        ? transformedBody.salesOrganization
        : null);

    const distributionChannelValue = (data.distributionChannel !== undefined && data.distributionChannel !== null && data.distributionChannel !== '')
      ? data.distributionChannel
      : ((transformedBody.distributionChannel !== undefined && transformedBody.distributionChannel !== null && transformedBody.distributionChannel !== '')
        ? transformedBody.distributionChannel
        : null);

    const divisionValue = (data.division !== undefined && data.division !== null && data.division !== '')
      ? data.division
      : ((transformedBody.division !== undefined && transformedBody.division !== null && transformedBody.division !== '')
        ? transformedBody.division
        : null);

    const purchasingGroupValue = (data.purchasingGroup !== undefined && data.purchasingGroup !== null && data.purchasingGroup !== '')
      ? data.purchasingGroup
      : ((transformedBody.purchasingGroup !== undefined && transformedBody.purchasingGroup !== null && transformedBody.purchasingGroup !== '')
        ? transformedBody.purchasingGroup
        : null);

    const purchaseOrganizationValue = (data.purchaseOrganization !== undefined && data.purchaseOrganization !== null && data.purchaseOrganization !== '')
      ? data.purchaseOrganization
      : ((transformedBody.purchaseOrganization !== undefined && transformedBody.purchaseOrganization !== null && transformedBody.purchaseOrganization !== '')
        ? transformedBody.purchaseOrganization
        : null);

    const productionStorageLocationValue = (data.productionStorageLocation !== undefined && data.productionStorageLocation !== null && data.productionStorageLocation !== '')
      ? data.productionStorageLocation
      : ((transformedBody.productionStorageLocation !== undefined && transformedBody.productionStorageLocation !== null && transformedBody.productionStorageLocation !== '')
        ? transformedBody.productionStorageLocation
        : null);

    const profitCenterValue = (data.profitCenter !== undefined && data.profitCenter !== null && data.profitCenter !== '')
      ? data.profitCenter
      : ((transformedBody.profitCenter !== undefined && transformedBody.profitCenter !== null && transformedBody.profitCenter !== '')
        ? transformedBody.profitCenter
        : null);

    const costCenterValue = (data.costCenter !== undefined && data.costCenter !== null && data.costCenter !== '')
      ? data.costCenter
      : ((transformedBody.costCenter !== undefined && transformedBody.costCenter !== null && transformedBody.costCenter !== '')
        ? transformedBody.costCenter
        : null);

    const plantCodeValue = (data.plantCode !== undefined && data.plantCode !== null && data.plantCode !== '')
      ? data.plantCode
      : ((transformedBody.plantCode !== undefined && transformedBody.plantCode !== null && transformedBody.plantCode !== '')
        ? transformedBody.plantCode
        : null);

    const materialAssignmentGroupCodeValue = (data.materialAssignmentGroupCode !== undefined && data.materialAssignmentGroupCode !== null && data.materialAssignmentGroupCode !== '')
      ? data.materialAssignmentGroupCode
      : ((transformedBody.materialAssignmentGroupCode !== undefined && transformedBody.materialAssignmentGroupCode !== null && transformedBody.materialAssignmentGroupCode !== '')
        ? transformedBody.materialAssignmentGroupCode
        : null);

    const loadingGroupValue = (data.loadingGroup !== undefined && data.loadingGroup !== null && data.loadingGroup !== '')
      ? data.loadingGroup
      : ((transformedBody.loadingGroup !== undefined && transformedBody.loadingGroup !== null && transformedBody.loadingGroup !== '')
        ? transformedBody.loadingGroup
        : null);

    // Try simple INSERT without ID - let database handle it completely
    // No hardcoded defaults - all values must be explicitly provided
    // Include ALL fields that the frontend sends
    const insertResult = await db.execute(sql`
      INSERT INTO materials (
        code, name, type, description, uom_id, base_uom, base_unit_price, 
        mrp_type, procurement_type, lot_size, reorder_point, safety_stock,
        min_stock, max_stock, lead_time,
        planned_delivery_time, production_time, mrp_controller,
        weight, gross_weight, net_weight, weight_unit, 
        volume, volume_unit, valuation_class, industry_sector, 
        item_category_group, material_group, material_assignment_group_code, loading_group, price_control, sales_organization, distribution_channel, division,
        purchasing_group, purchase_organization, production_storage_location,
        plant_code, profit_center, cost_center,
        is_active, created_at, updated_at
      )
      VALUES (
        ${data.code}, 
        ${data.name}, 
        ${data.type}, 
        ${data.description || null}, 
        ${uomId}, 
        ${data.baseUnit}, 
        ${data.price || null}, 
        ${mrpTypeValue}, 
        ${procurementTypeValue},
        ${lotSizeValue},
        ${reorderPointValue},
        ${safetyStockValue},
        ${minStockValue},
        ${maxStockValue},
        ${leadTimeValue},
        ${plannedDeliveryTimeValue},
        ${productionTimeValue},
        ${mrpControllerValue},
        ${data.weight || null}, 
        ${transformedBody.grossWeight !== undefined ? transformedBody.grossWeight : (data.grossWeight || null)}, 
        ${transformedBody.netWeight !== undefined ? transformedBody.netWeight : (data.netWeight || null)}, 
        ${transformedBody.weightUnit !== undefined && transformedBody.weightUnit !== '' ? transformedBody.weightUnit : null}, 
        ${transformedBody.volume !== undefined ? transformedBody.volume : (data.volume || null)}, 
        ${transformedBody.volumeUnit !== undefined && transformedBody.volumeUnit !== '' ? transformedBody.volumeUnit : null}, 
        ${valuationClassValue}, 
        ${transformedBody.industrySector !== undefined && transformedBody.industrySector !== '' ? transformedBody.industrySector : null}, 
        ${transformedBody.itemCategoryGroup !== undefined && transformedBody.itemCategoryGroup !== '' ? transformedBody.itemCategoryGroup : null},
        ${transformedBody.materialGroup !== undefined && transformedBody.materialGroup !== '' ? transformedBody.materialGroup : null}, 
        ${materialAssignmentGroupCodeValue},
        ${loadingGroupValue},
        ${priceControlValue},
        ${salesOrganizationValue},
        ${distributionChannelValue},
        ${divisionValue},
        ${purchasingGroupValue},
        ${purchaseOrganizationValue},
        ${productionStorageLocationValue},
        ${plantCodeValue},
        ${profitCenterValue},
        ${costCenterValue},
        ${data.isActive !== undefined ? data.isActive : true}, 
        NOW(), 
        NOW()
      )
      RETURNING id, code, name, type, description, base_uom, base_unit_price, mrp_type, procurement_type, lot_size, reorder_point, safety_stock, min_stock, max_stock, lead_time, planned_delivery_time, production_time, mrp_controller, weight, gross_weight, net_weight, weight_unit, volume, volume_unit, valuation_class, industry_sector, material_group, material_assignment_group_code, price_control, sales_organization, distribution_channel, division, purchasing_group, purchase_organization, production_storage_location, plant_code, profit_center, cost_center, is_active, created_at, updated_at
    `);

    console.log('✅ INSERT - Result:', {
      id: insertResult.rows[0]?.id,
      code: insertResult.rows[0]?.code,
      mrp_type: insertResult.rows[0]?.mrp_type,
      valuation_class: insertResult.rows[0]?.valuation_class
    });

    // Auto-increment the number range for next material
    try {
      // Find the number range for this material type
      const materialTypeResult = await pool.query(
        'SELECT number_range_code FROM product_types WHERE code = $1',
        [data.type]
      );

      if (materialTypeResult.rows.length > 0 && materialTypeResult.rows[0].number_range_code) {
        const numberRangeCode = materialTypeResult.rows[0].number_range_code;

        // Increment the current_number in the number_ranges table
        // Handle both string and numeric current_number values
        await pool.query(`
          UPDATE number_ranges 
          SET current_number = CAST(CAST(current_number AS INTEGER) + 1 AS VARCHAR),
              updated_at = NOW()
          WHERE number_range_code = $1 AND external_numbering = false
        `, [numberRangeCode]);

        console.log(`✅ Number range ${numberRangeCode} incremented for next material`);
      }
    } catch (rangeError) {
      // Log the error but don't fail the material creation
      console.error('⚠️ Failed to increment number range:', rangeError);
    }

    // Create initial stock_balance entry so material appears in inventory
    const createdMaterial = insertResult.rows[0];
    const plantCodeForStock = plantCodeValue || 'P002'; // Use provided or default
    const storageLocationForStock = productionStorageLocationValue || '1010'; // Use provided or default

    try {
      await pool.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, available_quantity, reserved_quantity,
          unit, moving_average_price, total_value,
          last_updated, created_at, updated_at
        ) VALUES ($1, $2, $3, 'AVAILABLE', 0, 0, 0, $4, $5, 0, NOW(), NOW(), NOW())
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO NOTHING
      `, [
        createdMaterial.code,
        plantCodeForStock,
        storageLocationForStock,
        createdMaterial.base_uom || 'EA',
        createdMaterial.base_unit_price || 0
      ]);

      console.log(`✅ Created stock balance for material ${createdMaterial.code} at plant ${plantCodeForStock}, storage ${storageLocationForStock}`);
    } catch (stockError) {
      console.error('⚠️ Error creating stock balance:', stockError);
      // Don't fail material creation if stock balance creation fails
    }

    return res.status(201).json(insertResult.rows[0]);
  } catch (error: any) {
    console.error('Error creating material:', error);

    // Handle specific database errors
    if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
      if (error.message.includes('materials_pkey')) {
        return res.status(500).json({
          error: "Database Error",
          message: "ID generation failed - database sequence issue detected. Please contact administrator."
        });
      }
      return res.status(409).json({ error: "Conflict", message: "Material code already exists" });
    }

    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update material handler (used by both PUT and PATCH)
const updateMaterialHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    // Transform snake_case to camelCase for validation
    // Handle all fields explicitly - no defaults, no hardcoded values
    const mrpTypeValue = req.body.mrpType !== undefined
      ? req.body.mrpType
      : (req.body.mrp_type !== undefined ? req.body.mrp_type : undefined);

    const transformedBody = {
      ...req.body,
      code: req.body.code !== undefined ? req.body.code : req.body.material_code,
      name: req.body.name !== undefined ? req.body.name : req.body.description,
      type: req.body.type !== undefined ? req.body.type : req.body.material_type,
      description: req.body.description,
      baseUnit: req.body.baseUnit !== undefined ? req.body.baseUnit : req.body.base_unit,
      mrpType: mrpTypeValue,
      procurementType: req.body.procurementType !== undefined ? req.body.procurementType : req.body.procurement_type,
      lotSize: req.body.lotSize !== undefined ? req.body.lotSize : req.body.lot_size,
      reorderPoint: req.body.reorderPoint !== undefined ? req.body.reorderPoint : req.body.reorder_point,
      safetyStock: req.body.safetyStock !== undefined ? req.body.safetyStock : req.body.safety_stock,
      minStock: req.body.minStock !== undefined ? req.body.minStock : req.body.min_stock,
      maxStock: req.body.maxStock !== undefined ? req.body.maxStock : req.body.max_stock,
      leadTime: req.body.leadTime !== undefined ? req.body.leadTime : req.body.lead_time,
      plannedDeliveryTime: req.body.plannedDeliveryTime !== undefined ? req.body.plannedDeliveryTime : req.body.planned_delivery_time,
      productionTime: req.body.productionTime !== undefined ? req.body.productionTime : req.body.production_time,
      mrpController: req.body.mrpController !== undefined ? req.body.mrpController : req.body.mrp_controller,
      price: req.body.price !== undefined ? req.body.price : req.body.base_price,
      weight: req.body.weight !== undefined ? req.body.weight : req.body.gross_weight,
      grossWeight: req.body.grossWeight !== undefined ? req.body.grossWeight : req.body.gross_weight,
      netWeight: req.body.netWeight !== undefined ? req.body.netWeight : req.body.net_weight,
      weightUnit: req.body.weightUnit !== undefined ? req.body.weightUnit : req.body.weight_unit,
      volume: req.body.volume,
      volumeUnit: req.body.volumeUnit !== undefined ? req.body.volumeUnit : req.body.volume_unit,
      valuationClass: req.body.valuationClass !== undefined ? req.body.valuationClass : req.body.valuation_class,
      industrySector: req.body.industrySector !== undefined ? req.body.industrySector : req.body.industry_sector,
      materialGroup: req.body.materialGroup !== undefined ? req.body.materialGroup : req.body.material_group,
      priceControl: req.body.priceControl !== undefined ? req.body.priceControl : req.body.price_control,
      salesOrganization: req.body.salesOrganization !== undefined ? req.body.salesOrganization : req.body.sales_organization,
      distributionChannel: req.body.distributionChannel !== undefined ? req.body.distributionChannel : req.body.distribution_channel,
      division: req.body.division !== undefined ? req.body.division : req.body.division,
      purchaseOrganization: req.body.purchaseOrganization !== undefined ? req.body.purchaseOrganization : req.body.purchase_organization,
      purchasingGroup: req.body.purchasingGroup !== undefined ? req.body.purchasingGroup : req.body.purchasing_group,
      productionStorageLocation: req.body.productionStorageLocation !== undefined ? req.body.productionStorageLocation : req.body.production_storage_location,
      plantCode: req.body.plantCode !== undefined ? req.body.plantCode : req.body.plant_code,
      profitCenter: req.body.profitCenter !== undefined ? req.body.profitCenter : req.body.profit_center,
      costCenter: req.body.costCenter !== undefined ? req.body.costCenter : req.body.cost_center,
      itemCategoryGroup: req.body.itemCategoryGroup !== undefined ? req.body.itemCategoryGroup : req.body.item_category_group,
      materialAssignmentGroupCode: req.body.materialAssignmentGroupCode !== undefined ? req.body.materialAssignmentGroupCode : req.body.material_assignment_group_code,
      isActive: req.body.isActive !== undefined ? req.body.isActive : req.body.is_active
    };

    // Debug log to see what we're receiving
    console.log('🔍 Update Material - Raw req.body keys:', Object.keys(req.body));
    console.log('🔍 Update Material - production_storage_location in req.body:', {
      has_production_storage_location: 'production_storage_location' in req.body,
      has_productionStorageLocation: 'productionStorageLocation' in req.body,
      value_snake: req.body.production_storage_location,
      value_camel: req.body.productionStorageLocation,
      transformed_value: transformedBody.productionStorageLocation
    });
    console.log('Update Material - Received data:', {
      originalBody: req.body,
      transformedBody: transformedBody,
      mrpTypeValue: mrpTypeValue,
      mrpTypeInOriginal: req.body.mrp_type,
      mrpTypeInCamel: req.body.mrpType,
      itemCategoryGroup: {
        inOriginal: req.body.item_category_group,
        inCamel: req.body.itemCategoryGroup,
        inTransformed: transformedBody.itemCategoryGroup
      }
    });

    const validation = materialSchema.partial().safeParse(transformedBody);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Debug: Log validation result
    console.log('Update Material - After validation:', {
      validatedData: data,
      hasMrpType: data.mrpType !== undefined,
      mrpTypeValue: data.mrpType,
      transformedBodyMrpType: transformedBody.mrpType
    });

    // Check if material exists
    const existingResult = await db.execute(sql`SELECT id FROM materials WHERE id = ${id}`);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Validate MRP type if provided (and not empty string)
    // Check both data.mrpType and transformedBody.mrpType
    const mrpTypeToValidate = data.mrpType !== undefined ? data.mrpType : transformedBody.mrpType;
    if (mrpTypeToValidate && mrpTypeToValidate.trim() !== '') {
      const mrpTypeCheck = await pool.query(
        'SELECT code FROM mrp_types WHERE code = $1 AND is_active = true',
        [mrpTypeToValidate]
      );
      if (mrpTypeCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Validation failed",
          message: `Invalid MRP type: ${mrpTypeToValidate}. Must be a valid code from mrp_types table.`
        });
      }
    }

    // Build UPDATE statement - only update fields that are provided
    const updateParts: any[] = [];

    if (data.code !== undefined) {
      updateParts.push(sql`code = ${data.code}`);
    }
    if (data.name !== undefined) {
      updateParts.push(sql`name = ${data.name}`);
    }
    if (data.type !== undefined) {
      updateParts.push(sql`type = ${data.type}`);
    }
    if (data.description !== undefined) {
      updateParts.push(sql`description = ${data.description}`);
    }
    if (data.baseUnit !== undefined) {
      updateParts.push(sql`base_uom = ${data.baseUnit}`);
    }
    if (data.price !== undefined) {
      updateParts.push(sql`base_unit_price = ${data.price}`);
    }

    // CRITICAL FIX: Always check transformedBody.mrpType first, then data.mrpType
    // This ensures we capture the value even if zod filters it out
    if (transformedBody.mrpType !== undefined) {
      const mrpTypeToUpdate = transformedBody.mrpType;
      console.log('Update Material - Adding mrp_type to update:', {
        mrpTypeToUpdate: mrpTypeToUpdate,
        type: typeof mrpTypeToUpdate,
        isEmpty: mrpTypeToUpdate === '' || (typeof mrpTypeToUpdate === 'string' && mrpTypeToUpdate.trim() === '')
      });

      // If empty string, set to NULL; otherwise use the value
      if (mrpTypeToUpdate === '' || (typeof mrpTypeToUpdate === 'string' && mrpTypeToUpdate.trim() === '')) {
        updateParts.push(sql`mrp_type = NULL`);
      } else if (mrpTypeToUpdate) {
        updateParts.push(sql`mrp_type = ${mrpTypeToUpdate}`);
      }
    } else if (data.mrpType !== undefined) {
      // Fallback to data.mrpType if transformedBody doesn't have it
      const mrpTypeToUpdate = data.mrpType;
      console.log('Update Material - Adding mrp_type to update (from data):', {
        mrpTypeToUpdate: mrpTypeToUpdate
      });

      if (mrpTypeToUpdate === '' || (typeof mrpTypeToUpdate === 'string' && mrpTypeToUpdate.trim() === '')) {
        updateParts.push(sql`mrp_type = NULL`);
      } else if (mrpTypeToUpdate) {
        updateParts.push(sql`mrp_type = ${mrpTypeToUpdate}`);
      }
    } else {
      console.log('Update Material - mrp_type NOT included in update (both undefined)');
    }
    if (data.procurementType !== undefined || transformedBody.procurementType !== undefined) {
      const procurementTypeValue = data.procurementType !== undefined ? data.procurementType : transformedBody.procurementType;
      if (procurementTypeValue === '' || procurementTypeValue === null) {
        updateParts.push(sql`procurement_type = NULL`);
      } else {
        updateParts.push(sql`procurement_type = ${procurementTypeValue}`);
      }
    }
    if (data.lotSize !== undefined || transformedBody.lotSize !== undefined) {
      const lotSizeValue = data.lotSize !== undefined ? data.lotSize : transformedBody.lotSize;
      if (lotSizeValue === '' || lotSizeValue === null) {
        updateParts.push(sql`lot_size = NULL`);
      } else {
        updateParts.push(sql`lot_size = ${lotSizeValue}`);
      }
    }
    if (data.reorderPoint !== undefined || transformedBody.reorderPoint !== undefined) {
      updateParts.push(sql`reorder_point = ${data.reorderPoint !== undefined ? data.reorderPoint : transformedBody.reorderPoint}`);
    }
    if (data.safetyStock !== undefined || transformedBody.safetyStock !== undefined) {
      updateParts.push(sql`safety_stock = ${data.safetyStock !== undefined ? data.safetyStock : transformedBody.safetyStock}`);
    }
    if (data.minStock !== undefined || transformedBody.minStock !== undefined) {
      updateParts.push(sql`min_stock = ${data.minStock !== undefined ? data.minStock : transformedBody.minStock}`);
    }
    if (data.maxStock !== undefined || transformedBody.maxStock !== undefined) {
      updateParts.push(sql`max_stock = ${data.maxStock !== undefined ? data.maxStock : transformedBody.maxStock}`);
    }
    if (data.leadTime !== undefined || transformedBody.leadTime !== undefined) {
      updateParts.push(sql`lead_time = ${data.leadTime !== undefined ? data.leadTime : transformedBody.leadTime}`);
    }
    if (data.plannedDeliveryTime !== undefined || transformedBody.plannedDeliveryTime !== undefined) {
      updateParts.push(sql`planned_delivery_time = ${data.plannedDeliveryTime !== undefined ? data.plannedDeliveryTime : transformedBody.plannedDeliveryTime}`);
    }
    if (data.productionTime !== undefined || transformedBody.productionTime !== undefined) {
      updateParts.push(sql`production_time = ${data.productionTime !== undefined ? data.productionTime : transformedBody.productionTime}`);
    }
    if (data.mrpController !== undefined || transformedBody.mrpController !== undefined) {
      const mrpControllerValue = data.mrpController !== undefined ? data.mrpController : transformedBody.mrpController;
      if (mrpControllerValue === '' || mrpControllerValue === null) {
        updateParts.push(sql`mrp_controller = NULL`);
      } else {
        updateParts.push(sql`mrp_controller = ${mrpControllerValue}`);
      }
    }
    if (data.weight !== undefined) {
      updateParts.push(sql`weight = ${data.weight}`);
    }
    if (data.grossWeight !== undefined || transformedBody.grossWeight !== undefined) {
      const grossWeightValue = data.grossWeight !== undefined ? data.grossWeight : transformedBody.grossWeight;
      updateParts.push(sql`gross_weight = ${grossWeightValue}`);
    }
    if (data.netWeight !== undefined || transformedBody.netWeight !== undefined) {
      const netWeightValue = data.netWeight !== undefined ? data.netWeight : transformedBody.netWeight;
      updateParts.push(sql`net_weight = ${netWeightValue}`);
    }
    if (data.weightUnit !== undefined || transformedBody.weightUnit !== undefined) {
      const weightUnitValue = data.weightUnit !== undefined ? data.weightUnit : transformedBody.weightUnit;
      if (weightUnitValue === '' || weightUnitValue === null) {
        updateParts.push(sql`weight_unit = NULL`);
      } else {
        updateParts.push(sql`weight_unit = ${weightUnitValue}`);
      }
    }
    if (data.volume !== undefined || transformedBody.volume !== undefined) {
      const volumeValue = data.volume !== undefined ? data.volume : transformedBody.volume;
      updateParts.push(sql`volume = ${volumeValue}`);
    }
    if (data.volumeUnit !== undefined || transformedBody.volumeUnit !== undefined) {
      const volumeUnitValue = data.volumeUnit !== undefined ? data.volumeUnit : transformedBody.volumeUnit;
      if (volumeUnitValue === '' || volumeUnitValue === null) {
        updateParts.push(sql`volume_unit = NULL`);
      } else {
        updateParts.push(sql`volume_unit = ${volumeUnitValue}`);
      }
    }
    if (data.valuationClass !== undefined || transformedBody.valuationClass !== undefined) {
      const valuationClassValue = data.valuationClass !== undefined ? data.valuationClass : transformedBody.valuationClass;
      if (valuationClassValue === '' || valuationClassValue === null) {
        updateParts.push(sql`valuation_class = NULL`);
      } else {
        updateParts.push(sql`valuation_class = ${valuationClassValue}`);
      }
    }
    if (data.industrySector !== undefined || transformedBody.industrySector !== undefined) {
      const industrySectorValue = data.industrySector !== undefined ? data.industrySector : transformedBody.industrySector;
      if (industrySectorValue === '' || industrySectorValue === null) {
        updateParts.push(sql`industry_sector = NULL`);
      } else {
        updateParts.push(sql`industry_sector = ${industrySectorValue}`);
      }
    }
    if (data.itemCategoryGroup !== undefined || transformedBody.itemCategoryGroup !== undefined) {
      const itemCategoryGroupValue = data.itemCategoryGroup !== undefined ? data.itemCategoryGroup : transformedBody.itemCategoryGroup;
      if (itemCategoryGroupValue === '' || itemCategoryGroupValue === null) {
        updateParts.push(sql`item_category_group = NULL`);
      } else {
        updateParts.push(sql`item_category_group = ${itemCategoryGroupValue}`);
      }
    }
    if (data.materialGroup !== undefined || transformedBody.materialGroup !== undefined) {
      const materialGroupValue = data.materialGroup !== undefined ? data.materialGroup : transformedBody.materialGroup;
      if (materialGroupValue === '' || materialGroupValue === null) {
        updateParts.push(sql`material_group = NULL`);
      } else {
        updateParts.push(sql`material_group = ${materialGroupValue}`);
      }
    }
    if (data.priceControl !== undefined || transformedBody.priceControl !== undefined) {
      const priceControlValue = data.priceControl !== undefined ? data.priceControl : transformedBody.priceControl;
      if (priceControlValue === '' || priceControlValue === null) {
        updateParts.push(sql`price_control = NULL`);
      } else {
        updateParts.push(sql`price_control = ${priceControlValue}`);
      }
    }
    if (data.salesOrganization !== undefined || transformedBody.salesOrganization !== undefined) {
      const salesOrganizationValue = data.salesOrganization !== undefined ? data.salesOrganization : transformedBody.salesOrganization;
      if (salesOrganizationValue === '' || salesOrganizationValue === null) {
        updateParts.push(sql`sales_organization = NULL`);
      } else {
        updateParts.push(sql`sales_organization = ${salesOrganizationValue}`);
      }
    }
    if (data.distributionChannel !== undefined || transformedBody.distributionChannel !== undefined) {
      const distributionChannelValue = data.distributionChannel !== undefined ? data.distributionChannel : transformedBody.distributionChannel;
      if (distributionChannelValue === '' || distributionChannelValue === null) {
        updateParts.push(sql`distribution_channel = NULL`);
      } else {
        updateParts.push(sql`distribution_channel = ${distributionChannelValue}`);
      }
    }
    if (data.division !== undefined || transformedBody.division !== undefined) {
      const divisionValue = data.division !== undefined ? data.division : transformedBody.division;
      if (divisionValue === '' || divisionValue === null) {
        updateParts.push(sql`division = NULL`);
      } else {
        updateParts.push(sql`division = ${divisionValue}`);
      }
    }
    if (data.purchaseOrganization !== undefined || transformedBody.purchaseOrganization !== undefined) {
      const purchaseOrganizationValue = data.purchaseOrganization !== undefined ? data.purchaseOrganization : transformedBody.purchaseOrganization;
      if (purchaseOrganizationValue === '' || purchaseOrganizationValue === null) {
        updateParts.push(sql`purchase_organization = NULL`);
      } else {
        updateParts.push(sql`purchase_organization = ${purchaseOrganizationValue}`);
      }
    }
    if (data.purchasingGroup !== undefined || transformedBody.purchasingGroup !== undefined) {
      const purchasingGroupValue = data.purchasingGroup !== undefined ? data.purchasingGroup : transformedBody.purchasingGroup;
      if (purchasingGroupValue === '' || purchasingGroupValue === null) {
        updateParts.push(sql`purchasing_group = NULL`);
      } else {
        updateParts.push(sql`purchasing_group = ${purchasingGroupValue}`);
      }
    }
    if (data.productionStorageLocation !== undefined || transformedBody.productionStorageLocation !== undefined) {
      const productionStorageLocationValue = data.productionStorageLocation !== undefined ? data.productionStorageLocation : transformedBody.productionStorageLocation;
      if (productionStorageLocationValue === '' || productionStorageLocationValue === null) {
        updateParts.push(sql`production_storage_location = NULL`);
      } else {
        updateParts.push(sql`production_storage_location = ${productionStorageLocationValue}`);
      }
    }
    if (data.plantCode !== undefined || transformedBody.plantCode !== undefined) {
      const plantCodeValue = data.plantCode !== undefined ? data.plantCode : transformedBody.plantCode;
      if (plantCodeValue === '' || plantCodeValue === null) {
        updateParts.push(sql`plant_code = NULL`);
      } else {
        updateParts.push(sql`plant_code = ${plantCodeValue}`);
      }
    }
    if (data.profitCenter !== undefined || transformedBody.profitCenter !== undefined) {
      const profitCenterValue = data.profitCenter !== undefined ? data.profitCenter : transformedBody.profitCenter;
      if (profitCenterValue === '' || profitCenterValue === null) {
        updateParts.push(sql`profit_center = NULL`);
      } else {
        updateParts.push(sql`profit_center = ${profitCenterValue}`);
      }
    }
    if (data.costCenter !== undefined || transformedBody.costCenter !== undefined) {
      const costCenterValue = data.costCenter !== undefined ? data.costCenter : transformedBody.costCenter;
      if (costCenterValue === '' || costCenterValue === null) {
        updateParts.push(sql`cost_center = NULL`);
      } else {
        updateParts.push(sql`cost_center = ${costCenterValue}`);
      }
    }
    if (data.materialAssignmentGroupCode !== undefined || transformedBody.materialAssignmentGroupCode !== undefined) {
      const materialAssignmentGroupCodeValue = data.materialAssignmentGroupCode !== undefined ? data.materialAssignmentGroupCode : transformedBody.materialAssignmentGroupCode;
      if (materialAssignmentGroupCodeValue === '' || materialAssignmentGroupCodeValue === null) {
        updateParts.push(sql`material_assignment_group_code = NULL`);
      } else {
        updateParts.push(sql`material_assignment_group_code = ${materialAssignmentGroupCodeValue}`);
      }
    }
    if (data.loadingGroup !== undefined || transformedBody.loadingGroup !== undefined) {
      const loadingGroupValue = data.loadingGroup !== undefined ? data.loadingGroup : transformedBody.loadingGroup;
      if (loadingGroupValue === '' || loadingGroupValue === null) {
        updateParts.push(sql`loading_group = NULL`);
      } else {
        updateParts.push(sql`loading_group = ${loadingGroupValue}`);
      }
    }
    if (data.isActive !== undefined) {
      updateParts.push(sql`is_active = ${data.isActive}`);
    }

    updateParts.push(sql`updated_at = NOW()`);

    if (updateParts.length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Debug: Log what will be updated
    console.log('Update Material - Update parts count:', updateParts.length);
    console.log('Update Material - Will update mrp_type:', updateParts.some(part => {
      // Check if any part contains mrp_type
      const partStr = part.sql || '';
      return partStr.includes('mrp_type');
    }));

    const updateResult = await db.execute(sql`
      UPDATE materials 
      SET ${sql.join(updateParts, sql`, `)}
      WHERE id = ${id}
      RETURNING id, code, name, type, description, base_uom, base_unit_price, mrp_type, weight, gross_weight, net_weight, weight_unit, volume, volume_unit, valuation_class, industry_sector, item_category_group, material_group, material_assignment_group_code, loading_group, price_control, sales_organization, distribution_channel, purchase_organization, purchasing_group, production_storage_location, is_active, created_at, updated_at
    `);

    console.log('Update Material - Update result:', {
      id: updateResult.rows[0]?.id,
      code: updateResult.rows[0]?.code,
      mrp_type: updateResult.rows[0]?.mrp_type
    });

    return res.status(200).json(updateResult.rows[0]);
  } catch (error: any) {
    console.error('Error updating material:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
};

// Register both PUT and PATCH for update
router.patch('/:id', updateMaterialHandler);
router.put('/:id', updateMaterialHandler);

// Delete material
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const existingResult = await db.execute(sql`SELECT id FROM materials WHERE id = ${id}`);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Delete material
    await db.execute(sql`DELETE FROM materials WHERE id = ${id}`);

    return res.status(200).json({ message: "Material deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Bulk import materials
router.post('/bulk-import', async (req, res) => {
  try {
    const materials = req.body;

    if (!Array.isArray(materials)) {
      return res.status(400).json({ error: "Request body must be an array of materials" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const material of materials) {
      try {
        // Transform snake_case to camelCase for validation
        const transformedMaterial = {
          ...material,
          code: material.code || material.material_code,
          name: material.name || material.description,
          type: material.type || material.material_type,
          description: material.description,
          baseUnit: material.baseUnit || material.base_unit,
          mrpType: material.mrpType || material.mrp_type,
          price: material.price || material.base_price,
          weight: material.weight || material.gross_weight,
          isActive: material.isActive !== undefined ? material.isActive : (material.is_active !== undefined ? material.is_active : true)
        };

        const validation = materialSchema.safeParse(transformedMaterial);

        if (!validation.success) {
          results.failed++;
          results.errors.push(`Material ${material.code || material.material_code || 'unknown'}: ${validation.error.errors.map(e => e.message).join(", ")}`);
          continue;
        }

        const data = validation.data;

        // Check if material code already exists
        const existingResult = await db.execute(sql`SELECT id FROM materials WHERE code = ${data.code}`);

        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`Material ${data.code}: Material code already exists`);
          continue;
        }

        // Validate MRP type if provided
        if (data.mrpType) {
          const mrpTypeCheck = await pool.query(
            'SELECT code FROM mrp_types WHERE code = $1 AND is_active = true',
            [data.mrpType]
          );
          if (mrpTypeCheck.rows.length === 0) {
            results.failed++;
            results.errors.push(`Material ${data.code}: Invalid MRP type: ${data.mrpType}`);
            continue;
          }
        }

        // Insert material using correct column names
        await db.execute(sql`
          INSERT INTO materials (
            code, name, type, description, base_uom, base_unit_price, 
            mrp_type, weight, is_active, created_at, updated_at
          )
          VALUES (
            ${data.code}, ${data.name}, ${data.type || 'FERT'}, ${data.description || ''}, 
            ${data.baseUnit || 'EA'}, ${data.price || 0}, 
            ${data.mrpType || null}, ${data.weight || 0}, ${data.isActive}, NOW(), NOW()
          )
        `);

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Material ${material.code || 'unknown'}: ${error.message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error bulk importing materials:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

export default router;