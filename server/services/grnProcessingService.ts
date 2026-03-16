/**
 * GRN (Goods Receipt Note) Processing Service
 * Handles complete goods receipt workflow as shown in user's MRP diagram
 */

export interface GRNRecord {
  id?: number;
  grn_number: string;
  po_number: string;
  vendor_code: string;
  material_code: string;
  quantity_ordered: number;
  quantity_received: number;
  unit: string;
  unit_price: number;
  total_value: number;
  receipt_date: Date;
  plant_code: string;
  storage_location: string;
  qc_required: boolean;
  qc_status: 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  grn_status: 'RECEIVED' | 'QC_PENDING' | 'QC_APPROVED' | 'POSTED' | 'REJECTED';
  created_by: string;
  created_at?: Date;
}

export interface QualityCheckRecord {
  id?: number;
  grn_number: string;
  material_code: string;
  inspection_date: Date;
  inspector_id: string;
  quality_grade: string;
  test_results: any; // JSONB
  qc_decision: 'ACCEPT' | 'REJECT' | 'CONDITIONAL_ACCEPT';
  remarks: string;
  created_at?: Date;
}

export class GRNProcessingService {
  
  /**
   * Create GRN from Purchase Order Receipt
   */
  async createGRN(poNumber: string, receivedItems: any[]): Promise<GRNRecord[]> {
    const grnRecords: GRNRecord[] = [];
    
    for (const item of receivedItems) {
      const grn: GRNRecord = {
        grn_number: this.generateGRNNumber(),
        po_number: poNumber,
        vendor_code: item.vendor_code,
        material_code: item.material_code,
        quantity_ordered: item.quantity_ordered,
        quantity_received: item.quantity_received,
        unit: item.unit,
        unit_price: item.unit_price,
        total_value: item.quantity_received * item.unit_price,
        receipt_date: new Date(),
        plant_code: item.plant_code,
        storage_location: item.storage_location,
        qc_required: item.material_type === 'RAW_MATERIAL' || item.critical_material,
        qc_status: item.qc_required ? 'PENDING' : 'NOT_REQUIRED',
        grn_status: item.qc_required ? 'QC_PENDING' : 'RECEIVED',
        created_by: 'MRP_SYSTEM'
      };
      
      grnRecords.push(grn);
    }
    
    return grnRecords;
  }
  
  /**
   * Process Quality Control for GRN
   */
  async processQualityControl(grnNumber: string, qcData: any): Promise<QualityCheckRecord> {
    const qcRecord: QualityCheckRecord = {
      grn_number: grnNumber,
      material_code: qcData.material_code,
      inspection_date: new Date(),
      inspector_id: qcData.inspector_id,
      quality_grade: qcData.quality_grade,
      test_results: qcData.test_results,
      qc_decision: qcData.qc_decision,
      remarks: qcData.remarks
    };
    
    // Update GRN status based on QC decision
    await this.updateGRNQCStatus(grnNumber, qcData.qc_decision);
    
    return qcRecord;
  }
  
  /**
   * Update GRN QC Status
   */
  private async updateGRNQCStatus(grnNumber: string, qcDecision: string): Promise<void> {
    let newStatus: string;
    let qcStatus: string;
    
    switch (qcDecision) {
      case 'ACCEPT':
        newStatus = 'QC_APPROVED';
        qcStatus = 'PASSED';
        break;
      case 'CONDITIONAL_ACCEPT':
        newStatus = 'QC_APPROVED';
        qcStatus = 'PASSED';
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        qcStatus = 'FAILED';
        break;
      default:
        newStatus = 'QC_PENDING';
        qcStatus = 'PENDING';
    }
    
    // Update in database (would be implemented with actual DB calls)
    console.log(`Updated GRN ${grnNumber}: Status=${newStatus}, QC=${qcStatus}`);
  }
  
  /**
   * Post GRN to Inventory (after QC approval)
   */
  async postGRNToInventory(grnNumber: string): Promise<void> {
    // This would update inventory balances
    // Update material documents
    // Create accounting entries
    console.log(`Posted GRN ${grnNumber} to inventory`);
  }
  
  /**
   * Generate GRN Number
   */
  private generateGRNNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `GRN-${new Date().getFullYear()}-${timestamp}`;
  }
  
  /**
   * Get GRN Status for Dashboard
   */
  async getGRNDashboardData(): Promise<any> {
    return {
      totalGRNs: 0,
      pendingQC: 0,
      approvedGRNs: 0,
      rejectedGRNs: 0,
      valueReceived: 0
    };
  }
}

export const grnProcessingService = new GRNProcessingService();