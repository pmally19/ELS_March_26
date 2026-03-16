import { db } from "../db";
import { 
  orders,
  customers,
  products,
  glAccounts
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class SalesFinanceIntegrationService {

  // Generate Order Number
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    // Count existing orders using raw count
    const existingOrders = await db.select().from(orders);
    const nextNumber = existingOrders.length + 1;
    
    return `SO-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }

  // Create Sales Order (simplified version for existing schema)
  async createSalesOrder(orderData: {
    customerId: number;
    salesOrganization?: string;
    distributionChannel?: string;
    division?: string;
    requestedDeliveryDate?: Date;
    items: Array<{
      materialNumber?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      materialId?: number;
    }>;
    createdBy: number;
  }) {
    return await db.transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber();

      // Calculate total amount
      const totalAmount = orderData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      );

      // Get customer info
      const [customer] = await tx.select()
        .from(customers)
        .where(eq(customers.id, orderData.customerId))
        .limit(1);

      // Create sales order using existing orders table
      const [salesOrder] = await tx.insert(orders).values({
        order_number: orderNumber,
        customer_id: orderData.customerId,
        customer_name: customer?.name || `Customer ${orderData.customerId}`,
        delivery_date: orderData.requestedDeliveryDate || new Date(),
        status: "CREATED",
        total_amount: totalAmount.toString(),
        payment_status: "PENDING",
        shipping_address: customer?.address || "TBD",
        billing_address: customer?.address || "TBD",
        notes: `Sales order created with ${orderData.items.length} items`,
        created_by: orderData.createdBy
      }).returning();

      return { 
        salesOrder: {
          id: salesOrder.id,
          orderNumber: salesOrder.order_number,
          totalAmount: salesOrder.total_amount,
          status: salesOrder.status
        },
        orderItems: orderData.items.map((item, index) => ({
          lineItem: (index + 1) * 10,
          materialNumber: item.materialNumber || `MAT-${Date.now()}-${index}`,
          description: item.description || "Sales Item",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          netAmount: item.quantity * item.unitPrice
        }))
      };
    });
  }

  // Get Sales Orders
  async getSalesOrders(filters: {
    customerId?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  } = {}) {
    let query = db.select().from(orders);

    if (filters.customerId) {
      query = query.where(eq(orders.customer_id, filters.customerId));
    }

    if (filters.status) {
      query = query.where(eq(orders.status, filters.status));
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    query = query.orderBy(desc(orders.created_at));

    const results = await query;
    
    return {
      orders: results,
      totalCount: results.length,
      statistics: {
        totalValue: results.reduce((sum, order) => 
          sum + parseFloat(order.total_amount || "0"), 0
        ),
        statusBreakdown: results.reduce((acc, order) => {
          acc[order.status || "UNKNOWN"] = (acc[order.status || "UNKNOWN"] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }

  // Basic pricing calculation
  async calculatePricing(items: Array<{
    materialId?: number;
    quantity: number;
    unitPrice: number;
  }>) {
    return items.map(item => ({
      ...item,
      netAmount: item.quantity * item.unitPrice,
      taxAmount: 0, // Simplified - no tax calculation
      totalAmount: item.quantity * item.unitPrice
    }));
  }
}

export const salesFinanceIntegration = new SalesFinanceIntegrationService();