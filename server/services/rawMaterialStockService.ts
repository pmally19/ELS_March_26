import pkg from 'pg';
const { Pool } = pkg;

interface RawMaterialRequirement {
  materialCode: string;
  requiredQuantity: number;
  availableStock: number;
  shortfall: number;
  plantId: number;
  bomComponent: boolean;
}

interface BOMComponent {
  parentMaterial: string;
  componentMaterial: string;
  quantityPer: number;
  componentType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PURCHASED_PART';
}

export class RawMaterialStockService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Check raw material availability for production requirements
   * This follows the RM Stock Check step in your diagram
   */
  async checkRawMaterialAvailability(
    finishedGoodCode: string,
    requiredQuantity: number,
    plantId: number
  ): Promise<RawMaterialRequirement[]> {
    try {
      // First, get BOM components for the finished good
      const bomQuery = `
        SELECT 
          bom_header.material_code as parent_material,
          bom_items.component_material,
          bom_items.quantity_per,
          bom_items.component_type
        FROM bom_header 
        JOIN bom_items ON bom_header.id = bom_items.bom_header_id
        WHERE bom_header.material_code = $1 
        AND bom_header.plant_id = $2
        AND bom_items.component_type IN ('RAW_MATERIAL', 'SEMI_FINISHED')
      `;

      const bomResult = await this.pool.query(bomQuery, [finishedGoodCode, plantId]);
      const bomComponents: BOMComponent[] = bomResult.rows;

      if (bomComponents.length === 0) {
        console.log(`No BOM found for material ${finishedGoodCode} in plant ${plantId}`);
        return [];
      }

      const requirements: RawMaterialRequirement[] = [];

      // Check stock for each raw material component
      for (const component of bomComponents) {
        const totalRequired = component.quantityPer * requiredQuantity;
        
        // Check current stock availability
        const stockQuery = `
          SELECT 
            material_code,
            current_stock,
            safety_stock,
            minimum_level
          FROM stock_availability_check 
          WHERE material_code = $1 AND plant_id = $2
        `;

        const stockResult = await this.pool.query(stockQuery, [component.componentMaterial, plantId]);
        
        let availableStock = 0;
        if (stockResult.rows.length > 0) {
          availableStock = parseFloat(stockResult.rows[0].current_stock) || 0;
        }

        const shortfall = Math.max(0, totalRequired - availableStock);

        requirements.push({
          materialCode: component.componentMaterial,
          requiredQuantity: totalRequired,
          availableStock,
          shortfall,
          plantId,
          bomComponent: true
        });
      }

      return requirements;
    } catch (error) {
      console.error('Error checking raw material availability:', error);
      throw error;
    }
  }

  /**
   * Create purchase requisitions for raw material shortfalls
   * This implements the PR to Procurement step from your diagram
   */
  async createPurchaseRequisitionsForShortfalls(
    requirements: RawMaterialRequirement[],
    requestorName: string = 'MRP System'
  ): Promise<{ created: number; requisitions: any[] }> {
    try {
      const requisitions = [];
      let created = 0;

      for (const req of requirements) {
        if (req.shortfall > 0) {
          // Generate PR number
          const prNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          
          // Create purchase requisition
          const insertQuery = `
            INSERT INTO purchase_requisitions (
              requisition_number,
              requestor_name,
              request_date,
              required_date,
              plant_id,
              priority,
              status,
              approval_status,
              business_justification,
              created_by
            ) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', $3, 'HIGH', 'OPEN', 'PENDING', 'MRP-generated requirement for production', 'MRP_SYSTEM')
            RETURNING id
          `;

          const prResult = await this.pool.query(insertQuery, [
            prNumber,
            requestorName,
            req.plantId
          ]);

          const prId = prResult.rows[0].id;

          // Add line item for the material
          const lineItemQuery = `
            INSERT INTO purchase_requisition_items (
              pr_id,
              material_code,
              description,
              quantity,
              unit_of_measure,
              estimated_price,
              total_value,
              delivery_date
            ) VALUES ($1, $2, $3, $4, 'PC', 100.00, $5, CURRENT_DATE + INTERVAL '7 days')
          `;

          await this.pool.query(lineItemQuery, [
            prId,
            req.materialCode,
            `Raw material for production - ${req.materialCode}`,
            req.shortfall,
            req.shortfall * 100 // estimated total value
          ]);

          requisitions.push({
            prNumber,
            materialCode: req.materialCode,
            quantity: req.shortfall,
            plantId: req.plantId
          });

          created++;
        }
      }

      return { created, requisitions };
    } catch (error) {
      console.error('Error creating purchase requisitions:', error);
      throw error;
    }
  }

  /**
   * Get raw material stock dashboard
   */
  async getRawMaterialDashboard(plantId?: number): Promise<any> {
    try {
      const baseWhereClause = plantId ? 'WHERE plant_id = $1' : '';
      const params = plantId ? [plantId] : [];

      // Critical raw materials (below safety stock)
      const criticalQuery = `
        SELECT 
          material_code,
          current_stock,
          safety_stock,
          minimum_level,
          plant_id,
          (safety_stock - current_stock) as shortage_quantity
        FROM stock_availability_check 
        ${baseWhereClause}
        AND current_stock < safety_stock
        ORDER BY shortage_quantity DESC
      `;

      const criticalResult = await this.pool.query(criticalQuery, params);

      // Total raw materials count
      const totalQuery = `
        SELECT COUNT(*) as total_materials
        FROM stock_availability_check 
        ${baseWhereClause}
      `;

      const totalResult = await this.pool.query(totalQuery, params);

      // Pending purchase requisitions
      const prQuery = `
        SELECT COUNT(*) as pending_prs
        FROM purchase_requisitions 
        WHERE status = 'OPEN' AND approval_status = 'PENDING'
        ${plantId ? 'AND plant_id = $1' : ''}
      `;

      const prResult = await this.pool.query(prQuery, params);

      return {
        criticalMaterials: criticalResult.rows.length,
        totalMaterials: parseInt(totalResult.rows[0]?.total_materials || '0'),
        pendingPurchaseRequisitions: parseInt(prResult.rows[0]?.pending_prs || '0'),
        criticalMaterialsList: criticalResult.rows
      };
    } catch (error) {
      console.error('Error fetching raw material dashboard:', error);
      throw error;
    }
  }
}