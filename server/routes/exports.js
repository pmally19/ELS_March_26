import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

// Create direct connection instead of importing
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

const router = express.Router();

// This route has been moved to salesOppRoutes.js to resolve duplicate route conflicts
// Export other data as needed below

export default router;