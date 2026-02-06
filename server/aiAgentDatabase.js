import pkg from 'pg';
const { Pool } = pkg;

class AIAgentDatabase {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  // Get AI agent configuration
  async getAgentConfig(moduleType) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM ai_agent_configs WHERE module_type = $1 AND is_active = true',
        [moduleType]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching agent config:', error);
      throw error;
    }
  }

  // Create new chat session
  async createChatSession(moduleType, userId = null, userRole = 'User', contextData = {}) {
    try {
      const result = await this.pool.query(
        `INSERT INTO ai_chat_sessions (module_type, user_id, user_role, context_data)
         VALUES ($1, $2, $3, $4) RETURNING session_id`,
        [moduleType, userId, userRole, JSON.stringify(contextData)]
      );
      return result.rows[0].session_id;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  // Save chat message
  async saveChatMessage(sessionId, messageType, content, agentName = null, contextData = {}, responseTime = null, tokensUsed = null) {
    try {
      await this.pool.query(
        `INSERT INTO ai_chat_messages (session_id, message_type, content, agent_name, context_data, api_response_time, tokens_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sessionId, messageType, content, agentName, JSON.stringify(contextData), responseTime, tokensUsed]
      );
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  // Get chat history
  async getChatHistory(sessionId, limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM ai_chat_messages 
         WHERE session_id = $1 
         ORDER BY created_at ASC 
         LIMIT $2`,
        [sessionId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }

  // End chat session
  async endChatSession(sessionId) {
    try {
      await this.pool.query(
        'UPDATE ai_chat_sessions SET session_end = CURRENT_TIMESTAMP, is_active = false WHERE session_id = $1',
        [sessionId]
      );
    } catch (error) {
      console.error('Error ending chat session:', error);
      throw error;
    }
  }

  // Update analytics
  async updateAnalytics(moduleType, successful = true, responseTime = null, tokensUsed = 0) {
    try {
      await this.pool.query(
        `INSERT INTO ai_agent_analytics (module_type, total_queries, successful_queries, failed_queries, avg_response_time, total_tokens_used, unique_users)
         VALUES ($1, 1, $2, $3, $4, $5, 1)
         ON CONFLICT (module_type, date)
         DO UPDATE SET
           total_queries = ai_agent_analytics.total_queries + 1,
           successful_queries = ai_agent_analytics.successful_queries + $2,
           failed_queries = ai_agent_analytics.failed_queries + $3,
           avg_response_time = CASE 
             WHEN $4 IS NOT NULL THEN 
               COALESCE((ai_agent_analytics.avg_response_time * (ai_agent_analytics.total_queries - 1) + $4) / ai_agent_analytics.total_queries, $4)
             ELSE ai_agent_analytics.avg_response_time
           END,
           total_tokens_used = ai_agent_analytics.total_tokens_used + $5,
           updated_at = CURRENT_TIMESTAMP`,
        [moduleType, successful ? 1 : 0, successful ? 0 : 1, responseTime, tokensUsed]
      );
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  }

  // Save data analysis session
  async saveDataAnalysisSession(moduleType, analysisType, inputData, result = null, insights = {}, recommendations = {}, processingTime = null, status = 'completed') {
    try {
      const sessionResult = await this.pool.query(
        `INSERT INTO ai_data_analysis_sessions 
         (module_type, analysis_type, input_data, analysis_result, insights, recommendations, processing_time, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING session_id`,
        [moduleType, analysisType, JSON.stringify(inputData), result, JSON.stringify(insights), JSON.stringify(recommendations), processingTime, status]
      );
      return sessionResult.rows[0].session_id;
    } catch (error) {
      console.error('Error saving data analysis session:', error);
      throw error;
    }
  }

  // Record system health check
  async recordHealthCheck(openaiStatus, apiKeyStatus, totalAgents, activeAgents, responseTime = null, errorDetails = {}) {
    try {
      await this.pool.query(
        `INSERT INTO ai_agent_health (openai_status, api_key_status, total_agents, active_agents, response_time, error_details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [openaiStatus, apiKeyStatus, totalAgents, activeAgents, responseTime, JSON.stringify(errorDetails)]
      );
    } catch (error) {
      console.error('Error recording health check:', error);
      throw error;
    }
  }

  // Get analytics for module
  async getModuleAnalytics(moduleType, days = 30) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM ai_agent_analytics 
         WHERE module_type = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY date DESC`,
        [moduleType]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching module analytics:', error);
      throw error;
    }
  }

  // Get all agent configurations
  async getAllAgentConfigs() {
    try {
      const result = await this.pool.query(
        'SELECT * FROM ai_agent_configs WHERE is_active = true ORDER BY module_name'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all agent configs:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    await this.pool.end();
  }
}

export default AIAgentDatabase;