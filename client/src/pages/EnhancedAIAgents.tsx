/**
 * ENHANCED AI AGENTS PAGE
 * Comprehensive interface for managing role-based AI agents with Transformers, HuggingFace, and LangChain integration
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Brain,
  Crown,
  Users,
  GraduationCap,
  UserCheck,
  MessageSquare,
  Activity,
  Settings,
  DollarSign,
  BarChart3,
  Package,
  Factory,
  ShoppingCart,
  UserIcon,
  TrendingUp,
  ArrowLeft,
  Bot,
  Zap,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Sparkles,
  Network,
  Database
} from 'lucide-react';

type AgentRole = 'rookie' | 'coach' | 'player' | 'chief';
type BusinessDomain = 'sales' | 'finance' | 'inventory' | 'production' | 'purchasing' | 'hr' | 'controlling';

const roleIcons = {
  rookie: GraduationCap,
  coach: UserCheck,
  player: Users,
  chief: Crown
};

const roleColors = {
  rookie: 'bg-blue-100 text-blue-800 border-blue-300',
  coach: 'bg-green-100 text-green-800 border-green-300',
  player: 'bg-purple-100 text-purple-800 border-purple-300',
  chief: 'bg-red-100 text-red-800 border-red-300'
};

const domainIcons = {
  sales: DollarSign,
  finance: BarChart3,
  inventory: Package,
  production: Factory,
  purchasing: ShoppingCart,
  hr: UserIcon,
  controlling: TrendingUp
};

const domainColors = {
  sales: 'bg-green-50 text-green-700',
  finance: 'bg-blue-50 text-blue-700',
  inventory: 'bg-purple-50 text-purple-700',
  production: 'bg-orange-50 text-orange-700',
  purchasing: 'bg-yellow-50 text-yellow-700',
  hr: 'bg-pink-50 text-pink-700',
  controlling: 'bg-indigo-50 text-indigo-700'
};

const EnhancedAIAgents: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRole, setSelectedRole] = useState<AgentRole | ''>('');
  const [selectedDomain, setSelectedDomain] = useState<BusinessDomain | ''>('');
  const [requestText, setRequestText] = useState('');
  const [fromAgent, setFromAgent] = useState('');
  const [toAgent, setToAgent] = useState('');
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showCommDialog, setShowCommDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch agent status
  const { data: agentStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['enhanced-ai-status'],
    queryFn: () => apiRequest('/api/enhanced-ai/status'),
    refetchInterval: 5000,
  });

  // Fetch task history
  const { data: taskHistory, isLoading: tasksLoading } = useQuery({
    queryKey: ['enhanced-ai-tasks'],
    queryFn: () => apiRequest('/api/enhanced-ai/tasks'),
    refetchInterval: 3000,
  });

  // Fetch communications
  const { data: communications, isLoading: commsLoading } = useQuery({
    queryKey: ['enhanced-ai-communications'],
    queryFn: () => apiRequest('/api/enhanced-ai/communications'),
    refetchInterval: 2000,
  });

  // Fetch capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['enhanced-ai-capabilities'],
    queryFn: () => apiRequest('/api/enhanced-ai/capabilities'),
  });

  // Process request mutation
  const processRequestMutation = useMutation({
    mutationFn: async (data: { request: string; role: AgentRole; domain: BusinessDomain; context?: any }) => {
      return apiRequest('/api/enhanced-ai/process', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: "Request Processed",
        description: "The AI agent has successfully processed your request.",
      });
      queryClient.invalidateQueries({ queryKey: ['enhanced-ai-tasks'] });
      setShowRequestDialog(false);
      setRequestText('');
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process the request",
        variant: "destructive",
      });
    },
  });

  // Communication mutation
  const communicationMutation = useMutation({
    mutationFn: async (data: { fromAgent: string; toAgent: string; message: string; messageType?: string }) => {
      return apiRequest('/api/enhanced-ai/communicate', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: "Communication Sent",
        description: "Message sent successfully between agents.",
      });
      queryClient.invalidateQueries({ queryKey: ['enhanced-ai-communications'] });
      setShowCommDialog(false);
      setCommunicationMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "Communication Failed",
        description: error.message || "Failed to send communication",
        variant: "destructive",
      });
    },
  });

  const handleProcessRequest = () => {
    if (!selectedRole || !selectedDomain || !requestText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select role, domain, and enter request text",
        variant: "destructive",
      });
      return;
    }

    processRequestMutation.mutate({
      request: requestText,
      role: selectedRole,
      domain: selectedDomain,
    });
  };

  const handleSendCommunication = () => {
    if (!fromAgent || !toAgent || !communicationMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select agents and enter message",
        variant: "destructive",
      });
      return;
    }

    communicationMutation.mutate({
      fromAgent,
      toAgent,
      message: communicationMessage,
      messageType: 'request',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-600" />
              Enhanced AI Agents
              <Badge variant="outline" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Transformers + HuggingFace + LangChain
              </Badge>
            </h1>
            <p className="text-gray-600 mt-1">
              Advanced AI agents with role-based intelligence and cross-domain expertise
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button>
                <Bot className="h-4 w-4 mr-2" />
                Process Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Process AI Request</DialogTitle>

              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Agent Role</label>
                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AgentRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rookie">Rookie Agent</SelectItem>
                      <SelectItem value="coach">Coach Agent</SelectItem>
                      <SelectItem value="player">Player Agent</SelectItem>
                      <SelectItem value="chief">Chief Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Domain</label>
                  <Select value={selectedDomain} onValueChange={(value) => setSelectedDomain(value as BusinessDomain)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="purchasing">Purchasing</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="controlling">Controlling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Request</label>
                  <Textarea
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    placeholder="Enter your request for the AI agent..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleProcessRequest}
                  disabled={processRequestMutation.isPending}
                  className="w-full"
                >
                  {processRequestMutation.isPending ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Process Request
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCommDialog} onOpenChange={setShowCommDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Agent Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Inter-Agent Communication</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">From Agent</label>
                  <Input
                    value={fromAgent}
                    onChange={(e) => setFromAgent(e.target.value)}
                    placeholder="e.g., player-sales"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">To Agent</label>
                  <Input
                    value={toAgent}
                    onChange={(e) => setToAgent(e.target.value)}
                    placeholder="e.g., coach-finance"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={communicationMessage}
                    onChange={(e) => setCommunicationMessage(e.target.value)}
                    placeholder="Enter communication message..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSendCommunication}
                  disabled={communicationMutation.isPending}
                  className="w-full"
                >
                  {communicationMutation.isPending ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Communication
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Cards */}
      {agentStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Agents</p>
                  <p className="text-2xl font-bold">{agentStatus.status.total_agents}</p>
                </div>
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Agents</p>
                  <p className="text-2xl font-bold text-green-600">{agentStatus.status.active_agents}</p>
                </div>
                <Zap className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                  <p className="text-2xl font-bold text-blue-600">{agentStatus.status.completed_tasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Queue Length</p>
                  <p className="text-2xl font-bold text-orange-600">{agentStatus.status.task_queue_length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Role Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentStatus && agentStatus.status?.role_distribution ? (
                  <div className="space-y-3">
                    {Object.entries(agentStatus.status.role_distribution).map(([role, count]) => {
                      const RoleIcon = roleIcons[role as AgentRole];
                      return (
                        <div key={role} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <RoleIcon className="h-5 w-5 text-gray-600" />
                            <span className="font-medium capitalize">{role} Agents</span>
                          </div>
                          <Badge className={roleColors[role as AgentRole]}>{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Network className="h-8 w-8 mx-auto mb-4" />
                    <p>No role distribution data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <span className="font-medium">System Status</span>
                    <Badge className="bg-green-100 text-green-800">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <span className="font-medium">Queue Health</span>
                    <Badge className="bg-blue-100 text-blue-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                    <span className="font-medium">AI Models</span>
                    <Badge className="bg-purple-100 text-purple-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {agentStatus?.status?.agents && agentStatus.status.agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentStatus.status.agents.map((agent: any) => {
                const RoleIcon = roleIcons[agent.role as AgentRole];
                const DomainIcon = domainIcons[agent.domain as BusinessDomain];

                return (
                  <Card key={agent.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <RoleIcon className="h-5 w-5" />
                        {agent.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={roleColors[agent.role as AgentRole]}>
                          {agent.role}
                        </Badge>
                        <Badge variant="outline" className={domainColors[agent.domain as BusinessDomain]}>
                          <DomainIcon className="h-3 w-3 mr-1" />
                          {agent.domain}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Intelligence Level:</span>
                          <Badge variant="secondary">{agent.intelligence_level}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>AI Model:</span>
                          <Badge variant="outline">{agent.ai_model_preference}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Status:</span>
                          <Badge className={agent.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {agent.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Learning:</span>
                          <Badge variant={agent.learning_enabled ? 'default' : 'secondary'}>
                            {agent.learning_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Autonomous:</span>
                          <Badge variant={agent.autonomous_actions ? 'default' : 'secondary'}>
                            {agent.autonomous_actions ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4" />
              <p>No agents available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Task History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading tasks...</p>
                </div>
              ) : taskHistory?.tasks?.length > 0 ? (
                <div className="space-y-3">
                  {taskHistory.tasks.map((task: any) => (
                    <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={roleColors[task.role as AgentRole]}>
                            {task.role}
                          </Badge>
                          <Badge variant="outline" className={domainColors[task.domain as BusinessDomain]}>
                            {task.domain}
                          </Badge>
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(task.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Task Type: {task.task_type}</span>
                        <span>Agent: {task.agent_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-4" />
                  <p>No tasks found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Agent Communications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commsLoading ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading communications...</p>
                </div>
              ) : communications?.communications?.length > 0 ? (
                <div className="space-y-3">
                  {communications.communications.map((comm: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={roleColors[comm.from_role as AgentRole]}>
                            {comm.from_agent}
                          </Badge>
                          <span className="text-sm text-gray-500">→</span>
                          <Badge className={roleColors[comm.to_role as AgentRole]}>
                            {comm.to_agent}
                          </Badge>
                          <Badge variant="outline">
                            {comm.message_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(comm.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{comm.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-4" />
                  <p>No communications found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Agent Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capabilities?.capabilities?.length > 0 ? (
                <div className="space-y-4">
                  {capabilities.capabilities.map((agent: any) => (
                    <div key={agent.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{agent.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={roleColors[agent.role as AgentRole]}>
                            {agent.role}
                          </Badge>
                          <Badge variant="outline" className={domainColors[agent.domain as BusinessDomain]}>
                            {agent.domain}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Capabilities:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.capabilities.map((cap: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.permissions.map((perm: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-8 w-8 mx-auto mb-4" />
                  <p>No capabilities data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAIAgents;