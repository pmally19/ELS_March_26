import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import { 
  Plus, Save, Play, Download, Edit2, Trash2, Copy, 
  BarChart3, LineChart, PieChart, AreaChart, ScatterChart,
  TrendingUp, TrendingDown, Calculator, Database, 
  FileText, Filter, Settings, Eye, RefreshCw,
  Table as TableIcon, Zap, Target, Activity,
  DollarSign, Package, Link
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Chart type configurations
const CHART_TYPES = [
  { id: "bar", name: "Bar Chart", icon: BarChart3, category: "basic" },
  { id: "line", name: "Line Chart", icon: LineChart, category: "basic" },
  { id: "pie", name: "Pie Chart", icon: PieChart, category: "basic" },
  { id: "area", name: "Area Chart", icon: AreaChart, category: "basic" },
  { id: "scatter", name: "Scatter Plot", icon: ScatterChart, category: "basic" },
  { id: "column", name: "Column Chart", icon: BarChart3, category: "basic" },
  { id: "doughnut", name: "Doughnut Chart", icon: PieChart, category: "basic" },
  { id: "radar", name: "Radar Chart", icon: Target, category: "advanced" },
  { id: "bubble", name: "Bubble Chart", icon: ScatterChart, category: "advanced" },
  { id: "candlestick", name: "Candlestick", icon: TrendingUp, category: "financial" },
  { id: "waterfall", name: "Waterfall Chart", icon: BarChart3, category: "financial" },
  { id: "funnel", name: "Funnel Chart", icon: Filter, category: "business" },
  { id: "gauge", name: "Gauge Chart", icon: Activity, category: "kpi" },
  { id: "speedometer", name: "Speedometer", icon: Activity, category: "kpi" },
  { id: "heatmap", name: "Heat Map", icon: TableIcon, category: "advanced" },
  { id: "treemap", name: "Tree Map", icon: TableIcon, category: "advanced" },
  { id: "sankey", name: "Sankey Diagram", icon: TrendingUp, category: "advanced" },
  { id: "sunburst", name: "Sunburst Chart", icon: PieChart, category: "advanced" },
  { id: "gantt", name: "Gantt Chart", icon: BarChart3, category: "project" },
  { id: "timeline", name: "Timeline Chart", icon: LineChart, category: "project" },
  { id: "histogram", name: "Histogram", icon: BarChart3, category: "statistical" },
];

const SQL_OPERATORS = ["=", "!=", "<", ">", "<=", ">=", "LIKE", "IN", "NOT IN", "IS NULL", "IS NOT NULL"];

interface Report {
  id: number;
  name: string;
  description: string;
  sql_query: string;
  chart_config: any;
  parameters: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  is_shared: boolean;
  category: string;
}

interface ReportResult {
  columns: string[];
  data: any[];
  total_rows: number;
  execution_time: number;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("builder");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [joinConditions, setJoinConditions] = useState<any[]>([]);
  const [whereConditions, setWhereConditions] = useState<any[]>([]);
  const [customFormula, setCustomFormula] = useState("");
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [selectedChartType, setSelectedChartType] = useState("bar");
  const [chartConfig, setChartConfig] = useState<any>({});
  const [sqlQuery, setSqlQuery] = useState("");
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [resultsSearchTerm, setResultsSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    enabled: activeTab === "saved"
  });

  // Fetch table schemas for query builder (including enterprise views)
  const { data: tableSchemas = {} } = useQuery<Record<string, string[]>>({
    queryKey: ["/api/reports/schemas"],
  });

  // Fetch report templates
  const { data: reportTemplates = {} } = useQuery({
    queryKey: ["/api/reports/templates"],
  });

  // Enhanced table list including enterprise views
  const availableTables = {
    ...tableSchemas,
    'Enterprise Views': {
      'financeview': 'Financial transactions with master data integration',
      'materialflowview': 'Material movements with value stream tracking', 
      'inventoryflowview': 'Inventory analytics by material and location',
      'financialmaterialintegrationview': 'Complete business process integration'
    }
  };

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (reportData: any) => apiRequest("/api/reports", {
      method: "POST",
      body: JSON.stringify(reportData)
    }),
    onSuccess: () => {
      toast({
        title: "Report Saved",
        description: "Your custom report has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setReportName("");
      setReportDescription("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the report. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Execute query mutation
  const executeQueryMutation = useMutation<ReportResult, Error, string>({
    mutationFn: async (query: string) => {
      const response = await apiRequest("/api/reports/execute", {
        method: "POST",
        body: JSON.stringify({ query })
      });
      return response as unknown as ReportResult;
    },
    onSuccess: (result: ReportResult) => {
      setReportResult(result);
      toast({
        title: "Query Executed",
        description: `Retrieved ${result.total_rows} rows in ${result.execution_time}ms`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Query Error",
        description: error.message || "Failed to execute query",
        variant: "destructive"
      });
    }
  });

  // Generate SQL from visual builder
  const generateSQL = () => {
    if (selectedTables.length === 0) {
      return "";
    }

    let query = "SELECT ";
    
    // Add columns
    if (selectedColumns.length > 0) {
      query += selectedColumns.join(", ");
    } else {
      query += "*";
    }
    
    // Add custom formula if provided
    if (customFormula.trim()) {
      if (selectedColumns.length > 0) {
        query += ", ";
      }
      query += `(${customFormula}) AS custom_calculation`;
    }
    
    // Add FROM clause
    query += ` FROM ${selectedTables[0]}`;
    
    // Add joins
    for (let i = 1; i < selectedTables.length; i++) {
      const joinIndex = i - 1;
      if (joinConditions[joinIndex]) {
        query += ` ${joinConditions[joinIndex].type} JOIN ${selectedTables[i]} ON ${joinConditions[joinIndex].condition}`;
      } else {
        query += ` INNER JOIN ${selectedTables[i]}`;
      }
    }
    
    // Add WHERE conditions
    if (whereConditions.length > 0) {
      const validConditions = whereConditions.filter(condition => 
        condition.column && condition.operator && condition.value
      );
      if (validConditions.length > 0) {
        query += " WHERE " + validConditions.map(condition => 
          `${condition.column} ${condition.operator} '${condition.value}'`
        ).join(" AND ");
      }
    }
    
    query += " LIMIT 100";
    return query;
  };

  // Execute query based on current state
  const executeQuery = () => {
    const query = showSqlEditor ? sqlQuery : generateSQL();
    
    if (!query.trim()) {
      toast({
        title: "No Query",
        description: "Please build a query using the visual builder or enter SQL directly.",
        variant: "destructive",
      });
      return;
    }
    
    setIsExecuting(true);
    executeQueryMutation.mutate(query, {
      onSettled: () => setIsExecuting(false)
    });
  };

  // Template report generation
  const generateTemplateReport = async (templateId: string) => {
    try {
      setIsExecuting(true);
      const response = await apiRequest(`/api/reports/templates/${templateId}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          filters: {},
          chartType: selectedChartType
        })
      });
      
      setReportResult(response);
      toast({
        title: "Template Report Generated",
        description: `${response.template.name} created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate template report",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // AI report generation
  const generateAIReport = async () => {
    try {
      setIsExecuting(true);
      const response = await apiRequest('/api/reports/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: customFormula,
          requirements: {
            chartType: selectedChartType,
            includeEnterpriseViews: true
          }
        })
      });
      
      // Apply AI suggestions to current builder
      if (response.suggestedTables) {
        setSelectedTables(response.suggestedTables);
      }
      
      if (response.query) {
        setSqlQuery(response.query);
        setActiveTab('sql');
      }
      
      toast({
        title: "AI Report Generated",
        description: "Report structure created based on your requirements",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to generate AI report",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const customizeTemplate = (templateId: string) => {
    const template = reportTemplates[templateId];
    if (template) {
      setSelectedTables(template.tables || []);
      setSelectedChartType(template.defaultCharts?.[0] || 'bar');
      setActiveTab('builder');
      toast({
        title: "Template Loaded",
        description: `${template.name} loaded in Report Builder`,
      });
    }
  };

  // Export results
  const exportResults = (format: string) => {
    if (!reportResult) return;
    
    const csv = [
      reportResult.columns.join(','),
      ...reportResult.data.map(row => reportResult.columns.map(col => row[col]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Report exported as ${format.toUpperCase()}`,
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Header title="AI-Powered Reports" subtitle="Comprehensive business intelligence with enterprise views and AI assistance" />

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="builder">Report Builder</TabsTrigger>
            <TabsTrigger value="templates">Report Templates</TabsTrigger>
            <TabsTrigger value="ai-agent">AI Report Agent</TabsTrigger>
            <TabsTrigger value="sql">SQL Editor</TabsTrigger>
            <TabsTrigger value="saved">Report Library</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Sources
                  </CardTitle>
                  <CardDescription>Select tables and enterprise views to include</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      placeholder="Search tables..."
                      value={tableSearchTerm}
                      onChange={(e) => setTableSearchTerm(e.target.value)}
                    />
                    
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {Object.entries(availableTables).map(([category, tables]) => (
                          <div key={category}>
                            <div className="font-medium text-sm text-muted-foreground mb-2">
                              {category}
                            </div>
                            {Object.entries(tables).map(([tableName, description]) => (
                              <div key={tableName} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{tableName}</div>
                                  <div className="text-xs text-muted-foreground">{description}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant={selectedTables.includes(tableName) ? "default" : "outline"}
                                  onClick={() => {
                                    if (selectedTables.includes(tableName)) {
                                      setSelectedTables(selectedTables.filter(t => t !== tableName));
                                    } else {
                                      setSelectedTables([...selectedTables, tableName]);
                                    }
                                  }}
                                >
                                  {selectedTables.includes(tableName) ? "Remove" : "Add"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {selectedTables.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Selected Tables:</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedTables.map((table) => (
                            <Badge key={table} variant="secondary" className="text-xs">
                              {table}
                              <button 
                                className="ml-1 hover:text-destructive"
                                onClick={() => setSelectedTables(selectedTables.filter(t => t !== table))}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Column Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TableIcon className="h-5 w-5" />
                    Columns & Fields
                  </CardTitle>
                  <CardDescription>Choose specific columns or use * for all</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      placeholder="Search columns..."
                      value={columnSearchTerm}
                      onChange={(e) => setColumnSearchTerm(e.target.value)}
                    />
                    
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {selectedTables.map((table) => {
                          const columns = tableSchemas[table] || [];
                          return (
                            <div key={table}>
                              <div className="font-medium text-sm text-muted-foreground mb-2">
                                {table}
                              </div>
                              {columns.map((column) => (
                                <div key={`${table}.${column}`} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${table}.${column}`}
                                    checked={selectedColumns.includes(`${table}.${column}`)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedColumns([...selectedColumns, `${table}.${column}`]);
                                      } else {
                                        setSelectedColumns(selectedColumns.filter(c => c !== `${table}.${column}`));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`${table}.${column}`} className="text-sm">
                                    {column}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              {/* Chart Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Visualization
                  </CardTitle>
                  <CardDescription>Select chart type and configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Chart Type</Label>
                      <Select value={selectedChartType} onValueChange={setSelectedChartType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHART_TYPES.reduce((acc, chart) => {
                            if (!acc[chart.category]) acc[chart.category] = [];
                            acc[chart.category].push(chart);
                            return acc;
                          }, {} as Record<string, typeof CHART_TYPES>)).map(([category, charts]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                                {category}
                              </div>
                              {charts.map((chart) => (
                                <SelectItem key={chart.id} value={chart.id}>
                                  <div className="flex items-center gap-2">
                                    <chart.icon className="h-4 w-4" />
                                    {chart.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Custom Formula</Label>
                      <Textarea
                        placeholder="e.g., SUM(revenue), COUNT(*), AVG(price)"
                        value={customFormula}
                        onChange={(e) => setCustomFormula(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={executeQuery} disabled={isExecuting} className="flex-1">
                        {isExecuting ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Execute Query
                      </Button>
                      <Button variant="outline" onClick={() => setSqlQuery(generateSQL())}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Results */}
            {reportResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Report Results</span>
                    <div className="flex items-center gap-2">
                      <Select value={selectedChartType} onValueChange={setSelectedChartType}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select Chart Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHART_TYPES.reduce((acc, chart) => {
                            if (!acc[chart.category]) acc[chart.category] = [];
                            acc[chart.category].push(chart);
                            return acc;
                          }, {} as Record<string, typeof CHART_TYPES>)).map(([category, charts]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                                {category}
                              </div>
                              {charts.map((chart) => (
                                <SelectItem key={chart.id} value={chart.id}>
                                  <div className="flex items-center gap-2">
                                    <chart.icon className="h-4 w-4" />
                                    {chart.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => exportResults('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {reportResult.total_rows} rows • {reportResult.execution_time}ms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {reportResult.columns.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportResult.data.map((row, index) => (
                          <TableRow key={index}>
                            {reportResult.columns.map((column) => (
                              <TableCell key={column}>
                                {String(row[column] || '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Business Report Templates</CardTitle>
                <CardDescription>Pre-built reports for common business scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(reportTemplates).map(([templateId, template]) => (
                    <Card key={templateId} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">{template.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.tables?.slice(0, 3).map((table) => (
                            <Badge key={table} variant="outline" className="text-xs">
                              {table}
                            </Badge>
                          ))}
                          {template.tables?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.tables.length - 3} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => generateTemplateReport(templateId)}
                            className="flex-1"
                          >
                            <Play className="h-3 w-3 mr-2" />
                            Generate
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => customizeTemplate(templateId)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-agent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  AI Report Agent
                </CardTitle>
                <CardDescription>
                  Describe what you want to analyze and the AI will build the perfect report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>What would you like to analyze?</Label>
                    <Textarea
                      placeholder="e.g., 'Show me sales performance by customer for the last quarter with aging analysis' or 'Create a production efficiency report with capacity utilization'"
                      className="min-h-24"
                      value={customFormula}
                      onChange={(e) => setCustomFormula(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Report Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales & Revenue Analysis</SelectItem>
                          <SelectItem value="financial">Financial Reports</SelectItem>
                          <SelectItem value="inventory">Inventory & Stock</SelectItem>
                          <SelectItem value="production">Production Planning</SelectItem>
                          <SelectItem value="aging">Aging & Collections</SelectItem>
                          <SelectItem value="performance">Performance Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Preferred Visualization</Label>
                      <Select value={selectedChartType} onValueChange={setSelectedChartType}>
                        <SelectTrigger>
                          <SelectValue placeholder="AI will suggest best option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">AI Auto-Select</SelectItem>
                          <SelectItem value="dashboard">Interactive Dashboard</SelectItem>
                          <SelectItem value="chart">Single Chart</SelectItem>
                          <SelectItem value="table">Data Table</SelectItem>
                          <SelectItem value="mixed">Mixed Views</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => generateAIReport()}
                      disabled={!customFormula.trim()}
                      className="flex-1"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Generate AI Report
                    </Button>
                    <Button variant="outline" onClick={() => setCustomFormula('')}>
                      Clear
                    </Button>
                  </div>
                  
                  {/* AI Suggestions */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-medium mb-2">AI Suggestions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span>Try: "Customer aging report with overdue amounts by region"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span>Try: "Sales trend analysis with seasonal patterns"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        <span>Try: "Inventory turnover by material category with ABC analysis"</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sql" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  SQL Editor
                </CardTitle>
                <CardDescription>Write custom SQL queries directly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="SELECT * FROM financeview WHERE business_date >= '2025-01-01'"
                    className="min-h-32 font-mono"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={executeQuery} disabled={isExecuting}>
                      {isExecuting ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Execute SQL
                    </Button>
                    <Button variant="outline" onClick={() => setSqlQuery('')}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Library</CardTitle>
                <CardDescription>Manage your saved custom reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Report name..."
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                    />
                    <Button onClick={() => {
                      const reportData = {
                        name: reportName,
                        description: reportDescription,
                        sql_query: sqlQuery || generateSQL(),
                        chart_config: { type: selectedChartType },
                        parameters: [],
                        category: "custom"
                      };
                      createReportMutation.mutate(reportData);
                    }} disabled={!reportName.trim()}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Report
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Saved reports feature coming soon - reports will be stored and accessible here.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}