import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Factory, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

interface BusinessProcess {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'completed';
  progress: number;
  module: string;
  priority: 'high' | 'medium' | 'low';
  lastUpdate: string;
}

interface AgentActivity {
  id: string;
  agent: string;
  action: string;
  module: string;
  timestamp: string;
  status: 'success' | 'processing' | 'error';
}

export default function AgenticERP() {
  const [activeTab, setActiveTab] = useState("overview");

  // Business Process Management
  const { data: businessProcesses = [] } = useQuery({
    queryKey: ["/api/business-processes"],
    enabled: false,
    initialData: [
      {
        id: "bp-001",
        name: "Order-to-Cash",
        status: "active",
        progress: 75,
        module: "Sales",
        priority: "high",
        lastUpdate: "2 minutes ago"
      },
      {
        id: "bp-002", 
        name: "Procure-to-Pay",
        status: "pending",
        progress: 30,
        module: "Purchasing",
        priority: "medium",
        lastUpdate: "15 minutes ago"
      },
      {
        id: "bp-003",
        name: "Plan-to-Produce",
        status: "completed",
        progress: 100,
        module: "Production",
        priority: "low",
        lastUpdate: "1 hour ago"
      }
    ] as BusinessProcess[]
  });

  // Agent Activities
  const { data: agentActivities = [] } = useQuery({
    queryKey: ["/api/agent-activities"],
    enabled: false,
    initialData: [
      {
        id: "act-001",
        agent: "Sales Agent",
        action: "Processing customer order #SO-2024-001",
        module: "Sales & Distribution",
        timestamp: "2 minutes ago",
        status: "processing"
      },
      {
        id: "act-002",
        agent: "Inventory Agent", 
        action: "Stock level optimization completed",
        module: "Inventory Management",
        timestamp: "5 minutes ago",
        status: "success"
      },
      {
        id: "act-003",
        agent: "Finance Agent",
        action: "Invoice generation for order #SO-2024-001",
        module: "Finance",
        timestamp: "8 minutes ago",
        status: "success"
      }
    ] as AgentActivity[]
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Agentic ERP Control Center</h1>
            <p className="text-muted-foreground">
              AI-powered enterprise resource planning with autonomous agents
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Live System
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Processes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last hour
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,580</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Processed</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              +7 in last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              +3% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Business Overview</TabsTrigger>
          <TabsTrigger value="processes">Active Processes</TabsTrigger>
          <TabsTrigger value="agents">Agent Activities</TabsTrigger>
          <TabsTrigger value="modules">ERP Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Process Status</CardTitle>
                <CardDescription>Real-time status of core business operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {businessProcesses.map((process) => (
                  <div key={process.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(process.status)}
                      <div>
                        <p className="font-medium">{process.name}</p>
                        <p className="text-sm text-muted-foreground">{process.module}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getPriorityColor(process.priority)}>
                        {process.priority}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{process.lastUpdate}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Agent Activities</CardTitle>
                <CardDescription>Latest actions performed by autonomous agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getStatusIcon(activity.status)}
                    <div className="flex-1">
                      <p className="font-medium">{activity.agent}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {activity.module}
                        </span>
                        <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="processes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Business Processes</CardTitle>
              <CardDescription>Monitor and manage ongoing business operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businessProcesses.map((process) => (
                  <div key={process.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(process.status)}
                        <h3 className="font-semibold">{process.name}</h3>
                        <Badge className={getPriorityColor(process.priority)}>
                          {process.priority}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{process.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${process.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Module: {process.module}</span>
                        <span>Last update: {process.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autonomous Agent Network</CardTitle>
              <CardDescription>Monitor AI agents managing your business processes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Sales Agent', 'Inventory Agent', 'Finance Agent', 'Production Agent', 'HR Agent', 'Quality Agent'].map((agent) => (
                  <Card key={agent}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{agent}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Active</span>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>Processing: 3 tasks</p>
                        <p>Completed: 47 today</p>
                        <p>Efficiency: 96%</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Sales & Distribution', icon: ShoppingCart, status: 'operational', processes: 8 },
              { name: 'Financial Management', icon: DollarSign, status: 'operational', processes: 12 },
              { name: 'Inventory Management', icon: Package, status: 'operational', processes: 6 },
              { name: 'Production Planning', icon: Factory, status: 'maintenance', processes: 4 },
              { name: 'Human Resources', icon: Users, status: 'operational', processes: 5 },
              { name: 'Procurement', icon: Building2, status: 'operational', processes: 7 }
            ].map((module) => (
              <Card key={module.name}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <module.icon className="h-5 w-5" />
                    <span className="text-sm">{module.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status:</span>
                      <Badge variant={module.status === 'operational' ? 'default' : 'secondary'}>
                        {module.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Processes:</span>
                      <span className="font-medium">{module.processes}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Module
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}