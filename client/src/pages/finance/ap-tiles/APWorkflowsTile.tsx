import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Workflow, Play, Pause, RotateCcw, Settings, Zap, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface APWorkflowsTileProps {
  onBack: () => void;
}

export default function APWorkflowsTile({ onBack }: APWorkflowsTileProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [targetSystem, setTargetSystem] = useState("");
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AP workflows - using workflow statistics
  const { data: workflowStats } = useQuery({
    queryKey: ['/api/ap/workflow-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/workflow-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  // Workflows list - empty for now as we don't have a workflows table
  const workflows: any[] = [];
  const isLoading = false;

  // Workflow executions - empty for now
  const workflowExecutions: any[] = [];

  // Automation statistics - using workflow stats
  const automationStats = workflowStats ? {
    invoices_processed: 0,
    approval_rate: 0,
    cycle_time_reduction: 0,
    cost_savings: 0,
    time_saved_hours: 0
  } : {
    invoices_processed: 0,
    approval_rate: 0,
    cycle_time_reduction: 0,
    cost_savings: 0,
    time_saved_hours: 0
  };

  // Integration systems - empty for now
  const integrationSystems: any[] = [];

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      return await apiRequest('/api/ap/create-workflow', {
        method: 'POST',
        body: JSON.stringify(workflowData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow Created",
        description: "AP workflow has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/workflows'] });
      setShowWorkflowForm(false);
      setWorkflowName("");
      setTriggerType("");
      setTargetSystem("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return await apiRequest('/api/ap/execute-workflow', {
        method: 'POST',
        body: JSON.stringify({ workflow_id: workflowId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow Executed",
        description: "Workflow has been triggered successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/workflow-executions'] });
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle workflow status mutation
  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId, status }: { workflowId: string; status: string }) => {
      return await apiRequest('/api/ap/toggle-workflow', {
        method: 'POST',
        body: JSON.stringify({ workflow_id: workflowId, status }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow Updated",
        description: "Workflow status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/workflows'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateWorkflow = () => {
    if (!workflowName || !triggerType || !targetSystem) {
      toast({
        title: "Missing Information",
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
      created_by: 'Current User',
      created_date: new Date().toISOString(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500 text-white">Paused</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExecutionStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <Badge className="bg-green-500 text-white">Success</Badge>;
      case 'running':
        return <Badge className="bg-blue-500 text-white">Running</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* AP Workflows Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
            <div>
  <p className="text-sm text-gray-600">Active Workflows</p>
  <p className="text-2xl font-bold text-green-600">
    {Array.isArray(workflows) ? workflows.filter((w) => w.status === 'active').length : 0}
  </p>
</div>

              <Workflow className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
           <div>
  <p className="text-sm text-gray-600">Executions Today</p>
  <p className="text-2xl font-bold text-blue-600">
    {Array.isArray(workflowExecutions)
      ? workflowExecutions.filter((exec) =>
          new Date(exec.execution_date).toDateString() === new Date().toDateString()
        ).length
      : 0}
  </p>
</div>

              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
        
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Time Saved</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(automationStats?.time_saved_hours ?? 0)}h
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Creation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create AP Workflow</CardTitle>
            <Button
              onClick={() => setShowWorkflowForm(!showWorkflowForm)}
              variant={showWorkflowForm ? "outline" : "default"}
            >
              {showWorkflowForm ? 'Hide Form' : 'New Workflow'}
            </Button>
          </div>
        </CardHeader>
        {showWorkflowForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Workflow Name</Label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Enter workflow name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice_received">Invoice Received</SelectItem>
                    <SelectItem value="invoice_approved">Invoice Approved</SelectItem>
                    <SelectItem value="payment_due">Payment Due</SelectItem>
                    <SelectItem value="vendor_created">Vendor Created</SelectItem>
                    <SelectItem value="payment_failed">Payment Failed</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Target System</Label>
                <Select value={targetSystem} onValueChange={setTargetSystem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target system" />
                  </SelectTrigger>
               <SelectContent>
  {Array.isArray(integrationSystems) && integrationSystems.length > 0 ? (
    integrationSystems.map((system) => (
      <SelectItem key={system.id} value={system.system_code}>
        {system.system_name}
      </SelectItem>
    ))
  ) : (
    <div className="p-2 text-sm text-gray-500">No systems available</div>
  )}
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
        )}
      </Card>

      {/* Automation Benefits */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-indigo-900">Automation Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-indigo-200">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {(automationStats?.invoices_processed ?? 0)}
              </p>
              <p className="text-sm text-blue-600">Invoices Automated</p>
              <p className="text-xs text-gray-600">This month</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-indigo-200">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {(automationStats?.approval_rate ?? 0)}%
              </p>
              <p className="text-sm text-green-600">Auto-Approval Rate</p>
              <p className="text-xs text-gray-600">Rule-based approvals</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-indigo-200">
              <RotateCcw className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {(automationStats?.cycle_time_reduction ?? 0)}%
              </p>
              <p className="text-sm text-purple-600">Cycle Time Reduction</p>
              <p className="text-xs text-gray-600">Process improvement</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-indigo-200">
              <Settings className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                ${Number(automationStats?.cost_savings || 0).toFixed(0)}
              </p>
              <p className="text-sm text-orange-600">Monthly Savings</p>
              <p className="text-xs text-gray-600">Operational efficiency</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <CardTitle>AP Automation Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Trigger Type</TableHead>
                  <TableHead>Target System</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Execution</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
          <TableBody>
  {isLoading ? (
    <TableRow>
      <TableCell colSpan={7} className="text-center">
        Loading...
      </TableCell>
    </TableRow>
  ) : !Array.isArray(workflows) || workflows.length === 0 ? (
    <TableRow>
      <TableCell colSpan={7} className="text-center text-gray-500">
        No workflows found
      </TableCell>
    </TableRow>
  ) : (
    workflows.map((workflow) => (
      <TableRow key={workflow.id}>
        <TableCell className="font-medium">{workflow.name}</TableCell>
        <TableCell>{workflow.trigger_type.replace('_', ' ')}</TableCell>
        <TableCell>{workflow.target_system}</TableCell>
        <TableCell>{getStatusBadge(workflow.status)}</TableCell>
        <TableCell>
          {workflow.last_execution
            ? new Date(workflow.last_execution).toLocaleString()
            : 'Never'}
        </TableCell>
        <TableCell>
          <Badge
            className={
              workflow.success_rate >= 90
                ? 'bg-green-500'
                : workflow.success_rate >= 75
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }
          >
            {workflow.success_rate || 0}%
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeWorkflowMutation.mutate(workflow.id)}
              disabled={executeWorkflowMutation.isPending}
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toggleWorkflowMutation.mutate({
                  workflowId: workflow.id,
                  status: workflow.status === 'active' ? 'paused' : 'active',
                })
              }
              disabled={toggleWorkflowMutation.isPending}
            >
              {workflow.status === 'active' ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))
  )}
</TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Workflow Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Workflow Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Execution Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Records Processed</TableHead>
                  <TableHead>Error Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!workflowExecutions || workflowExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No executions found
                    </TableCell>
                  </TableRow>
                ) : (
                  (Array.isArray(workflowExecutions) ? workflowExecutions.slice() : []).map((execution: any) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">{execution.workflow_name}</TableCell>
                      <TableCell>{new Date(execution.execution_date).toLocaleString()}</TableCell>
                      <TableCell>{getExecutionStatusBadge(execution.status)}</TableCell>
                      <TableCell>{execution.duration_seconds}s</TableCell>
                      <TableCell>{execution.records_processed || 0}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {execution.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Integration Systems Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Systems Status</CardTitle>
        </CardHeader>
        <CardContent>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.isArray(integrationSystems) && integrationSystems.length > 0 ? (
      integrationSystems.map((system) => (
        <div key={system.id} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{system.system_name}</h4>
            {getStatusBadge(system.status)}
          </div>
          <p className="text-sm text-gray-600 mb-2">{system.description}</p>
          <div className="text-xs text-gray-500">
            Last sync: {system.last_sync ? new Date(system.last_sync).toLocaleString() : 'Never'}
          </div>
        </div>
      ))
    ) : (
      <div className="col-span-full text-center text-gray-500">
        No integration systems configured
      </div>
    )}
  </div>
</CardContent>

      </Card>

      {/* Workflow Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Common AP Workflow Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-medium mb-2">Three-Way Match Automation</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically matches invoices with purchase orders and receipt confirmations
              </p>
              <Button size="sm" variant="outline">
                Create Workflow
              </Button>
            </div>
            <div className="p-4 border rounded-lg bg-green-50">
              <h4 className="font-medium mb-2">Auto-Approval Rules</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically approve invoices that meet predefined criteria
              </p>
              <Button size="sm" variant="outline">
                Create Workflow
              </Button>
            </div>
            <div className="p-4 border rounded-lg bg-purple-50">
              <h4 className="font-medium mb-2">Payment Scheduling</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically schedule payments based on vendor terms and cash flow
              </p>
              <Button size="sm" variant="outline">
                Create Workflow
              </Button>
            </div>
            <div className="p-4 border rounded-lg bg-orange-50">
              <h4 className="font-medium mb-2">Exception Handling</h4>
              <p className="text-sm text-gray-600 mb-3">
                Route failed payments and exceptions to appropriate handlers
              </p>
              <Button size="sm" variant="outline">
                Create Workflow
              </Button>
            </div>
          </div>
        </CardContent>  <CardContent className="p-4">
            <div className="flex items-center justify-between">
            <div>
  <p className="text-sm text-gray-600">Success Rate</p>
  <p className="text-2xl font-bold text-purple-600">
    {Array.isArray(workflowExecutions) && workflowExecutions.length > 0
      ? Math.round(
          (workflowExecutions.filter((e) => e.status === 'success').length / workflowExecutions.length) * 100
        )
      : 0}%
  </p>
</div>

              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
      </Card>
    </div>
  );
}