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
  Bot,
  Crown,
  GraduationCap,
  PlayCircle,
  UserCheck
} from 'lucide-react';

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  domain: string;
  specialization: string[];
  intelligence_level: string;
  ai_model_preference: string;
  permissions: string[];
  active: boolean;
  learning_enabled: boolean;
  autonomous_actions: boolean;
}

interface AgentStatus {
  total_agents: number;
  active_agents: number;
  task_queue_length: number;
  pending_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  agents: AgentInfo[];
  role_distribution: {
    rookie: number;
    coach: number;
    player: number;
    chief: number;
  };
}

interface AgentHealth {
  system_status: string;
  agents_active: number;
  total_agents: number;
  task_queue_health: string;
  role_distribution: {
    rookie: number;
    coach: number;
    player: number;
    chief: number;
  };
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  uptime: number;
  timestamp: string;
}

const LiveAIAgentsInterface: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [taskRequest, setTaskRequest] = useState('');
  const queryClient = useQueryClient();

  // Agent Status Query
  const { data: agentStatusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{success: boolean, status: AgentStatus}>({
    queryKey: ['/api/enhanced-ai/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Agent Health Query
  const { data: agentHealthData, refetch: refetchHealth } = useQuery<{success: boolean, health: AgentHealth}>({
    queryKey: ['/api/enhanced-ai/health'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Chat with Agent Mutation
  const chatMutation = useMutation({
    mutationFn: async (data: { agent_id: string, message: string, task_type?: string }) => {
      return apiRequest('/api/enhanced-ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setMessageText('');
      refetchStatus();
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: { agent_id: string, task_type: string, description: string, priority: string }) => {
      return apiRequest('/api/enhanced-ai/task', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setTaskRequest('');
      refetchStatus();
    },
  });

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'chief': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'player': return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'coach': return <GraduationCap className="w-4 h-4 text-green-600" />;
      case 'rookie': return <UserCheck className="w-4 h-4 text-gray-600" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getDomainColor = (domain: string) => {
    switch(domain) {
      case 'sales': return 'bg-blue-100 text-blue-800';
      case 'finance': return 'bg-green-100 text-green-800';
      case 'inventory': return 'bg-purple-100 text-purple-800';
      case 'production': return 'bg-orange-100 text-orange-800';
      case 'controlling': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendMessage = () => {
    if (selectedAgent && messageText.trim()) {
      chatMutation.mutate({
        agent_id: selectedAgent,
        message: messageText,
        task_type: 'chat'
      });
    }
  };

  const handleCreateTask = () => {
    if (selectedAgent && taskRequest.trim()) {
      createTaskMutation.mutate({
        agent_id: selectedAgent,
        task_type: 'business_analysis',
        description: taskRequest,
        priority: 'normal'
      });
    }
  };

  const agentStatus = agentStatusData?.status;
  const agentHealth = agentHealthData?.health;

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Cpu className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading AI Agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Live AI Agents Interface</h1>
        <p className="text-gray-600">
          Interact with 12 autonomous AI agents across your ERP system
        </p>
      </div>

      {/* System Overview */}
      {agentHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Status</p>
                  <p className="text-lg font-semibold capitalize">{agentHealth.system_status}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Agents</p>
                  <p className="text-lg font-semibold">{agentHealth.agents_active}/{agentHealth.total_agents}</p>
                </div>
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Queue Health</p>
                  <p className="text-lg font-semibold capitalize">{agentHealth.task_queue_health}</p>
                </div>
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-lg font-semibold">{Math.floor(agentHealth.uptime / 60)}m</p>
                </div>
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">Active Agents</TabsTrigger>
          <TabsTrigger value="chat">Agent Chat</TabsTrigger>
          <TabsTrigger value="tasks">Task Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Agents Tab */}
        <TabsContent value="agents">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">AI Agent Hierarchy</h2>
              <Button onClick={() => refetchStatus()} size="sm">
                <Activity className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {agentStatus && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentStatus.agents.map((agent) => (
                  <Card key={agent.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(agent.role)}
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                        </div>
                        <div className="flex space-x-1">
                          {agent.active && <Badge variant="outline" className="text-green-600">Active</Badge>}
                          {agent.autonomous_actions && <Badge variant="outline" className="text-blue-600">Autonomous</Badge>}
                        </div>
                      </div>
                      <Badge className={getDomainColor(agent.domain)}>
                        {agent.domain.charAt(0).toUpperCase() + agent.domain.slice(1)}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Intelligence Level</p>
                          <p className="text-sm capitalize">{agent.intelligence_level}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Specializations</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.specialization.slice(0, 2).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {agent.specialization.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{agent.specialization.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Model:</span>
                          <span className="capitalize">{agent.ai_model_preference}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Agent Chat Tab */}
        <TabsContent value="chat">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Select Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {agentStatus?.agents.map((agent) => (
                        <Button
                          key={agent.id}
                          variant={selectedAgent === agent.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedAgent(agent.id)}
                        >
                          {getRoleIcon(agent.role)}
                          <span className="ml-2">{agent.name}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Chat with Agent</CardTitle>
                  <CardDescription>
                    {selectedAgent ? `Chatting with ${agentStatus?.agents.find(a => a.id === selectedAgent)?.name}` : 'Select an agent to start chatting'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-64 border rounded-lg p-4 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        Chat history will appear here. The agents are currently running autonomously and making business decisions in real-time.
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your message to the agent..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        disabled={!selectedAgent}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!selectedAgent || !messageText.trim() || chatMutation.isPending}
                      >
                        {chatMutation.isPending ? (
                          <Activity className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Task Management Tab */}
        <TabsContent value="tasks">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Task</CardTitle>
                <CardDescription>Assign tasks to AI agents for business analysis and automation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Agent</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                    >
                      <option value="">Choose an agent...</option>
                      {agentStatus?.agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.domain})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Task Description</label>
                    <Textarea
                      placeholder="Describe the task you want the agent to perform..."
                      value={taskRequest}
                      onChange={(e) => setTaskRequest(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreateTask}
                    disabled={!selectedAgent || !taskRequest.trim() || createTaskMutation.isPending}
                    className="w-full"
                  >
                    {createTaskMutation.isPending ? (
                      <>
                        <Activity className="w-4 h-4 mr-2 animate-spin" />
                        Creating Task...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Create Task
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agentStatus && Object.entries(agentStatus.role_distribution).map(([role, count]) => (
                <Card key={role}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 capitalize">{role} Agents</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                      {getRoleIcon(role)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Total Active Agents</span>
                    <Badge variant="outline">{agentStatus?.active_agents}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Queue Length</span>
                    <Badge variant="outline">{agentStatus?.task_queue_length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Pending Tasks</span>
                    <Badge variant="outline">{agentStatus?.pending_tasks}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveAIAgentsInterface;