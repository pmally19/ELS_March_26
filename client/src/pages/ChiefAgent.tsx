import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Crown,
  Shield,
  Eye,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Database,
  Settings,
  BarChart3,
  Activity,
  FileText,
  MessageSquare,
  ArrowLeft
} from "lucide-react";

interface ChiefAgentDashboard {
  pendingRequests: any[];
  systemHealth: any[];
  humanInteractions: any[];
  stats: {
    totalRequests: number;
    approvalRate: number;
    averageProcessingTime: string;
    systemHealth: string;
  };
}

export default function ChiefAgent() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalResponse, setApprovalResponse] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  const queryClient = useQueryClient();

  // Fetch Chief Agent dashboard data
  const { data: dashboard, isLoading } = useQuery<ChiefAgentDashboard>({
    queryKey: ["/api/chief-agent/dashboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Approve/reject change request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async (data: { interactionId: string; response: string; notes: string }) => {
      const response = await fetch(`/api/chief-agent/human-interactions/${data.interactionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: data.response,
          notes: data.notes,
          managerId: 'CHF001'
        })
      });
      if (!response.ok) throw new Error('Failed to process approval');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chief-agent/dashboard"] });
      setApprovalDialog(false);
      setApprovalResponse("");
      setApprovalNotes("");
      setSelectedRequest(null);
    }
  });

  const handleApproval = () => {
    if (selectedRequest && approvalResponse) {
      approveRequestMutation.mutate({
        interactionId: selectedRequest.interactionId,
        response: approvalResponse,
        notes: approvalNotes
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Chief Agent dashboard...</div>
      </div>
    );
  }

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
              <Crown className="h-8 w-8 text-yellow-600" />
              Chief Agent
              <Badge variant="destructive" className="ml-2">Ultimate Authority</Badge>
            </h1>
            <p className="text-gray-600 mt-1">
              System-wide oversight and data governance with human manager approval workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">System Health</div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(dashboard?.stats.systemHealth || 'gray')}`}></div>
              <span className="font-medium">{dashboard?.stats.systemHealth?.toUpperCase() || 'UNKNOWN'}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="change-requests" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Change Requests
          </TabsTrigger>
          <TabsTrigger value="system-monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Monitoring
          </TabsTrigger>
          <TabsTrigger value="human-approvals" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Human Approvals
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats.totalRequests || 0}</div>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats.approvalRate || 0}%</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats.averageProcessingTime || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">Average</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(dashboard?.stats.systemHealth || 'gray')}`}></div>
                  <div className="text-2xl font-bold">{dashboard?.stats.systemHealth?.toUpperCase() || 'UNKNOWN'}</div>
                </div>
                <p className="text-xs text-muted-foreground">Real-time status</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Change Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Recent Change Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {dashboard?.pendingRequests?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.pendingRequests.slice(0, 5).map((request: any) => (
                        <div key={request.id} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{request.title}</span>
                            <Badge variant={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{request.businessDomain}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{request.finalStatus}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No pending change requests
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* System Health Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {dashboard?.systemHealth?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.systemHealth.map((health: any) => (
                        <div key={health.id} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{health.businessDomain}</span>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(health.healthStatus)}`}></div>
                              <span className="text-sm">{health.healthStatus?.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">{health.systemComponent}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(health.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No recent monitoring data
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Change Requests Tab */}
        <TabsContent value="change-requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Change Requests</CardTitle>
              <CardDescription>
                Comprehensive view of all system change requests requiring approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.pendingRequests?.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.requestId}</TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.businessDomain}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.finalStatus}</Badge>
                      </TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setApprovalDialog(true);
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Monitoring Tab */}
        <TabsContent value="system-monitoring" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Business Domain Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['finance', 'sales', 'inventory', 'purchase', 'production', 'hr'].map((domain) => (
                    <div key={domain} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium capitalize">{domain}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-green-600">HEALTHY</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Agent Activity Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">Coach Agent</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-green-600">ACTIVE</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">Player Agents</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-green-600">7 ACTIVE</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">Rookie Agents</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-yellow-600">3 LEARNING</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Human Approvals Tab */}
        <TabsContent value="human-approvals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pending Human Approvals
              </CardTitle>
              <CardDescription>
                High-impact changes requiring human manager approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.humanInteractions?.length > 0 ? (
                  dashboard.humanInteractions.map((interaction: any) => (
                    <div key={interaction.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{interaction.subject}</h4>
                          <p className="text-sm text-gray-600">{interaction.description}</p>
                        </div>
                        <Badge variant={interaction.urgencyLevel === 'critical' ? 'destructive' : 'default'}>
                          {interaction.urgencyLevel}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Business Domain: {interaction.businessDomain}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(interaction);
                            setApprovalDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Review & Approve
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No pending human approvals
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit-trail" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Decision Audit Trail
              </CardTitle>
              <CardDescription>
                Complete audit trail of all Chief Agent decisions and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Audit trail implementation in progress...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Human Manager Approval Required</DialogTitle>
            <DialogDescription>
              Review and approve this high-impact change request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Request Details</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Subject:</span> {selectedRequest.subject || selectedRequest.title}
                    </div>
                    <div>
                      <span className="font-medium">Business Domain:</span> {selectedRequest.businessDomain}
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span> {selectedRequest.priority || selectedRequest.urgencyLevel}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(selectedRequest.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="font-medium">Description:</span>
                    <p className="text-sm mt-1">{selectedRequest.description}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="approval-response">Decision</Label>
                <Select value={approvalResponse} onValueChange={setApprovalResponse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                    <SelectItem value="needs_more_info">Needs More Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="approval-notes">Notes</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Enter your decision notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApproval}
              disabled={!approvalResponse || approveRequestMutation.isPending}
            >
              {approveRequestMutation.isPending ? "Processing..." : "Submit Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}