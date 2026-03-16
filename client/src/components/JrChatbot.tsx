import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Minimize2, Maximize2, Monitor, Globe, MessageCircle, Minus } from 'lucide-react';
import { useAgentRole } from '@/contexts/AgentRoleContext';

interface Message {
  id: string;
  type: 'user' | 'jr' | 'system' | 'navigation';
  content: string;
  timestamp: Date;
  agentContext?: string;
  actionData?: any;
}

interface AgentContext {
  currentModule: string;
  availableAgents: string[];
  primaryAgent: string;
  supportLevel: 'rookie' | 'player' | 'coach' | 'chief';
}

export const JrChatbotFixed: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMode, setContextMode] = useState<'current' | 'entire'>('current');
  const [showContextConfirm, setShowContextConfirm] = useState(false);
  const [targetPage, setTargetPage] = useState<string>('');

  const [location, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentRole, roleConfig } = useAgentRole();

  const getContextFromRoute = (path: string): AgentContext => {
    const routeMap: Record<string, string> = {
      '/': 'Dashboard',
      '/sales': 'Sales',
      '/inventory': 'Inventory', 
      '/finance': 'Finance',
      '/hr': 'Human Resources',
      '/production': 'Production',
      '/purchasing': 'Purchasing',
      '/master-data': 'Master Data',
      '/reports': 'Reports',
      '/general-ledger': 'General Ledger',
      '/tools': 'Tools',
      '/admin': 'Administration'
    };

    const currentModule = routeMap[path] || 'Dashboard';
    
    return {
      currentModule,
      availableAgents: ['Sales', 'Finance', 'Inventory', 'HR', 'Production', 'Purchasing'],
      primaryAgent: currentModule,
      supportLevel: (currentRole as 'rookie' | 'player' | 'coach' | 'chief') || 'chief'
    };
  };

  const agentContext = getContextFromRoute(location);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        type: 'jr',
        content: `Hello! I'm Jr., your MallyERP business assistant. I can help with navigation, data operations, and system guidance.`,
        timestamp: new Date(),
        agentContext: agentContext?.primaryAgent
      };
      setMessages([welcomeMessage]);
    }
  }, [agentContext?.primaryAgent]);

  // Handle context mode changes with confirmation
  const handleContextChange = (newMode: 'current' | 'entire') => {
    if (contextMode === 'entire' && newMode === 'current') {
      setShowContextConfirm(true);
      setTargetPage(agentContext?.currentModule || 'Unknown Page');
    } else {
      setContextMode(newMode);
      if (newMode === 'entire') {
        const contextMessage: Message = {
          id: `context-${Date.now()}`,
          type: 'system',
          content: `Switched to Entire Application mode. I can now access any MallyERP page or tile.`,
          timestamp: new Date(),
          agentContext: agentContext?.primaryAgent
        };
        setMessages(prev => [...prev, contextMessage]);
      }
    }
  };

  // Confirm page setting
  const confirmPageSetting = (confirm: boolean) => {
    if (confirm) {
      setContextMode('current');
      const confirmMessage: Message = {
        id: `confirm-${Date.now()}`,
        type: 'system',
        content: `Page context set to: ${targetPage}. I'm now focused on this page for all assistance.`,
        timestamp: new Date(),
        agentContext: agentContext?.primaryAgent
      };
      setMessages(prev => [...prev, confirmMessage]);
    } else {
      setContextMode('entire');
    }
    setShowContextConfirm(false);
    setTargetPage('');
  };

  const getAgentResponse = async (userMessage: string): Promise<string> => {
    const userInput = userMessage.toLowerCase();

    // TRUE AI NAVIGATION - Direct navigation commands
    const navigationMap: Record<string, { route: string; display: string }> = {
      'report': { route: '/reports', display: 'Reporting Center' },
      'reports': { route: '/reports', display: 'Reporting Center' },
      'reporting': { route: '/reports', display: 'Reporting Center' },
      'dashboard': { route: '/', display: 'Main Dashboard' },
      'home': { route: '/', display: 'Main Dashboard' },
      'sales': { route: '/sales', display: 'Sales Module' },
      'inventory': { route: '/inventory', display: 'Inventory Management' },
      'finance': { route: '/finance', display: 'Finance Module' },
      'hr': { route: '/hr', display: 'Human Resources' },
      'production': { route: '/production', display: 'Production Module' },
      'purchasing': { route: '/purchasing', display: 'Purchasing Module' },
      'master data': { route: '/master-data', display: 'Master Data' },
      'general ledger': { route: '/general-ledger', display: 'General Ledger' },
      'tools': { route: '/tools', display: 'Business Tools' },
      'admin': { route: '/admin', display: 'Administration' }
    };

    // Check for navigation commands
    const navigationPatterns = ['go to', 'open', 'navigate to', 'take me to', 'show me'];
    const isNavigationRequest = navigationPatterns.some(pattern => userInput.includes(pattern));
    
    if (isNavigationRequest) {
      for (const [keyword, pageInfo] of Object.entries(navigationMap)) {
        if (userInput.includes(keyword)) {
          // Execute navigation
          setTimeout(() => {
            window.location.href = pageInfo.route;
          }, 500);
          
          const navMessage: Message = {
            id: `nav-${Date.now()}`,
            type: 'navigation',
            content: `Opening ${pageInfo.display}...`,
            timestamp: new Date(),
            actionData: {
              type: 'navigate',
              target: pageInfo.display,
              url: pageInfo.route
            }
          };
          
          setMessages(prev => [...prev, navMessage]);
          return `Navigating to ${pageInfo.display}`;
        }
      }
    }

    // Data operations
    const interactiveKeywords = ['show', 'list', 'display', 'create', 'add', 'new'];
    const businessKeywords = ['customer', 'vendor', 'material', 'product', 'employee', 'account'];
    
    const hasInteractiveKeyword = interactiveKeywords.some(keyword => userInput.includes(keyword));
    const hasBusinessKeyword = businessKeywords.some(keyword => userInput.includes(keyword));
    
    if (hasInteractiveKeyword && hasBusinessKeyword) {
      const moduleMap: Record<string, string> = {
        'customer': 'sales', 'vendor': 'purchasing', 'material': 'inventory',
        'product': 'inventory', 'employee': 'hr', 'account': 'finance'
      };
      
      let targetModule = 'sales';
      for (const [entity, module] of Object.entries(moduleMap)) {
        if (userInput.includes(entity)) {
          targetModule = module;
          break;
        }
      }
      
      try {
        const response = await fetch(`/api/jr/real-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            context: { currentModule: agentContext.currentModule, userRole: currentRole }
          })
        });
        
        const result = await response.json();
        if (result.success && result.response) {
          return result.response;
        }
      } catch (error) {
        return `I can help with ${targetModule} data. Try specific commands like "show ${Object.keys(moduleMap).find(key => moduleMap[key] === targetModule)}".`;
      }
    }

    // Context-aware guidance
    if (contextMode === 'entire') {
      return `I'm ready to help with any MallyERP function. You can:

**Navigate:** "go to reports", "go to sales", "go to finance", etc.
**View Data:** "show customers", "show accounts", "show materials"
**Create Records:** "create customer [name]", "create account [name]"

What would you like to do?`;
    } else {
      return `I'm focused on the current page context (${agentContext.currentModule}). You can:

**Ask Questions:** About this page's functionality
**Navigate:** "go to [destination]" to move elsewhere  
**Switch Context:** Use the radio buttons above to access entire application

How can I help with this page?`;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const inputValue = input.trim();
    if (!inputValue || isLoading) return;

    // Check if this is a response to Credit Management options
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.actionData?.type === 'show_options' && (inputValue === '1' || inputValue === '2')) {
      const chosenOption = lastMessage.actionData.options[inputValue === '1' ? 0 : 1];
      
      // Execute navigation immediately for chosen option
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        type: 'user',
        content: inputValue,
        timestamp: new Date()
      }]);
      
      setMessages(prev => [...prev, {
        id: `nav-${Date.now()}`,
        type: 'system',
        content: `✅ Opening ${chosenOption.name} now...`,
        timestamp: new Date()
      }]);
      
      setTimeout(() => {
        console.log('Navigating to chosen option:', chosenOption.route);
        setLocation(chosenOption.route);
      }, 500);
      
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use REAL business intelligence endpoint for actual data responses
      const response = await fetch('/api/jr/real-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          userId: 'default_user',
          sessionId: sessionStorage.getItem('jr_session_id'),
          currentPage: location,
          contextMode: contextMode
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store session ID for conversation continuity
        if (data.sessionId) {
          sessionStorage.setItem('jr_session_id', data.sessionId);
        }

        // Handle navigation actions - execute actual page navigation
        if (data.actions && data.actions.length > 0) {
          console.log('Navigation actions received:', data.actions);
          for (const action of data.actions) {
            // Handle show_options action for Credit Management choices
            if (action.type === 'show_options' && action.data?.options) {
              // Create an interactive options message
              const optionsMessage: Message = {
                id: `options-${Date.now()}`,
                type: 'system',
                content: `I found 2 Credit Management options. Please choose:

1. **${action.data.options[0].name}** - ${action.data.options[0].description}
2. **${action.data.options[1].name}** - ${action.data.options[1].description}

Type "1" for Advanced Credit Management or "2" for Credit Management Tile.`,
                timestamp: new Date(),
                actionData: { type: 'show_options', options: action.data.options }
              };
              setMessages(prev => [...prev, optionsMessage]);
              continue; // Don't process as navigation
            }
            
            // Handle different action types from the backend
            if ((action.type === 'navigate_to_page' || action.type === 'open_tile') && action.data) {
              const pageName = action.data.pageName || action.data.tileName;
              
              // Use route from action data if provided (preferred - comes from backend route finder)
              let route = action.data?.route;
              
              if (!route) {
                // Comprehensive route mapping with all application routes
                const pageRouteMap: Record<string, string> = {
                  // Main modules
                  'dashboard': '/',
                  'home': '/',
                  'sales': '/sales',
                  'production': '/production',
                  'finance': '/finance',
                  'inventory': '/inventory',
                  'master data': '/master-data',
                  'purchasing': '/purchasing',
                  'hr': '/hr',
                  'reports': '/reports',
                  'tools': '/tools',
                  'admin': '/admin',
                  'controlling': '/controlling',
                  
                  // Sales sub-modules
                  'order to cash': '/sales/order-to-cash',
                  'sales leads': '/sales/leads',
                  'sales opportunities': '/sales/opportunities',
                  'sales quotes': '/sales/quotes',
                  'sales orders': '/sales/orders',
                  
                  // Finance sub-modules
                  'credit management': '/finance/credit-management',
                  'accounts receivable': '/finance/accounts-receivable',
                  'ar': '/finance/accounts-receivable',
                  'accounts payable': '/finance/accounts-payable',
                  'ap': '/finance/accounts-payable',
                  'general ledger': '/general-ledger',
                  'gl': '/general-ledger',
                  'reconciliation': '/finance/reconciliation',
                  
                  // Master data sub-modules
                  'company code': '/master-data/company-code',
                  'plant': '/master-data/plant',
                  'customer master': '/master-data/customer-master',
                  'customers': '/master-data/customer-master',
                  'vendor master': '/master-data/vendor-master',
                  'vendors': '/master-data/vendor-master',
                  'material master': '/master-data/material-master',
                  'materials': '/master-data/material-master',
                  'products': '/master-data/material-master',
                  'cost centers': '/master-data/cost-centers',
                  'work centers': '/master-data/work-centers',
                  'gl accounts': '/master-data/gl-accounts',
                  'bank master': '/master-data/bank-master',
                  'asset master': '/master-data/asset-master',
                  
                  // Transactions
                  'transactions': '/transactions',
                  'asset accounting': '/transactions/asset-accounting',
                  'bank statement processing': '/transactions/bank-statement-processing',
                  'advanced authorization management': '/transactions/advanced-authorization-management',
                  
                  // Tools & Admin
                  'workspace manager': '/workspace-manager',
                  'user management': '/admin/users',
                  'users': '/admin/users',
                  'rbac': '/admin/rbac',
                  'api key manager': '/api-key-manager',
                  
                  // AI Agents
                  'designer agent': '/designer-agent',
                  'developer agent': '/developer-agent',
                  'chief agent': '/chief-agent',
                  'coach agent': '/coach-agent'
                };
                
                route = pageRouteMap[pageName?.toLowerCase()];
                
                // If still no route, try fuzzy matching
                if (!route) {
                  const lowerPageName = pageName?.toLowerCase() || '';
                  // Smart fallback based on keywords
                  if (lowerPageName.includes('receiv') || lowerPageName.includes('ar')) {
                    route = '/finance/accounts-receivable';
                  } else if (lowerPageName.includes('payable') || lowerPageName.includes('ap')) {
                    route = '/finance/accounts-payable';
                  } else if (lowerPageName.includes('customer')) {
                    route = '/master-data/customer-master';
                  } else if (lowerPageName.includes('vendor') || lowerPageName.includes('supplier')) {
                    route = '/master-data/vendor-master';
                  } else if (lowerPageName.includes('product') || lowerPageName.includes('material')) {
                    route = '/master-data/material-master';
                  } else if (lowerPageName.includes('order')) {
                    route = '/sales/orders';
                  } else if (lowerPageName.includes('master')) {
                    route = '/master-data';
                  } else {
                    // Default fallback to dashboard
                    route = '/';
                  }
                }
              }
              
              console.log(`Executing navigation - Type: ${action.type}, Page: ${pageName}, Route: ${route}`);
              
              // Add visual feedback for navigation
              setMessages(prev => [...prev, {
                id: `nav-${Date.now()}`,
                type: 'system',
                content: `🧭 Navigating to ${pageName} now...`,
                timestamp: new Date()
              }]);
              
              // Execute navigation immediately
              setTimeout(() => {
                console.log('Actually navigating to route:', route);
                setLocation(route);
              }, 500);
            }
          }
        }
        
        const jrMessage: Message = {
          id: `jr-${Date.now()}`,
          type: 'jr',
          content: data.response || 'I processed your request.',
          timestamp: new Date(),
          agentContext: agentContext?.primaryAgent,
          actionData: data.actions?.[0] || undefined
        };

        setMessages(prev => [...prev, jrMessage]);
      } else {
        // Fallback to original logic if enhanced AI is unavailable
        const fallbackResponse = await getAgentResponse(inputValue);
        const jrMessage: Message = {
          id: `jr-${Date.now()}`,
          type: 'jr',
          content: fallbackResponse,
          timestamp: new Date(),
          agentContext: agentContext?.primaryAgent
        };
        setMessages(prev => [...prev, jrMessage]);
      }
    } catch (error) {
      console.error('Error getting response:', error);
      // Fallback to original logic
      try {
        const fallbackResponse = await getAgentResponse(inputValue);
        const jrMessage: Message = {
          id: `jr-${Date.now()}`,
          type: 'jr',
          content: fallbackResponse,
          timestamp: new Date(),
          agentContext: agentContext?.primaryAgent
        };
        setMessages(prev => [...prev, jrMessage]);
      } catch (fallbackError) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'system',
          content: 'I encountered an issue. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-xl transition-all duration-300 ${
      isMaximized 
        ? 'w-screen h-screen top-0 left-0 right-0 bottom-0 rounded-none' 
        : isMinimized 
          ? 'w-80 h-12' 
          : 'w-96 h-[600px]'
    }`}>
      <CardHeader className="p-3 bg-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="font-semibold">Jr. Assistant</span>
            {!isMinimized && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded">
                {contextMode === 'current' ? '📍 Current Page' : '🌐 Entire Application'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              title="Minimize chat"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              title={isMaximized ? "Exit fullscreen" : "Maximize chat"}
            >
              {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              title="Close chat"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className={`p-0 flex flex-col ${
          isMaximized ? 'h-[calc(100vh-80px)]' : 'h-[calc(600px-80px)]'
        }`}>
        <ScrollArea className={`flex-1 ${isMaximized ? 'p-8' : 'p-4'}`}>
          {/* Page Context Management Controls */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-medium mb-2 text-blue-800">Page Context Management</div>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="contextMode"
                  value="current"
                  checked={contextMode === 'current'}
                  onChange={() => handleContextChange('current')}
                  className="text-blue-600"
                />
                <div className="flex items-center gap-1 text-sm">
                  <Monitor className="h-3 w-3" />
                  Current Page (Default)
                </div>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="contextMode"
                  value="entire"
                  checked={contextMode === 'entire'}
                  onChange={() => handleContextChange('entire')}
                  className="text-blue-600"
                />
                <div className="flex items-center gap-1 text-sm">
                  <Globe className="h-3 w-3" />
                  Entire Application
                </div>
              </label>
            </div>
            <div className="text-xs text-blue-600 font-medium">
              {contextMode === 'current' 
                ? '📍 Focused on current page context' 
                : '🌐 Access to all MallyERP modules and pages'}
            </div>
          </div>

          {/* Context Switch Confirmation Dialog */}
          {showContextConfirm && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm font-medium mb-2 text-yellow-800">
                Do you want to set to work on this page?
              </div>
              <div className="text-xs text-yellow-700 mb-3">
                Current page: <strong>{targetPage}</strong>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => confirmPageSetting(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Set Page
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => confirmPageSetting(false)}
                >
                  Continue Exploring
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'system'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : message.type === 'navigation'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="text-sm">Thinking...</div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Jr. anything about MallyERP..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </Button>
          </form>
        </div>
        </CardContent>
      )}
    </Card>
  );
};

// Export both names for compatibility
export { JrChatbotFixed as JrChatbot };