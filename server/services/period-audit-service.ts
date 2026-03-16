import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

/**
 * Period Audit Service
 * Logs all period status changes for compliance and troubleshooting
 */

export interface AuditLogEntry {
    fiscalPeriodId?: number;
    tableName: string;
    recordId: number;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    changedBy?: number;
    changeReason?: string;
    ipAddress?: string;
    userAgent?: string;
}

export class PeriodAuditService {
    /**
     * Log a period status change
     */
    static async logChange(entry: AuditLogEntry): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO period_status_audit (
          fiscal_period_id, table_name, record_id, field_name,
          old_value, new_value, changed_by, change_reason,
          ip_address, user_agent, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
                [
                    entry.fiscalPeriodId || null,
                    entry.tableName,
                    entry.recordId,
                    entry.fieldName,
                    entry.oldValue,
                    entry.newValue,
                    entry.changedBy || null,
                    entry.changeReason || null,
                    entry.ipAddress || null,
                    entry.userAgent || null
                ]
            );
        } catch (error) {
            console.error('Failed to log period audit:', error);
            // Don't throw - audit failures shouldn't block operations
        }
    }

    /**
     * Log multiple changes in a single transaction
     */
    static async logMultipleChanges(entries: AuditLogEntry[]): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const entry of entries) {
                await client.query(
                    `INSERT INTO period_status_audit (
            fiscal_period_id, table_name, record_id, field_name,
            old_value, new_value, changed_by, change_reason,
            ip_address, user_agent, changed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
                    [
                        entry.fiscalPeriodId || null,
                        entry.tableName,
                        entry.recordId,
                        entry.fieldName,
                        entry.oldValue,
                        entry.newValue,
                        entry.changedBy || null,
                        entry.changeReason || null,
                        entry.ipAddress || null,
                        entry.userAgent || null
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Failed to log multiple audit entries:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Get audit trail for a specific fiscal period
     */
    static async getAuditTrail(fiscalPeriodId: number): Promise<any[]> {
        const result = await pool.query(
            `SELECT 
        id, table_name, record_id, field_name,
        old_value, new_value, changed_by, change_reason,
        changed_at, ip_address
      FROM period_status_audit
      WHERE fiscal_period_id = $1
      ORDER BY changed_at DESC
      LIMIT 100`,
            [fiscalPeriodId]
        );

        return result.rows;
    }

    /**
     * Get recent audit logs across all periods
     */
    static async getRecentAudits(limit: number = 50): Promise<any[]> {
        const result = await pool.query(
            `SELECT 
        psa.id, psa.table_name, psa.record_id, psa.field_name,
        psa.old_value, psa.new_value, psa.changed_by, psa.change_reason,
        psa.changed_at,
        fp.year, fp.period, fp.name as period_name
      FROM period_status_audit psa
      LEFT JOIN fiscal_periods fp ON psa.fiscal_period_id = fp.id
      ORDER BY psa.changed_at DESC
      LIMIT $1`,
            [limit]
        );

        return result.rows;
    }

    /**
     * Express middleware to automatically log period changes
     */
    static auditMiddleware(options: {
        tableName: string;
        extractRecordId: (req: Request) => number;
        extractFiscalPeriodId?: (req: Request) => number;
    }) {
        return async (req: Request, res: Response, next: NextFunction) => {
            // Store original status/method for comparison
            (req as any).__auditContext = {
                tableName: options.tableName,
                recordId: options.extractRecordId(req),
                fiscalPeriodId: options.extractFiscalPeriodId?.(req),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            };

            next();
        };
    }

    /**
     * Helper to log period status change
     */
    static async logPeriodStatusChange(
        fiscalPeriodId: number,
        oldStatus: string,
        newStatus: string,
        userId?: number,
        reason?: string
    ): Promise<void> {
        await this.logChange({
            fiscalPeriodId,
            tableName: 'fiscal_periods',
            recordId: fiscalPeriodId,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: newStatus,
            changedBy: userId,
            changeReason: reason
        });
    }

    /**
     * Helper to log closing status change
     */
    static async logClosingStatusChange(
        closingId: number,
        fiscalPeriodId: number,
        oldStatus: string,
        newStatus: string,
        userId?: number,
        reason?: string
    ): Promise<void> {
        await this.logChange({
            fiscalPeriodId,
            tableName: 'period_end_closing',
            recordId: closingId,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: newStatus,
            changedBy: userId,
            changeReason: reason
        });
    }
}

export default PeriodAuditService;
