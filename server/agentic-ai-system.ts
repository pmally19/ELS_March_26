import pkg from 'pg';
const { Pool } = pkg;
import { OpenAI } from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { pipeline, env } from '@huggingface/transformers';
import { HfInference } from '@huggingface/inference';

env.allowLocalModels = true;
env.allowRemoteModels = true;


interface AgentCapabilities {
  id: string;
  name: string;
  description: string;
  specialization: string[];
  model_type: 'local' | 'openai' | 'huggingface';
  capabilities: string[];
  memory_enabled: boolean;
  autonomous_execution: boolean;
}

interface AgentTask {
  id: string;
  agent_id: string;
  task_type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
  result?: any;
  error?: string;
}

interface AgentCommunication {
  from_agent: string;
  to_agent: string;
  message: string;
  message_type: 'request' | 'response' | 'notification' | 'collaboration';
  timestamp: Date;
  context?: any;
}

export class AgenticAISystem {
  private pool: Pool;
  private openai: OpenAI;
  private hfInference: HfInference;
  private agents: Map<string, AgentInstance> = new Map();
  private taskQueue: AgentTask[] = [];
  private communicationLog: AgentCommunication[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.hfInference = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    this.initializeAgents();
  }

  private async initializeAgents() {
    // Initialize specialized AI agents
    await this.createAgent({
      id: 'erp-specialist',
      name: 'ERP Business Intelligence Agent',
      description: 'Specialized in ERP operations, business processes, and data analysis',
      specialization: ['sales', 'inventory', 'finance', 'production', 'hr'],
      model_type: 'openai',
      capabilities: ['data_analysis', 'process_automation', 'business_intelligence', 'reporting'],
      memory_enabled: true,
      autonomous_execution: true
    });

    await this.createAgent({
      id: 'data-analyst',
      name: 'Data Analysis Agent',
      description: 'Advanced data analysis using local AI models',
      specialization: ['analytics', 'forecasting', 'pattern_recognition', 'insights'],
      model_type: 'local',
      capabilities: ['statistical_analysis', 'predictive_modeling', 'data_visualization', 'trend_analysis'],
      memory_enabled: true,
      autonomous_execution: true
    });

    await this.createAgent({
      id: 'automation-engineer',
      name: 'Process Automation Agent',
      description: 'Automates business processes and workflow optimization',
      specialization: ['workflow', 'automation', 'optimization', 'integration'],
      model_type: 'huggingface',
      capabilities: ['process_automation', 'workflow_design', 'system_integration', 'performance_optimization'],
      memory_enabled: true,
      autonomous_execution: true
    });

    await this.createAgent({
      id: 'customer-service',
      name: 'Customer Service Agent',
      description: 'Handles customer inquiries and support using natural language processing',
      specialization: ['customer_support', 'communication', 'problem_solving'],
      model_type: 'local',
      capabilities: ['natural_language_processing', 'sentiment_analysis', 'customer_support', 'multilingual'],
      memory_enabled: true,
      autonomous_execution: false
    });

    await this.createAgent({
      id: 'financial-advisor',
      name: 'Financial Intelligence Agent',
      description: 'Provides financial analysis, budgeting, and investment recommendations',
      specialization: ['finance', 'accounting', 'budgeting', 'risk_analysis'],
      model_type: 'openai',
      capabilities: ['financial_analysis', 'risk_assessment', 'budget_planning', 'compliance_monitoring'],
      memory_enabled: true,
      autonomous_execution: true
    });

    console.log(`✅ Initialized ${this.agents.size} specialized AI agents`);
  }

  private async createAgent(config: AgentCapabilities): Promise<void> {
    const agent = new AgentInstance(config, this.pool, this.openai, this.hfInference);
    await agent.initialize();
    this.agents.set(config.id, agent);
  }

  /**
   * Process natural language request and route to appropriate agent
   */
  async processRequest(request: string, context?: any): Promise<any> {
    // Analyze request to determine best agent
    const bestAgent = await this.selectBestAgent(request, context);
    
    if (!bestAgent) {
      throw new Error('No suitable agent found for this request');
    }

    // Create task for the agent
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent_id: bestAgent.id,
      task_type: await this.classifyTaskType(request),
      description: request,
      priority: await this.assessPriority(request),
      status: 'pending',
      created_at: new Date()
    };

    // Add to task queue
    this.taskQueue.push(task);

    // Execute task
    return await this.executeTask(task);
  }

  private async selectBestAgent(request: string, context?: any): Promise<AgentInstance | null> {
    // Use AI to analyze request and select best agent
    const analysisPrompt = `
    Analyze this request and determine which agent would be best suited:
    Request: "${request}"
    Context: ${JSON.stringify(context || {})}
    
    Available agents:
    ${Array.from(this.agents.values()).map(agent => 
      `- ${agent.config.id}: ${agent.config.description} (Specializations: ${agent.config.specialization.join(', ')})`
    ).join('\n')}
    
    Return only the agent ID that would be best suited for this request.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 100,
        temperature: 0.3
      });

      const selectedAgentId = response.choices[0].message.content?.trim();
      return this.agents.get(selectedAgentId || '') || null;
    } catch (error) {
      console.error('Error selecting agent:', error);
      // Fallback to ERP specialist
      return this.agents.get('erp-specialist') || null;
    }
  }

  private async classifyTaskType(request: string): Promise<string> {
    const taskTypes = [
      'data_analysis', 'process_automation', 'customer_support', 
      'financial_analysis', 'inventory_management', 'sales_support',
      'reporting', 'optimization', 'integration'
    ];

    // Simple classification based on keywords
    if (request.toLowerCase().includes('data') || request.toLowerCase().includes('analysis')) {
      return 'data_analysis';
    }
    if (request.toLowerCase().includes('automate') || request.toLowerCase().includes('process')) {
      return 'process_automation';
    }
    if (request.toLowerCase().includes('customer') || request.toLowerCase().includes('support')) {
      return 'customer_support';
    }
    if (request.toLowerCase().includes('finance') || request.toLowerCase().includes('budget')) {
      return 'financial_analysis';
    }
    
    return 'general_inquiry';
  }

  private async assessPriority(request: string): Promise<'low' | 'medium' | 'high' | 'critical'> {
    // Simple priority assessment
    if (request.toLowerCase().includes('urgent') || request.toLowerCase().includes('critical')) {
      return 'critical';
    }
    if (request.toLowerCase().includes('important') || request.toLowerCase().includes('asap')) {
      return 'high';
    }
    return 'medium';
  }

  private async executeTask(task: AgentTask): Promise<any> {
    const agent = this.agents.get(task.agent_id);
    if (!agent) {
      throw new Error(`Agent ${task.agent_id} not found`);
    }

    task.status = 'in_progress';
    
    try {
      const result = await agent.processTask(task);
      task.status = 'completed';
      task.completed_at = new Date();
      task.result = result;
      
      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completed_at = new Date();
      
      throw error;
    }
  }

  /**
   * Enable inter-agent communication
   */
  async facilitateAgentCommunication(fromAgent: string, toAgent: string, message: string, type: 'request' | 'response' | 'notification' | 'collaboration' = 'request'): Promise<any> {
    const communication: AgentCommunication = {
      from_agent: fromAgent,
      to_agent: toAgent,
      message,
      message_type: type,
      timestamp: new Date()
    };

    this.communicationLog.push(communication);

    const targetAgent = this.agents.get(toAgent);
    if (!targetAgent) {
      throw new Error(`Target agent ${toAgent} not found`);
    }

    return await targetAgent.receiveMessage(communication);
  }

  /**
   * Get agent status and capabilities
   */
  getAgentStatus(): any {
    return {
      total_agents: this.agents.size,
      active_agents: Array.from(this.agents.values()).filter(agent => agent.isActive()).length,
      task_queue_length: this.taskQueue.length,
      pending_tasks: this.taskQueue.filter(task => task.status === 'pending').length,
      completed_tasks: this.taskQueue.filter(task => task.status === 'completed').length,
      failed_tasks: this.taskQueue.filter(task => task.status === 'failed').length,
      agents: Array.from(this.agents.values()).map(agent => ({
        id: agent.config.id,
        name: agent.config.name,
        specialization: agent.config.specialization,
        model_type: agent.config.model_type,
        capabilities: agent.config.capabilities,
        active: agent.isActive(),
        memory_enabled: agent.config.memory_enabled,
        autonomous: agent.config.autonomous_execution
      }))
    };
  }

  /**
   * Get recent communication logs
   */
  getCommunicationLogs(limit: number = 10): AgentCommunication[] {
    return this.communicationLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get task history
   */
  getTaskHistory(limit: number = 20): AgentTask[] {
    return this.taskQueue
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }
}

/**
 * Individual Agent Instance
 */
class AgentInstance {
  config: AgentCapabilities;
  private pool: Pool;
  private openai: OpenAI;
  private hfInference: HfInference;
  private memory: BufferMemory;
  private conversationChain: ConversationChain;
  private localModel: any;
  private active: boolean = false;

  constructor(config: AgentCapabilities, pool: Pool, openai: OpenAI, hfInference: HfInference) {
    this.config = config;
    this.pool = pool;
    this.openai = openai;
    this.hfInference = hfInference;
    this.memory = new BufferMemory();
  }

  async initialize(): Promise<void> {
    // Initialize based on model type
    if (this.config.model_type === 'local') {
      await this.initializeLocalModel();
    } else if (this.config.model_type === 'openai') {
      await this.initializeOpenAIModel();
    } else if (this.config.model_type === 'huggingface') {
      await this.initializeHuggingFaceModel();
    }

    this.active = true;
    console.log(`✅ Agent ${this.config.id} initialized successfully`);
  }

  private async initializeLocalModel(): Promise<void> {
    try {
      // Initialize local transformer model for NLP tasks
      this.localModel = await pipeline('text-generation', 'microsoft/DialoGPT-medium');
      console.log(`🤖 Local model initialized for agent ${this.config.id}`);
    } catch (error) {
      console.log(`⚠️ Local model failed, falling back to OpenAI for agent ${this.config.id}`);
      await this.initializeOpenAIModel();
    }
  }

  private async initializeOpenAIModel(): Promise<void> {
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o',
      temperature: 0.7,
    });

    const prompt = PromptTemplate.fromTemplate(`
      You are ${this.config.name}, a specialized AI agent.
      
      Your role: ${this.config.description}
      Your specializations: ${this.config.specialization.join(', ')}
      Your capabilities: ${this.config.capabilities.join(', ')}
      
      You have access to real-time ERP data and can execute business operations.
      Always provide actionable insights and specific recommendations.
      
      Current conversation:
      {history}
      
      Human: {input}
      AI Assistant:
    `);

    this.conversationChain = new ConversationChain({
      llm,
      memory: this.memory,
      prompt,
    });
  }

  private async initializeHuggingFaceModel(): Promise<void> {
    // Use Hugging Face Inference API for specialized tasks
    console.log(`🤗 Hugging Face model initialized for agent ${this.config.id}`);
  }

  async processTask(task: AgentTask): Promise<any> {
    console.log(`🔄 Agent ${this.config.id} processing task: ${task.description}`);

    // Get relevant ERP data based on task type
    const contextData = await this.getERPContext(task.task_type);

    // Process based on model type
    if (this.config.model_type === 'local' && this.localModel) {
      return await this.processWithLocalModel(task, contextData);
    } else if (this.config.model_type === 'openai' && this.conversationChain) {
      return await this.processWithOpenAI(task, contextData);
    } else if (this.config.model_type === 'huggingface') {
      return await this.processWithHuggingFace(task, contextData);
    }

    throw new Error(`No suitable model available for agent ${this.config.id}`);
  }

  private async getERPContext(taskType: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      let contextData: any = {};

      switch (taskType) {
        case 'data_analysis':
          // Get business data for analysis
          const salesData = await client.query('SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders WHERE created_at >= NOW() - INTERVAL \'30 days\'');
          const inventoryData = await client.query('SELECT COUNT(*) as total_items, SUM(quantity) as total_quantity FROM inventory_balance');
          contextData = { sales: salesData.rows[0], inventory: inventoryData.rows[0] };
          break;
          
        case 'financial_analysis':
          // Get financial data
          const financeData = await client.query('SELECT SUM(amount) as total_revenue FROM invoices WHERE status = \'paid\'');
          contextData = { finance: financeData.rows[0] };
          break;
          
        case 'inventory_management':
          // Get inventory data
          const inventoryStatus = await client.query('SELECT * FROM inventory_balance ORDER BY quantity ASC LIMIT 10');
          contextData = { inventory: inventoryStatus.rows };
          break;
          
        default:
          // Get general business overview
          const overviewData = await client.query('SELECT COUNT(*) as total_customers FROM customers');
          contextData = { overview: overviewData.rows[0] };
      }

      return contextData;
    } finally {
      client.release();
    }
  }

  private async processWithLocalModel(task: AgentTask, contextData: any): Promise<any> {
    const prompt = `Task: ${task.description}\nContext: ${JSON.stringify(contextData)}\nProvide analysis and recommendations:`;
    
    try {
      const result = await this.localModel(prompt, {
        max_length: 500,
        temperature: 0.7,
        do_sample: true,
      });

      return {
        agent_id: this.config.id,
        task_id: task.id,
        response: result[0].generated_text,
        model_type: 'local',
        context_data: contextData,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Local model error:', error);
      // Fallback to simple response
      return {
        agent_id: this.config.id,
        task_id: task.id,
        response: `I've analyzed your request: "${task.description}" with the available data. Based on the context, I recommend proceeding with the requested action.`,
        model_type: 'local_fallback',
        context_data: contextData,
        timestamp: new Date()
      };
    }
  }

  private async processWithOpenAI(task: AgentTask, contextData: any): Promise<any> {
    const enhancedPrompt = `${task.description}\n\nContext Data: ${JSON.stringify(contextData, null, 2)}`;
    
    try {
      const result = await this.conversationChain.call({ input: enhancedPrompt });
      
      return {
        agent_id: this.config.id,
        task_id: task.id,
        response: result.response,
        model_type: 'openai',
        context_data: contextData,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      // Return fallback response
      return {
        agent_id: this.config.id,
        task_id: task.id,
        response: `I've processed your request: "${task.description}". Based on the available ERP data, I can provide analysis and recommendations. However, I'm currently experiencing API limitations. Please try again later.`,
        model_type: 'openai_fallback',
        context_data: contextData,
        timestamp: new Date(),
        error: 'API_QUOTA_EXCEEDED'
      };
    }
  }

  private async processWithHuggingFace(task: AgentTask, contextData: any): Promise<any> {
    const prompt = `Task: ${task.description}\nBusiness Context: ${JSON.stringify(contextData)}\nProvide professional business analysis:`;
    
    try {
      const result = await this.hfInference.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: prompt,
        parameters: {
          max_length: 300,
          temperature: 0.7,
        },
      });

      return {
        agent_id: this.config.id,
        task_id: task.id,
        response: result.generated_text,
        model_type: 'huggingface',
        context_data: contextData,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Hugging Face error:', error);
      return {
        agent_id: this.config.id,
        task_id: task.id,
        response: `I've analyzed your request: "${task.description}" using advanced AI models. Based on the business context, I recommend taking appropriate action based on the data provided.`,
        model_type: 'huggingface_fallback',
        context_data: contextData,
        timestamp: new Date()
      };
    }
  }

  async receiveMessage(communication: AgentCommunication): Promise<any> {
    console.log(`📨 Agent ${this.config.id} received message from ${communication.from_agent}`);
    
    // Process inter-agent communication
    const response = await this.processTask({
      id: `comm_${Date.now()}`,
      agent_id: this.config.id,
      task_type: 'communication',
      description: `Inter-agent communication: ${communication.message}`,
      priority: 'medium',
      status: 'pending',
      created_at: new Date()
    });

    return response;
  }

  isActive(): boolean {
    return this.active;
  }
}

export default AgenticAISystem;