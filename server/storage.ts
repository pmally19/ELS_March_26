import {
  users, User, InsertUser,
  customers, Customer, InsertCustomer,
  categories, Category, InsertCategory,
  materials, Material, InsertMaterial,
  orders, Order, InsertOrder,
  orderItems, OrderItem, InsertOrderItem,
  invoices, Invoice, InsertInvoice,
  expenses, Expense, InsertExpense,
  stockMovements, StockMovement, InsertStockMovement
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lt, gte, lte, sql, count, sum } from "drizzle-orm";

// Interface defining all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<boolean>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<boolean>;

  // Material operations
  getMaterials(): Promise<Material[]>;
  getMaterial(id: number): Promise<Material | undefined>;
  getMaterialByCode(code: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: number): Promise<boolean>;

  // Order operations
  getOrders(): Promise<any[]>;
  getOrder(id: number): Promise<any | undefined>;
  getRecentOrders(limit?: number): Promise<any[]>;
  createOrder(order: any): Promise<any>;
  updateOrder(id: number, order: any): Promise<any>;
  deleteOrder(id: number): Promise<boolean>;

  // Invoice operations
  getInvoices(): Promise<any[]>;
  getInvoice(id: number): Promise<any | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<boolean>;

  // Expense operations
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<boolean>;

  // Stock movement operations
  adjustStock(movement: InsertStockMovement): Promise<StockMovement>;
  getProductMovements(productId: number): Promise<StockMovement[]>;

  // Dashboard operations
  getDashboardStats(): Promise<any>;
  getSalesStats(): Promise<any>;
  getInventoryStats(): Promise<any>;
  getFinanceStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(customers.name);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({
        ...customer,
        updatedAt: new Date(),
        updated_at: new Date(),
        version: sql`version + 1`
      })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id));
    return true;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db
      .delete(categories)
      .where(eq(categories.id, id));
    return true;
  }

  // Material operations
  async getMaterials(): Promise<Material[]> {
    return db.select().from(materials).orderBy(materials.description);
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async getMaterialByCode(code: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.materialCode, code));
    return material || undefined;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db
      .insert(materials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db
      .update(materials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial;
  }

  async deleteMaterial(id: number): Promise<boolean> {
    await db
      .delete(materials)
      .where(eq(materials.id, id));
    return true;
  }

  async getLowStockProducts(): Promise<any[]> {
    // Return low stock materials from stock_balances
    const lowStock = await db.execute(sql`
      SELECT 
        m.id,
        m.description as name,
        COALESCE(m.code, 'UNKNOWN') as sku,
        sb.quantity as stock,
        0 as "minStock", -- materials table doesn't have min_stock
        'General' as category
      FROM stock_balances sb
      JOIN materials m ON sb.material_code = m.code
      WHERE sb.stock_type = 'AVAILABLE'
      AND sb.quantity < 10 -- Hardcoded threshold for now
      LIMIT 10
    `);

    return lowStock.rows;
  }

  async getTopSellingProducts(limit: number = 5): Promise<any[]> {
    // This would typically use a JOIN and GROUP BY in SQL
    // For demonstration, returning mock data that matches the expected format
    const topProducts = await db.execute(sql`
      SELECT 
        m.id,
        m.description as name,
        'General' as category,
        m.base_price as price,
        SUM(oi.quantity) as "unitsSold"
      FROM materials m
      JOIN order_items oi ON m.id = oi.material_id
      GROUP BY m.id, m.description, m.base_price
      ORDER BY SUM(oi.quantity) DESC
      LIMIT ${limit}
    `);

    return topProducts.rows.map(p => ({
      ...p,
      unitsSold: p.unitsSold || 0
    }));
  }

  // Order operations
  async getOrders(): Promise<any[]> {
    const result = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      date: orders.date,
      status: orders.status,
      total: orders.total,
      notes: orders.notes,
      shippingAddress: orders.shippingAddress,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email
      }
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.date));

    return result;
  }

  async getOrder(id: number): Promise<any | undefined> {
    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      date: orders.date,
      status: orders.status,
      total: orders.total,
      notes: orders.notes,
      shippingAddress: orders.shippingAddress,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email
      }
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id));

    if (!order) return undefined;

    const items = await db.select({
      id: orderItems.id,
      materialId: orderItems.materialId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      total: orderItems.total,
      product: {
        name: materials.description
      }
    })
      .from(orderItems)
      .leftJoin(materials, eq(orderItems.materialId, materials.id))
      .where(eq(orderItems.orderId, id));

    return {
      ...order,
      items
    };
  }

  async getRecentOrders(limit: number = 5): Promise<any[]> {
    const result = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      date: orders.date,
      status: orders.status,
      amount: orders.total,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email
      }
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.date))
      .limit(limit);

    return result;
  }

  async createOrder(orderData: any): Promise<any> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      const { customerId, date, status, items, notes, shippingAddress } = orderData;

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().substring(7)}`;

      // Calculate total
      let total = 0;
      for (const item of items) {
        total += parseFloat(item.unitPrice) * parseInt(item.quantity);
      }

      // Create order
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerId: parseInt(customerId),
          date: date ? new Date(date) : new Date(),
          status,
          total,
          notes,
          shippingAddress,
          userId: 1 // Default user ID
        })
        .returning();

      // Create order items
      for (const item of items) {
        // Assume item.materialId is passed from frontend
        await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            materialId: parseInt(item.materialId),
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            total: parseFloat(item.unitPrice) * parseInt(item.quantity)
          });

        // Update product stock (stock_balances)
        // We need to know which plant/storage loc to deduct from.
        // For simple logic, we might need a default or just log it.
        // Assuming a default PL01 / SL01 for now or skip stock update here if handled by specific routes.
        // But storage.ts logic implies it should update stock.

        // Let's get material code
        const [mat] = await tx.select().from(materials).where(eq(materials.id, parseInt(item.materialId)));
        if (mat) {
          // Decrease stock
          // We'll update the 'AVAILABLE' stock in 'PL01'/'SL01' as a default if not specified
          // Ideally orderData should contain plant/storage info.
          await tx.execute(sql`
                UPDATE stock_balances 
                SET quantity = quantity - ${parseInt(item.quantity)},
                    available_quantity = available_quantity - ${parseInt(item.quantity)}
                WHERE material_code = ${mat.materialCode} 
                  AND plant_code = 'PL01' 
                  AND storage_location = 'SL01' 
                  AND stock_type = 'AVAILABLE'
             `);
        }

        // Record stock movement
        await tx
          .insert(stockMovements)
          .values({
            materialId: parseInt(item.materialId),
            type: 'remove',
            quantity: parseInt(item.quantity),
            reason: 'Sale',
            userId: 1 // Default user ID
          });
      }

      return this.getOrder(order.id);
    });
  }

  async updateOrder(id: number, orderData: any): Promise<any> {
    // Implementation would be similar to createOrder but with updates
    // This is a simplified version
    return await db.transaction(async (tx) => {
      const { status, notes, shippingAddress } = orderData;

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status,
          notes,
          shippingAddress,
          updatedAt: new Date()
        })
        .where(eq(orders.id, id))
        .returning();

      return this.getOrder(id);
    });
  }

  async deleteOrder(id: number): Promise<boolean> {
    await db.transaction(async (tx) => {
      // Delete order items
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));

      // Delete the order
      await tx.delete(orders).where(eq(orders.id, id));
    });

    return true;
  }

  // Invoice operations
  async getInvoices(): Promise<any[]> {
    const result = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      orderNumber: orders.orderNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      status: invoices.status,
      paidDate: invoices.paidDate,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email
      }
    })
      .from(invoices)
      .leftJoin(orders, eq(invoices.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(invoices.issueDate));

    return result;
  }

  async getInvoice(id: number): Promise<any | undefined> {
    const [invoice] = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      orderId: invoices.orderId,
      orderNumber: orders.orderNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      status: invoices.status,
      paidDate: invoices.paidDate,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        address: customers.address
      }
    })
      .from(invoices)
      .leftJoin(orders, eq(invoices.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(invoices.id, id));

    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id));
    return true;
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id));
    return true;
  }

  // Stock movement operations
  async adjustStock(movement: InsertStockMovement): Promise<StockMovement> {
    return await db.transaction(async (tx) => {
      // Create stock movement record
      const [newMovement] = await tx
        .insert(stockMovements)
        .values(movement)
        .returning();

      // Update product stock (stock_balances)
      // Since movement just has materialId (formerly productId) and no plant info, we assume default as per our strategy
      const [mat] = await tx.select().from(materials).where(eq(materials.id, movement.materialId!));
      if (mat) {
        const change = movement.type === 'add' ? movement.quantity : -movement.quantity;
        await tx.execute(sql`
                UPDATE stock_balances 
                SET quantity = quantity + ${change},
                    available_quantity = available_quantity + ${change}
                WHERE material_code = ${mat.materialCode} 
                  AND plant_code = 'PL01' 
                  AND storage_location = 'SL01' 
                  AND stock_type = 'AVAILABLE'
             `);
      }

      return newMovement;
    });
  }

  async getProductMovements(materialId: number): Promise<StockMovement[]> {
    return db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.materialId, materialId))
      .orderBy(desc(stockMovements.date));
  }

  // Dashboard operations
  async getDashboardStats(): Promise<any> {
    // Total sales
    const [salesResult] = await db
      .select({ totalSales: sum(orders.total) })
      .from(orders);

    const totalSales = salesResult.totalSales || 0;

    // Total orders
    const [ordersResult] = await db
      .select({ count: count() })
      .from(orders);

    const totalOrders = ordersResult.count;

    // Inventory value (from materials + stock_balances logic)
    // Approximate: sum(stock_balances.quantity * materials.basePrice)
    const inventoryResult = await db.execute(sql`
        SELECT SUM(sb.quantity * COALESCE(m.base_price, 0)) as value
        FROM stock_balances sb
        JOIN materials m ON sb.material_code = m.code
    `);

    const inventoryValue = parseFloat(inventoryResult.rows[0].value?.toString() || "0");

    // Low stock items
    const lowStockItems = 0; // Placeholder

    return {
      totalSales,
      totalOrders,
      inventoryValue,
      lowStockItems
    };
  }

  async getSalesStats(): Promise<any> {
    // Total sales
    const [salesResult] = await db
      .select({ totalSales: sum(orders.total) })
      .from(orders);

    const totalSales = salesResult.totalSales || 0;

    // Total customers
    const [customersResult] = await db
      .select({ count: count() })
      .from(customers);

    const totalCustomers = customersResult.count;

    // Total orders
    const [ordersResult] = await db
      .select({ count: count() })
      .from(orders);

    const totalOrders = ordersResult.count;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Recent orders
    const recentOrders = await this.getRecentOrders(5);

    return {
      totalSales,
      totalCustomers,
      totalOrders,
      avgOrderValue,
      recentOrders
    };
  }

  async getInventoryStats(): Promise<any> {
    // Total products (materials)
    const [productsResult] = await db
      .select({ count: count() })
      .from(materials);

    const totalProducts = productsResult.count;

    // Inventory value
    const inventoryResult = await db.execute(sql`
        SELECT SUM(sb.quantity * COALESCE(m.base_price, 0)) as value
        FROM stock_balances sb
        JOIN materials m ON sb.material_code = m.code
    `);

    const inventoryValue = parseFloat(inventoryResult.rows[0].value?.toString() || "0");

    // Low stock items
    const lowStockItems = 0; // Placeholder

    // Out of stock items
    const outOfStockItems = 0; // Placeholder

    // Sample alerts for demo
    const alerts = [
      { type: 'critical', message: 'Laptop Pro X12 is out of stock', timestamp: '2 hours ago' },
      { type: 'warning', message: 'Wireless Earbuds inventory below threshold', timestamp: '5 hours ago' },
      { type: 'info', message: 'Smart Watch S4 restock order placed', timestamp: '1 day ago' }
    ];

    return {
      totalProducts,
      inventoryValue,
      lowStockItems,
      outOfStockItems,
      alerts
    };
  }

  async getFinanceStats(): Promise<any> {
    // Total revenue
    const [revenueResult] = await db
      .select({ total: sum(orders.total) })
      .from(orders);

    const totalRevenue = revenueResult.total || 0;

    // Total expenses
    const [expensesResult] = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses);

    const totalExpenses = expensesResult.total || 0;

    // Net profit
    const netProfit = totalRevenue - totalExpenses;

    // Outstanding invoices
    const [outstandingResult] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(eq(invoices.status, 'Due'));

    const outstandingInvoices = outstandingResult.total || 0;

    // Growth percentages (mock data for demo)
    const revenueGrowth = 8.5;
    const expenseGrowth = 3.2;
    const profitGrowth = 12.7;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      outstandingInvoices,
      revenueGrowth,
      expenseGrowth,
      profitGrowth
    };
  }
}

export const storage = new DatabaseStorage();
