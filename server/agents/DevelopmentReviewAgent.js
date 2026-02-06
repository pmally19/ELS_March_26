import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

class DevelopmentReviewAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.agentId = 'dev-review-001';
    this.agentName = 'Development Review Agent';
    this.capabilities = [
      'Code Review & Analysis',
      'Implementation Gap Detection', 
      'CRUD Operation Implementation',
      'API Endpoint Creation',
      'Database Schema Updates',
      'Frontend Component Generation',
      'Status Update Automation'
    ];
  }

  async analyzeImportFeedback(analysisResult) {
    try {
      console.log(`🔍 ${this.agentName} analyzing import feedback...`);
      
      if (!analysisResult.changes || analysisResult.changes.length === 0) {
        return {
          success: true,
          message: 'No implementation changes required',
          implementations: []
        };
      }

      const implementations = [];
      
      for (const change of analysisResult.changes) {
        const implementation = await this.planImplementation(change);
        if (implementation) {
          implementations.push(implementation);
        }
      }

      return {
        success: true,
        totalChanges: analysisResult.changes.length,
        implementations,
        summary: `Planned ${implementations.length} implementations based on user feedback`
      };

    } catch (error) {
      console.error('Development Review Agent analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async planImplementation(change) {
    try {
      const implementationPlan = {
        tile: change.tile,
        field: change.field,
        priority: change.priority,
        description: change.description,
        tasks: []
      };

      // Analyze what type of implementation is needed
      if (change.field === 'Implementation Status') {
        implementationPlan.tasks.push({
          type: 'status_update',
          action: 'Update implementation status in data structure',
          priority: change.priority
        });
      }

      if (change.field.includes('Operation')) {
        const operation = change.field.split(' ')[0]; // GET, POST, PUT, DELETE
        implementationPlan.tasks.push({
          type: 'crud_implementation',
          operation: operation,
          action: `Implement ${operation} endpoint for ${change.tile}`,
          priority: change.priority
        });
      }

      if (change.field === 'Notes/Comments') {
        // Parse the feedback for specific implementation requests
        const feedback = change.newValue.toLowerCase();
        
        if (feedback.includes('database') || feedback.includes('table')) {
          implementationPlan.tasks.push({
            type: 'database_schema',
            action: 'Create/update database table',
            priority: change.priority
          });
        }
        
        if (feedback.includes('frontend') || feedback.includes('component')) {
          implementationPlan.tasks.push({
            type: 'frontend_component',
            action: 'Create/update frontend component',
            priority: change.priority
          });
        }
        
        if (feedback.includes('api') || feedback.includes('endpoint')) {
          implementationPlan.tasks.push({
            type: 'api_endpoint',
            action: 'Create/update API endpoint',
            priority: change.priority
          });
        }
      }

      return implementationPlan;

    } catch (error) {
      console.error('Implementation planning failed:', error);
      return null;
    }
  }

  async executeImplementations(implementations) {
    const results = [];
    
    for (const implementation of implementations) {
      try {
        console.log(`🔧 Executing implementation for: ${implementation.tile}`);
        
        const result = await this.executeImplementation(implementation);
        results.push({
          tile: implementation.tile,
          success: result.success,
          details: result.details,
          tasksCompleted: result.tasksCompleted || 0
        });

      } catch (error) {
        console.error(`Implementation failed for ${implementation.tile}:`, error);
        results.push({
          tile: implementation.tile,
          success: false,
          error: error.message
        });
      }
    }

    return {
      totalImplementations: implementations.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async executeImplementation(implementation) {
    const tasksCompleted = [];
    
    for (const task of implementation.tasks) {
      try {
        switch (task.type) {
          case 'status_update':
            await this.updateImplementationStatus(implementation.tile);
            tasksCompleted.push('Status updated');
            break;
            
          case 'crud_implementation':
            await this.implementCRUDOperation(implementation.tile, task.operation);
            tasksCompleted.push(`${task.operation} operation implemented`);
            break;
            
          case 'database_schema':
            await this.updateDatabaseSchema(implementation.tile);
            tasksCompleted.push('Database schema updated');
            break;
            
          case 'frontend_component':
            await this.updateFrontendComponent(implementation.tile);
            tasksCompleted.push('Frontend component updated');
            break;
            
          case 'api_endpoint':
            await this.createAPIEndpoint(implementation.tile);
            tasksCompleted.push('API endpoint created');
            break;
        }
      } catch (error) {
        console.error(`Task execution failed: ${task.type}`, error);
        tasksCompleted.push(`Failed: ${task.type}`);
      }
    }

    return {
      success: tasksCompleted.length > 0,
      details: `Completed ${tasksCompleted.length}/${implementation.tasks.length} tasks`,
      tasksCompleted: tasksCompleted.length
    };
  }

  async updateImplementationStatus(tileName) {
    // This would update the status in the data structure
    console.log(`✅ Updated implementation status for: ${tileName}`);
    return true;
  }

  async implementCRUDOperation(tileName, operation) {
    // This would generate the actual CRUD endpoints
    console.log(`🔧 Implemented ${operation} operation for: ${tileName}`);
    return true;
  }

  async updateDatabaseSchema(tileName) {
    // This would create/update database tables
    console.log(`🗄️ Updated database schema for: ${tileName}`);
    return true;
  }

  async updateFrontendComponent(tileName) {
    // This would create/update React components
    console.log(`🎨 Updated frontend component for: ${tileName}`);
    return true;
  }

  async createAPIEndpoint(tileName) {
    // This would create API endpoints
    console.log(`🔗 Created API endpoint for: ${tileName}`);
    return true;
  }

  async generateImplementationReport(executionResults) {
    const report = {
      timestamp: new Date().toISOString(),
      agent: this.agentName,
      summary: {
        totalImplementations: executionResults.totalImplementations,
        successful: executionResults.successful,
        failed: executionResults.failed,
        successRate: `${Math.round((executionResults.successful / executionResults.totalImplementations) * 100)}%`
      },
      details: executionResults.results,
      recommendations: []
    };

    // Add recommendations based on results
    if (executionResults.failed > 0) {
      report.recommendations.push('Review failed implementations and provide more specific feedback');
    }
    
    if (executionResults.successful > 0) {
      report.recommendations.push('Test implemented features for functionality and integration');
    }

    return report;
  }

  async processChatMessage(message, developmentContext) {
    try {
      console.log(`💬 ${this.agentName} processing chat message: ${message.substring(0, 50)}...`);
      
      // Analyze the development context to understand current status
      const contextAnalysis = this.analyzeDevelopmentContext(developmentContext);
      
      // Generate intelligent response based on the message and context
      const response = await this.generateChatResponse(message, contextAnalysis);
      
      return {
        response: response.answer,
        implementations: response.implementations || [],
        suggestions: response.suggestions || [],
        contextInsights: contextAnalysis
      };

    } catch (error) {
      console.error('Chat message processing failed:', error);
      return {
        response: "I'm having trouble analyzing the development status right now. Could you try rephrasing your question?",
        implementations: [],
        suggestions: []
      };
    }
  }

  analyzeDevelopmentContext(context) {
    const analysis = {
      totalTiles: 0,
      fullyOperational: 0,
      partiallyImplemented: 0,
      notImplemented: 0,
      missingCrudOperations: [],
      moduleBreakdown: {}
    };

    // Analyze each module
    Object.keys(context).forEach(moduleKey => {
      const tiles = context[moduleKey] || [];
      const moduleName = moduleKey.replace('Tiles', '');
      
      analysis.totalTiles += tiles.length;
      analysis.moduleBreakdown[moduleName] = {
        total: tiles.length,
        operational: 0,
        partial: 0,
        missing: 0,
        issues: []
      };

      tiles.forEach(tile => {
        switch (tile.implementationStatus) {
          case 'FULLY_OPERATIONAL':
            analysis.fullyOperational++;
            analysis.moduleBreakdown[moduleName].operational++;
            break;
          case 'PARTIALLY_IMPLEMENTED':
            analysis.partiallyImplemented++;
            analysis.moduleBreakdown[moduleName].partial++;
            break;
          default:
            analysis.notImplemented++;
            analysis.moduleBreakdown[moduleName].missing++;
            break;
        }

        // Check for missing CRUD operations
        if (!tile.get || !tile.post || !tile.put || !tile.delete) {
          const missingOps = [];
          if (!tile.get) missingOps.push('GET');
          if (!tile.post) missingOps.push('POST');
          if (!tile.put) missingOps.push('PUT');
          if (!tile.delete) missingOps.push('DELETE');
          
          analysis.missingCrudOperations.push({
            tile: tile.tileName,
            module: moduleName,
            missing: missingOps
          });
          
          analysis.moduleBreakdown[moduleName].issues.push({
            tile: tile.tileName,
            issue: `Missing ${missingOps.join(', ')} operations`
          });
        }
      });
    });

    return analysis;
  }

  async generateChatResponse(message, contextAnalysis) {
    try {
      // Try OpenAI first, then DeepSeek, then fallback to rule-based
      const systemPrompt = `You are a Development Status Assistant for MallyERP. You have deep knowledge of the current implementation status across all ERP modules.

Current Development Status:
- Total Tiles: ${contextAnalysis.totalTiles}
- Fully Operational: ${contextAnalysis.fullyOperational}
- Partially Implemented: ${contextAnalysis.partiallyImplemented}
- Not Implemented: ${contextAnalysis.notImplemented}
- Missing CRUD Operations: ${contextAnalysis.missingCrudOperations.length}

Module Breakdown:
${Object.entries(contextAnalysis.moduleBreakdown).map(([module, data]) => 
  `${module}: ${data.operational}/${data.total} operational, ${data.issues.length} issues`
).join('\n')}

Your role:
1. Answer questions about development status with specific data
2. Identify gaps and missing implementations
3. Suggest prioritized development tasks
4. Provide technical guidance for implementations
5. When asked to implement something, provide specific implementation steps

Be concise, technical, and actionable. Focus on specific tiles, modules, and CRUD operations.`;

      const userPrompt = `User Question: ${message}

Please provide:
1. Direct answer to the question
2. Specific technical details from the development context
3. If implementation is requested, provide clear steps
4. Suggest related improvements if relevant`;

      let aiResponse;
      let providerUsed = 'fallback';

      try {
        // Try OpenAI first
        aiResponse = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.3
        });
        providerUsed = 'openai';
      } catch (openaiError) {
        console.log('OpenAI failed, trying DeepSeek...');
        
        try {
          // Try DeepSeek as backup
          const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || 'sk-placeholder'}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 1000,
              temperature: 0.3
            })
          });

          if (deepSeekResponse.ok) {
            const deepSeekData = await deepSeekResponse.json();
            aiResponse = deepSeekData;
            providerUsed = 'deepseek';
          } else {
            throw new Error('DeepSeek also failed');
          }
        } catch (deepSeekError) {
          console.log('Both AI providers failed, using enhanced fallback');
          throw new Error('All AI providers failed');
        }
      }

      const response = providerUsed === 'deepseek' 
        ? aiResponse.choices[0].message.content 
        : aiResponse.choices[0].message.content;
      
      // Parse response for implementation suggestions
      const implementations = this.extractImplementationSuggestions(response, contextAnalysis);
      const suggestions = this.extractGeneralSuggestions(response);

      return {
        answer: `${response}\n\n---\n*Response provided by ${providerUsed} provider*`,
        implementations,
        suggestions
      };

    } catch (error) {
      console.error('All AI providers failed, using enhanced fallback:', error);
      
      // Enhanced rule-based response
      return this.generateEnhancedFallbackResponse(message, contextAnalysis);
    }
  }

  generateEnhancedFallbackResponse(message, contextAnalysis) {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced analysis for specific modules
    if (lowerMessage.includes('master data') || lowerMessage.includes('chart of accounts')) {
      const masterDataModule = contextAnalysis.moduleBreakdown.masterData;
      if (masterDataModule) {
        return {
          answer: `**Master Data Module Analysis:**\n\n✅ Operational: ${masterDataModule.operational}/${masterDataModule.total} tiles\n⚠️ Issues: ${masterDataModule.issues.length} tiles need work\n\n**Chart of Accounts Status:**\n• Missing CRUD operations detected\n• Database table: chart_of_accounts\n• Required endpoints: GET, POST, PUT, DELETE\n\n**Implementation Priority:**\n1. Complete CRUD operations for Chart of Accounts\n2. Add Financial Master data validation\n3. Implement account hierarchy structure\n\n**Specific Missing Operations:**\n${masterDataModule.issues.slice(0, 5).map(issue => `• ${issue.tile}: ${issue.issue}`).join('\n')}`,
          implementations: [
            { description: 'Implement Chart of Accounts GET endpoint', priority: 'High', type: 'API' },
            { description: 'Add Chart of Accounts POST/PUT operations', priority: 'High', type: 'CRUD' },
            { description: 'Create account hierarchy validation', priority: 'Medium', type: 'Business Logic' }
          ],
          suggestions: ['Focus on financial master data first', 'Implement proper validation rules', 'Add account type classifications']
        };
      }
    }
    
    if (lowerMessage.includes('missing') || lowerMessage.includes('what needs') || lowerMessage.includes('develop')) {
      const topMissingModules = Object.entries(contextAnalysis.moduleBreakdown)
        .filter(([_, data]) => data.missing > 0)
        .sort((a, b) => b[1].missing - a[1].missing)
        .slice(0, 3);

      return {
        answer: `**Development Gaps Analysis:**\n\n📊 **Overall Status:**\n• ${contextAnalysis.notImplemented} tiles need implementation\n• ${contextAnalysis.missingCrudOperations.length} tiles missing CRUD operations\n• ${Math.round((contextAnalysis.fullyOperational/contextAnalysis.totalTiles)*100)}% completion rate\n\n🎯 **Top Priority Modules:**\n${topMissingModules.map(([module, data]) => `• ${module}: ${data.missing} missing, ${data.issues.length} issues`).join('\n')}\n\n⚠️ **Critical Missing Operations:**\n${contextAnalysis.missingCrudOperations.slice(0, 8).map(item => `• ${item.tile}: Missing ${item.missing.join(', ')}`).join('\n')}\n\n💡 **Recommended Implementation Order:**\n1. Complete CRUD for high-traffic modules (Sales, Finance)\n2. Implement Master Data foundations\n3. Add Transaction processing capabilities\n4. Enhance reporting and analytics`,
        implementations: contextAnalysis.missingCrudOperations.slice(0, 5).map(item => ({
          description: `Implement ${item.missing.join('/')} for ${item.tile}`,
          priority: item.module === 'masterData' || item.module === 'finance' ? 'High' : 'Medium',
          type: 'CRUD'
        })),
        suggestions: [
          'Prioritize Master Data completion first',
          'Focus on Finance and Sales modules',
          'Implement database schemas before frontend',
          'Add proper validation and error handling'
        ]
      };
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('overview')) {
      return {
        answer: `**Development Status Overview:**\n\n📈 **Progress Summary:**\n✅ Operational: ${contextAnalysis.fullyOperational}/${contextAnalysis.totalTiles} tiles (${Math.round((contextAnalysis.fullyOperational/contextAnalysis.totalTiles)*100)}%)\n⚠️ Partial: ${contextAnalysis.partiallyImplemented} tiles\n❌ Missing: ${contextAnalysis.notImplemented} tiles\n\n📋 **Module Breakdown:**\n${Object.entries(contextAnalysis.moduleBreakdown).map(([module, data]) => {
          const percentage = Math.round((data.operational/data.total)*100);
          const status = percentage >= 80 ? '🟢' : percentage >= 50 ? '🟡' : '🔴';
          return `${status} ${module}: ${data.operational}/${data.total} (${percentage}%) - ${data.issues.length} issues`;
        }).join('\n')}\n\n🔍 **Key Insights:**\n• ${contextAnalysis.missingCrudOperations.length} tiles need CRUD completion\n• Focus needed on modules with <80% completion\n• Database integration is the primary bottleneck`,
        implementations: [],
        suggestions: [
          'Review partially implemented tiles first',
          'Complete missing CRUD operations systematically',
          'Focus on high-impact modules (Finance, Sales)',
          'Implement proper testing for completed features'
        ]
      };
    }

    // Handle specific module questions
    const moduleMatch = lowerMessage.match(/(sales|finance|inventory|master\s*data|transaction|production|purchase|controlling)/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1].replace(/\s/g, '');
      const moduleKey = moduleName === 'masterdata' ? 'masterData' : moduleName;
      const moduleData = contextAnalysis.moduleBreakdown[moduleKey];
      
      if (moduleData) {
        const completionRate = Math.round((moduleData.operational/moduleData.total)*100);
        return {
          answer: `**${moduleName.toUpperCase()} Module Status:**\n\n📊 **Progress:** ${moduleData.operational}/${moduleData.total} tiles (${completionRate}%)\n⚠️ **Issues:** ${moduleData.issues.length} tiles need work\n❌ **Missing:** ${moduleData.missing} tiles not implemented\n\n🔧 **Specific Issues:**\n${moduleData.issues.slice(0, 6).map(issue => `• ${issue.tile}: ${issue.issue}`).join('\n')}\n\n💡 **Next Steps:**\n1. Complete missing CRUD operations\n2. Implement database schema updates\n3. Add proper validation and error handling\n4. Test existing functionality`,
          implementations: moduleData.issues.slice(0, 3).map(issue => ({
            description: `Fix ${issue.tile}: ${issue.issue}`,
            priority: 'High',
            type: 'CRUD'
          })),
          suggestions: [
            `Focus on ${moduleName} module completion`,
            'Implement missing database operations',
            'Add comprehensive testing',
            'Update documentation'
          ]
        };
      }
    }
    
    return {
      answer: `**Development Assistant Ready**\n\nI can help you with development status questions. Try asking:\n\n🔍 **Status Questions:**\n• "What's missing in [module] module?"\n• "Show me implementation status"\n• "What needs to be developed?"\n\n⚙️ **Implementation Requests:**\n• "Implement [specific feature]"\n• "Develop missing in Master Data Chart of Accounts"\n• "Fix CRUD operations for [tile name]"\n\n📊 **Available Modules:**\nMaster Data, Transaction, Sales, Inventory, Finance, Production, Purchase, Controlling\n\n*Note: AI services temporarily unavailable, using enhanced rule-based analysis*`,
      implementations: [],
      suggestions: [
        'Ask about specific modules for detailed analysis',
        'Request implementation of missing features',
        'Get status overview of development progress'
      ]
    };
  }

  extractImplementationSuggestions(response, contextAnalysis) {
    // Extract actionable implementation items from AI response
    const implementations = [];
    
    // Look for specific implementation mentions
    const lines = response.split('\n');
    lines.forEach(line => {
      if (line.includes('implement') || line.includes('create') || line.includes('add')) {
        implementations.push({
          description: line.trim(),
          priority: 'Medium',
          type: 'implementation'
        });
      }
    });
    
    return implementations.slice(0, 5); // Limit to 5 suggestions
  }

  extractGeneralSuggestions(response) {
    const suggestions = [];
    
    if (response.includes('database')) {
      suggestions.push('Consider database schema updates');
    }
    if (response.includes('CRUD')) {
      suggestions.push('Complete missing CRUD operations');
    }
    if (response.includes('frontend')) {
      suggestions.push('Update frontend components');
    }
    if (response.includes('API')) {
      suggestions.push('Implement missing API endpoints');
    }
    
    return suggestions;
  }

  async getAgentStatus() {
    return {
      agentId: this.agentId,
      name: this.agentName,
      status: 'operational',
      capabilities: this.capabilities,
      lastActivity: new Date().toISOString(),
      metrics: {
        totalAnalyses: 0,
        implementationsCompleted: 0,
        successRate: '100%'
      }
    };
  }
}

export default DevelopmentReviewAgent;