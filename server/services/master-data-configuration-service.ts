import { db } from "../db";
import { 
  fiscalYearVariants,
  documentNumberRanges,
  fieldStatusVariants,
  fieldStatusGroups,
  toleranceGroups,
  taxCodes,
  exchangeRateTypes,
  exchangeRates,
  functionalAreas,
  purchasingGroups,
  purchasingOrganizations,
  costElements,
  internalOrders,
  workCenters,
  billOfMaterials,
  productionOrders
} from "@shared/financial-master-data-schema";
import { creditControlAreas } from "@shared/organizational-schema";
import { glAccounts, costCenters } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class MasterDataConfigurationService {

  // Initialize Complete Financial Master Data Configuration
  async initializeCompleteConfiguration(): Promise<{
    success: boolean;
    componentsInitialized: string[];
    errors: string[];
  }> {
    console.log("Initializing complete financial master data configuration...");
    
    const componentsInitialized: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Initialize Fiscal Year Variants
      await this.createFiscalYearVariants();
      componentsInitialized.push("Fiscal Year Variants");

      // 2. Initialize Document Number Ranges
      await this.createDocumentNumberRanges();
      componentsInitialized.push("Document Number Ranges");

      // 3. Initialize Field Status Variants
      await this.createFieldStatusConfiguration();
      componentsInitialized.push("Field Status Configuration");

      // 4. Initialize Tolerance Groups
      await this.createToleranceGroups();
      componentsInitialized.push("Tolerance Groups");

      // 5. Initialize Tax Configuration
      await this.createTaxConfiguration();
      componentsInitialized.push("Tax Configuration");

      // 6. Initialize Exchange Rate Management
      await this.createExchangeRateConfiguration();
      componentsInitialized.push("Exchange Rate Management");

      // 7. Initialize Organizational Structure Extensions
      await this.createOrganizationalExtensions();
      componentsInitialized.push("Organizational Structure Extensions");

      // 8. Initialize Purchasing Configuration
      await this.createPurchasingConfiguration();
      componentsInitialized.push("Purchasing Configuration");

      // 9. Initialize Controlling Components
      await this.createControllingComponents();
      componentsInitialized.push("Controlling Components");

      // 10. Initialize Production Planning Components
      await this.createProductionPlanningComponents();
      componentsInitialized.push("Production Planning Components");

      console.log("Complete financial master data configuration initialized successfully");
      
      return {
        success: true,
        componentsInitialized,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(errorMessage);
      console.error("Configuration initialization error:", error);
      
      return {
        success: false,
        componentsInitialized,
        errors
      };
    }
  }

  private async createFiscalYearVariants(): Promise<void> {
    const variants = [
      {
        code: "K4",
        name: "Calendar Year, 4 Special Periods",
        description: "Standard calendar year with 12 posting periods and 4 special periods",
        postingPeriods: 12,
        specialPeriods: 4,
        isCalendarYear: true,
        startMonth: 1,
        endMonth: 12
      },
      {
        code: "K2",
        name: "Calendar Year, 2 Special Periods", 
        description: "Calendar year with 12 posting periods and 2 special periods",
        postingPeriods: 12,
        specialPeriods: 2,
        isCalendarYear: true,
        startMonth: 1,
        endMonth: 12
      },
      {
        code: "V3",
        name: "Fiscal Year April-March",
        description: "Fiscal year from April to March with 12 periods",
        postingPeriods: 12,
        specialPeriods: 4,
        isCalendarYear: false,
        startMonth: 4,
        endMonth: 3,
        yearShift: 1
      }
    ];

    for (const variant of variants) {
      try {
        await db.insert(fiscalYearVariants).values(variant);
      } catch (error) {
        console.log(`Fiscal year variant already exists: ${variant.code}`);
      }
    }
  }

  private async createDocumentNumberRanges(): Promise<void> {
    const currentYear = new Date().getFullYear().toString();
    
    const numberRanges = [
      // General Ledger Document Types
      {
        companyCode: "1000",
        documentType: "SA",
        fiscalYear: currentYear,
        numberRangeObject: "RF_BELEG",
        fromNumber: "1800000000",
        toNumber: "1899999999",
        currentNumber: "1800000001"
      },
      {
        companyCode: "1000", 
        documentType: "DZ",
        fiscalYear: currentYear,
        numberRangeObject: "RF_BELEG",
        fromNumber: "5100000000",
        toNumber: "5199999999",
        currentNumber: "5100000001"
      },
      // Accounts Payable
      {
        companyCode: "1000",
        documentType: "KR",
        fiscalYear: currentYear,
        numberRangeObject: "RF_BELEG",
        fromNumber: "5900000000",
        toNumber: "5999999999",
        currentNumber: "5900000001"
      },
      // Accounts Receivable
      {
        companyCode: "1000",
        documentType: "DR",
        fiscalYear: currentYear,
        numberRangeObject: "RF_BELEG",
        fromNumber: "1900000000",
        toNumber: "1999999999",
        currentNumber: "1900000001"
      },
      // Material Documents
      {
        companyCode: "1000",
        documentType: "WE",
        fiscalYear: currentYear,
        numberRangeObject: "MATBELEG",
        fromNumber: "4900000000",
        toNumber: "4999999999",
        currentNumber: "4900000001"
      },
      // Purchase Orders
      {
        companyCode: "1000",
        documentType: "NB",
        fiscalYear: currentYear,
        numberRangeObject: "BANF",
        fromNumber: "4500000000",
        toNumber: "4599999999",
        currentNumber: "4500000001"
      }
    ];

    for (const range of numberRanges) {
      try {
        await db.insert(documentNumberRanges).values(range);
      } catch (error) {
        console.log(`Number range already exists: ${range.documentType}-${range.companyCode}`);
      }
    }
  }

  private async createFieldStatusConfiguration(): Promise<void> {
    const variants = [
      {
        code: "FSV1",
        name: "Field Status Variant 1000",
        description: "Standard field status variant for company code 1000"
      },
      {
        code: "FSV2", 
        name: "Field Status Variant 2000",
        description: "Field status variant for subsidiary operations"
      }
    ];

    for (const variant of variants) {
      try {
        const [insertedVariant] = await db.insert(fieldStatusVariants).values(variant).returning();
        
        // Create field status groups for this variant
        const fieldGroups = [
          { variantId: insertedVariant.id, groupCode: "G001", fieldName: "COST_CENTER", fieldStatus: "M" },
          { variantId: insertedVariant.id, groupCode: "G001", fieldName: "PROFIT_CENTER", fieldStatus: "O" },
          { variantId: insertedVariant.id, groupCode: "G001", fieldName: "ASSIGNMENT", fieldStatus: "O" },
          { variantId: insertedVariant.id, groupCode: "G001", fieldName: "TEXT", fieldStatus: "O" },
          { variantId: insertedVariant.id, groupCode: "G002", fieldName: "COST_CENTER", fieldStatus: "S" },
          { variantId: insertedVariant.id, groupCode: "G002", fieldName: "TRADING_PARTNER", fieldStatus: "M" },
          { variantId: insertedVariant.id, groupCode: "G003", fieldName: "PAYMENT_TERMS", fieldStatus: "M" },
          { variantId: insertedVariant.id, groupCode: "G003", fieldName: "BASELINE_DATE", fieldStatus: "M" }
        ];

        for (const group of fieldGroups) {
          try {
            await db.insert(fieldStatusGroups).values(group);
          } catch (error) {
            console.log(`Field status group already exists: ${group.groupCode}-${group.fieldName}`);
          }
        }
      } catch (error) {
        console.log(`Field status variant already exists: ${variant.code}`);
      }
    }
  }

  private async createToleranceGroups(): Promise<void> {
    const tolerances = [
      {
        code: "EMPL001",
        name: "Employee Tolerance Group 1",
        description: "Standard employee posting tolerance",
        companyCode: "1000",
        userType: "Employee",
        upperAmountLimit: "10000.00",
        percentageLimit: "5.00",
        absoluteAmountLimit: "100.00",
        paymentDifferenceTolerance: "10.00",
        cashDiscountTolerance: "5.00"
      },
      {
        code: "GL001",
        name: "GL Account Tolerance Group 1", 
        description: "Standard GL account tolerance for posting differences",
        companyCode: "1000",
        userType: "GL_Account",
        upperAmountLimit: "1000.00",
        percentageLimit: "2.00",
        absoluteAmountLimit: "50.00"
      },
      {
        code: "CUST001",
        name: "Customer Tolerance Group 1",
        description: "Standard customer payment tolerance",
        companyCode: "1000", 
        userType: "Customer",
        paymentDifferenceTolerance: "25.00",
        cashDiscountTolerance: "10.00"
      },
      {
        code: "VEND001",
        name: "Vendor Tolerance Group 1",
        description: "Standard vendor payment tolerance",
        companyCode: "1000",
        userType: "Vendor", 
        paymentDifferenceTolerance: "50.00",
        cashDiscountTolerance: "15.00"
      }
    ];

    for (const tolerance of tolerances) {
      try {
        await db.insert(toleranceGroups).values(tolerance);
      } catch (error) {
        console.log(`Tolerance group already exists: ${tolerance.code}`);
      }
    }
  }

  private async createTaxConfiguration(): Promise<void> {
    const taxCodes = [
      {
        code: "I0",
        name: "Input Tax 0%",
        description: "Non-taxable input tax",
        country: "US",
        taxType: "Input",
        taxRate: "0.00",
        effectiveFrom: new Date("2024-01-01")
      },
      {
        code: "I1",
        name: "Input Tax 7%", 
        description: "Standard input tax rate",
        country: "US",
        taxType: "Input",
        taxRate: "7.00",
        taxAccount: "154000",
        effectiveFrom: new Date("2024-01-01")
      },
      {
        code: "V0",
        name: "Output Tax 0%",
        description: "Non-taxable output tax",
        country: "US", 
        taxType: "Output",
        taxRate: "0.00",
        effectiveFrom: new Date("2024-01-01")
      },
      {
        code: "V1",
        name: "Output Tax 7%",
        description: "Standard output tax rate",
        country: "US",
        taxType: "Output", 
        taxRate: "7.00",
        taxAccount: "176000",
        effectiveFrom: new Date("2024-01-01")
      },
      {
        code: "V2",
        name: "Output Tax 10%",
        description: "Higher output tax rate",
        country: "US",
        taxType: "Output",
        taxRate: "10.00", 
        taxAccount: "176000",
        effectiveFrom: new Date("2024-01-01")
      }
    ];

    for (const tax of taxCodes) {
      try {
        await db.insert(taxCodes).values(tax);
      } catch (error) {
        console.log(`Tax code already exists: ${tax.code}`);
      }
    }
  }

  private async createExchangeRateConfiguration(): Promise<void> {
    // Create exchange rate types
    const rateTypes = [
      {
        code: "M",
        name: "Average Rate",
        description: "Average exchange rate for the period",
        rateSource: "Manual",
        isDefault: true
      },
      {
        code: "B",
        name: "Bank Buying Rate",
        description: "Bank buying rate for currency conversion",
        rateSource: "Bank"
      },
      {
        code: "G",
        name: "Bank Selling Rate", 
        description: "Bank selling rate for currency conversion",
        rateSource: "Bank"
      }
    ];

    for (const rateType of rateTypes) {
      try {
        const [insertedType] = await db.insert(exchangeRateTypes).values(rateType).returning();
        
        // Create sample exchange rates
        const currentDate = new Date();
        const rates = [
          {
            rateTypeId: insertedType.id,
            fromCurrency: "EUR", 
            toCurrency: "USD",
            validFrom: currentDate,
            exchangeRate: "1.08500"
          },
          {
            rateTypeId: insertedType.id,
            fromCurrency: "GBP",
            toCurrency: "USD", 
            validFrom: currentDate,
            exchangeRate: "1.26500"
          },
          {
            rateTypeId: insertedType.id,
            fromCurrency: "JPY",
            toCurrency: "USD",
            validFrom: currentDate,
            exchangeRate: "0.00650",
            ratio: 100
          }
        ];

        for (const rate of rates) {
          try {
            await db.insert(exchangeRates).values(rate);
          } catch (error) {
            console.log(`Exchange rate already exists: ${rate.fromCurrency}-${rate.toCurrency}`);
          }
        }
      } catch (error) {
        console.log(`Exchange rate type already exists: ${rateType.code}`);
      }
    }
  }

  private async createOrganizationalExtensions(): Promise<void> {
    // Create Functional Areas
    const functionalAreas = [
      {
        code: "01",
        name: "Administration",
        description: "Administrative functions and overhead"
      },
      {
        code: "02", 
        name: "Production",
        description: "Manufacturing and production operations"
      },
      {
        code: "03",
        name: "Sales",
        description: "Sales and marketing activities"
      },
      {
        code: "04",
        name: "Research & Development",
        description: "R&D and innovation activities"
      }
    ];

    for (const area of functionalAreas) {
      try {
        await db.insert(functionalAreas).values(area);
      } catch (error) {
        console.log(`Functional area already exists: ${area.code}`);
      }
    }

    // Credit Control Areas should be created via database migration script
    // See: database/migrate-credit-control-areas.sql
    // This ensures proper company_code_id foreign key relationships
  }

  private async createPurchasingConfiguration(): Promise<void> {
    // Create Purchasing Groups
    const groups = [
      {
        code: "001",
        name: "Raw Materials",
        description: "Purchasing group for raw materials",
        responsiblePerson: "John Smith",
        emailAddress: "john.smith@company.com",
        phoneNumber: "+1-555-0101"
      },
      {
        code: "002",
        name: "Finished Goods",
        description: "Purchasing group for finished goods and trading items",
        responsiblePerson: "Sarah Johnson", 
        emailAddress: "sarah.johnson@company.com",
        phoneNumber: "+1-555-0102"
      },
      {
        code: "003",
        name: "Services",
        description: "Purchasing group for services and maintenance",
        responsiblePerson: "Mike Davis",
        emailAddress: "mike.davis@company.com",
        phoneNumber: "+1-555-0103"
      }
    ];

    for (const group of groups) {
      try {
        await db.insert(purchasingGroups).values(group);
      } catch (error) {
        console.log(`Purchasing group already exists: ${group.code}`);
      }
    }

    // Create Purchasing Organizations
    const organizations = [
      {
        code: "1000",
        name: "Corporate Purchasing",
        description: "Central purchasing organization",
        companyCode: "1000",
        currency: "USD"
      },
      {
        code: "2000", 
        name: "Plant-Specific Purchasing",
        description: "Decentralized purchasing for specific plants",
        companyCode: "1000",
        currency: "USD"
      }
    ];

    for (const org of organizations) {
      try {
        await db.insert(purchasingOrganizations).values(org);
      } catch (error) {
        console.log(`Purchasing organization already exists: ${org.code}`);
      }
    }
  }

  private async createControllingComponents(): Promise<void> {
    // Create Cost Elements
    const elements = [
      {
        code: "400000",
        name: "Revenue",
        description: "Primary cost element for revenue",
        category: "Primary",
        costElementClass: "1",
        glAccount: "400000"
      },
      {
        code: "500000",
        name: "Cost of Sales", 
        description: "Primary cost element for cost of sales",
        category: "Primary",
        costElementClass: "2",
        glAccount: "500000"
      },
      {
        code: "620000",
        name: "Manufacturing Costs",
        description: "Primary cost element for manufacturing costs",
        category: "Primary", 
        costElementClass: "2",
        glAccount: "620000"
      },
      {
        code: "900001",
        name: "Internal Activity Allocation",
        description: "Secondary cost element for activity allocation",
        category: "Secondary",
        costElementClass: "42"
      }
    ];

    for (const element of elements) {
      try {
        await db.insert(costElements).values(element);
      } catch (error) {
        console.log(`Cost element already exists: ${element.code}`);
      }
    }

    // Create Internal Orders
    const orders = [
      {
        orderNumber: "100001",
        orderType: "ZAD1",
        description: "Marketing Campaign Q1 2024",
        responsibleCostCenter: "MKTG001",
        budgetAmount: "50000.00",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        status: "released"
      },
      {
        orderNumber: "100002",
        orderType: "ZAD1", 
        description: "IT Infrastructure Project",
        responsibleCostCenter: "IT001",
        budgetAmount: "75000.00",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        status: "planned"
      }
    ];

    for (const order of orders) {
      try {
        await db.insert(internalOrders).values(order);
      } catch (error) {
        console.log(`Internal order already exists: ${order.orderNumber}`);
      }
    }
  }

  private async createProductionPlanningComponents(): Promise<void> {
    // Create Work Centers
    const centers = [
      {
        code: "ASSEMBLY1",
        name: "Assembly Line 1",
        description: "Main assembly line for product manufacturing",
        plant: "1000",
        workCenterCategory: "0001",
        capacity: "8.00",
        unitOfMeasure: "HR",
        standardRate: "25.00",
        costCenter: "PROD001"
      },
      {
        code: "PACKAGING",
        name: "Packaging Center",
        description: "Product packaging and finishing operations",
        plant: "1000", 
        workCenterCategory: "0002",
        capacity: "16.00",
        unitOfMeasure: "HR",
        standardRate: "18.00",
        costCenter: "PROD002"
      }
    ];

    for (const center of centers) {
      try {
        await db.insert(workCenters).values(center);
      } catch (error) {
        console.log(`Work center already exists: ${center.code}`);
      }
    }

    // BOMs should be created through the BOM management interface, not hardcoded
    // Removed hardcoded BOM data - all BOMs must be created through proper UI/API
  }

  // Get comprehensive configuration status
  async getConfigurationStatus(): Promise<{
    fiscalYearVariants: number;
    documentNumberRanges: number;
    fieldStatusVariants: number;
    toleranceGroups: number;
    taxCodes: number;
    exchangeRateTypes: number;
    functionalAreas: number;
    creditControlAreas: number;
    purchasingGroups: number;
    costElements: number;
    workCenters: number;
    systemHealth: string;
  }> {
    try {
      const [fiscalVariants] = await db.select({ count: sql<number>`count(*)` }).from(fiscalYearVariants);
      const [numberRanges] = await db.select({ count: sql<number>`count(*)` }).from(documentNumberRanges);
      const [fieldVariants] = await db.select({ count: sql<number>`count(*)` }).from(fieldStatusVariants);
      const [tolerances] = await db.select({ count: sql<number>`count(*)` }).from(toleranceGroups);
      const [taxes] = await db.select({ count: sql<number>`count(*)` }).from(taxCodes);
      const [rateTypes] = await db.select({ count: sql<number>`count(*)` }).from(exchangeRateTypes);
      const [funcAreas] = await db.select({ count: sql<number>`count(*)` }).from(functionalAreas);
      const [creditAreas] = await db.select({ count: sql<number>`count(*)` }).from(creditControlAreas);
      const [purchGroups] = await db.select({ count: sql<number>`count(*)` }).from(purchasingGroups);
      const [costElems] = await db.select({ count: sql<number>`count(*)` }).from(costElements);
      const [workCtrs] = await db.select({ count: sql<number>`count(*)` }).from(workCenters);

      return {
        fiscalYearVariants: fiscalVariants?.count || 0,
        documentNumberRanges: numberRanges?.count || 0,
        fieldStatusVariants: fieldVariants?.count || 0,
        toleranceGroups: tolerances?.count || 0,
        taxCodes: taxes?.count || 0,
        exchangeRateTypes: rateTypes?.count || 0,
        functionalAreas: funcAreas?.count || 0,
        creditControlAreas: creditAreas?.count || 0,
        purchasingGroups: purchGroups?.count || 0,
        costElements: costElems?.count || 0,
        workCenters: workCtrs?.count || 0,
        systemHealth: "operational"
      };
    } catch (error) {
      console.error('Configuration status check failed:', error);
      return {
        fiscalYearVariants: 0,
        documentNumberRanges: 0,
        fieldStatusVariants: 0,
        toleranceGroups: 0,
        taxCodes: 0,
        exchangeRateTypes: 0,
        functionalAreas: 0,
        creditControlAreas: 0,
        purchasingGroups: 0,
        costElements: 0,
        workCenters: 0,
        systemHealth: "error"
      };
    }
  }
}

export const masterDataConfigurationService = new MasterDataConfigurationService();