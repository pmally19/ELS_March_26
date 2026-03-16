import { db } from "../db";
import { quotations, quotationItems, salesOrders, salesOrderItems, inventoryReservations, customers } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { documentNumberService } from "./document-number-service";

export class QuotationService {

    // Create a new quotation
    async createQuotation(data: {
        customerId: number;
        documentType?: string;  // NEW: Document type (defaults to 'QT')
        quotationDate?: Date | string;
        validUntilDate: Date | string;
        currency: string;
        notes?: string;
        items: Array<{
            materialId: number;
            quantity: number;
            unit: string;
            unitPrice: number;
            description?: string;
        }>;
        userId: number;
    }) {
        // 1. Calculate totals
        const itemsWithTotals = data.items.map(item => ({
            ...item,
            netPrice: item.unitPrice, // Apply discount logic if needed
            lineTotal: item.quantity * item.unitPrice
        }));

        const totalAmount = itemsWithTotals.reduce((sum, item) => sum + item.lineTotal, 0);

        // 2. Get document type and its number range
        const documentType = data.documentType || 'QT';

        // Query the document type to get its number range (using direct SQL)
        const docTypeResult = await db.execute(sql`
            SELECT code, name, number_range 
            FROM sd_document_types 
            WHERE code = ${documentType} 
            AND category = 'QUOTATION'
            AND is_active = true
            LIMIT 1
        `);

        if (!docTypeResult.rows || docTypeResult.rows.length === 0) {
            throw new Error(`Document type ${documentType} not found or invalid for quotations`);
        }

        const numberRange = docTypeResult.rows[0].number_range || documentType;
        console.log(`📄 Creating quotation with document type: ${documentType}, number range: ${numberRange}`);

        // 3. Get next number from the specific number range for this document type
        const numberRangeResult = await db.execute(sql`
            UPDATE sd_number_ranges 
            SET current_number = (current_number::bigint + 1)::text,
                updated_at = NOW()
            WHERE object_code = 'QUOTATION' 
            AND range_number = ${numberRange}
            RETURNING 
                current_number,
                from_number,
                to_number
        `);

        if (!numberRangeResult.rows || numberRangeResult.rows.length === 0) {
            throw new Error(`Number range not found for document type ${documentType} (range: ${numberRange})`);
        }

        const currentNum = numberRangeResult.rows[0].current_number;
        const quotationNumber = currentNum; // Already formatted as 10-digit string

        console.log(`✅ Generated quotation number: ${quotationNumber} for type ${documentType}`);

        // 4. Create Quotation Header
        const [newQuotation] = await db.insert(quotations).values({
            quotationNumber,
            documentType: documentType,  // Store the document type
            customerId: data.customerId,
            quotationDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
            validUntilDate: new Date(data.validUntilDate), // Convert string to Date
            status: "DRAFT",
            totalAmount: totalAmount.toString(),
            currency: data.currency,
            notes: data.notes,
            createdBy: data.userId
        }).returning();

        // 5. Create Quotation Items
        if (itemsWithTotals.length > 0) {
            await db.insert(quotationItems).values(
                itemsWithTotals.map((item, index) => ({
                    quotationId: newQuotation.id,
                    lineNumber: (index + 1) * 10,
                    materialId: item.materialId,
                    description: item.description || "Item",
                    quantity: item.quantity.toString(),
                    unit: item.unit,
                    unitPrice: item.unitPrice.toString(),
                    netPrice: item.netPrice.toString(),
                    lineTotal: item.lineTotal.toString()
                }))
            );
        }

        return await this.getQuotationById(newQuotation.id);
    }

    // Get all quotations
    async getAllQuotations() {
        const allQuotations = await db.select({
            id: quotations.id,
            quotationNumber: quotations.quotationNumber,
            customerName: customers.name,
            quotationDate: quotations.quotationDate,
            validUntilDate: quotations.validUntilDate,
            status: quotations.status,
            totalAmount: quotations.totalAmount,
            currency: quotations.currency,
            notes: quotations.notes
        })
            .from(quotations)
            .leftJoin(customers, eq(quotations.customerId, customers.id))
            .orderBy(desc(quotations.createdAt));

        return allQuotations;
    }

    // Get single quotation by ID
    async getQuotationById(id: number) {
        const quotation = await db.query.quotations.findFirst({
            where: eq(quotations.id, id),
            with: {
                items: true
            }
        });

        // Fetch customer name manually to avoid complex relation setups if not present
        if (quotation) {
            const customer = await db.query.customers.findFirst({
                where: eq(customers.id, quotation.customerId)
            });
            return { ...quotation, customerName: customer?.name };
        }

        return quotation;
    }

    async updateQuotationStatus(id: number, status: string) {
        const [updated] = await db.update(quotations)
            .set({ status, updatedAt: new Date() })
            .where(eq(quotations.id, id))
            .returning();
        return updated;
    }

    // Convert Quotation to Sales Order
    async convertToSalesOrder(quotationId: number, userId: number) {
        return await db.transaction(async (tx) => {
            // 1. Get Quotation
            const quotation = await tx.query.quotations.findFirst({
                where: eq(quotations.id, quotationId),
                with: { items: true }
            });

            if (!quotation) throw new Error("Quotation not found");
            if (quotation.status === "CONVERTED") throw new Error("Quotation already converted");

            // 2. Get customer to retrieve sales organization (if not provided, we'll need to default or throw error)
            const customer = await tx.query.customers.findFirst({
                where: eq(customers.id, quotation.customerId)
            });

            if (!customer) throw new Error("Customer not found");

            // 3. Generate Sales Order Number
            const orderNumber = await documentNumberService.getNextNumber('SALES_ORDER');

            // 4. Create Sales Order (removed hardcoded values)
            const [newOrder] = await tx.insert(salesOrders).values({
                orderNumber,
                customerId: quotation.customerId,
                salesOrgId: customer.company_code_id || 1, // Get from customer or use default
                documentType: "STANDARD", // Replaced SAP terminology "TA" with business-friendly "STANDARD"
                totalAmount: quotation.totalAmount,
                subtotal: quotation.totalAmount,
                currency: quotation.currency,
                status: "Confirmed",
                quoteReference: quotation.quotationNumber,
                createdBy: userId
            }).returning();

            // 5. Create Sales Order Items
            if (quotation.items && quotation.items.length > 0) {
                // Get first item's plant if available, otherwise need to determine from business logic
                await tx.insert(salesOrderItems).values(
                    quotation.items.map(item => ({
                        salesOrderId: newOrder.id,
                        lineNumber: item.lineNumber,
                        materialId: item.materialId,
                        orderedQuantity: item.quantity,
                        unit: item.unit,
                        unitPrice: item.unitPrice,
                        netPrice: item.netPrice,
                        lineTotal: item.lineTotal,
                        plantId: 1 // TODO: Should be determined from material master or user selection
                    }))
                );
            }

            // 6. Update Quotation Status
            await tx.update(quotations)
                .set({
                    status: "CONVERTED",
                    convertedToOrderId: newOrder.id,
                    updatedAt: new Date()
                })
                .where(eq(quotations.id, quotationId));

            return newOrder;
        });
    }

    // Save quotation texts (header and item texts)
    async saveQuotationTexts(quotationId: number, texts: Array<{
        textTypeId: number;
        textContent: string;
        itemId?: number; // null for header texts, quotation_item_id for item texts
    }>) {
        try {
            // Delete existing texts
            await db.execute(sql`
                DELETE FROM sd_document_texts
                WHERE document_type = 'QUOTATION'
                AND document_id = ${quotationId}
            `);

            // Insert new texts
            if (texts && texts.length > 0) {
                for (const text of texts) {
                    await db.execute(sql`
                        INSERT INTO sd_document_texts (
                            document_type, document_id, item_id, text_type_id, text_content
                        )
                        VALUES (
                            'QUOTATION', ${quotationId}, ${text.itemId || null}, ${text.textTypeId}, ${text.textContent}
                        )
                    `);
                }
            }

            return { success: true, count: texts.length };
        } catch (error) {
            console.error('Error saving quotation texts:', error);
            throw error;
        }
    }

    // Get quotation texts
    async getQuotationTexts(quotationId: number) {
        try {
            const result = await db.execute(sql`
                SELECT 
                    dt.id,
                    dt.item_id,
                    dt.text_content,
                    tt.text_type_code,
                    tt.description as text_type_description,
                    tt.text_level
                FROM sd_document_texts dt
                LEFT JOIN sd_text_types tt ON dt.text_type_id = tt.id
                WHERE dt.document_type = 'QUOTATION'
                AND dt.document_id = ${quotationId}
                ORDER BY dt.item_id NULLS FIRST, tt.text_level
            `);

            return result.rows;
        } catch (error) {
            console.error('Error fetching quotation texts:', error);
            throw error;
        }
    }

    // Delete quotation
    async deleteQuotation(id: number) {
        return await db.transaction(async (tx) => {
            // First delete all quotation items
            await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));

            // Then delete the quotation
            await tx.delete(quotations).where(eq(quotations.id, id));

            return { success: true };
        });
    }
}

export const quotationService = new QuotationService();
