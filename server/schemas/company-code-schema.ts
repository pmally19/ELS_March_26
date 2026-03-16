import { z } from 'zod';

// Validation schema for company code - accept all frontend fields but only use database fields
export const companyCodeSchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  city: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
  language: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  active: z.boolean().default(true),
  fiscalYear: z.string().min(1, "Fiscal Year is required"),
  chartOfAccounts: z.string().optional(), // Chart of Accounts ID (chart_id)
  // Accept but ignore these frontend fields that don't exist in database
  description: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  taxId: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  address: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  state: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  postalCode: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  phone: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  email: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  website: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  logoUrl: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  region: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  regionId: z.union([z.number(), z.string()]).transform(val => {
    if (val === "" || val === null || val === undefined) return null;
    return Number(val);
  }).nullable().optional(),
});
