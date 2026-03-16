import { z } from 'zod';

// Validation schema for plant
export const plantSchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional().nullable(),
  companyCodeId: z.number().min(1, "Company Code is required"),
  valuationGroupingCodeId: z.number().optional().nullable(),
  type: z.string().min(1, "Type is required"),
  category: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  manager: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  operatingHours: z.string().optional().nullable(),
  coordinates: z.string().optional().nullable(),
  factoryCalendar: z.string().optional().nullable(),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
  region: z.string().optional().nullable(),
  regionId: z.coerce.number().optional().nullable(),
});
