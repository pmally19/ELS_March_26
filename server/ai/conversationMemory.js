/**
 * Advanced Conversation Memory System for MallyERP AI
 * Maintains context across sessions, learns user patterns, and provides intelligent responses
 */

import pkg from 'pg';
const { Pool } = pkg;

class ConversationMemory {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.initializeMemoryTables();
  }

  async initializeMemoryTables() {
    try {
      // Create conversation memory table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS conversation_memory (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) DEFAULT 'default_user',
          session_id VARCHAR(100),
          conversation_context JSONB,
          user_preferences JSONB,
          task_context JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user patterns table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_patterns (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) DEFAULT 'default_user',
          pattern_type VARCHAR(50),
          pattern_data JSONB,
          frequency INTEGER DEFAULT 1,
          last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create AI learning table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ai_learning (
          id SERIAL PRIMARY KEY,
          user_input TEXT,
          ai_response TEXT,
          action_taken VARCHAR(100),
          success_rating INTEGER,
          learning_context JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Conversation memory tables initialized');
    } catch (error) {
      console.error('Failed to initialize conversation memory:', error);
    }
  }

  async saveConversation(userId, sessionId, messages, context) {
    try {
      await this.pool.query(`
        INSERT INTO conversation_memory (user_id, session_id, conversation_context, task_context, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, session_id) 
        DO UPDATE SET 
          conversation_context = $3,
          task_context = $4,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, sessionId, JSON.stringify(messages), JSON.stringify(context)]);
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  async getConversationContext(userId, sessionId) {
    try {
      const result = await this.pool.query(`
        SELECT conversation_context, task_context, user_preferences
        FROM conversation_memory 
        WHERE user_id = $1 AND session_id = $2
        ORDER BY updated_at DESC LIMIT 1
      `, [userId, sessionId]);

      if (result.rows.length > 0) {
        return {
          messages: result.rows[0].conversation_context || [],
          taskContext: result.rows[0].task_context || {},
          preferences: result.rows[0].user_preferences || {}
        };
      }
      return { messages: [], taskContext: {}, preferences: {} };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return { messages: [], taskContext: {}, preferences: {} };
    }
  }

  async learnUserPattern(userId, patternType, patternData) {
    try {
      await this.pool.query(`
        INSERT INTO user_patterns (user_id, pattern_type, pattern_data, frequency, last_used)
        VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, pattern_type, pattern_data)
        DO UPDATE SET 
          frequency = user_patterns.frequency + 1,
          last_used = CURRENT_TIMESTAMP
      `, [userId, patternType, JSON.stringify(patternData)]);
    } catch (error) {
      console.error('Failed to learn user pattern:', error);
    }
  }

  async getUserPatterns(userId) {
    try {
      const result = await this.pool.query(`
        SELECT pattern_type, pattern_data, frequency
        FROM user_patterns 
        WHERE user_id = $1
        ORDER BY frequency DESC, last_used DESC
        LIMIT 20
      `, [userId]);

      return result.rows.map(row => ({
        type: row.pattern_type,
        data: row.pattern_data,
        frequency: row.frequency
      }));
    } catch (error) {
      console.error('Failed to get user patterns:', error);
      return [];
    }
  }

  async recordAIInteraction(userInput, aiResponse, actionTaken, successRating, context) {
    try {
      await this.pool.query(`
        INSERT INTO ai_learning (user_input, ai_response, action_taken, success_rating, learning_context)
        VALUES ($1, $2, $3, $4, $5)
      `, [userInput, aiResponse, actionTaken, successRating, JSON.stringify(context)]);
    } catch (error) {
      console.error('Failed to record AI interaction:', error);
    }
  }

  async getAILearningData(limit = 100) {
    try {
      const result = await this.pool.query(`
        SELECT user_input, ai_response, action_taken, success_rating, learning_context
        FROM ai_learning 
        WHERE success_rating >= 4
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('Failed to get AI learning data:', error);
      return [];
    }
  }
}

export default ConversationMemory;