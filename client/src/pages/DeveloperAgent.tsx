/**
 * Developer Agent Interface
 * Provides UI for collaborative development workflow between Designer Agent, Developer Agent, and Peer Review Agent
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Code2, 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Play, 
  Pause,
  Users,
  FileText,
  Settings,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DevelopmentSession {
  sessionId: string;
  currentPhase: string;
  status: string;
  taskSummary: {
    total: number;
    pending: number;
    developing: number;
    reviewing: number;
    approved: number;
    rejected: number;
    implemented: number;
  };
  averageScore: number;
  collaborationEvents: number;
  qualityGate: {
    codeQuality: string;
    security: string;
    performance: string;
    testing: string;
    overallGate: string;
    currentScore: number;
    minimumScore: number;
  };
}

interface CodeReview {
  reviewId: string;
  overallScore: number;
  status: string;
  findings: any[];
  recommendations: string[];
  securityAssessment: any;
  performanceAssessment: any;
  codeQualityMetrics: any;
}

const DeveloperAgent = () => {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [workflowStage, setWorkflowStage] = useState<'planning' | 'development' | 'review' | 'implementation'>('planning');
  const queryClient = useQueryClient();

  // Fetch active development sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/development-agents/sessions'],
    refetchInterval: 5000 // Auto-refresh every 5 seconds
  });

  // Fetch session details
  const { data: sessionDetails, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/development-agents/session', selectedSession],
    enabled: !!selectedSession,
    refetchInterval: 3000
  });

  // Start development session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (designerAnalysis: any) => {
      const response = await fetch('/api/development-agents/start-development', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designerAnalysis })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedSession(data.sessionId);
      setWorkflowStage('development');
      queryClient.invalidateQueries({ queryKey: ['/api/development-agents/sessions'] });
    }
  });

  // Develop task mutation
  const developTaskMutation = useMutation({
    mutationFn: async ({ sessionId, taskId }: { sessionId: string; taskId: string }) => {
      const response = await fetch('/api/development-agents/develop-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, taskId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/development-agents/session', selectedSession] });
    }
  });

  // Implement tasks mutation
  const implementTasksMutation = useMutation({
    mutationFn: async ({ sessionId, dryRun }: { sessionId: string; dryRun: boolean }) => {
      const response = await fetch('/api/development-agents/implement-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, dryRun })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/development-agents/session', selectedSession] });
    }
  });

  const handleStartDevelopment = async () => {
    // Mock Designer Agent analysis for demo
    const mockAnalysis = {
      documentName: "Customer Management Enhancement",
      requirements: [
        "Customer profile management",
        "Contact information tracking",
        "Purchase history integration"
      ],
      suggestedImplementations: [
        {
          type: "component",
          name: "CustomerProfile",
          description: "Enhanced customer profile component"
        },
        {
          type: "api",
          name: "Customer Management API",
          description: "CRUD operations for customer data"
        }
      ]
    };

    startSessionMutation.mutate(mockAnalysis);
  };

  const handleDevelopTask = (taskId: string) => {
    if (!selectedSession) return;
    developTaskMutation.mutate({ sessionId: selectedSession, taskId });
  };

  const handleImplementTasks = (dryRun: boolean = true) => {
    if (!selectedSession) return;
    implementTasksMutation.mutate({ sessionId: selectedSession, dryRun });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'reviewing': return 'bg-yellow-500';
      case 'developing': return 'bg-blue-500';
      case 'implemented': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPhaseProgress = (phase: string) => {
    switch (phase) {
      case 'planning': return 25;
      case 'development': return 50;
      case 'review': return 75;
      case 'implementation': return 90;
      case 'completed': return 100;
      default: return 0;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Agent</h1>
          <p className="text-muted-foreground">
            Collaborative development with AI-powered code generation and peer review
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleStartDevelopment} 
            disabled={startSessionMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Code2 className="h-4 w-4 mr-2" />
            Start Development
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="workflow">Development Workflow</TabsTrigger>
          <TabsTrigger value="review">Code Review</TabsTrigger>
          <TabsTrigger value="quality">Quality Gates</TabsTrigger>
        </TabsList>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Development Sessions
              </CardTitle>
              <CardDescription>
                Active collaborative development sessions between AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="text-center py-4">Loading sessions...</div>
              ) : sessions?.activeSessions?.length > 0 ? (
                <div className="space-y-4">
                  {sessions.activeSessions.map((session: DevelopmentSession) => (
                    <Card 
                      key={session.sessionId}
                      className={`cursor-pointer border-2 ${
                        selectedSession === session.sessionId ? 'border-blue-500' : 'border-border'
                      }`}
                      onClick={() => setSelectedSession(session.sessionId)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{session.sessionId}</div>
                            <div className="text-sm text-muted-foreground">
                              Phase: {session.currentPhase} • Score: {session.averageScore}/100
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                            <Progress value={getPhaseProgress(session.currentPhase)} className="w-20" />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-4 text-sm">
                          <span>Total: {session.taskSummary.total}</span>
                          <span className="text-green-600">✓ {session.taskSummary.approved}</span>
                          <span className="text-blue-600">⚡ {session.taskSummary.developing}</span>
                          <span className="text-yellow-600">👁 {session.taskSummary.reviewing}</span>
                          <span className="text-red-600">✗ {session.taskSummary.rejected}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">No Active Sessions</div>
                  <div className="text-muted-foreground mb-4">
                    Start a new development session to begin collaborative coding
                  </div>
                  <Button onClick={handleStartDevelopment} disabled={startSessionMutation.isPending}>
                    Start Development Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Development Workflow Tab */}
        <TabsContent value="workflow" className="space-y-4">
          {selectedSession && sessionDetails ? (
            <div className="space-y-4">
              {/* Workflow Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Development Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Current Phase: {sessionDetails.currentPhase}</span>
                      <Progress value={getPhaseProgress(sessionDetails.currentPhase)} className="w-32" />
                    </div>
                    
                    {/* Pipeline Steps */}
                    <div className="grid grid-cols-4 gap-4">
                      {['Planning', 'Development', 'Review', 'Implementation'].map((step, index) => (
                        <div key={step} className="text-center">
                          <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                            getPhaseProgress(sessionDetails.currentPhase) > index * 25 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="text-sm">{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks List */}
              <Card>
                <CardHeader>
                  <CardTitle>Development Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {sessionDetails.session?.tasks?.map((task: any) => (
                        <Card key={task.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{task.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Iteration: {task.iterationCount}/{task.maxIterations}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                              {task.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDevelopTask(task.id)}
                                  disabled={developTaskMutation.isPending}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Develop
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {task.peerReview && (
                            <div className="mt-3 p-3 bg-muted rounded">
                              <div className="text-sm font-medium">Peer Review Score: {task.peerReview.overallScore}/100</div>
                              <div className="text-sm text-muted-foreground">
                                {task.peerReview.findings.length} findings • {task.peerReview.recommendations.length} recommendations
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Implementation Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => handleImplementTasks(true)}
                      disabled={implementTasksMutation.isPending}
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Dry Run (Simulate)
                    </Button>
                    <Button 
                      onClick={() => handleImplementTasks(false)}
                      disabled={implementTasksMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Implement Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Select a development session to view the workflow details.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Code Review Tab */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Peer Review Agent Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive code review and quality assessment by Senior Developer Agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSession && sessionDetails?.session?.tasks ? (
                <div className="space-y-4">
                  {sessionDetails.session.tasks
                    .filter((task: any) => task.peerReview)
                    .map((task: any) => (
                    <Card key={task.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="font-medium">{task.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={task.peerReview.status === 'approved' ? 'default' : 'destructive'}>
                            {task.peerReview.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {task.peerReview.overallScore}/100
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {task.peerReview.securityAssessment?.score || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Security</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {task.peerReview.performanceAssessment?.score || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Performance</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">
                            {Math.round(
                              (task.peerReview.codeQualityMetrics?.maintainability +
                               task.peerReview.codeQualityMetrics?.readability +
                               task.peerReview.codeQualityMetrics?.testability) / 3
                            ) || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Code Quality</div>
                        </div>
                      </div>

                      {task.peerReview.findings?.length > 0 && (
                        <div className="space-y-2">
                          <div className="font-medium">Findings:</div>
                          {task.peerReview.findings.slice(0, 3).map((finding: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              {finding.severity === 'critical' ? (
                                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                              ) : finding.severity === 'high' ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                              )}
                              <div>
                                <div className="font-medium">{finding.message}</div>
                                <div className="text-muted-foreground">{finding.file}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {task.peerReview.recommendations?.length > 0 && (
                        <div className="mt-4">
                          <div className="font-medium mb-2">Recommendations:</div>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {task.peerReview.recommendations.slice(0, 3).map((rec: string, index: number) => (
                              <li key={index} className="text-muted-foreground">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">No Reviews Available</div>
                  <div className="text-muted-foreground">
                    Code reviews will appear here after development tasks are completed
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Gates Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quality Gate Status
              </CardTitle>
              <CardDescription>
                Enterprise-grade quality controls and approval gates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSession && sessionDetails?.qualityGate ? (
                <div className="space-y-6">
                  {/* Overall Status */}
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {sessionDetails.qualityGate.currentScore}/100
                    </div>
                    <Badge 
                      variant={sessionDetails.qualityGate.overallGate === 'open' ? 'default' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      Gate {sessionDetails.qualityGate.overallGate.toUpperCase()}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-2">
                      Minimum Score Required: {sessionDetails.qualityGate.minimumScore}
                    </div>
                  </div>

                  <Separator />

                  {/* Quality Metrics */}
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { name: 'Code Quality', status: sessionDetails.qualityGate.codeQuality, icon: Code2 },
                      { name: 'Security', status: sessionDetails.qualityGate.security, icon: Settings },
                      { name: 'Performance', status: sessionDetails.qualityGate.performance, icon: Zap },
                      { name: 'Testing', status: sessionDetails.qualityGate.testing, icon: CheckCircle }
                    ].map((metric) => (
                      <Card key={metric.name} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <metric.icon className="h-5 w-5" />
                            <span className="font-medium">{metric.name}</span>
                          </div>
                          <Badge variant={metric.status === 'pass' ? 'default' : 'destructive'}>
                            {metric.status.toUpperCase()}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quality Score Progress</span>
                      <span>{sessionDetails.qualityGate.currentScore}%</span>
                    </div>
                    <Progress value={sessionDetails.qualityGate.currentScore} className="h-3" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">No Quality Data</div>
                  <div className="text-muted-foreground">
                    Quality gate information will appear here during development
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperAgent;