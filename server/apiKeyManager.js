import pkg from 'pg';
const { Pool } = pkg;

class APIKeyManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.cache = new Map();
  }

  // Store API key securely
  async storeAPIKey(serviceName, keyName, keyValue, description = '') {
    try {
      // Simple encoding for basic security (in production, use proper encryption)
      const encodedKey = Buffer.from(keyValue).toString('base64');
      
      const result = await this.pool.query(
        `INSERT INTO api_keys (service_name, key_name, key_value, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (service_name)
         DO UPDATE SET
           key_value = EXCLUDED.key_value,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, service_name`,
        [serviceName, keyName, encodedKey, description]
      );

      // Update cache
      this.cache.set(serviceName, keyValue);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error storing API key:', error);
      throw error;
    }
  }

  // Retrieve API key
  async getAPIKey(serviceName) {
    try {
      // Check cache first
      if (this.cache.has(serviceName)) {
        return this.cache.get(serviceName);
      }

      const result = await this.pool.query(
        'SELECT key_value FROM api_keys WHERE service_name = $1 AND is_active = true',
        [serviceName]
      );

      if (result.rows.length > 0) {
        // Decode the key
        const decodedKey = Buffer.from(result.rows[0].key_value, 'base64').toString();
        
        // Update cache
        this.cache.set(serviceName, decodedKey);
        
        // Update last used timestamp
        await this.pool.query(
          'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE service_name = $1',
          [serviceName]
        );

        return decodedKey;
      }

      return null;
    } catch (error) {
      console.error('Error retrieving API key:', error);
      throw error;
    }
  }

  // Check if API key exists and is active
  async hasAPIKey(serviceName) {
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM api_keys WHERE service_name = $1 AND is_active = true',
        [serviceName]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking API key:', error);
      return false;
    }
  }

  // List all configured services
  async listServices() {
    try {
      const result = await this.pool.query(
        `SELECT service_name, key_name, description, is_active, 
                created_at, updated_at, last_used
         FROM api_keys 
         ORDER BY service_name`
      );
      return result.rows;
    } catch (error) {
      console.error('Error listing services:', error);
      throw error;
    }
  }

  // Deactivate API key
  async deactivateAPIKey(serviceName) {
    try {
      await this.pool.query(
        'UPDATE api_keys SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE service_name = $1',
        [serviceName]
      );
      
      // Remove from cache
      this.cache.delete(serviceName);
      
      return true;
    } catch (error) {
      console.error('Error deactivating API key:', error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Initialize OpenAI API key if available
  async initializeOpenAI() {
    try {
      const openaiKey = await this.getAPIKey('openai');
      if (openaiKey) {
        process.env.OPENAI_API_KEY = openaiKey;
        console.log('OpenAI API key loaded from database');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing OpenAI:', error);
      return false;
    }
  }

  // Close database connection
  async close() {
    await this.pool.end();
  }
}

export default APIKeyManager;