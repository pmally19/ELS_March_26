import fs from 'fs';
import path from 'path';
import { databaseLogger } from './databaseLogger';

interface ErrorLog {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  module: string;
  message: string;
  stack?: string;
  userId?: string;
  requestId?: string;
  additionalData?: any;
}

class ErrorLogger {
  private logFilePath: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;
  private useDatabase: boolean = true; // Enable database logging by default
  private useFiles: boolean = true; // Also keep file logging

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFilePath = path.join(logsDir, 'error.log');
  }

  setStorageMode(useDatabase: boolean, useFiles: boolean): void {
    this.useDatabase = useDatabase;
    this.useFiles = useFiles;
  }

  private rotateLogIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > this.maxLogSize) {
          // Rotate log files
          for (let i = this.maxLogFiles - 1; i > 0; i--) {
            const oldFile = `${this.logFilePath}.${i}`;
            const newFile = `${this.logFilePath}.${i + 1}`;
            if (fs.existsSync(oldFile)) {
              if (i === this.maxLogFiles - 1) {
                fs.unlinkSync(oldFile);
              } else {
                fs.renameSync(oldFile, newFile);
              }
            }
          }
          fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
        }
      }
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  private async writeLog(logEntry: ErrorLog): Promise<void> {
    // Write to database if enabled
    if (this.useDatabase) {
      try {
        await databaseLogger.log(logEntry);
      } catch (error) {
        console.error('Failed to write to database log:', error);
      }
    }

    // Write to file if enabled
    if (this.useFiles) {
      try {
        this.rotateLogIfNeeded();
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.logFilePath, logLine);
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  error(module: string, message: string, error?: Error, additionalData?: any): void {
    const logEntry: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      module,
      message,
      stack: error?.stack,
      additionalData
    };

    this.writeLog(logEntry).catch(err => console.error('Failed to write log:', err));
    console.error(`[${logEntry.timestamp}] ERROR [${module}]: ${message}`, error);
  }

  warn(module: string, message: string, additionalData?: any): void {
    const logEntry: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      module,
      message,
      additionalData
    };

    this.writeLog(logEntry).catch(err => console.error('Failed to write log:', err));
    console.warn(`[${logEntry.timestamp}] WARN [${module}]: ${message}`);
  }

  info(module: string, message: string, additionalData?: any): void {
    const logEntry: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      module,
      message,
      additionalData
    };

    this.writeLog(logEntry).catch(err => console.error('Failed to write log:', err));
    console.info(`[${logEntry.timestamp}] INFO [${module}]: ${message}`);
  }

  // Database-specific methods
  async getDatabaseLogs(limit: number = 100): Promise<ErrorLog[]> {
    if (!this.useDatabase) return [];
    return await databaseLogger.getRecentLogs(limit);
  }

  async getDatabaseLogsByModule(module: string, limit: number = 50): Promise<ErrorLog[]> {
    if (!this.useDatabase) return [];
    return await databaseLogger.getLogsByModule(module, limit);
  }

  async getDatabaseStats(): Promise<{ totalLogs: number; errorCount: number; warnCount: number; infoCount: number }> {
    if (!this.useDatabase) return { totalLogs: 0, errorCount: 0, warnCount: 0, infoCount: 0 };
    return await databaseLogger.getLogStats();
  }

  async clearDatabaseLogs(): Promise<void> {
    if (!this.useDatabase) return;
    await databaseLogger.clearLogs();
  }

  // Get recent errors for debugging
  getRecentErrors(limit: number = 100): ErrorLog[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const logContent = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line);
      const errors: ErrorLog[] = [];

      // Get the last 'limit' lines
      const recentLines = lines.slice(-limit);
      
      for (const line of recentLines) {
        try {
          const logEntry = JSON.parse(line);
          errors.push(logEntry);
        } catch (parseError) {
          // Skip malformed log entries
        }
      }

      return errors.reverse(); // Most recent first
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }

  // Get errors by module
  getErrorsByModule(module: string, limit: number = 50): ErrorLog[] {
    const allErrors = this.getRecentErrors(500); // Get more to filter
    return allErrors
      .filter(error => error.module === module)
      .slice(0, limit);
  }

  // Clear log file
  clearLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath);
      }
      console.log('Log file cleared successfully');
    } catch (error) {
      console.error('Error clearing log file:', error);
    }
  }

  // Get log file stats
  getLogStats(): { size: number; lastModified: Date; errorCount: number } {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return { size: 0, lastModified: new Date(), errorCount: 0 };
      }

      const stats = fs.statSync(this.logFilePath);
      const logContent = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line);
      
      return {
        size: stats.size,
        lastModified: stats.mtime,
        errorCount: lines.length
      };
    } catch (error) {
      console.error('Error getting log stats:', error);
      return { size: 0, lastModified: new Date(), errorCount: 0 };
    }
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export the class for testing or custom instances
export { ErrorLogger };