import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity,
  Database,
  Server,
  Users,
  TrendingUp,
  AlertCircle,
  Heart,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface HealthMetrics {
  businessDomains: BusinessDomainHealth[];
  dataIntegrity: DataIntegrityMetrics;
  agentHealth: AgentHealthMetrics;
  userActivity: UserActivityMetrics;
  systemOverview: SystemOverviewMetrics;
  timestamp: Date;
}

interface BusinessDomainHealth {
  domain: string;
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  metrics: {
    activeTransactions: number;
    errorRate: number;
    responseTime: number;
    dataQuality: number;
  };
  issues: string[];
  lastUpdated: Date;
}

interface DataIntegrityMetrics {
  overallScore: number;
  tableHealth: TableHealthCheck[];
  referentialIntegrity: number;
  dataConsistency: number;
  backupStatus: string;
  lastBackup: Date;
}

interface TableHealthCheck {
  tableName: string;
  recordCount: number;
  lastModified: Date;
  integrityScore: number;
  issues: string[];
}

interface AgentHealthMetrics {
  totalAgents: number;
  activeAgents: number;
  healthyAgents: number;
  agentsByStatus: {
    green: number;
    amber: number;
    red: number;
  };
  averageResponseTime: number;
  escalationRate: number;
}

interface UserActivityMetrics {
  totalUsers: number;
  activeUsers: number;
  sessionHealth: number;
  authenticationRate: number;
  errorRate: number;
}

interface SystemOverviewMetrics {
  overallHealth: number;
  uptime: number;
  performanceScore: number;
  securityScore: number;
  scalabilityMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    dbConnections: number;
  };
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function CoachAgentHealthDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch comprehensive health metrics
  const { data: healthMetrics, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/health/comprehensive-health', refreshKey],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: HealthMetrics | undefined, isLoading: boolean, error: any, refetch: () => void };

  // Fetch real-time status summary
  const { data: statusSummary } = useQuery({
    queryKey: ['/api/health/status-summary', refreshKey],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading health metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load health metrics. Please check system connectivity.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Prepare chart data
  const domainScoreData = healthMetrics?.businessDomains.map(domain => ({
    name: domain.domain,
    score: domain.score,
    fill: domain.status === 'healthy' ? '#10b981' : domain.status === 'warning' ? '#f59e0b' : '#ef4444'
  })) || [];

  const agentStatusData = healthMetrics ? [
    { name: 'Green', value: healthMetrics.agentHealth.agentsByStatus.green, fill: '#10b981' },
    { name: 'Amber', value: healthMetrics.agentHealth.agentsByStatus.amber, fill: '#f59e0b' },
    { name: 'Red', value: healthMetrics.agentHealth.agentsByStatus.red, fill: '#ef4444' }
  ] : [];

  const systemMetricsData = healthMetrics ? [
    { name: 'CPU', value: healthMetrics.systemOverview.scalabilityMetrics.cpuUsage, fill: '#3b82f6' },
    { name: 'Memory', value: healthMetrics.systemOverview.scalabilityMetrics.memoryUsage, fill: '#8b5cf6' },
    { name: 'DB Connections', value: healthMetrics.systemOverview.scalabilityMetrics.dbConnections, fill: '#10b981' }
  ] : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/coach-agent">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Coach Agent
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Application Health Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive monitoring of business domains, data integrity, agents, and users
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.systemOverview.overallHealth || 0}%
            </div>
            <Progress 
              value={healthMetrics?.systemOverview.overallHealth || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Integrity</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.dataIntegrity.overallScore || 0}%
            </div>
            <Progress 
              value={healthMetrics?.dataIntegrity.overallScore || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.agentHealth.activeAgents || 0}/{healthMetrics?.agentHealth.totalAgents || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthMetrics?.agentHealth.healthyAgents || 0} healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.userActivity.activeUsers || 0}/{healthMetrics?.userActivity.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthMetrics?.userActivity.sessionHealth || 0}% session health
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="domains">Business Domains</TabsTrigger>
          <TabsTrigger value="agents">Agent Health</TabsTrigger>
          <TabsTrigger value="data">Data Integrity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Domain Health Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Business Domain Health Scores</CardTitle>
                <CardDescription>Performance scores across all business domains</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={domainScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Agent Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Status Distribution</CardTitle>
                <CardDescription>Current status of all monitoring agents</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={agentStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {agentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* System Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Real-time system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>CPU Usage</span>
                    <span>{healthMetrics?.systemOverview.scalabilityMetrics.cpuUsage || 0}%</span>
                  </div>
                  <Progress value={healthMetrics?.systemOverview.scalabilityMetrics.cpuUsage || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Memory Usage</span>
                    <span>{healthMetrics?.systemOverview.scalabilityMetrics.memoryUsage || 0}%</span>
                  </div>
                  <Progress value={healthMetrics?.systemOverview.scalabilityMetrics.memoryUsage || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Database Connections</span>
                    <span>{healthMetrics?.systemOverview.scalabilityMetrics.dbConnections || 0}</span>
                  </div>
                  <Progress value={(healthMetrics?.systemOverview.scalabilityMetrics.dbConnections || 0) * 5} />
                </div>
              </CardContent>
            </Card>

            {/* Security & Performance Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Security & Performance</CardTitle>
                <CardDescription>Overall system security and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart data={[
                    { name: 'Security', value: healthMetrics?.systemOverview.securityScore || 0, fill: '#10b981' },
                    { name: 'Performance', value: healthMetrics?.systemOverview.performanceScore || 0, fill: '#3b82f6' },
                    { name: 'Uptime', value: healthMetrics?.systemOverview.uptime || 0, fill: '#8b5cf6' }
                  ]}>
                    <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="domains" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {healthMetrics?.businessDomains.map((domain) => (
              <Card key={domain.domain}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">{domain.domain}</CardTitle>
                    {getStatusIcon(domain.status)}
                  </div>
                  <CardDescription>
                    Health Score: {domain.score}% | Last Updated: {new Date(domain.lastUpdated).toLocaleTimeString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Active Transactions</span>
                      <div className="font-semibold">{domain.metrics.activeTransactions}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Rate</span>
                      <div className="font-semibold">{domain.metrics.errorRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Response Time</span>
                      <div className="font-semibold">{domain.metrics.responseTime}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data Quality</span>
                      <div className="font-semibold">{domain.metrics.dataQuality}%</div>
                    </div>
                  </div>
                  
                  {domain.issues.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Current Issues:</h4>
                      <ul className="text-xs space-y-1">
                        {domain.issues.map((issue, index) => (
                          <li key={index} className="text-muted-foreground">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Metrics</CardTitle>
                <CardDescription>Real-time agent monitoring and performance data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {healthMetrics?.agentHealth.agentsByStatus.green || 0}
                    </div>
                    <div className="text-sm text-green-700">Healthy Agents</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {healthMetrics?.agentHealth.agentsByStatus.amber || 0}
                    </div>
                    <div className="text-sm text-yellow-700">Warning Agents</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {healthMetrics?.agentHealth.agentsByStatus.red || 0}
                  </div>
                  <div className="text-sm text-red-700">Critical Agents</div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Average Response Time</span>
                    <span>{healthMetrics?.agentHealth.averageResponseTime || 0}ms</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Escalation Rate</span>
                    <span>{healthMetrics?.agentHealth.escalationRate?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Status Trends</CardTitle>
                <CardDescription>Historical agent status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={agentStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Integrity Overview</CardTitle>
                <CardDescription>Database health and integrity metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Integrity Score</span>
                    <span>{healthMetrics?.dataIntegrity.overallScore || 0}%</span>
                  </div>
                  <Progress value={healthMetrics?.dataIntegrity.overallScore || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Referential Integrity</span>
                    <span>{healthMetrics?.dataIntegrity.referentialIntegrity || 0}%</span>
                  </div>
                  <Progress value={healthMetrics?.dataIntegrity.referentialIntegrity || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Data Consistency</span>
                    <span>{healthMetrics?.dataIntegrity.dataConsistency || 0}%</span>
                  </div>
                  <Progress value={healthMetrics?.dataIntegrity.dataConsistency || 0} />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Backup Status</span>
                    <Badge variant="outline" className="text-green-600">
                      {healthMetrics?.dataIntegrity.backupStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Last Backup</span>
                    <span className="text-xs text-muted-foreground">
                      {healthMetrics?.dataIntegrity.lastBackup 
                        ? new Date(healthMetrics.dataIntegrity.lastBackup).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Table Health Status</CardTitle>
                <CardDescription>Individual database table integrity scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {healthMetrics?.dataIntegrity.tableHealth.map((table) => (
                      <div key={table.tableName} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">{table.tableName}</span>
                          <Badge variant={table.integrityScore >= 90 ? 'default' : table.integrityScore >= 70 ? 'secondary' : 'destructive'}>
                            {table.integrityScore}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {table.recordCount.toLocaleString()} records
                        </div>
                        {table.issues.length > 0 && (
                          <ul className="text-xs text-red-600 mt-1">
                            {table.issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      {healthMetrics && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date(healthMetrics.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}