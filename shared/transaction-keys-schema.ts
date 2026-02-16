import { pgTable, serial, varchar, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const transactionKeys = pgTable('transaction_keys', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 3 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    businessContext: varchar('business_context', { length: 100 }),
    isActive: boolean('is_active').default(true),
    createdBy: integer('created_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

// Zod schemas for validation
export const insertTransactionKeySchema = createInsertSchema(transactionKeys, {
    code: z.string()
        .min(1, 'Code is required')
        .max(3, 'Code must be exactly 3 characters')
        .regex(/^[A-Z0-9]{1,3}$/, 'Code must contain only uppercase letters and numbers'),
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    businessContext: z.string().max(100).optional().nullable(),
    isActive: z.boolean().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectTransactionKeySchema = createSelectSchema(transactionKeys);

export const updateTransactionKeySchema = insertTransactionKeySchema.partial();

// TypeScript types
export type TransactionKey = typeof transactionKeys.$inferSelect;
export type InsertTransactionKey = z.infer<typeof insertTransactionKeySchema>;
export type UpdateTransactionKey = z.infer<typeof updateTransactionKeySchema>;
