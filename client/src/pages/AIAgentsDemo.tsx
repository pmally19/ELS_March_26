import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AIAssistant from "@/components/ui/ai-assistant";
import { Bot, Brain, Sparkles, Database, BarChart3, ShoppingCart, Package, Factory, DollarSign, TrendingUp, Search, Shield, Users, CreditCard, ShieldCheck, FileText, PenTool } from "lucide-react";

const moduleConfigs = [
  {
    moduleType: "masterData",
    moduleName: "Master Data",
    icon: Database,
    description: "Customer, vendor, material, and organizational data management",
    color: "bg-blue-100 text-blue-800",
    sampleData: {
      customers: 150,
      vendors: 85,
      materials: 320,
      plants: 5
    }
  },
  {
    moduleType: "sales",
    moduleName: "Sales",
    icon: DollarSign,
    description: "Lead management, opportunities, quotes, and orders",
    color: "bg-green-100 text-green-800",
    sampleData: {
      activeLeads: 45,
      openOpportunities: 23,
      monthlyRevenue: "$125,000",
      conversionRate: "18%"
    }
  },
  {
    moduleType: "inventory",
    moduleName: "Inventory",
    icon: Package,
    description: "Stock levels, movements, warehousing, and material planning",
    color: "bg-purple-100 text-purple-800",
    sampleData: {
      totalItems: 1250,
      lowStockItems: 15,
      warehouses: 3,
      movements: 89
    }
  },
  {
    moduleType: "purchase",
    moduleName: "Purchase",
    icon: ShoppingCart,
    description: "Procurement, vendor management, and purchase orders",
    color: "bg-orange-100 text-orange-800",
    sampleData: {
      openPOs: 12,
      pendingApprovals: 5,
      monthlySpend: "$85,000",
      vendors: 45
    }
  },
  {
    moduleType: "production",
    moduleName: "Production",
    icon: Factory,
    description: "Manufacturing planning, work centers, and shop floor control",
    color: "bg-red-100 text-red-800",
    sampleData: {
      activeOrders: 18,
      workCenters: 8,
      efficiency: "92%",
      capacity: "78%"
    }
  },
  {
    moduleType: "finance",
    moduleName: "Finance",
    icon: BarChart3,
    description: "Accounting, reporting, and financial analysis",
    color: "bg-yellow-100 text-yellow-800",
    sampleData: {
      monthlyRevenue: "$245,000",
      expenses: "$180,000",
      profit: "$65,000",
      cashFlow: "Positive"
    }
  },
  {
    moduleType: "controlling",
    moduleName: "Controlling",
    icon: TrendingUp,
    description: "Cost analysis, profitability, and performance management",
    color: "bg-indigo-100 text-indigo-800",
    sampleData: {
      costCenters: 25,
      varianceAnalysis: "5%",
      profitability: "26%",
      kpis: 15
    }
  }
];

// AI Agents data
const aiAgents = [
  {
    id: 'sales',
    name: 'Sales Agent',
    description: 'Lead management, opportunity tracking, and sales analytics',
    icon: DollarSign,
    status: 'active',
    lastActive: '2 minutes ago',
    capabilities: ['Lead qualification', 'Opportunity analysis', 'Sales forecasting', 'Customer insights'],
    moduleType: 'sales'
  },
  {
    id: 'inventory',
    name: 'Inventory Agent',
    description: 'Stock management, warehouse optimization, and material planning',
    icon: Package,
    status: 'active',
    lastActive: '5 minutes ago',
    capabilities: ['Stock monitoring', 'Reorder predictions', 'Warehouse optimization', 'Movement tracking'],
    moduleType: 'inventory'
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    description: 'Financial analysis, reporting, and accounting automation',
    icon: BarChart3,
    status: 'active',
    lastActive: '1 minute ago',
    capabilities: ['GL analysis', 'Financial reporting', 'Cash flow forecasting', 'Variance analysis'],
    moduleType: 'finance'
  },
  {
    id: 'production',
    name: 'Production Agent',
    description: 'Manufacturing planning, capacity management, and shop floor control',
    icon: Factory,
    status: 'active',
    lastActive: '4 minutes ago',
    capabilities: ['Production scheduling', 'Capacity planning', 'Quality monitoring', 'Resource optimization'],
    moduleType: 'production'
  },
  {
    id: 'purchasing',
    name: 'Purchasing Agent',
    description: 'Procurement optimization, vendor management, and cost analysis',
    icon: ShoppingCart,
    status: 'active',
    lastActive: '3 minutes ago',
    capabilities: ['Vendor analysis', 'Cost optimization', 'Purchase planning', 'Contract management'],
    moduleType: 'purchase'
  },
  {
    id: 'hr',
    name: 'HR Agent',
    description: 'Human resources management, payroll, and workforce analytics',
    icon: Users,
    status: 'active',
    lastActive: '6 minutes ago',
    capabilities: ['Employee management', 'Payroll processing', 'Performance tracking', 'Workforce planning'],
    moduleType: 'hr'
  },
  {
    id: 'controlling',
    name: 'Controlling Agent',
    description: 'Cost center analysis, profit center management, and activity-based costing',
    icon: TrendingUp,
    status: 'active',
    lastActive: '3 minutes ago',
    capabilities: ['Cost center accounting', 'Budget planning', 'ABC costing', 'Performance analysis'],
    moduleType: 'controlling'
  },
  {
    id: 'data-integrity',
    name: 'Data Integrity Agent',
    description: 'Database validation, UI synchronization, and master data consistency analysis',
    icon: Shield,
    status: 'active',
    lastActive: '1 minute ago',
    capabilities: ['Master data validation', 'UI sync checking', 'Foreign key integrity', 'Cross-module consistency'],
    moduleType: 'data-integrity'
  },
  {
    id: 'enhanced-data-integrity',
    name: 'Enhanced Data Integrity Analysis',
    description: 'Side-by-side comparison of database tables with UI screens for company-specific monitoring',
    icon: Shield,
    status: 'active',
    lastActive: '30 seconds ago',
    capabilities: ['Company-based analysis', 'Red error boxes', 'DB-UI synchronization', 'Real-time monitoring'],
    moduleType: 'enhanced-data-integrity'
  },
  {
    id: 'designer-agent',
    name: 'Designer Agent',
    description: 'Document analysis, system comparison, and intelligent implementation guidance with AI-powered insights',
    icon: PenTool,
    status: 'active',
    lastActive: '1 minute ago',
    capabilities: ['Document analysis', 'System comparison', 'Gap analysis', 'Implementation recommendations'],
    moduleType: 'designer-agent'
  },
  {
    id: 'developer-agent',
    name: 'Developer Agent',
    description: 'AI-powered automated code generation, file modification, and task planning with collaborative development workflow',
    icon: Brain,
    status: 'active',
    lastActive: '30 seconds ago',
    capabilities: ['Code generation', 'File modification', 'Task automation', 'Multi-provider AI integration'],
    moduleType: 'developer-agent'
  },
  {
    id: 'peer-review-agent',
    name: 'Peer Review Agent',
    description: 'Senior Developer Agent providing collaborative code review, quality assurance, and comprehensive due diligence',
    icon: ShieldCheck,
    status: 'active',
    lastActive: '45 seconds ago',
    capabilities: ['Code review', 'Quality assurance', 'Security analysis', 'Performance optimization'],
    moduleType: 'peer-review-agent'
  }
];

export default function AIAgentsDemo() {
  const [selectedModule, setSelectedModule] = useState(moduleConfigs[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const handleAgentInteraction = (agentId: string) => {
    if (agentId === 'data-integrity') {
      window.location.href = '/agents/data-integrity';
    } else if (agentId === 'enhanced-data-integrity') {
      window.location.href = '/data-integrity';
    } else if (agentId === 'designer-agent') {
      window.location.href = '/designer-agent-main';
    } else if (agentId === 'developer-agent' || agentId === 'peer-review-agent') {
      window.location.href = '/developer-agent';
    } else {
      const agent = aiAgents.find(a => a.id === agentId);
      if (agent) {
        setSelectedAgent(agent);
        setDialogOpen(true);
      }
    }
  };

  // Filter agents based on search term
  const filteredAgents = aiAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase())) ||
    agent.moduleType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">AI-Powered ERP Agents</h1>
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <Sparkles className="h-4 w-4 mr-1" />
            Intelligent Assistance
          </Badge>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Experience module-specific AI agents that understand your business processes and provide intelligent assistance for each functional area of your ERP system.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="demo">Interactive Demo</TabsTrigger>
          <TabsTrigger value="test-results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Agent Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Query Processing</h3>
                  <p className="text-sm text-gray-600">Answer questions about processes and best practices</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Data Analysis</h3>
                  <p className="text-sm text-gray-600">Analyze data patterns and provide insights</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Data Validation</h3>
                  <p className="text-sm text-gray-600">Validate entries for accuracy and compliance</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Sparkles className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Process Guidance</h3>
                  <p className="text-sm text-gray-600">Guide through complex workflows and procedures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search agents by name, capabilities, or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear
              </Button>
            )}
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="text-sm text-gray-600 mb-4">
              Found {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} matching "{searchTerm}"
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-blue-600 text-white`}>
                      <agent.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-lg">{agent.name}</span>
                      <Badge className="ml-2 bg-green-100 text-green-900">{agent.status}</Badge>
                    </div>
                  </CardTitle>
                  <p className="text-sm text-gray-700">{agent.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600">
                      <div className="font-medium mb-1">Capabilities:</div>
                      {agent.capabilities.map((capability, index) => (
                        <div key={index}>• {capability}</div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last active: {agent.lastActive}
                    </div>
                    <div className="space-y-2">
                      <Button 
                        className="w-full"
                        onClick={() => handleAgentInteraction(agent.id)}
                      >
                        {agent.id === 'data-integrity' ? 'Open Analysis Tool' : 
                         agent.id === 'designer-agent' ? 'Open Designer Agent' : 'Start Conversation'}
                      </Button>
                      {agent.id === 'data-integrity' && (
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => window.location.href = '/agents/data-integrity-sidebyside'}
                        >
                          Side-by-Side View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Results Message */}
          {searchTerm && filteredAgents.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or browse all available agents.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                Show All Agents
              </Button>
            </div>
          )}
          {/* Chief Agent - Ultimate Authority */}
          <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-600 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Chief Agent</span>
                  <Badge className="ml-2 bg-red-100 text-red-900">Ultimate Authority</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">Ultimate decision-making authority with human manager approval requirements</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => window.location.pathname = "/chief-agent"}
                >
                  Access Chief Dashboard
                </Button>
                <div className="text-xs text-gray-600">
                  <div>• System-wide oversight and control</div>
                  <div>• All data changes require approval</div>
                  <div>• Human manager escalation authority</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coach Agent - Strategic Oversight */}
          <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Coach Agent</span>
                  <Badge className="ml-2 bg-gold text-blue-900">Strategic Oversight</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">Central authority for system-wide coordination and health monitoring</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.location.pathname = "/coach-agent"}
                >
                  Access Coach Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.pathname = "/coach-agent/health-dashboard"}
                >
                  System Health Monitor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Player Agent - Operational Level */}
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-600 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Player Agent</span>
                  <Badge className="ml-2 bg-green-100 text-green-900">Operational Excellence</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">Domain-specific expertise and autonomous process execution</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.location.pathname = "/agent-player"}
                >
                  Access Player Dashboard
                </Button>
                <div className="text-xs text-gray-600">
                  <div>• Finance • Sales • Inventory</div>
                  <div>• Production • HR • Purchasing</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rookie Agent - Learning Level */}
          <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-600 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Rookie Agent</span>
                  <Badge className="ml-2 bg-orange-100 text-orange-900">Learning & Support</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">Entry-level learning with supervised task execution</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.location.pathname = "/rookie-agent"}
                >
                  Access Rookie Dashboard
                </Button>
                <div className="text-xs text-gray-600">
                  <div>• Data Entry • Basic Support</div>
                  <div>• Training • Quality Checks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Designer Agent - Independent Analysis */}
          <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Designer Agent</span>
                  <Badge className="ml-2 bg-purple-100 text-purple-900">System Architecture</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">Document-driven system analysis and intelligent architecture design</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => window.location.pathname = "/designer-agent"}
                >
                  Access Designer Agent
                </Button>
                <div className="text-xs text-gray-600">
                  <div>• Document Analysis • Schema Design</div>
                  <div>• Cross-reference Architecture • Agent Communication</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intelligent Testing Agent */}
          <Card className="border-2 border-cyan-300 bg-gradient-to-r from-cyan-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-600 text-white">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Intelligent Testing Agent</span>
                  <Badge className="ml-2 bg-cyan-100 text-cyan-900">Quality Assurance</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">AI-powered comprehensive testing with predictive analysis</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => window.location.pathname = "/intelligent-testing"}
                >
                  Access Testing Dashboard
                </Button>
                <div className="text-xs text-gray-600">
                  <div>• Unit & Integration Tests • E2E & Performance</div>
                  <div>• Security Testing • Predictive Analysis</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced AI Agents System */}
          <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-violet-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg">Enhanced AI Agents</span>
                  <Badge className="ml-2 bg-indigo-100 text-indigo-900">Role-Based Intelligence</Badge>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-700">Advanced AI system with role-based intelligence levels and comprehensive business domain expertise</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => window.location.pathname = "/enhanced-ai-agents"}
                >
                  Access Enhanced AI System
                </Button>
                <div className="text-xs text-gray-600">
                  <div>• Rookie, Coach, Player, Chief Roles</div>
                  <div>• HuggingFace & LangChain Integration</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleConfigs.map((module) => {
              const IconComponent = module.icon;
              return (
                <Card key={module.moduleType} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${module.color}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span>{module.moduleName} Agent</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600">{module.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(module.sampleData).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-2 rounded">
                          <div className="font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-gray-900 font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => setSelectedModule(module)}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Chat with {module.moduleName} Agent
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[900px] p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-4 border-b">
                          <DialogTitle className="flex items-center gap-2">
                            <IconComponent className="h-5 w-5" />
                            {module.moduleName} AI Assistant
                          </DialogTitle>
                        </DialogHeader>
                        <div className="px-6 pb-6 h-[calc(100%-80px)] overflow-y-auto">
                          <div className="h-full">
                            <AIAssistant
                              moduleType={module.moduleType}
                              moduleName={module.moduleName}
                              currentData={module.sampleData}
                              userRole="Manager"
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Select Module</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {moduleConfigs.map((module) => {
                    const IconComponent = module.icon;
                    return (
                      <Button
                        key={module.moduleType}
                        variant={selectedModule.moduleType === module.moduleType ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedModule(module)}
                      >
                        <IconComponent className="h-4 w-4 mr-2" />
                        {module.moduleName}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <AIAssistant
                moduleType={selectedModule.moduleType}
                moduleName={selectedModule.moduleName}
                currentData={selectedModule.sampleData}
                userRole="Manager"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="test-results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Test Results Dashboard
              </CardTitle>
              <p className="text-sm text-gray-600">
                View comprehensive test results with screenshots, timestamps, and detailed analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.location.pathname = "/test-results"}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Complete Test Results
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">15</div>
                    <div className="text-sm text-gray-600">Tests Passed</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">3</div>
                    <div className="text-sm text-gray-600">Tests Failed</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">2</div>
                    <div className="text-sm text-gray-600">Tests Running</div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Features Available:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Screenshot documentation for visual verification</li>
                    <li>• Timestamp tracking for audit trails</li>
                    <li>• Unique test numbers for easy reference</li>
                    <li>• Domain-specific filtering (Finance, Sales, Inventory, etc.)</li>
                    <li>• Detailed error messages and success metrics</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for individual AI Agents (Sales, Inventory, Finance, etc.) */}
      {selectedAgent && (
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              // Reset selected agent when dialog closes
              setTimeout(() => setSelectedAgent(null), 100);
            }
          }}
        >
          <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[900px] p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                {selectedAgent.icon && <selectedAgent.icon className="h-5 w-5" />}
                {selectedAgent.name}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 h-[calc(100%-80px)] overflow-y-auto">
              <div className="h-full">
                <AIAssistant
                  moduleType={selectedAgent.moduleType}
                  moduleName={selectedAgent.name}
                  currentData={moduleConfigs.find(m => m.moduleType === selectedAgent.moduleType)?.sampleData || {}}
                  userRole="Manager"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">Ready to Experience AI-Powered ERP?</h3>
            <p className="text-gray-600">
              Each module has its own specialized AI agent trained to understand your business processes and provide intelligent assistance.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="secondary">7 Specialized Agents</Badge>
              <Badge variant="secondary">Real-time Analysis</Badge>
              <Badge variant="secondary">Process Guidance</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}