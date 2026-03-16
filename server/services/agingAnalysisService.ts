import { db } from '../db';
import { arOpenItems } from '@shared/finance-schema';
import { sql, eq, and, gte, lt } from 'drizzle-orm';

export class AgingAnalysisService {
  /**
   * Calculate and update aging buckets for AR open items
   * Uses system configuration for bucket names (no hardcoded values)
   */
  async updateAgingBuckets(): Promise<{ updated: number }> {
    try {
      // Get aging bucket configuration from system_configuration
      const bucketConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_current' AND active = true LIMIT 1) as current_bucket,
          (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_30_days' AND active = true LIMIT 1) as bucket_30,
          (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_60_days' AND active = true LIMIT 1) as bucket_60,
          (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_90_days' AND active = true LIMIT 1) as bucket_90,
          (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_over_90' AND active = true LIMIT 1) as bucket_over_90
      `);

      const buckets = bucketConfigResult.rows[0];
      
      if (!buckets?.current_bucket || !buckets?.bucket_30 || !buckets?.bucket_60 || 
          !buckets?.bucket_90 || !buckets?.bucket_over_90) {
        throw new Error('Aging bucket configuration not found. Please configure aging bucket values in system_configuration');
      }

      const currentDate = new Date();
      const currentBucket = String(buckets.current_bucket);
      const bucket30 = String(buckets.bucket_30);
      const bucket60 = String(buckets.bucket_60);
      const bucket90 = String(buckets.bucket_90);
      const bucketOver90 = String(buckets.bucket_over_90);

      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_open' AND active = true LIMIT 1) as open_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
      `);

      const openStatus = statusConfigResult.rows[0]?.open_status;
      const partialStatus = statusConfigResult.rows[0]?.partial_status;

      if (!openStatus || !partialStatus) {
        throw new Error('AR status configuration not found. Please configure ar_status_open and ar_status_partial in system_configuration');
      }

      // Update aging buckets based on due date
      // Current: due_date >= CURRENT_DATE
      const currentResult = await db.execute(sql`
        UPDATE ar_open_items
        SET aging_bucket = ${currentBucket}
        WHERE active = true
          AND status IN (${openStatus}, ${partialStatus})
          AND due_date >= CURRENT_DATE
          AND (aging_bucket IS NULL OR aging_bucket != ${currentBucket})
      `);

      // 30 Days: due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days'
      const bucket30Result = await db.execute(sql`
        UPDATE ar_open_items
        SET aging_bucket = ${bucket30}
        WHERE active = true
          AND status IN (${openStatus}, ${partialStatus})
          AND due_date < CURRENT_DATE
          AND due_date >= CURRENT_DATE - INTERVAL '30 days'
          AND (aging_bucket IS NULL OR aging_bucket != ${bucket30})
      `);

      // 60 Days: due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days'
      const bucket60Result = await db.execute(sql`
        UPDATE ar_open_items
        SET aging_bucket = ${bucket60}
        WHERE active = true
          AND status IN (${openStatus}, ${partialStatus})
          AND due_date < CURRENT_DATE - INTERVAL '30 days'
          AND due_date >= CURRENT_DATE - INTERVAL '60 days'
          AND (aging_bucket IS NULL OR aging_bucket != ${bucket60})
      `);

      // 90 Days: due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days'
      const bucket90Result = await db.execute(sql`
        UPDATE ar_open_items
        SET aging_bucket = ${bucket90}
        WHERE active = true
          AND status IN (${openStatus}, ${partialStatus})
          AND due_date < CURRENT_DATE - INTERVAL '60 days'
          AND due_date >= CURRENT_DATE - INTERVAL '90 days'
          AND (aging_bucket IS NULL OR aging_bucket != ${bucket90})
      `);

      // Over 90: due_date < CURRENT_DATE - INTERVAL '90 days'
      const over90Result = await db.execute(sql`
        UPDATE ar_open_items
        SET aging_bucket = ${bucketOver90}
        WHERE active = true
          AND status IN (${openStatus}, ${partialStatus})
          AND due_date < CURRENT_DATE - INTERVAL '90 days'
          AND (aging_bucket IS NULL OR aging_bucket != ${bucketOver90})
      `);

      const totalUpdated = 
        (currentResult.rowsAffected || 0) +
        (bucket30Result.rowsAffected || 0) +
        (bucket60Result.rowsAffected || 0) +
        (bucket90Result.rowsAffected || 0) +
        (over90Result.rowsAffected || 0);

      return { updated: totalUpdated };
    } catch (error: any) {
      console.error('Error updating aging buckets:', error);
      throw new Error(`Failed to update aging buckets: ${error.message}`);
    }
  }

  /**
   * Get aging analysis report
   */
  async getAgingReport(customerId?: number): Promise<any[]> {
    try {
      const customerFilter = customerId ? sql`AND aoi.customer_id = ${customerId}` : sql``;
      
      const report = await db.execute(sql`
        SELECT 
          aoi.aging_bucket,
          COUNT(*) as item_count,
          SUM(aoi.outstanding_amount) as total_outstanding
        FROM ar_open_items aoi
        WHERE aoi.active = true
          AND aoi.outstanding_amount > 0
          ${customerFilter}
        GROUP BY aoi.aging_bucket
        ORDER BY 
          CASE aoi.aging_bucket
            WHEN (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_current' AND active = true LIMIT 1) THEN 1
            WHEN (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_30_days' AND active = true LIMIT 1) THEN 2
            WHEN (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_60_days' AND active = true LIMIT 1) THEN 3
            WHEN (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_90_days' AND active = true LIMIT 1) THEN 4
            WHEN (SELECT config_value FROM system_configuration WHERE config_key = 'aging_bucket_over_90' AND active = true LIMIT 1) THEN 5
            ELSE 6
          END
      `);

      return report.rows;
    } catch (error: any) {
      console.error('Error getting aging report:', error);
      throw new Error(`Failed to get aging report: ${error.message}`);
    }
  }
}

export const agingAnalysisService = new AgingAnalysisService();

