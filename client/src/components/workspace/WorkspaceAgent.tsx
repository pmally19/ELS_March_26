import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Lightbulb, 
  Target,
  MessageSquare,
  Search,
  Settings,
  BookOpen,
  BarChart3,
  Zap,
  Brain,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Filter
} from 'lucide-react';
import { SIMPLIFIED_TILE_CATALOG, type TileConfig } from '@shared/simplified-tile-catalog';

interface AgentSuggestion {
  id: string;
  type: 'tile' | 'workspace' | 'optimization' | 'learning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  tiles?: string[];
  confidence: number;
}

interface UserActivity {
  tileId: string;
  timestamp: Date;
  action: 'view' | 'click' | 'favorite' | 'hide';
  duration?: number;
}

interface WorkspaceAnalytics {
  mostUsedTiles: string[];
  leastUsedTiles: string[];
  optimalWorkflowPath: string[];
  efficiencyScore: number;
  timeSpentByModule: Record<string, number>;
}

export default function WorkspaceAgent() {
  const [isAgentVisible, setIsAgentVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [userQuery, setUserQuery] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);

  // Initialize agent with smart suggestions
  useEffect(() => {
    generateInitialSuggestions();
    generateAnalytics();
  }, []);

  const generateInitialSuggestions = () => {
    const initialSuggestions: AgentSuggestion[] = [
      {
        id: 'workflow-optimization',
        type: 'optimization',
        title: 'Optimize Sales-to-Cash Workflow',
        description: 'Create a streamlined workspace for complete sales process from quotation to payment',
        priority: 'high',
        tiles: ['S001', 'S002', 'S003', 'S004', 'F005', 'F006'],
        confidence: 0.95
      },
      {
        id: 'master-data-setup',
        type: 'workspace',
        title: 'Essential Master Data Setup',
        description: 'Start with foundational data setup before configuring transactions',
        priority: 'high',
        tiles: ['A001', 'A002', 'A003', 'B001', 'B002'],
        confidence: 0.92
      },
      {
        id: 'procurement-efficiency',
        type: 'optimization',
        title: 'Streamline Procurement Process',
        description: 'Optimize purchase-to-pay workflow for better vendor management',
        priority: 'medium',
        tiles: ['P001', 'P002', 'P003', 'P004', 'P005'],
        confidence: 0.88
      },
      {
        id: 'inventory-control',
        type: 'tile',
        title: 'Inventory Management Focus',
        description: 'Key tiles for effective stock control and valuation',
        priority: 'medium',
        tiles: ['I001', 'I002', 'I003', 'I004'],
        confidence: 0.85
      },
      {
        id: 'financial-reporting',
        type: 'learning',
        title: 'Financial Reporting Best Practices',
        description: 'Learn how to set up comprehensive financial reporting workflows',
        priority: 'low',
        tiles: ['R001', 'R002', 'R003', 'F001', 'F002'],
        confidence: 0.82
      }
    ];
    setSuggestions(initialSuggestions);
  };

  const generateAnalytics = () => {
    // Simulate analytics based on tile usage patterns
    const mockAnalytics: WorkspaceAnalytics = {
      mostUsedTiles: ['S001', 'A001', 'F001', 'P001', 'I001'],
      leastUsedTiles: ['R003', 'C003', 'M003'],
      optimalWorkflowPath: ['A001', 'A002', 'B001', 'S001', 'S002', 'S003', 'F001'],
      efficiencyScore: 78,
      timeSpentByModule: {
        'Master Data': 25,
        'Sales': 30,
        'Finance': 20,
        'Procurement': 15,
        'Inventory': 10
      }
    };
    setAnalytics(mockAnalytics);
  };

  const handleAgentQuery = async (query: string) => {
    setIsProcessing(true);
    setUserQuery(query);

    try {
      // Call OpenAI API for intelligent workspace assistance
      const response = await fetch('/api/workspace-agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          currentWorkspace: 'all-modules',
          userActivity,
          availableTiles: SIMPLIFIED_TILE_CATALOG
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAgentResponse(data.response);
        if (data.suggestions) {
          setSuggestions(prev => [...data.suggestions, ...prev]);
        }
      } else {
        setAgentResponse("I'm here to help with your workspace needs. Try asking about tile recommendations, workflow optimization, or workspace setup guidance.");
      }
    } catch (error) {
      setAgentResponse("I'm ready to assist with workspace management. Feel free to ask about tile organization, process workflows, or productivity tips.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applySuggestion = (suggestion: AgentSuggestion) => {
    // Apply the suggested optimization
    console.log('Applying suggestion:', suggestion);
    // This would integrate with the workspace management system
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tile': return <Target className="h-4 w-4" />;
      case 'workspace': return <Settings className="h-4 w-4" />;
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'learning': return <BookOpen className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Agent Toggle Button */}
      <Button
        onClick={() => setIsAgentVisible(!isAgentVisible)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-50"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>

      {/* Agent Panel */}
      {isAgentVisible && (
        <Card className="fixed bottom-20 right-6 w-96 h-[600px] shadow-xl z-40 bg-white border border-gray-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Workspace Agent
            </CardTitle>
            <CardDescription className="text-blue-100">
              Your intelligent workspace assistant
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 h-[520px]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                <TabsTrigger value="suggestions" className="flex flex-col gap-1 py-3">
                  <Lightbulb className="h-4 w-4" />
                  <span className="text-xs">Suggestions</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex flex-col gap-1 py-3">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex flex-col gap-1 py-3">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="help" className="flex flex-col gap-1 py-3">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs">Help</span>
                </TabsTrigger>
              </TabsList>

              {/* Suggestions Tab */}
              <TabsContent value="suggestions" className="p-4 h-[450px]">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">Smart Recommendations</h3>
                    </div>
                    
                    {suggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(suggestion.type)}
                              <span className="font-medium text-sm">{suggestion.title}</span>
                            </div>
                            {getPriorityIcon(suggestion.priority)}
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-3">{suggestion.description}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {suggestion.confidence}% confidence
                              </Badge>
                              {suggestion.tiles && (
                                <Badge variant="secondary" className="text-xs">
                                  {suggestion.tiles.length} tiles
                                </Badge>
                              )}
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => applySuggestion(suggestion)}
                              className="text-xs"
                            >
                              Apply
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat" className="p-4 h-[450px] flex flex-col">
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Bot className="h-6 w-6 text-blue-600 mt-1" />
                      <div className="bg-blue-50 rounded-lg p-3 flex-1">
                        <p className="text-sm">
                          Hello! I'm your Workspace Agent. I can help you with:
                        </p>
                        <ul className="text-xs mt-2 space-y-1 text-gray-600">
                          <li>• Tile recommendations based on your role</li>
                          <li>• Workflow optimization suggestions</li>
                          <li>• Workspace organization tips</li>
                          <li>• Process efficiency analysis</li>
                        </ul>
                      </div>
                    </div>

                    {agentResponse && (
                      <div className="flex items-start gap-3">
                        <Bot className="h-6 w-6 text-blue-600 mt-1" />
                        <div className="bg-blue-50 rounded-lg p-3 flex-1">
                          <p className="text-sm">{agentResponse}</p>
                        </div>
                      </div>
                    )}

                    {userQuery && (
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">{userQuery}</p>
                        </div>
                        <Users className="h-6 w-6 text-gray-600 mt-1" />
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about workspace optimization..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAgentQuery(userQuery)}
                    className="text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => handleAgentQuery(userQuery)}
                    disabled={isProcessing || !userQuery.trim()}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-4 h-[450px]">
                <ScrollArea className="h-full">
                  {analytics && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">Workspace Analytics</h3>
                      </div>

                      <Card className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Efficiency Score</span>
                            <Badge className="bg-green-100 text-green-800">
                              {analytics.efficiencyScore}%
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${analytics.efficiencyScore}%` }}
                            ></div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-gray-200">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-sm mb-3">Most Used Tiles</h4>
                          <div className="space-y-2">
                            {analytics.mostUsedTiles.slice(0, 5).map((tileNumber, index) => {
                              const tile = SIMPLIFIED_TILE_CATALOG.find(t => t.number === tileNumber);
                              return (
                                <div key={tileNumber} className="flex items-center justify-between">
                                  <span className="text-xs">{tile?.title || tileNumber}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-1">
                                      <div 
                                        className="bg-blue-600 h-1 rounded-full" 
                                        style={{ width: `${100 - (index * 15)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-500">{100 - (index * 15)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-gray-200">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-sm mb-3">Time by Module</h4>
                          <div className="space-y-2">
                            {Object.entries(analytics.timeSpentByModule).map(([module, percentage]) => (
                              <div key={module} className="flex items-center justify-between">
                                <span className="text-xs">{module}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-1">
                                    <div 
                                      className="bg-indigo-600 h-1 rounded-full" 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500">{percentage}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Help Tab */}
              <TabsContent value="help" className="p-4 h-[450px]">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold">Quick Help</h3>
                    </div>

                    <Card className="border border-gray-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-2">Getting Started</h4>
                        <ul className="text-xs space-y-1 text-gray-600">
                          <li>• Start with Master Data workspace to set up foundations</li>
                          <li>• Use "All Modules" to see complete tile catalog</li>
                          <li>• Create custom workspaces for specific processes</li>
                          <li>• Ask the agent for personalized recommendations</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-2">Best Practices</h4>
                        <ul className="text-xs space-y-1 text-gray-600">
                          <li>• Group related tiles in custom workspaces</li>
                          <li>• Follow process sequences (A001 → A002 → B001)</li>
                          <li>• Use favorites to mark frequently accessed tiles</li>
                          <li>• Monitor analytics to optimize workflows</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm mb-2">Common Questions</h4>
                        <div className="space-y-2 text-xs">
                          <Button variant="ghost" size="sm" className="w-full justify-start h-auto p-2">
                            "How do I set up a new workspace?"
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start h-auto p-2">
                            "What tiles should I use for sales process?"
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start h-auto p-2">
                            "How to optimize my workflow?"
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </>
  );
}