import { db } from "../db";
import { orders, customers } from "@shared/schema";
import { eq } from "drizzle-orm";

export class SalesOrderService {
  
  // Create sales order using existing orders table
  async createSalesOrder(orderData: {
    customerId: number;
    items: Array<{
      materialNumber?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) {
    try {
      // Simple order number generation
      const orderNumber = `SO-2025-${Date.now()}`;
      
      // Calculate total
      const totalAmount = orderData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      );

      // Create order record (using correct schema)
      const [newOrder] = await db.insert(orders).values({
        orderNumber: orderNumber,
        customerId: orderData.customerId,
        status: "CREATED",
        total: totalAmount,
        notes: `Order with ${orderData.items.length} items`,
        shippingAddress: "TBD",
        userId: 1
      }).returning();

      return {
        success: true,
        salesOrder: {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          totalAmount: newOrder.total.toString(),
          status: newOrder.status
        },
        items: orderData.items.map((item, index) => ({
          lineItem: (index + 1) * 10,
          materialNumber: item.materialNumber || `MAT-${Date.now()}-${index}`,
          description: item.description || "Item",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          netAmount: item.quantity * item.unitPrice
        }))
      };
    } catch (error) {
      console.error("Error creating sales order:", error);
      throw error;
    }
  }

  // Get all orders
  async getAllOrders() {
    try {
      console.log("🔍 getAllOrders: Starting to fetch orders from database...");
      const allOrders = await db.select().from(orders);
      console.log(`✅ getAllOrders: Found ${allOrders.length} orders`);
      console.log("📊 Orders data:", allOrders);
      
      const result = {
        success: true,
        orders: allOrders,
        totalCount: allOrders.length,
        totalValue: allOrders.reduce((sum, order) => 
          sum + (order.total || 0), 0
        )
      };
      
      console.log("📤 getAllOrders: Returning result:", result);
      return result;
    } catch (error) {
      console.error("❌ Error getting orders:", error);
      console.error("❌ Error stack:", error.stack);
      throw error;
    }
  }
}

export const salesOrderService = new SalesOrderService();