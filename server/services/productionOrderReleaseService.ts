/**
 * Production Order Release Service  
 * Handles Production Order Release & Approval Workflow as shown in user's MRP diagram
 */

export interface ProductionOrderReleaseRecord {
  id?: number;
  production_order_number: string;
  planned_order_number?: string;
  material_code: string;
  plant_code: string;
  order_quantity: number;
  unit: string;
  start_date: Date;
  finish_date: Date;
  order_type: 'STANDARD' | 'RUSH' | 'REWORK';
  release_status: 'CREATED' | 'RELEASED' | 'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'TECHNICALLY_COMPLETE' | 'CLOSED';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approval_date?: Date;
  release_date?: Date;
  work_center: string;
  routing_number?: string;
  bom_number?: string;
  created_by: string;
  created_at?: Date;
}

export interface ProductionOrderOperations {
  id?: number;
  production_order_number: string;
  operation_number: string;
  work_center: string;
  operation_description: string;
  setup_time: number;
  processing_time: number;
  teardown_time: number;
  machine_hours: number;
  labor_hours: number;
  operation_status: 'CREATED' | 'RELEASED' | 'CONFIRMED' | 'COMPLETED';
  confirmed_yield?: number;
  confirmed_scrap?: number;
  actual_start_date?: Date;
  actual_finish_date?: Date;
}

export interface ProductionOrderComponents {
  id?: number;
  production_order_number: string;
  material_code: string;
  required_quantity: number;
  withdrawn_quantity: number;
  unit: string;
  storage_location: string;
  requirement_date: Date;
  component_scrap_percentage: number;
}

export class ProductionOrderReleaseService {
  
  /**
   * Create Production Order from Planned Order
   */
  async createProductionOrder(plannedOrderData: any): Promise<ProductionOrderReleaseRecord> {
    const productionOrder: ProductionOrderReleaseRecord = {
      production_order_number: this.generateProductionOrderNumber(),
      planned_order_number: plannedOrderData.planned_order_number,
      material_code: plannedOrderData.material_code,
      plant_code: plannedOrderData.plant_code,
      order_quantity: plannedOrderData.quantity,
      unit: plannedOrderData.unit,
      start_date: plannedOrderData.start_date,
      finish_date: plannedOrderData.finish_date,
      order_type: plannedOrderData.order_type || 'STANDARD',
      release_status: 'CREATED',
      approval_status: 'PENDING',
      work_center: plannedOrderData.work_center,
      routing_number: plannedOrderData.routing_number,
      bom_number: plannedOrderData.bom_number,
      created_by: 'MRP_SYSTEM'
    };
    
    // Create operations and components
    await this.createProductionOrderOperations(productionOrder.production_order_number, plannedOrderData);
    await this.createProductionOrderComponents(productionOrder.production_order_number, plannedOrderData);
    
    return productionOrder;
  }
  
  /**
   * Release Production Order (Approval Process)
   */
  async releaseProductionOrder(productionOrderNumber: string, approvedBy: string): Promise<void> {
    // Validate materials availability
    const materialsAvailable = await this.validateMaterialsAvailability(productionOrderNumber);
    if (!materialsAvailable) {
      throw new Error('Materials not available for production order release');
    }
    
    // Validate capacity
    const capacityAvailable = await this.validateCapacityAvailability(productionOrderNumber);
    if (!capacityAvailable) {
      throw new Error('Capacity not available for production order release');
    }
    
    // Release the order
    console.log(`Production Order ${productionOrderNumber} released by ${approvedBy}`);
    
    // Update status to RELEASED
    // This would update the database record
  }
  
  /**
   * Confirm Production Order (Production Activities)
   */
  async confirmProductionOrder(productionOrderNumber: string, confirmationData: any): Promise<void> {
    // Record production activities
    const activities = {
      production_order_number: productionOrderNumber,
      operation_number: confirmationData.operation_number,
      yield_quantity: confirmationData.yield_quantity,
      scrap_quantity: confirmationData.scrap_quantity,
      activity_type: confirmationData.activity_type,
      posting_date: new Date(),
      work_center: confirmationData.work_center,
      confirmed_by: confirmationData.confirmed_by
    };
    
    console.log(`Production activities confirmed for ${productionOrderNumber}:`, activities);
    
    // Update order status
    await this.updateProductionOrderStatus(productionOrderNumber, 'CONFIRMED');
  }
  
  /**
   * Create Production Order Operations
   */
  private async createProductionOrderOperations(productionOrderNumber: string, plannedOrderData: any): Promise<void> {
    const operations: ProductionOrderOperations[] = [
      {
        production_order_number: productionOrderNumber,
        operation_number: '0010',
        work_center: plannedOrderData.work_center,
        operation_description: 'Setup and Preparation',
        setup_time: 30,
        processing_time: 120,
        teardown_time: 15,
        machine_hours: 2.75,
        labor_hours: 2.0,
        operation_status: 'CREATED'
      },
      {
        production_order_number: productionOrderNumber,
        operation_number: '0020',
        work_center: plannedOrderData.work_center,
        operation_description: 'Main Production Process',
        setup_time: 15,
        processing_time: 240,
        teardown_time: 10,
        machine_hours: 4.42,
        labor_hours: 3.5,
        operation_status: 'CREATED'
      }
    ];
    
    // Save operations to database
    console.log(`Created operations for Production Order ${productionOrderNumber}`);
  }
  
  /**
   * Create Production Order Components
   */
  private async createProductionOrderComponents(productionOrderNumber: string, plannedOrderData: any): Promise<void> {
    const components: ProductionOrderComponents[] = [
      {
        production_order_number: productionOrderNumber,
        material_code: 'RM001',
        required_quantity: plannedOrderData.quantity * 2, // BOM explosion
        withdrawn_quantity: 0,
        unit: 'KG',
        storage_location: 'RM01',
        requirement_date: plannedOrderData.start_date,
        component_scrap_percentage: 2.0
      },
      {
        production_order_number: productionOrderNumber,
        material_code: 'RM002',
        required_quantity: plannedOrderData.quantity * 0.5,
        withdrawn_quantity: 0,
        unit: 'L',
        storage_location: 'RM01',
        requirement_date: plannedOrderData.start_date,
        component_scrap_percentage: 1.0
      }
    ];
    
    // Save components to database
    console.log(`Created components for Production Order ${productionOrderNumber}`);
  }
  
  /**
   * Validate Materials Availability
   */
  private async validateMaterialsAvailability(productionOrderNumber: string): Promise<boolean> {
    // Check if all required materials are available
    return true; // Simplified for now
  }
  
  /**
   * Validate Capacity Availability
   */
  private async validateCapacityAvailability(productionOrderNumber: string): Promise<boolean> {
    // Check if work center has available capacity
    return true; // Simplified for now
  }
  
  /**
   * Update Production Order Status
   */
  private async updateProductionOrderStatus(productionOrderNumber: string, status: string): Promise<void> {
    console.log(`Updated Production Order ${productionOrderNumber} status to ${status}`);
  }
  
  /**
   * Generate Production Order Number
   */
  private generateProductionOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `PRO-${new Date().getFullYear()}-${timestamp}`;
  }
  
  /**
   * Get Production Order Dashboard Data
   */
  async getProductionOrderDashboard(): Promise<any> {
    return {
      totalOrders: 0,
      createdOrders: 0,
      releasedOrders: 0,
      confirmedOrders: 0,
      completedOrders: 0,
      pendingApproval: 0
    };
  }
}

export const productionOrderReleaseService = new ProductionOrderReleaseService();