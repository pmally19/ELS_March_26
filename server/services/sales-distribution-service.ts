import { db, pool } from "../db";
import {
  salesOrganizations,
  distributionChannels,
  divisions,
  salesOffices,
  shippingPoints,
  salesAreas,
  salesOfficeAssignments,
  documentTypes,
  itemCategories,
  conditionTypes,
  pricingProcedures,
  shippingConditions,
  incoterms,
  customerIncotermsDefaults,
  salesOrderIncoterms,
  numberRanges,
  numberRangeObjects,
  copyControlHeaders,
  copyControlItems,
  type SalesOrganization,
  type DistributionChannel,
  type Division,
  type SalesArea,
  type DocumentType,
  type ConditionType,
  type PricingProcedure
} from "@shared/sales-distribution-schema";
import { eq, and, or, isNull, desc, sql } from "drizzle-orm";

export class SalesDistributionService {

  // Enterprise Structure Management

  async createSalesOrganization(data: {
    code: string;
    name: string;
    companyCode: string;
    currency: string;
    address?: string;
  }) {
    const [salesOrg] = await db
      .insert(salesOrganizations)
      .values(data)
      .returning();
    return salesOrg;
  }

  async createDistributionChannel(data: {
    code: string;
    name: string;
    description?: string;
  }) {
    const [channel] = await db
      .insert(distributionChannels)
      .values(data)
      .returning();
    return channel;
  }

  async createDivision(data: {
    code: string;
    name: string;
    description?: string;
  }) {
    const [division] = await db
      .insert(divisions)
      .values(data)
      .returning();
    return division;
  }

  async createSalesOffice(data: {
    code: string;
    name: string;
    description?: string;
    region?: string;
    country?: string;
    _tenantId?: string;
    createdBy?: number;
    updatedBy?: number;
  }) {
    const [office] = await db
      .insert(salesOffices)
      .values(data)
      .returning();
    return office;
  }

  async getAllSalesOffices() {
    return await db.select().from(salesOffices).where(or(eq(salesOffices.is_active, true), isNull(salesOffices.is_active))).orderBy(salesOffices.code);
  }

  async updateSalesOffice(id: number, data: Partial<{
    name: string;
    description: string;
    region: string;
    country: string;
    is_active: boolean;
    updatedBy: number;
  }>) {
    const [updated] = await db
      .update(salesOffices)
      .set({ ...data, updated_at: new Date() })
      .where(eq(salesOffices.id, id))
      .returning();
    return updated;
  }

  async deleteSalesOffice(id: number, updatedBy?: number) {
    const [deleted] = await db
      .update(salesOffices)
      .set({
        is_active: false,
        _deletedAt: new Date(),
        updatedBy: updatedBy,
        updated_at: new Date()
      })
      .where(eq(salesOffices.id, id))
      .returning();
    return deleted;
  }

  async bulkImportSalesOffices(offices: any[]) {
    const results = {
      created: [] as any[],
      errors: [] as string[]
    };

    for (const office of offices) {
      try {
        // Validation check for duplicates
        const existing = await db.query.salesOffices.findFirst({
          where: eq(salesOffices.code, office.code)
        });

        if (existing) {
          results.errors.push(`Sales Office code ${office.code} already exists`);
          continue;
        }

        const [created] = await db.insert(salesOffices).values({
          code: office.code,
          name: office.name,
          description: office.description,
          region: office.region,
          country: office.country,
          is_active: office.is_active !== undefined ? office.is_active : true,
          created_at: new Date(),
          updated_at: new Date()
        }).returning();

        results.created.push(created);
      } catch (error: any) {
        results.errors.push(`Failed to import ${office.code}: ${error.message}`);
      }
    }

    return results;
  }

  async createShippingPoint(data: {
    code: string;
    name: string;
    plantCode: string;
    factoryCalendar?: string;
  }) {
    const [shippingPoint] = await db
      .insert(shippingPoints)
      .values(data)
      .returning();
    return shippingPoint;
  }

  async createSalesArea(data: {
    salesOrgCode: string;
    distributionChannelCode: string;
    divisionCode: string;
    name: string;
  }) {
    const [salesArea] = await db
      .insert(salesAreas)
      .values(data)
      .returning();
    return salesArea;
  }

  async assignSalesOfficeToSalesArea(salesOfficeCode: string, salesAreaId: number) {
    const [assignment] = await db
      .insert(salesOfficeAssignments)
      .values({
        salesOfficeCode,
        salesAreaId
      })
      .returning();
    return assignment;
  }

  async getSalesOfficeAssignments(salesAreaId: number) {
    // Join with sales_offices to get details
    const result = await db
      .select({
        id: salesOfficeAssignments.id,
        salesAreaId: salesOfficeAssignments.salesAreaId,
        salesOfficeCode: salesOfficeAssignments.salesOfficeCode,
        salesOfficeName: salesOffices.name,
        salesOfficeDescription: salesOffices.description,
        createdAt: salesOfficeAssignments.createdAt
      })
      .from(salesOfficeAssignments)
      .leftJoin(salesOffices, eq(salesOfficeAssignments.salesOfficeCode, salesOffices.code))
      .where(eq(salesOfficeAssignments.salesAreaId, salesAreaId));

    return result;
  }

  async deleteSalesOfficeAssignment(salesAreaId: number, salesOfficeCode: string) {
    const [deleted] = await db
      .delete(salesOfficeAssignments)
      .where(and(
        eq(salesOfficeAssignments.salesAreaId, salesAreaId),
        eq(salesOfficeAssignments.salesOfficeCode, salesOfficeCode)
      ))
      .returning();
    return deleted;
  }

  // Document Type Configuration

  async createDocumentType(data: {
    code: string;
    name: string;
    category: string;
    numberRange?: string;
    documentFlow?: any;
  }) {
    const [docType] = await db
      .insert(documentTypes)
      .values(data)
      .returning();
    return docType;
  }

  async createItemCategory(data: {
    code: string;
    name: string;
    documentCategory: string;
    itemType: string;
    deliveryRelevant?: boolean;
    billingRelevant?: boolean;
    pricingRelevant?: boolean;
  }) {
    const [itemCategory] = await db
      .insert(itemCategories)
      .values(data)
      .returning();
    return itemCategory;
  }

  // Pricing Configuration

  async createConditionType(data: {
    code: string;
    name: string;
    conditionClass: string;
    calculationType: string;
    accessSequence?: string;
  }) {
    const [conditionType] = await db
      .insert(conditionTypes)
      .values(data)
      .returning();
    return conditionType;
  }

  async createPricingProcedure(data: {
    code: string;
    name: string;
    steps: any[];
  }) {
    const [procedure] = await db
      .insert(pricingProcedures)
      .values(data)
      .returning();
    return procedure;
  }

  // Shipping Conditions
  async createShippingCondition(data: {
    conditionCode: string;
    conditionCode: string;
    manualShippingPointAllowed?: boolean;
    countryOfDeparture?: string;
    departureZone?: string;
    transportationGroup?: string;
    countryOfDestination?: string;
    receivingZone?: string;
    weightGroup?: string;
    proposedRoute?: string;
    isActive?: boolean;
  }) {
    const [condition] = await db
      .insert(shippingConditions)
      .values(data)
      .returning();
    return condition;
  }

  async getAllShippingConditions() {
    return await db.select().from(shippingConditions).orderBy(shippingConditions.conditionCode);
  }

  async proposeShippingCondition(params: { documentTypeCode?: string }) {
    // Priority 1: From Document Type defaultShippingCondition
    if (params.documentTypeCode) {
      try {
        const [docType] = await db
          .select({
            id: documentTypes.id,
            code: documentTypes.code,
            name: documentTypes.name,
            category: documentTypes.category,
            defaultShippingCondition: documentTypes.defaultShippingCondition
          })
          .from(documentTypes)
          .where(eq(documentTypes.code, params.documentTypeCode))
          .limit(1);
        const docDefault = docType?.defaultShippingCondition;
        if (docDefault) {
          const [cond] = await db
            .select()
            .from(shippingConditions)
            .where(eq(shippingConditions.conditionCode, docDefault))
            .limit(1);
          if (cond) return cond;
        }
      } catch (error: any) {
        // If defaultShippingCondition column doesn't exist, skip this priority
        console.warn("defaultShippingCondition column not available, skipping document type default");
      }
    }

    // Future: Priority 2: From Customer Master default (not yet modeled here)

    // Fallbacks: Standard (STND) then any active
    const [standard] = await db
      .select()
      .from(shippingConditions)
      .where(eq(shippingConditions.conditionCode, 'STND'))
      .limit(1);
    if (standard) return standard;

    const all = await this.getAllShippingConditions();
    return all[0] || null;
  }

  async updateShippingCondition(id: number, data: Partial<{

    manualShippingPointAllowed: boolean;
    countryOfDeparture: string;
    departureZone: string;
    transportationGroup: string;
    countryOfDestination: string;
    receivingZone: string;
    weightGroup: string;
    proposedRoute: string;
    isActive: boolean;
  }>) {
    const [updated] = await db
      .update(shippingConditions)
      .set(data as any)
      .where(eq(shippingConditions.id, id))
      .returning();
    return updated;
  }

  async deleteShippingCondition(id: number) {
    const [deleted] = await db
      .delete(shippingConditions)
      .where(eq(shippingConditions.id, id))
      .returning();
    return deleted;
  }

  // Number Range Management

  async createNumberRangeObject(data: {
    objectCode: string;
    name: string;
    description?: string;
  }) {
    const [object] = await (db as any)
      .insert(numberRangeObjects)
      .values(data as any)
      .returning();
    return object;
  }

  async createNumberRange(data: {
    rangeNumber: string;
    objectCode: string;
    fromNumber: string;
    toNumber: string;
    currentNumber: string;
    external?: boolean;
  }) {
    const [range] = await (db as any)
      .insert(numberRanges)
      .values(data as any)
      .returning();
    return range;
  }

  async getNextNumber(objectCode: string, rangeNumber: string): Promise<string> {
    const range = await db
      .select()
      .from(numberRanges)
      .where(and(
        eq(numberRanges.objectCode, objectCode),
        eq(numberRanges.rangeNumber, rangeNumber)
      ))
      .limit(1);

    if (!range.length) {
      throw new Error(`Number range not found: ${objectCode}/${rangeNumber}`);
    }

    const currentRange = range[0];
    const currentNum = parseInt(currentRange.currentNumber);
    const nextNum = currentNum + 1;
    const nextNumber = nextNum.toString().padStart(currentRange.currentNumber.length, '0');

    // Update current number
    await db
      .update(numberRanges)
      .set({ currentNumber: nextNumber })
      .where(eq(numberRanges.id, currentRange.id));

    return nextNumber;
  }

  // Copy Control Configuration

  async createCopyControlHeader(data: {
    sourceDocType: string;
    targetDocType: string;
    copyRequirements?: string;
    dataTransfer?: string;
  }) {
    const [control] = await (db as any)
      .insert(copyControlHeaders)
      .values(data as any)
      .returning();
    return control;
  }

  async createCopyControlItem(data: {
    sourceDocType: string;
    sourceItemCategory: string;
    targetDocType: string;
    targetItemCategory: string;
    copyRequirements?: string;
    dataTransfer?: string;
  }) {
    const [control] = await (db as any)
      .insert(copyControlItems)
      .values(data as any)
      .returning();
    return control;
  }

  // Retrieval Methods

  async getAllSalesOrganizations(): Promise<SalesOrganization[]> {
    return await db.select().from(salesOrganizations).orderBy(salesOrganizations.code);
  }

  async getAllDistributionChannels(): Promise<DistributionChannel[]> {
    return await db.select().from(distributionChannels).orderBy(distributionChannels.code);
  }

  async getAllDivisions(): Promise<Division[]> {
    return await db.select().from(divisions).orderBy(divisions.code);
  }

  async getAllSalesAreas(): Promise<SalesArea[]> {
    return await db.select().from(salesAreas).orderBy(salesAreas.name);
  }

  async getAllDocumentTypes(category?: string): Promise<DocumentType[]> {
    try {
      // Try to select all columns including defaultShippingCondition and documentFlow
      let query = db.select().from(documentTypes);

      // Build where conditions
      const conditions = [];
      if (category) {
        conditions.push(eq(documentTypes.category, category));
      }
      // Only return active document types (or those where is_active is null/true)
      conditions.push(
        or(
          eq(documentTypes.isActive, true),
          isNull(documentTypes.isActive)
        )
      );

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(documentTypes.code);
    } catch (error: any) {
      // If columns don't exist, select only existing columns
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        // Select only columns that exist in the database
        // Use raw SQL query to avoid TypeScript issues with partial selects
        let sqlQuery = `
          SELECT id, code, name, category, number_range, is_active, created_at, updated_at
          FROM sd_document_types
          WHERE (is_active = true OR is_active IS NULL)
        `;
        const params: any[] = [];

        if (category) {
          sqlQuery += ` AND category = $${params.length + 1}`;
          params.push(category);
        }

        sqlQuery += ` ORDER BY code`;

        const result = await pool.query(sqlQuery, params);

        // Add missing fields as undefined to match the DocumentType interface
        return result.rows.map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          category: r.category,
          numberRange: r.number_range,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          defaultShippingCondition: undefined,
          documentFlow: undefined
        })) as DocumentType[];
      }
      throw error;
    }
  }

  async getAllConditionTypes(): Promise<ConditionType[]> {
    return await db.select().from(conditionTypes).orderBy(conditionTypes.code);
  }

  async getAllPricingProcedures(): Promise<PricingProcedure[]> {
    return await db.select().from(pricingProcedures).orderBy(pricingProcedures.code);
  }

  async getSalesAreaById(id: number): Promise<SalesArea | undefined> {
    const [salesArea] = await db
      .select()
      .from(salesAreas)
      .where(eq(salesAreas.id, id))
      .limit(1);
    return salesArea;
  }

  async getSalesAreaByCombo(
    salesOrgCode: string,
    distributionChannelCode: string,
    divisionCode: string
  ): Promise<SalesArea | undefined> {
    const [salesArea] = await db
      .select()
      .from(salesAreas)
      .where(and(
        eq(salesAreas.salesOrgCode, salesOrgCode),
        eq(salesAreas.distributionChannelCode, distributionChannelCode),
        eq(salesAreas.divisionCode, divisionCode)
      ))
      .limit(1);
    return salesArea;
  }

  // Configuration Validation

  async validateSalesAreaConfiguration(
    salesOrgCode: string,
    distributionChannelCode: string,
    divisionCode: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check if sales organization exists
    const salesOrg = await db
      .select()
      .from(salesOrganizations)
      .where(eq(salesOrganizations.code, salesOrgCode))
      .limit(1);

    if (!salesOrg.length) {
      errors.push(`Sales Organization ${salesOrgCode} does not exist`);
    }

    // Check if distribution channel exists
    const channel = await db
      .select()
      .from(distributionChannels)
      .where(eq(distributionChannels.code, distributionChannelCode))
      .limit(1);

    if (!channel.length) {
      errors.push(`Distribution Channel ${distributionChannelCode} does not exist`);
    }

    // Check if division exists
    const division = await db
      .select()
      .from(divisions)
      .where(eq(divisions.code, divisionCode))
      .limit(1);

    if (!division.length) {
      errors.push(`Division ${divisionCode} does not exist`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Data Initialization - Sets up basic configuration like in the document

  async initializeBasicConfiguration() {
    try {
      // Initialize Number Range Objects
      const numberRangeObjects = [
        { objectCode: 'RV_BELEG', name: 'Sales Documents', description: 'Sales order number ranges' },
        { objectCode: 'VL_BELEG', name: 'Delivery Documents', description: 'Delivery document number ranges' },
        { objectCode: 'VF_BELEG', name: 'Billing Documents', description: 'Invoice number ranges' }
      ];

      for (const obj of numberRangeObjects) {
        await this.createNumberRangeObject(obj);
      }

      // Initialize Document Types (using business-friendly codes, no SAP terminology)
      const docTypes = [
        { code: 'STANDARD', name: 'Standard Order', category: 'ORDER', numberRange: '01' },
        { code: 'QUOTE', name: 'Quotation', category: 'ORDER', numberRange: '02' },
        { code: 'DELIVERY', name: 'Delivery', category: 'DELIVERY', numberRange: '01' },
        { code: 'INVOICE', name: 'Invoice', category: 'BILLING', numberRange: '01' }
      ];

      for (const docType of docTypes) {
        await this.createDocumentType(docType);
      }

      // Initialize Item Categories (using business-friendly codes)
      const itemCats = [
        { code: 'STD', name: 'Standard Item', documentCategory: 'ORDER', itemType: 'STANDARD' },
        { code: 'TEXT', name: 'Text Item', documentCategory: 'ORDER', itemType: 'TEXT', deliveryRelevant: false, billingRelevant: false, pricingRelevant: false },
        { code: 'DELV', name: 'Delivery Item', documentCategory: 'DELIVERY', itemType: 'STANDARD' },
        { code: 'INV', name: 'Invoice Item', documentCategory: 'BILLING', itemType: 'STANDARD' }
      ];

      for (const itemCat of itemCats) {
        await this.createItemCategory(itemCat);
      }

      // Initialize Condition Types
      const condTypes = [
        { code: 'PR00', name: 'Price', conditionClass: 'A', calculationType: 'B' },
        { code: 'K004', name: 'Material Discount', conditionClass: 'B', calculationType: 'A' },
        { code: 'K005', name: 'Customer Discount', conditionClass: 'B', calculationType: 'A' },
        { code: 'MWST', name: 'Output Tax', conditionClass: 'C', calculationType: 'A' }
      ];

      for (const condType of condTypes) {
        await this.createConditionType(condType);
      }

      // Initialize Standard Pricing Procedure
      const pricingSteps = [
        { step: 10, conditionType: 'PR00', description: 'Price', mandatory: true },
        { step: 20, conditionType: 'K004', description: 'Material Discount', mandatory: false },
        { step: 30, conditionType: 'K005', description: 'Customer Discount', mandatory: false },
        { step: 40, conditionType: 'MWST', description: 'Output Tax', mandatory: true }
      ];

      await this.createPricingProcedure({
        code: 'RVAA01',
        name: 'Standard Pricing Procedure',
        steps: pricingSteps
      });

      return { success: true, message: 'Basic configuration initialized successfully' };
    } catch (error) {
      console.error('Error initializing basic configuration:', error);
      return { success: false, message: 'Failed to initialize basic configuration', error: error.message };
    }
  }

  // Incoterms Management

  async createIncoterms(data: {
    incotermsKey: string;
    description: string;
    category: string;
    applicableVersion: string;
    riskTransferPoint?: string;
    costResponsibility?: string;
    applicableTransport?: string;
    isActive?: boolean;
  }) {
    const [newIncoterms] = await db
      .insert(incoterms)
      .values(data)
      .returning();
    return newIncoterms;
  }

  async getAllIncoterms() {
    return await db.select().from(incoterms).where(eq(incoterms.isActive, true)).orderBy(incoterms.incotermsKey);
  }

  async getIncotermsByCategory(category: string) {
    return await db.select().from(incoterms).where(and(eq(incoterms.isActive, true), eq(incoterms.category, category)));
  }

  async getIncotermsByCategoryAndSubcategory(category: string, subcategory: string) {
    // Since the category field contains values like "Sea/Inland Waterway", 
    // we need to search for the subcategory within the category field
    const searchPattern = `${category}/${subcategory}`;
    return await db.select().from(incoterms).where(and(
      eq(incoterms.isActive, true),
      eq(incoterms.category, searchPattern)
    ));
  }

  async getCustomerIncotermsDefaults(customerId: number) {
    return await db.select().from(customerIncotermsDefaults).where(and(eq(customerIncotermsDefaults.customerId, customerId), eq(customerIncotermsDefaults.isActive, true)));
  }

  async setCustomerIncotermsDefaults(customerId: number, incotermsKey: string, incotermsLocation: string) {
    // Check if customer already has defaults
    const existing = await db.select().from(customerIncotermsDefaults).where(eq(customerIncotermsDefaults.customerId, customerId));

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db.update(customerIncotermsDefaults)
        .set({ incotermsKey, incotermsLocation, updatedAt: new Date() })
        .where(eq(customerIncotermsDefaults.customerId, customerId))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db.insert(customerIncotermsDefaults)
        .values({ customerId, incotermsKey, incotermsLocation })
        .returning();
      return created;
    }
  }

  async getSalesOrderIncoterms(salesOrderId: number) {
    return await db.select().from(salesOrderIncoterms).where(eq(salesOrderIncoterms.salesOrderId, salesOrderId));
  }

  async setSalesOrderIncoterms(salesOrderId: number, incotermsKey: string, incotermsLocation: string, isDefaulted: boolean = false, isUserOverride: boolean = false) {
    // Check if sales order already has incoterms
    const existing = await db.select().from(salesOrderIncoterms).where(eq(salesOrderIncoterms.salesOrderId, salesOrderId));

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db.update(salesOrderIncoterms)
        .set({ incotermsKey, incotermsLocation, isDefaulted, isUserOverride, updatedAt: new Date() })
        .where(eq(salesOrderIncoterms.salesOrderId, salesOrderId))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db.insert(salesOrderIncoterms)
        .values({ salesOrderId, incotermsKey, incotermsLocation, isDefaulted, isUserOverride })
        .returning();
      return created;
    }
  }

  async proposeIncotermsForCustomer(customerId: number) {
    // Get customer's default incoterms
    const customerDefaults = await this.getCustomerIncotermsDefaults(customerId);

    if (customerDefaults.length > 0) {
      const defaultIncoterm = customerDefaults[0];
      return {
        incotermsKey: defaultIncoterm.incotermsKey,
        incotermsLocation: defaultIncoterm.incotermsLocation,
        isDefaulted: true,
        source: 'customer_master'
      };
    }

    // If no customer defaults, return null
    return null;
  }

  async getAllCustomerIncotermsDefaults() {
    // Use raw SQL since erp_customers table is not defined in schema
    const result = await db.execute(sql`
      SELECT 
        d.id,
        d.customer_id as "customerId",
        d.incoterms_key as "incotermsKey",
        d.incoterms_location as "incotermsLocation",
        d.is_active as "isActive",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        c.customer_code as "customerCode",
        c.name as "customerName",
        c.country as "customerCountry"
      FROM sd_customer_incoterms_defaults d
      LEFT JOIN erp_customers c ON d.customer_id = c.id
      WHERE d.is_active = true
      ORDER BY c.customer_code
    `);

    return result.rows;
  }
}

export const salesDistributionService = new SalesDistributionService();