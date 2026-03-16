import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Plus, 
  Edit, 
  Trash2,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface IntegrationWorkflow {
  id: number;
  name: string;
  trigger_type: string;
  target_system: string;
  status: string;
  last_execution?: string;
  created_at: string;
}

interface IntegrationSystem {
  id: number;
  system_code: string;
  system_name: string;
  status: string;
}

interface WorkflowExecution {
  id: number;
  workflow_id: number;
  status: string;
  execution_date: string;
  duration_ms: number;
}

export default function IntegrationWorkflowsTile() {
  const [workflowName, setWorkflowName] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [targetSystem, setTargetSystem] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch integration workflows
  const { data: workflows = [], isLoading: workflowsLoading } = useQuery<IntegrationWorkflow[]>({
    queryKey: ['/api/finance/integration-workflows'],
  });

  // Fetch integration systems
  const { data: integrationSystems = [], isLoading: systemsLoading } = useQuery<IntegrationSystem[]>({
    queryKey: ['/api/finance/integration-systems'],
  });

  // Fetch workflow executions
  const { data: workflowExecutions = [], isLoading: executionsLoading } = useQuery<WorkflowExecution[]>({
    queryKey: ['/api/finance/workflow-executions'],
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      return await apiRequest('/api/finance/integration-workflows', {
        method: 'POST',
        body: JSON.stringify(workflowData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow Created",
        description: "Integration workflow has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/integration-workflows'] });
      setWorkflowName('');
      setTriggerType('');
      setTargetSystem('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create integration workflow.",
        variant: "destructive",
      });
    },
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
      return await apiRequest(`/api/finance/integration-workflows/${workflowId}/execute`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow Executed",
        description: "Integration workflow has been executed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/workflow-executions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to execute integration workflow.",
        variant: "destructive",
      });
    },
  });

  const handleCreateWorkflow = () => {
    if (!workflowName || !triggerType || !targetSystem) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createWorkflowMutation.mutate({
      name: workflowName,
      trigger_type: triggerType,
      target_system: targetSystem,
      status: 'active',
    });
  };

  const handleExecuteWorkflow = (workflowId: number) => {
    executeWorkflowMutation.mutate(workflowId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { variant: 'default' as const, icon: CheckCircle },
      'inactive': { variant: 'secondary' as const, icon: Pause },
      'error': { variant: 'destructive' as const, icon: XCircle },
      'running': { variant: 'outline' as const, icon: Clock },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getExecutionStatusBadge = (status: string) => {
    const statusConfig = {
      'success': { variant: 'default' as const, color: 'text-green-600' },
      'failed': { variant: 'destructive' as const, color: 'text-red-600' },
      'running': { variant: 'outline' as const, color: 'text-blue-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.failed;

    return (
      <Badge variant={config.variant}>
        {status}
      </Badge>
    );
  };

  // Calculate statistics
  const totalWorkflows = Array.isArray(workflows) ? workflows.length : 0;
  const activeWorkflows = Array.isArray(workflows) ? workflows.filter(w => w.status === 'active').length : 0;
  const successfulExecutions = Array.isArray(workflowExecutions) ? workflowExecutions.filter(e => e.status === 'success').length : 0;
  const failedExecutions = Array.isArray(workflowExecutions) ? workflowExecutions.filter(e => e.status === 'failed').length : 0;
  const totalExecutions = Array.isArray(workflowExecutions) ? workflowExecutions.length : 0;
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

  const failedToday = Array.isArray(workflowExecutions) ? workflowExecutions.filter(e => 
    e.status === 'failed' && 
    new Date(e.execution_date).toDateString() === new Date().toDateString()
  ).length : 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workflows</p>
                <p className="text-2xl font-bold text-blue-600">{totalWorkflows}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeWorkflows}</p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{successRate}%</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed Today</p>
                <p className="text-2xl font-bold text-red-600">{failedToday}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Creation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Integration Workflow
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Workflow Name</Label>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
              />
            </div>
            
            <div>
              <Label>Trigger Type</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="event_driven">Event Driven</SelectItem>
                  <SelectItem value="data_change">Data Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Target System</Label>
              <Select value={targetSystem} onValueChange={setTargetSystem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target system" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(integrationSystems) ? integrationSystems.map((system) => (
                    <SelectItem key={system.id} value={system.system_code}>
                      {system.system_name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              onClick={handleCreateWorkflow}
              disabled={createWorkflowMutation.isPending}
            >
              {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integration Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger Type</TableHead>
                <TableHead>Target System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Execution</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflowsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading workflows...
                  </TableCell>
                </TableRow>
              ) : !workflows || workflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No workflows found
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(workflows) ? workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.name}</TableCell>
                    <TableCell>{workflow.trigger_type.replace('_', ' ')}</TableCell>
                    <TableCell>{workflow.target_system}</TableCell>
                    <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                    <TableCell>
                      {workflow.last_execution ? new Date(workflow.last_execution).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExecuteWorkflow(workflow.id)}
                          disabled={executeWorkflowMutation.isPending}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : null
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Execution Time</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executionsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading executions...
                  </TableCell>
                </TableRow>
              ) : !workflowExecutions || workflowExecutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No executions found
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(workflowExecutions) ? workflowExecutions.slice(0, 10).map((execution) => {
                  const workflow = workflows.find(w => w.id === execution.workflow_id);
                  return (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">
                        {workflow ? workflow.name : `Workflow ${execution.workflow_id}`}
                      </TableCell>
                      <TableCell>{getExecutionStatusBadge(execution.status)}</TableCell>
                      <TableCell>{new Date(execution.execution_date).toLocaleString()}</TableCell>
                      <TableCell>{execution.duration_ms ? `${execution.duration_ms}ms` : 'N/A'}</TableCell>
                    </TableRow>
                  );
                }) : null
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}