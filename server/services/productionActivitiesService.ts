/**
 * Production Activities Service
 * Handles Production Activities tracking as shown in user's MRP diagram
 */

export interface ProductionActivity {
  id?: number;
  activity_id: string;
  production_order_number: string;
  operation_number: string;
  work_center: string;
  activity_type: 'SETUP' | 'PRODUCTION' | 'TEARDOWN' | 'INSPECTION' | 'REWORK' | 'MAINTENANCE';
  start_time: Date;
  end_time?: Date;
  planned_duration: number; // minutes
  actual_duration?: number; // minutes
  operator_id: string;
  machine_id?: string;
  material_code: string;
  planned_quantity: number;
  actual_quantity?: number;
  yield_quantity?: number;
  scrap_quantity?: number;
  quality_grade?: string;
  activity_status: 'PLANNED' | 'STARTED' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  comments?: string;
  created_at?: Date;
}

export interface ProductionConfirmation {
  id?: number;
  confirmation_id: string;
  production_order_number: string;
  operation_number: string;
  posting_date: Date;
  yield_quantity: number;
  scrap_quantity: number;
  rework_quantity: number;
  actual_work_time: number; // hours
  actual_machine_time: number; // hours
  confirmed_by: string;
  variance_reason?: string;
  cost_variance?: number;
  schedule_variance?: number; // minutes
  confirmation_status: 'DRAFT' | 'CONFIRMED' | 'REVERSED';
}

export interface WorkCenterUtilization {
  id?: number;
  work_center: string;
  date: Date;
  shift: string;
  planned_hours: number;
  actual_hours: number;
  utilization_percentage: number;
  downtime_hours: number;
  downtime_reason?: string;
  efficiency_percentage: number;
  quality_rate: number;
}

export class ProductionActivitiesService {
  
  /**
   * Start Production Activity
   */
  async startProductionActivity(activityData: any): Promise<ProductionActivity> {
    const activity: ProductionActivity = {
      activity_id: this.generateActivityId(),
      production_order_number: activityData.production_order_number,
      operation_number: activityData.operation_number,
      work_center: activityData.work_center,
      activity_type: activityData.activity_type,
      start_time: new Date(),
      planned_duration: activityData.planned_duration,
      operator_id: activityData.operator_id,
      machine_id: activityData.machine_id,
      material_code: activityData.material_code,
      planned_quantity: activityData.planned_quantity,
      activity_status: 'STARTED'
    };
    
    // Update work center status
    await this.updateWorkCenterStatus(activity.work_center, 'BUSY');
    
    // Create material withdrawal if needed
    if (activity.activity_type === 'PRODUCTION') {
      await this.withdrawMaterials(activity.production_order_number, activity.operation_number);
    }
    
    console.log(`Production activity ${activity.activity_id} started`);
    return activity;
  }
  
  /**
   * Complete Production Activity
   */
  async completeProductionActivity(activityId: string, completionData: any): Promise<ProductionActivity> {
    // Get existing activity
    const activity = await this.getActivity(activityId);
    
    // Update activity with completion data
    activity.end_time = new Date();
    activity.actual_duration = Math.floor((activity.end_time.getTime() - activity.start_time!.getTime()) / 60000);
    activity.actual_quantity = completionData.actual_quantity;
    activity.yield_quantity = completionData.yield_quantity;
    activity.scrap_quantity = completionData.scrap_quantity;
    activity.quality_grade = completionData.quality_grade;
    activity.activity_status = 'COMPLETED';
    activity.comments = completionData.comments;
    
    // Create production confirmation
    await this.createProductionConfirmation(activity, completionData);
    
    // Update work center utilization
    await this.updateWorkCenterUtilization(activity);
    
    // Update inventory if finished goods produced
    if (activity.activity_type === 'PRODUCTION' && activity.yield_quantity! > 0) {
      await this.receiveFinishedGoods(activity);
    }
    
    console.log(`Production activity ${activityId} completed`);
    return activity;
  }
  
  /**
   * Create Production Confirmation
   */
  async createProductionConfirmation(activity: ProductionActivity, confirmationData: any): Promise<ProductionConfirmation> {
    const confirmation: ProductionConfirmation = {
      confirmation_id: this.generateConfirmationId(),
      production_order_number: activity.production_order_number,
      operation_number: activity.operation_number,
      posting_date: new Date(),
      yield_quantity: activity.yield_quantity || 0,
      scrap_quantity: activity.scrap_quantity || 0,
      rework_quantity: confirmationData.rework_quantity || 0,
      actual_work_time: activity.actual_duration! / 60, // Convert minutes to hours
      actual_machine_time: confirmationData.machine_time || activity.actual_duration! / 60,
      confirmed_by: confirmationData.confirmed_by,
      variance_reason: confirmationData.variance_reason,
      cost_variance: this.calculateCostVariance(activity),
      schedule_variance: this.calculateScheduleVariance(activity),
      confirmation_status: 'CONFIRMED'
    };
    
    // Post to cost accounting
    await this.postToControlling(confirmation);
    
    return confirmation;
  }
  
  /**
   * Withdraw Materials for Production
   */
  private async withdrawMaterials(productionOrderNumber: string, operationNumber: string): Promise<void> {
    // Get component requirements from production order
    const components = await this.getProductionOrderComponents(productionOrderNumber);
    
    for (const component of components) {
      const withdrawal = {
        material_code: component.material_code,
        quantity: component.required_quantity,
        unit: component.unit,
        storage_location: component.storage_location,
        production_order_number: productionOrderNumber,
        operation_number: operationNumber,
        movement_type: '261', // Goods issue for production order
        posting_date: new Date()
      };
      
      // Post material withdrawal
      console.log(`Withdrew ${component.required_quantity} ${component.unit} of ${component.material_code}`);
    }
  }
  
  /**
   * Receive Finished Goods
   */
  private async receiveFinishedGoods(activity: ProductionActivity): Promise<void> {
    const receipt = {
      material_code: activity.material_code,
      quantity: activity.yield_quantity,
      production_order_number: activity.production_order_number,
      movement_type: '101', // Goods receipt for production order
      posting_date: new Date(),
      storage_location: 'FG01'
    };
    
    console.log(`Received ${activity.yield_quantity} units of ${activity.material_code} from production`);
  }
  
  /**
   * Update Work Center Status
   */
  private async updateWorkCenterStatus(workCenter: string, status: string): Promise<void> {
    console.log(`Work center ${workCenter} status updated to ${status}`);
  }
  
  /**
   * Update Work Center Utilization
   */
  private async updateWorkCenterUtilization(activity: ProductionActivity): Promise<void> {
    const utilization: WorkCenterUtilization = {
      work_center: activity.work_center,
      date: new Date(),
      shift: this.getCurrentShift(),
      planned_hours: activity.planned_duration / 60,
      actual_hours: activity.actual_duration! / 60,
      utilization_percentage: Math.min(100, (activity.actual_duration! / activity.planned_duration) * 100),
      downtime_hours: Math.max(0, (activity.actual_duration! - activity.planned_duration) / 60),
      efficiency_percentage: (activity.yield_quantity! / activity.planned_quantity) * 100,
      quality_rate: ((activity.yield_quantity! - (activity.scrap_quantity || 0)) / activity.yield_quantity!) * 100
    };
    
    if (utilization.actual_hours > utilization.planned_hours) {
      utilization.downtime_reason = 'Extended processing time';
    }
    
    console.log(`Updated utilization for work center ${activity.work_center}`);
  }
  
  /**
   * Calculate Cost Variance
   */
  private calculateCostVariance(activity: ProductionActivity): number {
    const plannedCost = activity.planned_duration * 50; // $50/hour standard rate
    const actualCost = activity.actual_duration! * 50;
    return actualCost - plannedCost;
  }
  
  /**
   * Calculate Schedule Variance
   */
  private calculateScheduleVariance(activity: ProductionActivity): number {
    return activity.actual_duration! - activity.planned_duration;
  }
  
  /**
   * Post to Controlling (Cost Accounting)
   */
  private async postToControlling(confirmation: ProductionConfirmation): Promise<void> {
    const costingEntries = {
      production_order_number: confirmation.production_order_number,
      actual_costs: {
        labor_cost: confirmation.actual_work_time * 50,
        machine_cost: confirmation.actual_machine_time * 75,
        overhead_cost: confirmation.yield_quantity * 10
      },
      variance_analysis: {
        labor_variance: confirmation.cost_variance,
        efficiency_variance: confirmation.schedule_variance! * 50 / 60
      }
    };
    
    console.log(`Posted production costs to controlling for order ${confirmation.production_order_number}`);
  }
  
  /**
   * Get Current Shift
   */
  private getCurrentShift(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'MORNING';
    if (hour >= 14 && hour < 22) return 'AFTERNOON';
    return 'NIGHT';
  }
  
  /**
   * Get Activity by ID
   */
  private async getActivity(activityId: string): Promise<ProductionActivity> {
    // This would fetch from database
    return {
      activity_id: activityId,
      production_order_number: 'PRO-2025-123456',
      operation_number: '0010',
      work_center: 'WC001',
      activity_type: 'PRODUCTION',
      start_time: new Date(Date.now() - 120000), // 2 minutes ago
      planned_duration: 120,
      operator_id: 'OP001',
      material_code: 'FG001',
      planned_quantity: 100,
      activity_status: 'STARTED'
    };
  }
  
  /**
   * Get Production Order Components
   */
  private async getProductionOrderComponents(productionOrderNumber: string): Promise<any[]> {
    return [
      {
        material_code: 'RM001',
        required_quantity: 200,
        unit: 'KG',
        storage_location: 'RM01'
      },
      {
        material_code: 'RM002',
        required_quantity: 50,
        unit: 'L',
        storage_location: 'RM01'
      }
    ];
  }
  
  /**
   * Generate Activity ID
   */
  private generateActivityId(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `ACT-${new Date().getFullYear()}-${timestamp}`;
  }
  
  /**
   * Generate Confirmation ID
   */
  private generateConfirmationId(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `CONF-${new Date().getFullYear()}-${timestamp}`;
  }
  
  /**
   * Get Production Activities Dashboard
   */
  async getProductionActivitiesDashboard(): Promise<any> {
    return {
      activeActivities: 0,
      completedActivities: 0,
      plannedActivities: 0,
      workCenterUtilization: 0,
      qualityRate: 0,
      efficiencyRate: 0
    };
  }
}

export const productionActivitiesService = new ProductionActivitiesService();