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
  DollarSign, Package, Link as LinkIcon, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
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
  { id: "boxplot", name: "Box Plot", icon: BarChart3, category: "statistical" },
  { id: "violin", name: "Violin Plot", icon: AreaChart, category: "statistical" },
  { id: "pareto", name: "Pareto Chart", icon: LineChart, category: "quality" },
  { id: "control", name: "Control Chart", icon: LineChart, category: "quality" },
  { id: "stacked_bar", name: "Stacked Bar", icon: BarChart3, category: "comparison" },
  { id: "stacked_area", name: "Stacked Area", icon: AreaChart, category: "comparison" },
  { id: "grouped_column", name: "Grouped Column", icon: BarChart3, category: "comparison" },
  { id: "combination", name: "Combination Chart", icon: LineChart, category: "hybrid" },
  { id: "dual_axis", name: "Dual Axis Chart", icon: LineChart, category: "hybrid" }
];

// Available database tables for joining
const DATABASE_TABLES = [
  "materials", "customers", "vendors", "sales_orders", "purchase_orders",
  "inventory", "journal_entries", "cost_centers", "profit_centers",
  "employees", "company_codes", "plants", "storage_locations",
  "sales_organizations", "purchase_organizations", "currencies",
  "uoms", "categories", "work_centers", "bill_of_materials",
  "expenses", "assets", "leads", "opportunities", "quotes"
];

// SQL operators and functions
const SQL_OPERATORS = [
  "=", "!=", "<", ">", "<=", ">=", "LIKE", "IN", "NOT IN", "BETWEEN", "IS NULL", "IS NOT NULL"
];

const SQL_FUNCTIONS = [
  "SUM", "COUNT", "AVG", "MIN", "MAX", "DISTINCT", "GROUP_CONCAT",
  "YEAR", "MONTH", "DAY", "DATE", "NOW", "UPPER", "LOWER", "TRIM"
];

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
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report Saved",
        description: "Custom report has been saved successfully.",
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
    query += `\nFROM ${selectedTables[0]}`;
    
    // Add JOINs
    joinConditions.forEach((join, index) => {
      if (index + 1 < selectedTables.length) {
        query += `\n${join.type || "INNER"} JOIN ${selectedTables[index + 1]} ON ${join.condition}`;
      }
    });
    
    // Add WHERE clause
    if (whereConditions.length > 0) {
      query += "\nWHERE ";
      const conditions = whereConditions.map(condition => 
        `${condition.column} ${condition.operator} ${condition.value}`
      );
      query += conditions.join(" AND ");
    }
    
    setSqlQuery(query);
    return query;
  };

  // Execute the current query
  const executeQuery = () => {
    const query = showSqlEditor ? sqlQuery : generateSQL();
    if (!query) {
      toast({
        title: "No Query to Execute",
        description: "Please build a query or enter SQL manually.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExecuting(true);
    executeQueryMutation.mutate(query, {
      onSettled: () => setIsExecuting(false)
    });
  };

  // Save current report
  const saveReport = () => {
    if (!reportName.trim()) {
      toast({
        title: "Report Name Required",
        description: "Please provide a name for the report.",
        variant: "destructive"
      });
      return;
    }

    const reportData = {
      name: reportName,
      description: reportDescription,
      sql_query: showSqlEditor ? sqlQuery : generateSQL(),
      chart_config: {
        type: selectedChartType,
        ...chartConfig
      },
      parameters: [],
      category: "custom"
    };

    createReportMutation.mutate(reportData);
  };

  // Add table to selection
  const addTable = (tableName: string) => {
    if (!selectedTables.includes(tableName)) {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  // Remove table from selection
  const removeTable = (tableName: string) => {
    setSelectedTables(selectedTables.filter(t => t !== tableName));
    // Also remove related columns and joins
    setSelectedColumns(selectedColumns.filter(col => !col.startsWith(tableName + ".")));
    setJoinConditions(joinConditions.filter((_, index) => index < selectedTables.length - 2));
  };

  // Add column to selection
  const addColumn = (column: string) => {
    if (!selectedColumns.includes(column)) {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  // Load and execute saved report
  const loadReport = (report: Report) => {
    setSelectedReport(report);
    setReportName(report.name);
    setReportDescription(report.description);
    setSqlQuery(report.sql_query);
    setSelectedChartType(report.chart_config?.type || "bar");
    setChartConfig(report.chart_config || {});
    
    // Execute the report query
    executeQueryMutation.mutate(report.sql_query);
  };

  // Execute selected reports
  const executeSelectedReports = () => {
    if (selectedReports.length === 0) {
      toast({
        title: "No Reports Selected",
        description: "Please select at least one report to execute.",
        variant: "destructive",
      });
      return;
    }

    // For multiple reports, execute the first one for demonstration
    const firstReport = reports?.find(r => selectedReports.includes(r.id));
    if (firstReport) {
      loadReport(firstReport);
    }
  };

  // Add join condition
  const addJoinCondition = () => {
    setJoinConditions([...joinConditions, { type: "INNER", condition: "" }]);
  };

  // Add where condition
  const addWhereCondition = () => {
    setWhereConditions([...whereConditions, { column: "", operator: "=", value: "" }]);
  };

  return (
    <>
      <Header title="Custom Reports" />
      
      <div className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Advanced Report Builder</h2>
              <p className="text-sm text-muted-foreground">Create custom reports with data joining, formulas, and 30+ chart types</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={executeQuery} disabled={isExecuting} className="bg-blue-600 hover:bg-blue-700">
              {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Execute Query
            </Button>
            <Button onClick={saveReport} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="builder">Data Source</TabsTrigger>
            <TabsTrigger value="designer">Report Designer</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
            <TabsTrigger value="charts">Chart Studio</TabsTrigger>
            <TabsTrigger value="sql">SQL Editor</TabsTrigger>
            <TabsTrigger value="saved">Report Library</TabsTrigger>
          </TabsList>

          <TabsContent value="enterprise" className="space-y-6">
          {/* Enterprise Summary Cards */}
          {enterpriseSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Financial Records</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enterpriseSummary.finance_records}</div>
                  <p className="text-xs text-muted-foreground">
                    Revenue: ${parseFloat(enterpriseSummary.total_revenue || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Material Movements</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enterpriseSummary.material_records}</div>
                  <p className="text-xs text-muted-foreground">
                    Value: ${parseFloat(enterpriseSummary.total_material_value || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Analytics</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enterpriseSummary.inventory_records}</div>
                  <p className="text-xs text-muted-foreground">Inventory summaries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Integration Records</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enterpriseSummary.integration_records}</div>
                  <p className="text-xs text-muted-foreground">Cross-module flows</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* View Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Reporting Views</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a view to explore comprehensive business data with master data integration
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedView} onValueChange={setSelectedView}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select enterprise view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financeview">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Finance View - Financial reporting with master data
                      </div>
                    </SelectItem>
                    <SelectItem value="materialflowview">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Material Flow View - Material movement analytics
                      </div>
                    </SelectItem>
                    <SelectItem value="inventoryflowview">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Inventory Flow View - Inventory management analytics
                      </div>
                    </SelectItem>
                    <SelectItem value="financialmaterialintegrationview">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Integration View - Complete business process integration
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* View Data Display */}
                {viewData && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} Data
                      </h3>
                      <Badge variant="secondary">{viewData.total} records</Badge>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <ScrollArea className="h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {viewData.data?.[0] && Object.keys(viewData.data[0]).map((key) => (
                                <th key={key} className="text-left p-3 font-medium">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {viewData.data?.map((row, index) => (
                              <tr key={index} className="border-t hover:bg-muted/50">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="p-3">
                                    {typeof value === 'number' && value > 1000 ? 
                                      value.toLocaleString() : 
                                      String(value || '-')
                                    }
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Tables
                  </CardTitle>
                  <CardDescription>Select tables to include in your report</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Search tables..."
                        value={tableSearchTerm}
                        onChange={(e) => setTableSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <ScrollArea className="h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Select</TableHead>
                            <TableHead>Table Name</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {DATABASE_TABLES
                            .filter(table => table.toLowerCase().includes(tableSearchTerm.toLowerCase()))
                            .map((table) => (
                            <TableRow key={table}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedTables.includes(table)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      addTable(table);
                                    } else {
                                      removeTable(table);
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{table}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    
                    {selectedTables.length > 0 && (
                      <div className="pt-4 border-t">
                        <Label className="text-sm font-medium">Selected Tables ({selectedTables.length}):</Label>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedTables.map((table) => (
                            <Badge key={table} variant="secondary" className="cursor-pointer">
                              {table}
                              <button
                                onClick={() => removeTable(table)}
                                className="ml-1 text-red-500 hover:text-red-700"
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
                    Table Columns
                  </CardTitle>
                  <CardDescription>Select columns from your chosen tables</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Search columns..."
                        value={columnSearchTerm}
                        onChange={(e) => setColumnSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <ScrollArea className="h-64">
                      {selectedTables.length > 0 ? (
                        selectedTables.map((table) => {
                          const filteredColumns = (tableSchemas[table] || []).filter((column: string) =>
                            column.toLowerCase().includes(columnSearchTerm.toLowerCase())
                          );
                          
                          if (filteredColumns.length === 0 && columnSearchTerm) return null;
                          
                          return (
                            <div key={table} className="mb-4">
                              <Label className="font-medium text-blue-600 mb-2 block">{table}</Label>
                              <Table className="border rounded">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">Select</TableHead>
                                    <TableHead>Column Name</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredColumns.map((column: string) => (
                                    <TableRow key={column}>
                                      <TableCell>
                                        <Checkbox
                                          checked={selectedColumns.includes(`${table}.${column}`)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              addColumn(`${table}.${column}`);
                                            } else {
                                              setSelectedColumns(selectedColumns.filter(c => c !== `${table}.${column}`));
                                            }
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">{column}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          Select tables first to view available columns
                        </div>
                      )}
                    </ScrollArea>

                    {selectedColumns.length > 0 && (
                      <div className="pt-4 border-t">
                        <Label className="text-sm font-medium">Selected Columns ({selectedColumns.length}):</Label>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedColumns.map((column) => (
                            <Badge key={column} variant="outline" className="cursor-pointer">
                              {column}
                              <button
                                onClick={() => setSelectedColumns(selectedColumns.filter(c => c !== column))}
                                className="ml-1 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div>
                      <Label className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Custom Formula
                      </Label>
                      <Textarea
                        placeholder="e.g., SUM(sales_orders.amount) * 0.1 AS commission"
                        value={customFormula}
                        onChange={(e) => setCustomFormula(e.target.value)}
                        className="mt-2"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {SQL_FUNCTIONS.map((func) => (
                          <Badge
                            key={func}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setCustomFormula(customFormula + func + "()")}
                          >
                            {func}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Joins & Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Joins & Filters
                  </CardTitle>
                  <CardDescription>Define table relationships and conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Join Conditions */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Join Conditions</Label>
                        <Button size="sm" onClick={addJoinCondition} disabled={selectedTables.length < 2}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {joinConditions.map((join, index) => (
                        <div key={index} className="border rounded p-2 mt-2">
                          <div className="space-y-2">
                            <Select value={join.type} onValueChange={(value) => {
                              const newJoins = [...joinConditions];
                              newJoins[index].type = value;
                              setJoinConditions(newJoins);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Join Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INNER">INNER JOIN</SelectItem>
                                <SelectItem value="LEFT">LEFT JOIN</SelectItem>
                                <SelectItem value="RIGHT">RIGHT JOIN</SelectItem>
                                <SelectItem value="FULL">FULL JOIN</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="e.g., table1.id = table2.table1_id"
                              value={join.condition}
                              onChange={(e) => {
                                const newJoins = [...joinConditions];
                                newJoins[index].condition = e.target.value;
                                setJoinConditions(newJoins);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Where Conditions */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Where Conditions</Label>
                        <Button size="sm" onClick={addWhereCondition}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {whereConditions.map((condition, index) => (
                        <div key={index} className="border rounded p-2 mt-2">
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Column"
                              value={condition.column}
                              onChange={(e) => {
                                const newConditions = [...whereConditions];
                                newConditions[index].column = e.target.value;
                                setWhereConditions(newConditions);
                              }}
                            />
                            <Select value={condition.operator} onValueChange={(value) => {
                              const newConditions = [...whereConditions];
                              newConditions[index].operator = value;
                              setWhereConditions(newConditions);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Operator" />
                              </SelectTrigger>
                              <SelectContent>
                                {SQL_OPERATORS.map((op) => (
                                  <SelectItem key={op} value={op}>{op}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Value"
                              value={condition.value}
                              onChange={(e) => {
                                const newConditions = [...whereConditions];
                                newConditions[index].value = e.target.value;
                                setWhereConditions(newConditions);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generated SQL Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated SQL Query
                </CardTitle>
                <CardDescription>Preview of the automatically generated SQL query</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sqlQuery || generateSQL() || "Select tables and columns to generate SQL..."}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono text-sm min-h-32"
                  placeholder="SQL query will appear here..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sql" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced SQL Editor</CardTitle>
                <CardDescription>Write custom SQL queries with full database access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sql-editor-mode"
                      checked={showSqlEditor}
                      onCheckedChange={(checked) => setShowSqlEditor(checked === true)}
                    />
                    <Label htmlFor="sql-editor-mode">Enable manual SQL editing</Label>
                  </div>
                  
                  <Textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="Enter your SQL query here..."
                    className="font-mono text-sm min-h-64"
                    disabled={!showSqlEditor}
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Available Tables:</Badge>
                    {DATABASE_TABLES.slice(0, 8).map((table) => (
                      <Badge key={table} variant="secondary" className="cursor-pointer">
                        {table}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="designer" className="space-y-6">
            {/* Report Designer - Similar to Power BI/Tableau */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[800px]">
              {/* Left Panel - Report Elements */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Report Elements
                  </CardTitle>
                  <CardDescription>Drag and drop components to design your report</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {/* Data Elements */}
                      <div>
                        <Label className="font-semibold text-blue-600">Data Fields</Label>
                        <div className="mt-2 space-y-2">
                          {selectedColumns.map((column) => (
                            <div key={column} className="p-2 border rounded cursor-move hover:bg-blue-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-mono">{column}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Chart Elements */}
                      <div>
                        <Label className="font-semibold text-green-600">Chart Components</Label>
                        <div className="mt-2 grid grid-cols-1 gap-2">
                          {CHART_TYPES.slice(0, 8).map((chart) => (
                            <div key={chart.id} className="p-2 border rounded cursor-move hover:bg-green-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <chart.icon className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{chart.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Report Elements */}
                      <div>
                        <Label className="font-semibold text-purple-600">Report Components</Label>
                        <div className="mt-2 space-y-2">
                          <div className="p-2 border rounded cursor-move hover:bg-purple-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">Text Box</span>
                            </div>
                          </div>
                          <div className="p-2 border rounded cursor-move hover:bg-purple-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <TableIcon className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">Data Table</span>
                            </div>
                          </div>
                          <div className="p-2 border rounded cursor-move hover:bg-purple-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <Calculator className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">Summary Card</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Center Panel - Design Canvas */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Report Canvas</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button size="sm" onClick={() => setActiveTab("preview")}>
                        <Play className="h-4 w-4 mr-2" />
                        Live Preview
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>Design your report layout by dropping elements here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-[600px] p-4 bg-gray-50">
                    <div className="grid grid-cols-12 gap-2 h-full">
                      {/* Report Header */}
                      <div className="col-span-12 border-2 border-blue-200 rounded p-4 bg-white min-h-[80px] flex items-center justify-center">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-700">Report Header</h3>
                          <p className="text-sm text-gray-500">Drop title and header elements here</p>
                        </div>
                      </div>
                      
                      {/* Main Content Area */}
                      <div className="col-span-8 border-2 border-green-200 rounded p-4 bg-white min-h-[400px] flex items-center justify-center">
                        <div className="text-center">
                          <TableIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          <h3 className="text-lg font-semibold text-gray-700">Main Content</h3>
                          <p className="text-sm text-gray-500">Drop charts and tables here</p>
                        </div>
                      </div>
                      
                      {/* Side Panel */}
                      <div className="col-span-4 border-2 border-purple-200 rounded p-4 bg-white min-h-[400px] flex items-center justify-center">
                        <div className="text-center">
                          <Calculator className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                          <h3 className="text-base font-semibold text-gray-700">Summary Panel</h3>
                          <p className="text-xs text-gray-500">Drop KPI cards here</p>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="col-span-12 border-2 border-orange-200 rounded p-2 bg-white min-h-[60px] flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Report Footer - Drop footer elements here</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Panel - Properties */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Properties
                  </CardTitle>
                  <CardDescription>Customize selected element</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      <div>
                        <Label>Element Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select element" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chart">Chart</SelectItem>
                            <SelectItem value="table">Table</SelectItem>
                            <SelectItem value="text">Text Box</SelectItem>
                            <SelectItem value="kpi">KPI Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Width</Label>
                        <Input placeholder="100%" />
                      </div>

                      <div>
                        <Label>Height</Label>
                        <Input placeholder="300px" />
                      </div>

                      <div>
                        <Label>Background Color</Label>
                        <Input type="color" defaultValue="#ffffff" />
                      </div>

                      <div>
                        <Label>Border</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Border style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="dashed">Dashed</SelectItem>
                            <SelectItem value="dotted">Dotted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div>
                        <Label className="font-semibold">Data Binding</Label>
                        <div className="mt-2 space-y-2">
                          <div>
                            <Label className="text-xs">Data Source</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select table" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedTables.map(table => (
                                  <SelectItem key={table} value={table}>{table}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Field</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedColumns.map(column => (
                                  <SelectItem key={column} value={column}>{column}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {/* Live Preview - Similar to Report Viewer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Live Report Preview</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button size="sm" onClick={() => setActiveTab("designer")}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Design
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Real-time preview of your report with live data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-6 min-h-[700px]">
                  {/* Report Preview Content */}
                  <div className="space-y-6">
                    {/* Header Section */}
                    <div className="text-center border-b pb-4">
                      <h1 className="text-2xl font-bold text-gray-800">
                        {reportName || "Custom Business Report"}
                      </h1>
                      <p className="text-gray-600 mt-2">
                        Generated on {new Date().toLocaleDateString()} • Data from {selectedTables.length} table(s)
                      </p>
                    </div>

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-600 font-medium">Total Records</p>
                              <p className="text-2xl font-bold text-blue-800">
                                {reportResult?.total_rows || "0"}
                              </p>
                            </div>
                            <Database className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-600 font-medium">Data Sources</p>
                              <p className="text-2xl font-bold text-green-800">{selectedTables.length}</p>
                            </div>
                            <TableIcon className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-purple-600 font-medium">Selected Columns</p>
                              <p className="text-2xl font-bold text-purple-800">{selectedColumns.length}</p>
                            </div>
                            <Calculator className="h-8 w-8 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-orange-600 font-medium">Execution Time</p>
                              <p className="text-2xl font-bold text-orange-800">
                                {reportResult?.execution_time || "0"}ms
                              </p>
                            </div>
                            <Zap className="h-8 w-8 text-orange-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Chart Section */}
                    {reportResult && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Data Visualization</CardTitle>
                            <CardDescription>Chart representation of your data</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
                              <div className="text-center">
                                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500">Chart Preview</p>
                                <p className="text-sm text-gray-400">
                                  {selectedChartType?.toUpperCase() || 'BAR'} chart with {reportResult?.data?.length || 0} data points
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Data Summary</CardTitle>
                            <CardDescription>Statistical overview</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Rows:</span>
                                <span className="font-medium">{reportResult?.total_rows || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Columns:</span>
                                <span className="font-medium">{reportResult?.columns?.length || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Query Time:</span>
                                <span className="font-medium">{reportResult?.execution_time || 0}ms</span>
                              </div>
                              <Separator />
                              <div>
                                <Label className="text-sm font-medium">Available Columns:</Label>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {reportResult?.columns?.slice(0, 6).map(column => (
                                    <Badge key={column} variant="outline" className="text-xs">
                                      {column}
                                    </Badge>
                                  )) || []}
                                  {(reportResult?.columns?.length || 0) > 6 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{(reportResult?.columns?.length || 0) - 6} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Data Table Preview */}
                    {reportResult && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Data Preview</CardTitle>
                          <CardDescription>First 10 rows of your report data</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-96">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {reportResult.columns.map((column) => (
                                    <TableHead key={column} className="font-semibold">
                                      {column}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {reportResult.data.slice(0, 10).map((row, index) => (
                                  <TableRow key={index} className="hover:bg-gray-50">
                                    {reportResult.columns.map((column) => (
                                      <TableCell key={column} className="font-mono text-sm">
                                        {row[column]}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Chart Type Selection</CardTitle>
                  <CardDescription>Choose from 30+ chart types for data visualization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["basic", "advanced", "financial", "business", "kpi", "statistical", "quality", "comparison", "hybrid", "project"].map((category) => (
                      <div key={category}>
                        <Label className="font-medium capitalize">{category} Charts</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {CHART_TYPES.filter(chart => chart.category === category).map((chart) => (
                            <Button
                              key={chart.id}
                              variant={selectedChartType === chart.id ? "default" : "outline"}
                              className="h-auto p-3 flex flex-col items-center gap-2"
                              onClick={() => setSelectedChartType(chart.id)}
                            >
                              <chart.icon className="h-5 w-5" />
                              <span className="text-xs">{chart.name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chart Configuration</CardTitle>
                  <CardDescription>Customize chart appearance and behavior</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Chart Title</Label>
                      <Input
                        value={chartConfig.title || ""}
                        onChange={(e) => setChartConfig({...chartConfig, title: e.target.value})}
                        placeholder="Enter chart title"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>X-Axis Label</Label>
                        <Input
                          value={chartConfig.xLabel || ""}
                          onChange={(e) => setChartConfig({...chartConfig, xLabel: e.target.value})}
                          placeholder="X-axis label"
                        />
                      </div>
                      <div>
                        <Label>Y-Axis Label</Label>
                        <Input
                          value={chartConfig.yLabel || ""}
                          onChange={(e) => setChartConfig({...chartConfig, yLabel: e.target.value})}
                          placeholder="Y-axis label"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Color Scheme</Label>
                        <Select
                          value={chartConfig.colorScheme || "default"}
                          onValueChange={(value) => setChartConfig({...chartConfig, colorScheme: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="blue">Blue Tones</SelectItem>
                            <SelectItem value="green">Green Tones</SelectItem>
                            <SelectItem value="red">Red Tones</SelectItem>
                            <SelectItem value="purple">Purple Tones</SelectItem>
                            <SelectItem value="rainbow">Rainbow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Animation</Label>
                        <Select
                          value={chartConfig.animation || "smooth"}
                          onValueChange={(value) => setChartConfig({...chartConfig, animation: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="smooth">Smooth</SelectItem>
                            <SelectItem value="bounce">Bounce</SelectItem>
                            <SelectItem value="elastic">Elastic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-legend"
                          checked={chartConfig.showLegend !== false}
                          onCheckedChange={(checked) => setChartConfig({...chartConfig, showLegend: checked === true})}
                        />
                        <Label htmlFor="show-legend">Show Legend</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-grid"
                          checked={chartConfig.showGrid !== false}
                          onCheckedChange={(checked) => setChartConfig({...chartConfig, showGrid: checked === true})}
                        />
                        <Label htmlFor="show-grid">Show Grid Lines</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-values"
                          checked={chartConfig.showValues === true}
                          onCheckedChange={(checked) => setChartConfig({...chartConfig, showValues: checked === true})}
                        />
                        <Label htmlFor="show-values">Show Data Values</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Saved Reports</span>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Search reports..." 
                      className="w-64"
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value)}
                    />
                    <Button 
                      size="sm" 
                      onClick={executeSelectedReports}
                      disabled={selectedReports.length === 0}
                      variant="default"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Execute Query
                    </Button>
                    <Button size="sm" onClick={() => setActiveTab("builder")} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      New Report
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Manage your saved custom reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Report Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports
                          .filter((report: Report) => 
                            report.name.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
                            report.description.toLowerCase().includes(reportSearchTerm.toLowerCase())
                          )
                          .map((report: Report) => (
                          <TableRow key={report.id} className="hover:bg-muted/50">
                            <TableCell>
                              <Checkbox 
                                checked={selectedReports.includes(report.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedReports([...selectedReports, report.id]);
                                  } else {
                                    setSelectedReports(selectedReports.filter(id => id !== report.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{report.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{report.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{report.category}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(report.updated_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="View Report"
                                  onClick={() => {
                                    loadReport(report);
                                    setActiveTab("preview");
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Edit Report"
                                  onClick={() => {
                                    loadReport(report);
                                    setActiveTab("designer");
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Execute Query"
                                  onClick={() => loadReport(report)}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" title="Duplicate Report">
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" title="Download Report">
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" title="Delete Report">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Report Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Report Settings</CardTitle>
            <CardDescription>Configure report metadata and sharing options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Report Name</Label>
                <Input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe what this report shows..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Results */}
        {reportResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Query Results ({reportResult.total_rows} rows)</span>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Search results..." 
                    className="w-48"
                    value={resultsSearchTerm}
                    onChange={(e) => setResultsSearchTerm(e.target.value)}
                  />
                  <Badge variant="outline">
                    Executed in {reportResult.execution_time}ms
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      {reportResult.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportResult.data
                      .filter((row) => {
                        if (!resultsSearchTerm) return true;
                        return reportResult.columns.some(column =>
                          String(row[column] || '').toLowerCase().includes(resultsSearchTerm.toLowerCase())
                        );
                      })
                      .slice(0, 100)
                      .map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        {reportResult.columns.map((column) => (
                          <TableCell key={column} className="font-mono text-sm">
                            {row[column]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(100, reportResult.data.length)} of {reportResult.total_rows} rows
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Add Filters
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Column Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}