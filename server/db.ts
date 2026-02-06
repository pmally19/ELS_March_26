
import * as schema from "@shared/schema";
import * as financialSchema from "@shared/financial-schema";
import * as financeSchema from "@shared/finance-schema";
import * as financialMasterDataSchema from "@shared/financial-master-data-schema";
import * as purchaseReferencesSchema from "@shared/purchase-references-schema";
import * as organizationalSchema from "@shared/organizational-schema";
import * as reconciliationAccountsSchema from "@shared/reconciliation-accounts-schema";
import * as glAccountGroupsSchema from "@shared/gl-account-groups-schema";
import * as postingPeriodControlSchema from "@shared/posting-period-control-schema";
import * as retainedEarningsAccountSchema from "@shared/retained-earnings-account-schema";
import * as chartOfDepreciationSchema from "@shared/chart-of-depreciation-schema";
import * as numberRangeObjectsSchema from "@shared/number-range-objects-schema";
import * as accountTypesSchema from "@shared/account-types-schema";
import * as ledgersSchema from "@shared/ledgers-schema";
import * as ledgerGroupsSchema from "@shared/ledger-groups-schema";
import * as companyCodeLedgerAssignmentSchema from "@shared/company-code-ledger-assignment-schema";
import * as accountingPrinciplesSchema from "@shared/accounting-principles-schema";
import * as toleranceGroupsSchema from "@shared/tolerance-groups-schema";
import * as documentSplittingSchema from "@shared/document-splitting-schema";
import * as costCenterCategoriesSchema from "@shared/cost-center-categories-schema";

import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config'; // Automatically loads environment variables from .env file

// Import centralized database connection
import { dbPool } from "./database";

// Use the centralized pool instead of creating a new one
export const pool = dbPool;

// Combine all schemas
const combinedSchema = {
  ...schema,
  ...financialSchema,
  ...financeSchema,
  ...financialMasterDataSchema,
  ...purchaseReferencesSchema,
  ...organizationalSchema,
  ...reconciliationAccountsSchema,
  ...glAccountGroupsSchema,
  ...postingPeriodControlSchema,
  ...retainedEarningsAccountSchema,
  ...chartOfDepreciationSchema,
  ...numberRangeObjectsSchema,
  ...accountTypesSchema,
  ...ledgersSchema,
  ...ledgerGroupsSchema,
  ...companyCodeLedgerAssignmentSchema,
  ...accountingPrinciplesSchema,
  ...toleranceGroupsSchema,
  ...documentSplittingSchema,
  ...costCenterCategoriesSchema
};

export const db = drizzle(pool, { schema: combinedSchema });