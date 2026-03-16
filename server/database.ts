import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

// Build DATABASE_URL from environment variables or use defaults
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

// Single centralized connection pool
let pool: InstanceType<typeof Pool> | null = null;
let isShuttingDown = false;
let hasShutdown = false;

export function getPool(): InstanceType<typeof Pool> {
  const isEnded = () => {
    try {
      return !!(pool as any)?._ending || !!(pool as any)?.ended || false;
    } catch {
      return false;
    }
  };

  if (!pool || isEnded()) {
    if (isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Increased max connections
      min: 2, // Keep some connections open
      idleTimeoutMillis: 60000, // 60 seconds - longer idle timeout
      connectionTimeoutMillis: 15000, // 15 seconds to connect - longer timeout
      query_timeout: 30000, // 30 seconds query timeout
      statement_timeout: 30000, // 30 seconds statement timeout
    });

    // Guard against accidental pool.end() during runtime
    try {
      const originalEnd = (pool as any).end?.bind(pool);
      const originalConnect = (pool as any).connect?.bind(pool);
      const originalQuery = (pool as any).query?.bind(pool);
      (pool as any)._originalEnd = originalEnd;
      (pool as any)._originalConnect = originalConnect;
      (pool as any)._originalQuery = originalQuery;
      (pool as any).end = async (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Ignoring pool.end() in development');
          return;
        }
        if (!isShuttingDown) {
          console.warn('Attempt to end shared db pool during runtime ignored. Use process signals for shutdown.');
          return; // Ignore at runtime to keep the shared pool alive
        }
        if (typeof originalEnd === 'function') {
          return await originalEnd(...args);
        }
      };

      // Auto-recover connect calls if pool was ended or is ending
      (pool as any).connect = async (...args: any[]) => {
        // If this pool instance is ended, delegate to a fresh guarded pool
        const needsNew = isEnded();
        if (needsNew) {
          const fresh = getPool();
          const connectFn = (fresh as any)._originalConnect?.bind(fresh);
          if (connectFn) return await connectFn(...args);
        }
        // Use original connect on current instance when active
        if ((pool as any)._originalConnect) {
          return await (pool as any)._originalConnect(...args);
        }
        return await originalConnect?.(...args);
      };

      // Make query resilient to ended pool
      (pool as any).query = async (...args: any[]) => {
        const needsNew = isEnded();
        if (needsNew) {
          const fresh = getPool();
          const queryFn = (fresh as any)._originalQuery?.bind(fresh) || (fresh as any).query?.bind(fresh);
          if (queryFn) return await queryFn(...args as any);
        }
        if ((pool as any)._originalQuery) {
          return await (pool as any)._originalQuery(...args as any);
        }
        return await originalQuery?.(...args as any);
      };
    } catch (patchErr) {
      console.warn('Could not guard pool.end:', (patchErr as any)?.message || patchErr);
    }

    // Enhanced error handling
    pool.on('error', (err: any) => {
      console.error('Database pool error:', err.message);
      // Don't throw here - let individual queries handle errors
    });

    pool.on('connect', (client: any) => {
      console.log('Database connection established');
    });

    pool.on('acquire', () => {
      // Connection acquired from pool
    });

    pool.on('release', () => {
      // Connection released back to pool
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      if (hasShutdown) return;
      hasShutdown = true;
      console.log('Closing database pool...');
      isShuttingDown = true;
      if (pool) {
        if (process.env.NODE_ENV !== 'development') {
          await pool.end();
        } else {
          console.warn('Skipping pool.end() in development to avoid hot-reload issues');
        }
      }
    });

    process.on('SIGINT', async () => {
      if (hasShutdown) return;
      hasShutdown = true;
      console.log('Closing database pool...');
      isShuttingDown = true;
      if (pool) {
        if (process.env.NODE_ENV !== 'development') {
          await pool.end();
        } else {
          console.warn('Skipping pool.end() in development to avoid hot-reload issues');
        }
      }
    });
  }

  return pool;
}

// Export the pool instance
export const dbPool = getPool();

// Utility to ensure an active pool (for modules that cache the pool reference)
export function ensureActivePool(): InstanceType<typeof Pool> {
  if (!pool || (pool as any)?._ending || (pool as any)?.ended) {
    return getPool();
  }
  return pool;
}