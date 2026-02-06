import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, Database, Bot, Filter, Search, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Issue {
  issue_id: string;
  error_message: string;
  module: string;
  operation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  user_id: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

interface ModuleHealth {
  module_name: string;
  health_score: number;
  total_issues: number;
  critical_issues: number;
  resolved_issues: number;
  response_time_avg: number;
  error_rate: number;
  availability_score: number;
  ai_intervention_count: number;
  ai_success_rate: number;
  last_check: string;
}

interface AIAgentPerformance {
  agent_name: string;
  agent_type: string;
  interventions: number;
  avg_confidence: number;
  successful_resolutions: number;
  avg_resolution_time: number;
}

export default function IssuesMonitoringDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Fetch recent issues
  const { data: recentIssues, refetch: refetchIssues } = useQuery({
    queryKey: ['/api/issues/recent', moduleFilter, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (moduleFilter) params.append('module', moduleFilter);
      if (severityFilter) params.append('severity', severityFilter);
      params.append('limit', '100');
      
      const response = await fetch(`/api/issues/recent?${params}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch module health
  const { data: moduleHealth } = useQuery({
    queryKey: ['/api/issues/module-health'],
    queryFn: async () => {
      const response = await fetch('/api/issues/module-health');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch AI agent performance
  const { data: aiPerformance } = useQuery({
    queryKey: ['/api/issues/ai-performance'],
    queryFn: async () => {
      const response = await fetch('/api/issues/ai-performance');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch issue statistics
  const { data: issueStats } = useQuery({
    queryKey: ['/api/issues/stats'],
    queryFn: async () => {
      const response = await fetch('/api/issues/stats?timeframe=day');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'ESCALATED': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredIssues = recentIssues?.filter((issue: Issue) =>
    issue.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.operation.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues Monitoring Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive system-wide issue tracking with AI-powered resolution</p>
        </div>
        <Button onClick={() => refetchIssues()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {issueStats?.reduce((acc: number, stat: any) => acc + stat.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {issueStats?.find((stat: any) => stat.severity === 'CRITICAL')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Resolved</CardTitle>
            <Bot className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {issueStats?.reduce((acc: number, stat: any) => acc + (stat.ai_resolved || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Automatically fixed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {issueStats?.length > 0 
                ? Math.round(
                    (issueStats.reduce((acc: number, stat: any) => acc + (stat.ai_resolved || 0) + (stat.manual_resolved || 0), 0) /
                     issueStats.reduce((acc: number, stat: any) => acc + stat.count, 0)) * 100
                  )
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Total resolution rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Recent Issues</TabsTrigger>
          <TabsTrigger value="modules">Module Health</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="MASTER_DATA">Master Data</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
                    <SelectItem value="PRODUCTION">Production</SelectItem>
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="CONTROLLING">Controlling</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setModuleFilter('');
                    setSeverityFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Issues ({filteredIssues.length})</CardTitle>
              <CardDescription>
                System-wide issues with AI-powered resolution tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredIssues.map((issue: Issue) => (
                  <div
                    key={issue.issue_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(issue.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline">{issue.module}</Badge>
                          <Badge variant="secondary">{issue.category}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate max-w-md">
                          {issue.error_message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {issue.operation} • {new Date(issue.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={issue.status === 'RESOLVED' ? 'default' : 'secondary'}>
                        {issue.status}
                      </Badge>
                      {issue.resolved_by && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Resolved by {issue.resolved_by}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {filteredIssues.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No issues found matching your criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleHealth?.map((module: ModuleHealth) => (
              <Card key={module.module_name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {module.module_name}
                    <span className={`text-2xl font-bold ${getHealthColor(module.health_score)}`}>
                      {Math.round(module.health_score)}%
                    </span>
                  </CardTitle>
                  <CardDescription>Module Health Score</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={module.health_score} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Issues</p>
                      <p className="font-medium">{module.total_issues}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Critical</p>
                      <p className="font-medium text-red-600">{module.critical_issues}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved</p>
                      <p className="font-medium text-green-600">{module.resolved_issues}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AI Success</p>
                      <p className="font-medium text-blue-600">{Math.round(module.ai_success_rate)}%</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Last checked: {new Date(module.last_check).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Performance</CardTitle>
              <CardDescription>
                Performance metrics for AI-powered issue resolution agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiPerformance?.map((agent: AIAgentPerformance) => (
                  <div key={agent.agent_name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{agent.agent_name}</h4>
                      <p className="text-sm text-muted-foreground">{agent.agent_type}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">Interventions</p>
                        <p className="font-medium">{agent.interventions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-medium text-green-600">
                          {Math.round((agent.successful_resolutions / agent.interventions) * 100)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Avg Confidence</p>
                        <p className="font-medium">{Math.round(agent.avg_confidence * 100)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Avg Time</p>
                        <p className="font-medium">{Math.round(agent.avg_resolution_time)}ms</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!aiPerformance || aiPerformance.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No AI agent performance data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issue Analytics</CardTitle>
              <CardDescription>
                System-wide issue trends and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Issues by Category</h4>
                  {issueStats?.map((stat: any) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <span className="text-sm">{stat.category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ 
                              width: `${(stat.count / Math.max(...issueStats.map((s: any) => s.count))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{stat.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Resolution Methods</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>AI Resolved</span>
                      <span className="font-medium text-green-600">
                        {issueStats?.reduce((acc: number, stat: any) => acc + (stat.ai_resolved || 0), 0) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Manual Resolution</span>
                      <span className="font-medium text-blue-600">
                        {issueStats?.reduce((acc: number, stat: any) => acc + (stat.manual_resolved || 0), 0) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Auto Recovery</span>
                      <span className="font-medium text-purple-600">
                        {issueStats?.reduce((acc: number, stat: any) => acc + (stat.auto_resolved || 0), 0) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unresolved</span>
                      <span className="font-medium text-red-600">
                        {issueStats?.reduce((acc: number, stat: any) => acc + (stat.unresolved || 0), 0) || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}