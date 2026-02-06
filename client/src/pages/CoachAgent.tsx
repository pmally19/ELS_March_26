import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  AlertTriangle,
  Eye,
  Ban,
  CheckCheck
} from "lucide-react";

export default function CoachAgent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | null>(null);
  const [justification, setJustification] = useState("");
  const [crossDomainAnalysis, setCrossDomainAnalysis] = useState("");

  // Get Coach Agent data
  const { data: coaches } = useQuery({
    queryKey: ["/api/coach-agents"],
    retry: false,
  });

  const coach = coaches?.[0];

  // Get Coach dashboard
  const { data: dashboard } = useQuery({
    queryKey: ["/api/coach-agents", coach?.id, "dashboard"],
    enabled: !!coach?.id,
    retry: false,
  });

  // Review change request mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/coach-agents/change-requests/${selectedRequest.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to review request');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Reviewed",
        description: `Change request ${reviewDecision}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-agents"] });
      setSelectedRequest(null);
      setReviewDecision(null);
      setJustification("");
      setCrossDomainAnalysis("");
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReviewSubmit = () => {
    if (!reviewDecision || !justification.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide decision and justification",
        variant: "destructive",
      });
      return;
    }

    const analysisData = crossDomainAnalysis.trim() ? 
      JSON.parse(crossDomainAnalysis) : 
      {
        affectedDomains: [selectedRequest.businessDomain],
        impact: "medium",
        riskMitigation: { approach: "standard_review" }
      };

    reviewMutation.mutate({
      coachId: coach.id,
      decision: reviewDecision,
      justification,
      crossDomainAnalysis: analysisData,
      implementationPlan: reviewDecision === 'approved' ? {
        steps: ["Grant temporary access", "Monitor implementation", "Revoke access"],
        timeline: "24 hours"
      } : null
    });
  };

  if (!coach) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Coach Agent not initialized. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Coach Agent Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Central oversight and approval system for all Player Agent activities
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          {coach.status.toUpperCase()}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Communications</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingCommunications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Decisions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.recentDecisions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.accessControls?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Under oversight
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="requests">Change Requests</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>
                Real-time monitoring of all business domains, data integrity, and agent performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button 
                  onClick={() => window.location.pathname = "/coach-agent/health-dashboard"}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Open Comprehensive Health Dashboard
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  Access detailed health metrics, charts, and real-time monitoring
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Pending Change Requests</CardTitle>
              <CardDescription>
                Review and approve Player Agent requests for data or UI modifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.requests?.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.requests.map((request: any) => (
                    <Card key={request.id} className="border-l-4 border-l-yellow-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{request.requestType}</CardTitle>
                          <Badge variant="secondary">{request.businessDomain}</Badge>
                        </div>
                        <CardDescription>{request.changeDescription}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <strong>Business Justification:</strong>
                            <p className="text-sm text-gray-600">{request.businessJustification}</p>
                          </div>
                          <div>
                            <strong>Affected Systems:</strong>
                            <p className="text-sm text-gray-600">
                              {Array.isArray(request.affectedSystems) 
                                ? request.affectedSystems.join(", ")
                                : JSON.stringify(request.affectedSystems)}
                            </p>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No pending change requests
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Player Communications</CardTitle>
              <CardDescription>
                Messages and questions from Player Agents requiring response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.communications?.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.communications.map((comm: any) => (
                    <Card key={comm.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{comm.subject}</CardTitle>
                          <Badge variant={comm.urgencyLevel === 'high' ? 'destructive' : 'secondary'}>
                            {comm.urgencyLevel}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{comm.message}</p>
                        <div className="mt-2">
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Respond
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No pending communications
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Decisions</CardTitle>
              <CardDescription>
                History of Coach Agent decisions and their business justifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.decisions?.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.decisions.map((decision: any) => (
                    <Card key={decision.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{decision.decisionType}</CardTitle>
                          <Badge variant={decision.decisionImpact === 'high' ? 'destructive' : 'secondary'}>
                            {decision.decisionImpact} impact
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{decision.decisionSummary}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(decision.createdAt).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent decisions
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Agent Access Controls</CardTitle>
              <CardDescription>
                Manage permissions for Player Agents (Coach and Admin access only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.accessControls?.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.accessControls.map((control: any) => (
                    <Card key={control.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Agent {control.agentType}</p>
                            <p className="text-sm text-gray-600">
                              Data: {control.canUpdateData ? "✓" : "✗"} | 
                              Delete: {control.canDeleteData ? "✓" : "✗"} | 
                              UI: {control.canModifyUI ? "✓" : "✗"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {control.approvalRequired && (
                              <Badge variant="outline">
                                <Ban className="h-3 w-3 mr-1" />
                                Restricted
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No access controls configured
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Review Change Request</CardTitle>
              <CardDescription>
                Provide cross-domain analysis and decision justification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong>Request Type:</strong> {selectedRequest.requestType}
              </div>
              <div>
                <strong>Business Domain:</strong> {selectedRequest.businessDomain}
              </div>
              <div>
                <strong>Description:</strong>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {selectedRequest.changeDescription}
                </p>
              </div>
              <div>
                <strong>Business Justification:</strong>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {selectedRequest.businessJustification}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Coach Decision</label>
                <div className="flex gap-2">
                  <Button
                    variant={reviewDecision === 'approved' ? 'default' : 'outline'}
                    onClick={() => setReviewDecision('approved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewDecision === 'rejected' ? 'destructive' : 'outline'}
                    onClick={() => setReviewDecision('rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Coach Justification</label>
                <Textarea
                  placeholder="Provide detailed reasoning for your decision, including cross-domain business impact..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cross-Domain Analysis (JSON)</label>
                <Textarea
                  placeholder='{"affectedDomains": ["sales", "finance"], "impact": "medium", "riskMitigation": {"approach": "phased_rollout"}}'
                  value={crossDomainAnalysis}
                  onChange={(e) => setCrossDomainAnalysis(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
                <Button onClick={handleReviewSubmit} disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? "Processing..." : "Submit Decision"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}