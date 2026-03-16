import { pool } from '../db';

interface DatabaseLogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  module: string;
  message: string;
  stack?: string;
  additionalData?: any;
}

class DatabaseLogger {
  private tableName = 'system_error_logs';
  private initialized = false;

  constructor() {
    this.initializeTable();
  }

  private async initializeTable(): Promise<void> {
    if (this.initialized) return;

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          level VARCHAR(10) NOT NULL,
          module VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          additional_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better query performance
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_system_error_logs_timestamp 
        ON ${this.tableName} (timestamp DESC)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_system_error_logs_level 
        ON ${this.tableName} (level)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_system_error_logs_module 
        ON ${this.tableName} (module)
      `);

      this.initialized = true;
      console.log('Database logging table initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database logging table:', error);
    }
  }

  async log(entry: DatabaseLogEntry): Promise<void> {
    await this.initializeTable();

    try {
      await pool.query(`
        INSERT INTO ${this.tableName} (timestamp, level, module, message, stack, additional_data)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        entry.timestamp,
        entry.level,
        entry.module,
        entry.message,
        entry.stack || null,
        entry.additionalData ? JSON.stringify(entry.additionalData) : null
      ]);
    } catch (error) {
      console.error('Failed to write log to database:', error);
      // Fallback to console logging if database fails
      console.log(`[${entry.timestamp}] ${entry.level} [${entry.module}]: ${entry.message}`);
    }
  }

  async getRecentLogs(limit: number = 100): Promise<DatabaseLogEntry[]> {
    await this.initializeTable();

    try {
      const result = await pool.query(`
        SELECT timestamp, level, module, message, stack, additional_data
        FROM ${this.tableName}
        ORDER BY timestamp DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        level: row.level,
        module: row.module,
        message: row.message,
        stack: row.stack,
        additionalData: row.additional_data ? JSON.parse(row.additional_data) : null
      }));
    } catch (error) {
      console.error('Failed to retrieve logs from database:', error);
      return [];
    }
  }

  async getLogsByModule(module: string, limit: number = 50): Promise<DatabaseLogEntry[]> {
    await this.initializeTable();

    try {
      const result = await pool.query(`
        SELECT timestamp, level, module, message, stack, additional_data
        FROM ${this.tableName}
        WHERE module = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [module, limit]);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        level: row.level,
        module: row.module,
        message: row.message,
        stack: row.stack,
        additionalData: row.additional_data ? JSON.parse(row.additional_data) : null
      }));
    } catch (error) {
      console.error('Failed to retrieve module logs from database:', error);
      return [];
    }
  }

  async getLogsByLevel(level: string, limit: number = 50): Promise<DatabaseLogEntry[]> {
    await this.initializeTable();

    try {
      const result = await pool.query(`
        SELECT timestamp, level, module, message, stack, additional_data
        FROM ${this.tableName}
        WHERE level = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [level, limit]);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        level: row.level,
        module: row.module,
        message: row.message,
        stack: row.stack,
        additionalData: row.additional_data ? JSON.parse(row.additional_data) : null
      }));
    } catch (error) {
      console.error('Failed to retrieve level logs from database:', error);
      return [];
    }
  }

  async getLogStats(): Promise<{ totalLogs: number; errorCount: number; warnCount: number; infoCount: number }> {
    await this.initializeTable();

    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count,
          COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warn_count,
          COUNT(CASE WHEN level = 'INFO' THEN 1 END) as info_count
        FROM ${this.tableName}
      `);

      const row = result.rows[0];
      return {
        totalLogs: parseInt(row.total_logs),
        errorCount: parseInt(row.error_count),
        warnCount: parseInt(row.warn_count),
        infoCount: parseInt(row.info_count)
      };
    } catch (error) {
      console.error('Failed to retrieve log stats from database:', error);
      return { totalLogs: 0, errorCount: 0, warnCount: 0, infoCount: 0 };
    }
  }

  async clearLogs(): Promise<void> {
    await this.initializeTable();

    try {
      await pool.query(`DELETE FROM ${this.tableName}`);
      console.log('Database logs cleared successfully');
    } catch (error) {
      console.error('Failed to clear database logs:', error);
      throw error;
    }
  }

  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    await this.initializeTable();

    try {
      const result = await pool.query(`
        DELETE FROM ${this.tableName}
        WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
      `);

      const deletedCount = result.rowCount || 0;
      console.log(`Cleaned up ${deletedCount} old log entries (older than ${daysToKeep} days)`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      return 0;
    }
  }
}

export const databaseLogger = new DatabaseLogger();