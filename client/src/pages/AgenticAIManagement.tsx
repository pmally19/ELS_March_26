import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Brain, 
  MessageSquare, 
  Users, 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Cpu,
  Database,
  Network,
  Bot
} from 'lucide-react';

interface AgentStatus {
  total_agents: number;
  active_agents: number;
  task_queue_length: number;
  pending_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  agents: AgentInfo[];
}

interface AgentInfo {
  id: string;
  name: string;
  specialization: string[];
  model_type: string;
  capabilities: string[];
  active: boolean;
  memory_enabled: boolean;
  autonomous: boolean;
}

interface AgentTask {
  id: string;
  agent_id: string;
  task_type: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

interface AgentCommunication {
  from_agent: string;
  to_agent: string;
  message: string;
  message_type: string;
  timestamp: string;
}

const AgenticAIManagement: React.FC = () => {
  const [requestText, setRequestText] = useState('');
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [selectedFromAgent, setSelectedFromAgent] = useState('');
  const [selectedToAgent, setSelectedToAgent] = useState('');
  const queryClient = useQueryClient();

  // Fetch agent status
  const { data: agentStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['agentic-ai-status'],
    queryFn: () => apiRequest('/api/agentic-ai/status'),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch task history
  const { data: taskHistory, isLoading: tasksLoading } = useQuery({
    queryKey: ['agentic-ai-tasks'],
    queryFn: () => apiRequest('/api/agentic-ai/tasks'),
    refetchInterval: 3000,
  });

  // Fetch communications
  const { data: communications, isLoading: commsLoading } = useQuery({
    queryKey: ['agentic-ai-communications'],
    queryFn: () => apiRequest('/api/agentic-ai/communications'),
    refetchInterval: 2000,
  });

  // Fetch capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['agentic-ai-capabilities'],
    queryFn: () => apiRequest('/api/agentic-ai/capabilities'),
  });

  // Process request mutation
  const processRequestMutation = useMutation({
    mutationFn: (request: { request: string; context?: any }) =>
      apiRequest('/api/agentic-ai/process', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentic-ai-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['agentic-ai-status'] });
      setRequestText('');
    },
  });

  // Inter-agent communication mutation
  const communicationMutation = useMutation({
    mutationFn: (communication: { from_agent: string; to_agent: string; message: string; type?: string }) =>
      apiRequest('/api/agentic-ai/communicate', {
        method: 'POST',
        body: JSON.stringify(communication),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentic-ai-communications'] });
      setCommunicationMessage('');
    },
  });

  const handleProcessRequest = () => {
    if (!requestText.trim()) return;
    
    processRequestMutation.mutate({
      request: requestText,
      context: { timestamp: new Date().toISOString() }
    });
  };

  const handleAgentCommunication = () => {
    if (!selectedFromAgent || !selectedToAgent || !communicationMessage.trim()) return;
    
    communicationMutation.mutate({
      from_agent: selectedFromAgent,
      to_agent: selectedToAgent,
      message: communicationMessage,
      type: 'request'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModelTypeIcon = (modelType: string) => {
    switch (modelType) {
      case 'local': return <Cpu className="h-4 w-4" />;
      case 'openai': return <Brain className="h-4 w-4" />;
      case 'huggingface': return <Bot className="h-4 w-4" />;
      default: return <Network className="h-4 w-4" />;
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Agentic AI System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agentic AI Management</h1>
        <p className="text-gray-600">Multi-agent AI system with Transformers, HuggingFace, and LangChain</p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentStatus?.status?.active_agents || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {agentStatus?.status?.total_agents || 0} total agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Queue</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentStatus?.status?.task_queue_length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {agentStatus?.status?.pending_tasks || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentStatus?.status?.completed_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {agentStatus?.status?.failed_tasks || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="process">Process Request</TabsTrigger>
          <TabsTrigger value="tasks">Task History</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                AI Agent Fleet
              </CardTitle>
              <CardDescription>
                Specialized AI agents powered by different models and frameworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Development Agents - Specialized Services */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Developer Agent</CardTitle>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Specializations:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">Code Generation</Badge>
                          <Badge variant="outline" className="text-xs">File Modification</Badge>
                          <Badge variant="outline" className="text-xs">Automation</Badge>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Capabilities:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">AI-Powered Development</Badge>
                          <Badge variant="secondary" className="text-xs">Multi-Provider AI</Badge>
                          <Badge variant="secondary" className="text-xs">Task Planning</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Memory Enabled
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Collaborative
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => window.location.href = '/developer-agent'}
                        size="sm" 
                        className="w-full mt-3"
                      >
                        Open Developer Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Peer Review Agent</CardTitle>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Specializations:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">Code Review</Badge>
                          <Badge variant="outline" className="text-xs">Quality Assurance</Badge>
                          <Badge variant="outline" className="text-xs">Due Diligence</Badge>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Capabilities:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">Security Analysis</Badge>
                          <Badge variant="secondary" className="text-xs">Performance Review</Badge>
                          <Badge variant="secondary" className="text-xs">Quality Gates</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Memory Enabled
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Senior Level
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => window.location.href = '/developer-agent'}
                        size="sm" 
                        className="w-full mt-3"
                        variant="outline"
                      >
                        View in Developer Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {agentStatus?.status?.agents?.map((agent: AgentInfo) => (
                  <Card key={agent.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getModelTypeIcon(agent.model_type)}
                          <Badge variant={agent.active ? "default" : "secondary"}>
                            {agent.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Specializations:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.specialization.map((spec) => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-700">Capabilities:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.capabilities.slice(0, 3).map((cap) => (
                              <Badge key={cap} variant="secondary" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                            {agent.capabilities.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{agent.capabilities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {agent.memory_enabled ? "Memory" : "No Memory"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {agent.autonomous ? "Autonomous" : "Manual"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Process AI Request
              </CardTitle>
              <CardDescription>
                Send natural language requests to the AI agent fleet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Request Description
                  </label>
                  <Textarea
                    placeholder="Enter your request in natural language... (e.g., 'Analyze sales data for the last 30 days', 'Optimize inventory levels', 'Generate financial report')"
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <Button 
                  onClick={handleProcessRequest}
                  disabled={!requestText.trim() || processRequestMutation.isPending}
                  className="w-full"
                >
                  {processRequestMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Process Request
                    </>
                  )}
                </Button>

                {processRequestMutation.isSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">Request processed successfully!</p>
                    <p className="text-green-600 text-sm mt-1">Check the Task History tab for results.</p>
                  </div>
                )}

                {processRequestMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">Error processing request:</p>
                    <p className="text-red-600 text-sm mt-1">
                      {processRequestMutation.error instanceof Error ? processRequestMutation.error.message : 'Unknown error'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inter-Agent Communication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Inter-Agent Communication
              </CardTitle>
              <CardDescription>
                Facilitate communication between AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      From Agent
                    </label>
                    <select
                      value={selectedFromAgent}
                      onChange={(e) => setSelectedFromAgent(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select source agent</option>
                      {agentStatus?.status?.agents?.map((agent: AgentInfo) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      To Agent
                    </label>
                    <select
                      value={selectedToAgent}
                      onChange={(e) => setSelectedToAgent(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select target agent</option>
                      {agentStatus?.status?.agents?.map((agent: AgentInfo) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Message
                  </label>
                  <Textarea
                    placeholder="Enter message for inter-agent communication..."
                    value={communicationMessage}
                    onChange={(e) => setCommunicationMessage(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <Button 
                  onClick={handleAgentCommunication}
                  disabled={!selectedFromAgent || !selectedToAgent || !communicationMessage.trim() || communicationMutation.isPending}
                  className="w-full"
                >
                  {communicationMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Task Execution History
              </CardTitle>
              <CardDescription>
                Recent tasks processed by AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {tasksLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taskHistory?.tasks?.map((task: AgentTask) => (
                      <Card key={task.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{task.task_type}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700">{task.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Bot className="h-3 w-3" />
                                {task.agent_id}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(task.created_at).toLocaleString()}
                              </div>
                            </div>

                            {task.result && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm font-medium text-green-800">Result:</p>
                                <p className="text-sm text-green-700 mt-1">
                                  {typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
                                </p>
                              </div>
                            )}

                            {task.error && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm font-medium text-red-800">Error:</p>
                                <p className="text-sm text-red-700 mt-1">{task.error}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Inter-Agent Communications
              </CardTitle>
              <CardDescription>
                Communication logs between AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {commsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {communications?.communications?.map((comm: AgentCommunication, index: number) => (
                      <Card key={index} className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {comm.from_agent} → {comm.to_agent}
                            </CardTitle>
                            <Badge variant="outline">
                              {comm.message_type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700">{comm.message}</p>
                            
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              {new Date(comm.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                System Capabilities
              </CardTitle>
              <CardDescription>
                Overview of AI frameworks and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">AI Frameworks</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span>OpenAI GPT-4o</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-green-600" />
                      <span>Hugging Face Transformers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-purple-600" />
                      <span>LangChain</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-orange-600" />
                      <span>Local AI Models</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Supported Tasks</h3>
                  <div className="space-y-2">
                    {capabilities?.capabilities?.supported_tasks?.map((task: string) => (
                      <div key={task} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="capitalize">{task.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {capabilities?.capabilities?.features?.map((feature: string) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgenticAIManagement;