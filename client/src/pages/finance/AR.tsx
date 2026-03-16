import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Filter,
  Clock,
  DollarSign,
  Eye,
  Calendar,
  User,
  CreditCard,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Users,
  ArrowLeft,
  FileText,
  Database,
  CheckCircle,
  Settings,
  RefreshCw,
} from "lucide-react";
import ARClearingManagement from "@/components/finance/ARClearingManagement";
import ARReconciliation from "@/components/finance/ARReconciliation";
import ARAgingAnalysis from "@/components/finance/ARAgingAnalysis";
import { CreateManualInvoiceDialog } from "@/components/finance/CreateManualInvoiceDialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

// AR Tile Content Renderer - moved outside component to avoid scoping issues
const renderTileContent = (tileId: string, toast: any, queryClient: any, creditLimits: any[] = []) => {
  console.log('renderTileContent called with:', tileId);

  const processPayment = async (amount: number, customerId: number) => {
    try {
      await fetch('/api/finance-enhanced/ar/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, customerId, date: new Date().toISOString() })
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/ar/statistics'] });
      toast({ title: "Payment Processed", description: `Payment of $${amount} recorded successfully` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to process payment", variant: "destructive" });
    }
  };

  switch (tileId) {
    case 'payment-processing':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Payment Processing & Recording</h3>
          <p className="text-muted-foreground">Payment processing functionality is available in the main AR dashboard.</p>
        </div>
      );

    case 'collection-management':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Collection Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overdue Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { customer: "ABC Corp", amount: "$15,000", days: "45 days" },
                    { customer: "XYZ Ltd", amount: "$8,500", days: "30 days" },
                    { customer: "Tech Solutions", amount: "$12,000", days: "60 days" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{item.customer}</div>
                        <div className="text-sm text-muted-foreground">{item.days} overdue</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">{item.amount}</div>
                        <Button size="sm" variant="outline">Send Notice</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Collection Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Dunning Letters
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Schedule Collection Calls
                  </Button>
                  <Button className="w-full" variant="outline">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Escalate to Legal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'credit-management':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Credit Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Credit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Assigned</span>
                    <span className="font-semibold">
                      ${(creditLimits.reduce((sum: number, c: any) => sum + (parseFloat(c.credit_limit) || 0), 0) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currently Used</span>
                    <span className="font-semibold">
                      ${(creditLimits.reduce((sum: number, c: any) => sum + (parseFloat(c.used_credit) || 0), 0) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available</span>
                    <span className="font-semibold text-green-600">
                      ${((creditLimits.reduce((sum: number, c: any) => sum + (parseFloat(c.credit_limit) || 0), 0) - 
                          creditLimits.reduce((sum: number, c: any) => sum + (parseFloat(c.used_credit) || 0), 0)) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Credit Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {creditLimits && creditLimits.length > 0 ? (
                  <div className="space-y-2">
                    {creditLimits
                      .filter((c: any) => {
                        const utilization = parseFloat(c.credit_utilization_percent) || 0;
                        return utilization >= 80;
                      })
                      .slice(0, 3)
                      .map((customer: any) => {
                        const utilization = parseFloat(customer.credit_utilization_percent) || 0;
                        const isHighRisk = utilization >= 90;
                        return (
                          <div key={customer.customer_id} className={`p-2 rounded text-sm ${isHighRisk ? 'bg-red-50' : 'bg-yellow-50'}`}>
                            <div className={`font-medium ${isHighRisk ? 'text-red-800' : 'text-yellow-800'}`}>
                              {isHighRisk ? 'High Risk' : 'Warning'}: {customer.customer_name || customer.customer_code}
                            </div>
                            <div className={isHighRisk ? 'text-red-600' : 'text-yellow-600'}>
                              {utilization.toFixed(1)}% of credit limit used
                            </div>
                          </div>
                        );
                      })}
                    {creditLimits.filter((c: any) => (parseFloat(c.credit_utilization_percent) || 0) >= 80).length === 0 && (
                      <div className="text-center py-2 text-muted-foreground text-sm">No credit alerts</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2 text-muted-foreground text-sm">No credit data available</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button size="sm" className="w-full">Review Limits</Button>
                  <Button size="sm" variant="outline" className="w-full">Run Credit Check</Button>
                  <Button size="sm" variant="outline" className="w-full">Generate Report</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'advanced-reporting':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Advanced Reporting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Available Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart className="h-4 w-4 mr-2" />
                    Aging Analysis Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <PieChart className="h-4 w-4 mr-2" />
                    Customer Payment Trends
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <LineChart className="h-4 w-4 mr-2" />
                    Cash Flow Projection
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Collection Effectiveness
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Collection Rate</span>
                    <span className="font-semibold text-green-600">94.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Payment Days</span>
                    <span className="font-semibold">28 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DSO (Days Sales Outstanding)</span>
                    <span className="font-semibold">32 days</span>
                  </div>
                  <Button size="sm" className="w-full">Export to Excel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'integration-workflows':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Integration Workflows</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">Auto-Payment Matching</div>
                      <div className="text-sm text-muted-foreground">Bank feed integration</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">Invoice-to-Cash Flow</div>
                      <div className="text-sm text-muted-foreground">Sales order automation</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">Credit Check Integration</div>
                      <div className="text-sm text-muted-foreground">External credit bureau</div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Workflow Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Create New Workflow
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Rules
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Automation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'document-management':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Document Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Document Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Invoice Template
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Payment Reminder
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Collection Notice
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Statement Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>INV-2024-001</span>
                    <Badge variant="outline">Sent</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Statement-Q1-2024</span>
                    <Badge variant="outline">Draft</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Collection-Notice-C001</span>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  <Button size="sm" className="w-full mt-2">View All Documents</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'crosscheck-validation':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">CrossCheck Lineage Validation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data Validation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Customer Data</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Invoice Data</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Payment Data</span>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GL Integration</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validation Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Records Validated</span>
                    <span className="font-semibold">15,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Errors Found</span>
                    <span className="font-semibold text-red-600">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-semibold text-green-600">99.85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Run</span>
                    <span className="font-semibold">2 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button size="sm" className="w-full">Run Validation</Button>
                  <Button size="sm" variant="outline" className="w-full">View Error Log</Button>
                  <Button size="sm" variant="outline" className="w-full">Export Report</Button>
                  <Button size="sm" variant="outline" className="w-full">Schedule Check</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-center py-8 text-muted-foreground">
          Select a tile to view its functionality
        </div>
      );
  }
}

// AR Tile System Component
function ARTileSystemContent() {
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: arStats } = useQuery({
    queryKey: ['/api/finance-enhanced/ar/statistics'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ar/statistics');
        if (!response.ok) return null;
        const data = await response.json();
        return data.data || data || null;
      } catch (error) {
        console.error('Error fetching AR statistics:', error);
        return null;
      }
    },
  });

  // Fetch AR open items for collections
  const { data: arOpenItems = [] } = useQuery({
    queryKey: ['/api/finance-enhanced/ar/open-items'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ar/open-items');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching AR open items:', error);
        return [];
      }
    },
  });

  // Fetch customer credit limits
  const { data: creditLimits = [], isLoading: isLoadingCreditLimits } = useQuery({
    queryKey: ['/api/finance-enhanced/ar/credit-limits'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ar/credit-limits');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching credit limits:', error);
        return [];
      }
    },
  });

  const arTiles = [
    {
      id: "payment-processing",
      title: "Payment Processing & Recording",
      icon: <CreditCard className="h-8 w-8 text-blue-600" />,
      description: "Process payments, record transactions, and manage payment methods",
      stats: arStats?.payments || { total: 0, pending: 0, completed: 0 },
      color: "blue"
    },
    {
      id: "collection-management", 
      title: "Collection Management",
      icon: <Users className="h-8 w-8 text-green-600" />,
      description: "Manage collections, dunning processes, and customer communications",
      stats: arStats?.collections || { active: 0, overdue: 0, resolved: 0 },
      color: "green"
    },
    {
      id: "credit-management",
      title: "Credit Management", 
      icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
      description: "Monitor credit limits, scoring, and customer creditworthiness",
      stats: arStats?.credit || { customers: 0, alerts: 0, limits: 0 },
      color: "purple"
    },
    {
      id: "advanced-reporting",
      title: "Advanced Reporting",
      icon: <FileText className="h-8 w-8 text-orange-600" />,
      description: "Generate comprehensive AR reports and analytics",
      stats: arStats?.reports || { generated: 0, scheduled: 0, alerts: 0 },
      color: "orange"
    },
    {
      id: "integration-workflows",
      title: "Integration Workflows",
      icon: <Database className="h-8 w-8 text-indigo-600" />,
      description: "Automate AR workflows and system integrations",
      stats: arStats?.workflows || { active: 0, completed: 0, failed: 0 },
      color: "indigo"
    },
    {
      id: "document-management",
      title: "Document Management", 
      icon: <FileText className="h-8 w-8 text-red-600" />,
      description: "Manage AR documents, templates, and communications",
      stats: arStats?.documents || { total: 0, pending: 0, sent: 0 },
      color: "red"
    },
    {
      id: "crosscheck-validation",
      title: "CrossCheck Lineage Validation",
      icon: <CheckCircle className="h-8 w-8 text-emerald-600" />,
      description: "Complete data lineage validation and integrity checks",
      stats: arStats?.validation || { passed: 0, failed: 0, warnings: 0 },
      color: "emerald"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {arTiles.map((tile) => (
          <Card key={tile.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedTile(tile.id)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                {tile.title}
              </CardTitle>
              {tile.icon}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                {tile.description}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold">{String(Object.values(tile.stats)[0] || 0)}</div>
                  <div className="text-muted-foreground">{String(Object.keys(tile.stats)[0] || '')}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{String(Object.values(tile.stats)[1] || 0)}</div>
                  <div className="text-muted-foreground">{String(Object.keys(tile.stats)[1] || '')}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{String(Object.values(tile.stats)[2] || 0)}</div>
                  <div className="text-muted-foreground">{String(Object.keys(tile.stats)[2] || '')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTile && (
        <div className="mt-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {arTiles.find(t => t.id === selectedTile)?.title} - Detailed View
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSelectedTile(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  switch (selectedTile) {
                    case 'payment-processing':
                      return (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Payment Processing & Recording</h3>
                          <p className="text-muted-foreground">Payment processing functionality is available in the main AR dashboard.</p>
                        </div>
                      );
                    case 'collection-management':
                      return (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Collection Management</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Active Collections</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {arOpenItems && arOpenItems.length > 0 ? (
                                  <div className="space-y-2 text-sm">
                                    {(arOpenItems as any[])
                                      .filter((item: any) => {
                                        const dueDate = item.due_date ? new Date(item.due_date) : null;
                                        const today = new Date();
                                        return dueDate && dueDate < today;
                                      })
                                      .slice(0, 5)
                                      .map((item: any) => {
                                        const dueDate = item.due_date ? new Date(item.due_date) : null;
                                        const today = new Date();
                                        const daysOverdue = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                        let colorClass = 'text-yellow-600';
                                        if (daysOverdue > 60) colorClass = 'text-red-600';
                                        else if (daysOverdue > 30) colorClass = 'text-orange-600';
                                        
                                        return (
                                          <div key={item.id} className="flex justify-between">
                                            <span className="truncate">{item.customer_name || `Customer ${item.customer_id}`}</span>
                                            <span className={`ml-2 whitespace-nowrap ${colorClass}`}>
                                              ${(item.outstanding_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({daysOverdue} days)
                                            </span>
                                          </div>
                                        );
                                      })}
                                    {(arOpenItems as any[]).filter((item: any) => {
                                      const dueDate = item.due_date ? new Date(item.due_date) : null;
                                      const today = new Date();
                                      return dueDate && dueDate < today;
                                    }).length === 0 && (
                                      <div className="text-center py-2 text-muted-foreground text-sm">No overdue items</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-muted-foreground text-sm">No collection data available</div>
                                )}
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Collection Actions</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <Button variant="outline" className="w-full text-left justify-start">
                                    Send Reminder Email
                                  </Button>
                                  <Button variant="outline" className="w-full text-left justify-start">
                                    Generate Dunning Letter
                                  </Button>
                                  <Button variant="outline" className="w-full text-left justify-start">
                                    Schedule Collection Call
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    case 'credit-management':
                      return (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Credit Management</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Credit Limits</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {isLoadingCreditLimits ? (
                                  <div className="text-center py-4 text-muted-foreground text-sm">Loading credit limits...</div>
                                ) : creditLimits && creditLimits.length > 0 ? (
                                  <div className="space-y-2 text-sm">
                                    {creditLimits.slice(0, 5).map((customer: any) => (
                                      <div key={customer.customer_id} className="flex justify-between">
                                        <span className="truncate">{customer.customer_name || customer.customer_code}</span>
                                        <span className="ml-2 whitespace-nowrap">
                                          ${(customer.credit_limit || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                                          {' '}(Used: ${(customer.used_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground text-sm">No credit limit data available</div>
                                )}
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Credit Actions</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <Button variant="outline" className="w-full text-left justify-start">
                                    Review Credit Limits
                                  </Button>
                                  <Button variant="outline" className="w-full text-left justify-start">
                                    Credit Check Report
                                  </Button>
                                  <Button variant="outline" className="w-full text-left justify-start">
                                    Update Credit Terms
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    default:
                      return (
                        <div className="text-center py-8">
                          <p>Detailed view for {selectedTile} is being developed.</p>
                        </div>
                      );
                  }
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function AccountsReceivable() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isManualInvoiceDialogOpen, setIsManualInvoiceDialogOpen] = useState(false);
  const [searchDocument, setSearchDocument] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState('overview');

  // Handle document query parameter from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const documentParam = urlParams.get('document');
      if (documentParam) {
        setSearchDocument(documentParam);
        setActiveTab('open-items'); // Switch to open-items tab
        toast({
          title: "Document Search",
          description: `Searching for document: ${documentParam}`,
        });
      }
    }
  }, [toast]);

  const { data: arData = [], isLoading, refetch: refetchARData } = useQuery({
    queryKey: ["/api/finance/accounts-receivable"],
    queryFn: async () => {
      const response = await fetch('/api/finance/accounts-receivable', {
        cache: 'no-store', // Prevent browser caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch AR data');
      const data = await response.json();
      // Ensure outstanding_amount is properly parsed for each invoice
      return Array.isArray(data) ? data.map((invoice: any) => ({
        ...invoice,
        outstanding_amount: invoice.outstanding_amount ? parseFloat(String(invoice.outstanding_amount)) : 0
      })) : [];
    },
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 0, // Don't cache data (gcTime replaces cacheTime in newer versions)
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: invoiceDetails } = useQuery({
    queryKey: [`/api/finance/accounts-receivable/${selectedInvoiceId}/details`],
    enabled: !!selectedInvoiceId,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Fetch AR statistics
  const { data: arStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/finance-enhanced/ar/statistics'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ar/statistics');
        if (!response.ok) return null;
        const data = await response.json();
        return data.data || data || null;
      } catch (error) {
        console.error('Error fetching AR statistics:', error);
        return null;
      }
    },
  });

  // Fetch AR open items
  const { data: arOpenItems, isLoading: isLoadingOpenItems } = useQuery({
    queryKey: ['/api/ar/open-items'],
    queryFn: async () => {
      const response = await fetch('/api/ar/open-items');
      if (!response.ok) throw new Error('Failed to fetch AR open items');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch AR aging report
  const { data: arAgingReport = [], isLoading: isLoadingAgingReport } = useQuery({
    queryKey: ['/api/finance-enhanced/ar/aging-report'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ar/aging-report');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching AR aging report:', error);
        return [];
      }
    },
  });

  // Fetch recent payments
  const { data: recentPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/ar/recent-payments'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ar/recent-payments');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching recent payments:', error);
        return [];
      }
    },
  });

  // Fetch collections data
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['/api/ar/collections'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ar/collections');
        if (!response.ok) return null;
        const data = await response.json();
        return data.data || data || null;
      } catch (error) {
        console.error('Error fetching collections data:', error);
        return null;
      }
    },
  });

  // Fetch customer credit limits
  const { data: creditLimits = [], isLoading: isLoadingCreditLimits } = useQuery({
    queryKey: ['/api/finance-enhanced/ar/credit-limits'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ar/credit-limits');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching credit limits:', error);
        return [];
      }
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await fetch('/api/finance-enhanced/ar/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      if (!response.ok) throw new Error('Failed to process payment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/open-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/ar/statistics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/ar/aging-report'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/recent-payments'] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/overdue-customers'] });
      toast({ title: "Success", description: "Customer payment processed successfully" });
      setIsPaymentDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process customer payment", variant: "destructive" });
    }
  });

  if (isLoading) {
    return <div className="p-6">Loading accounts receivable data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/finance')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Accounts Receivable (AR)</h1>
            <p className="text-sm text-muted-foreground">Manage customer invoices and payment collections</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refetchARData();
              queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts-receivable"] });
              toast({ title: "Refreshed", description: "AR data refreshed" });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setIsManualInvoiceDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* AR Navigation Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="invoices" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Invoices
              </TabsTrigger>
              <TabsTrigger 
                value="aging" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Aging Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Payments
              </TabsTrigger>
              <TabsTrigger 
                value="collections" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Collections
              </TabsTrigger>
              <TabsTrigger 
                value="open-items" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Open Items
              </TabsTrigger>
              <TabsTrigger 
                value="ar-tiles" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                AR Tile System
              </TabsTrigger>
              <TabsTrigger 
                value="clearing" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Clearing
              </TabsTrigger>
              <TabsTrigger 
                value="reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Reconciliation
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Overview Tab Content */}
          <TabsContent value="overview" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary KPI Cards */}
              <ARCard 
                title="Total Receivables" 
                value={`$${(arStats?.total_outstanding || 0).toLocaleString()}`}
                change={0} 
                isPositive={true}
                period=""
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              />
              <ARCard 
                title="Current (0-30 days)" 
                value={`$${(arStats?.current_amount || 0).toLocaleString()}`}
                change={0} 
                isPositive={true}
                period=""
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              />
              <ARCard 
                title="Over 90 Days" 
                value={`$${(arStats?.over_ninety_amount || 0).toLocaleString()}`}
                change={0} 
                isPositive={false}
                period=""
                icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
              />
            </div>
            
            {/* Aging Summary */}
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aging Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAgingReport ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Loading aging data...
                    </div>
                  ) : arStats ? (
                    <div className="h-[300px] space-y-6">
                      {/* Bar Chart Visualization */}
                      <div className="space-y-4">
                        {/* Current (0-30 days) */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Current (0-30 days)</span>
                            <span className="text-sm font-semibold text-green-600">
                              ${((arStats.current_amount || 0) / 1000).toFixed(1)}K
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className="bg-green-600 h-4 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(((arStats.current_amount || 0) / (arStats.total_outstanding || 1)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* 30-60 Days */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">30-60 Days</span>
                            <span className="text-sm font-semibold text-yellow-600">
                              ${((arStats.thirty_days_amount || 0) / 1000).toFixed(1)}K
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className="bg-yellow-600 h-4 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(((arStats.thirty_days_amount || 0) / (arStats.total_outstanding || 1)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* 60-90 Days */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">60-90 Days</span>
                            <span className="text-sm font-semibold text-orange-600">
                              ${((arStats.sixty_days_amount || 0) / 1000).toFixed(1)}K
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className="bg-orange-600 h-4 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(((arStats.sixty_days_amount || 0) / (arStats.total_outstanding || 1)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Over 90 Days */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Over 90 Days</span>
                            <span className="text-sm font-semibold text-red-600">
                              ${((arStats.over_ninety_amount || 0) / 1000).toFixed(1)}K
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className="bg-red-600 h-4 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(((arStats.over_ninety_amount || 0) / (arStats.total_outstanding || 1)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Summary Stats */}
                      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {arStats.open_items || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Open Items</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {arStats.partial_items || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Partial</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {arStats.cleared_items || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Cleared</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {arStats.total_open_items || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Items</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No aging data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Additional AR Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Outstanding Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAgingReport ? (
                    <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
                  ) : arAgingReport && arAgingReport.length > 0 ? (
                    <div className="space-y-4">
                      {arAgingReport.slice(0, 5).map((customer: any, index: number) => {
                        // Determine aging bucket based on amounts
                        let agingBucket = 'Current';
                        if (customer.over_ninety > 0) {
                          agingBucket = 'Over 90 days';
                        } else if (customer.sixty_days > 0) {
                          agingBucket = '60-90 days';
                        } else if (customer.thirty_days > 0) {
                          agingBucket = '30-60 days';
                        } else if (customer.current_balance > 0) {
                          agingBucket = 'Current';
                        }

                        return (
                          <ARCustomer 
                            key={customer.customer_code || index}
                            name={customer.customer_name || `Customer ${customer.customer_code || index}`}
                            balance={`$${(customer.total_outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            aging={agingBucket}
                            creditLimit="N/A"
                          />
                        );
                      })}
                      {arAgingReport.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No customer data available</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No customer data available</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Collections Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPayments ? (
                    <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
                  ) : recentPayments && Array.isArray(recentPayments) && recentPayments.length > 0 ? (
                    <div className="space-y-4">
                      {recentPayments.slice(0, 5).map((payment: any, index: number) => (
                        <CollectionActivity 
                          key={payment.id || index}
                          customer={payment.customer_name || `Customer ${payment.customer_id || ''}`}
                          activity={`Payment of $${(payment.amount || payment.payment_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} received`}
                          date={payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                          status={payment.status || 'Completed'}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No recent activity</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Invoices Tab Content */}
          <TabsContent value="invoices" className="p-4">
            {arData && arData.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Showing {arData.length} accounts receivable records
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Invoice Number</th>
                        <th className="text-left p-3 font-medium">Customer</th>
                        <th className="text-left p-3 font-medium">Invoice Date</th>
                        <th className="text-left p-3 font-medium">Due Date</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium w-24 bg-blue-100 border-2 border-blue-300">🔍 Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arData.map((invoice: any) => (
                        <tr key={invoice.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <span
                              className="text-blue-600 hover:text-blue-800 cursor-pointer hover:underline font-medium underline"
                              style={{ cursor: 'pointer', textDecoration: 'underline', color: '#2563eb' }}
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setShowInvoiceDetails(true);
                              }}
                            >
                              {invoice.invoice_number}
                            </span>
                          </td>
                          <td className="p-3">{invoice.customer_name || `Customer ${invoice.customer_id}`}</td>
                          <td className="p-3">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
                              {invoice.days_overdue > 0 && (
                                <span className="text-sm text-red-600 font-medium">
                                  {invoice.days_overdue} days overdue
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">${parseFloat(invoice.amount || 0).toLocaleString()}</span>
                              {invoice.outstanding_amount > 0 && (
                                <span className="text-sm text-orange-600">
                                  ${parseFloat(invoice.outstanding_amount || 0).toLocaleString()} outstanding
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {(() => {
                              // Determine actual status based on outstanding_amount (source of truth)
                              // If outstanding_amount > 0, invoice is definitely 'open'
                              // Only mark as 'paid' if outstanding_amount is 0 or null/undefined
                              const outstandingAmount = invoice.outstanding_amount ? parseFloat(invoice.outstanding_amount) : 0;
                              const actualStatus = outstandingAmount > 0 ? 'open' : 'paid';
                              
                              return (
                                <Badge 
                                  variant={actualStatus === 'paid' ? 'default' : 'secondary'}
                                  className={actualStatus === 'paid' ? 'bg-green-500' : invoice.days_overdue > 0 ? 'bg-red-500' : ''}
                                >
                                  {actualStatus}
                                </Badge>
                              );
                            })()}
                          </td>
                          <td className="p-3 text-center bg-blue-50">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-16 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setShowInvoiceDetails(true);
                              }}
                            >
                              ➡️
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No accounts receivable data available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="aging" className="p-4">
            <ARAgingAnalysis />
          </TabsContent>
          
          <TabsContent value="payments" className="p-4">
            <div className="space-y-6">
              {/* Payment Processing Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <div>Payment Processing Center</div>
                      <CardDescription className="mt-1">
                        Process customer payments and allocate to outstanding invoices
                      </CardDescription>
                    </div>
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Process Customer Payment</DialogTitle>
                        </DialogHeader>
                        <PaymentForm 
                          onSubmit={(data) => processPaymentMutation.mutate(data)}
                          openItems={arOpenItems || []}
                          isLoading={processPaymentMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Recent Payments Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>
                    View all customer payments processed in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPayments ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading payments...</span>
                    </div>
                  ) : recentPayments && recentPayments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Payment ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Invoice Number</TableHead>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentPayments.map((payment: any) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-sm">
                                {payment.id || 'N/A'}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {payment.customer_name || `Customer ${payment.customer_id || 'N/A'}`}
                                  </div>
                                  {payment.customer_id && (
                                    <div className="text-sm text-muted-foreground">
                                      ID: {payment.customer_id}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {payment.invoice_number || '-'}
                              </TableCell>
                              <TableCell>
                                {payment.payment_date 
                                  ? new Date(payment.payment_date).toLocaleDateString()
                                  : payment.created_at
                                  ? new Date(payment.created_at).toLocaleDateString()
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {payment.payment_method || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                ${parseFloat(payment.amount || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {payment.reference || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={payment.status === 'POSTED' || payment.status === 'confirmed' 
                                    ? 'default' 
                                    : 'secondary'}
                                  className={
                                    payment.status === 'POSTED' || payment.status === 'confirmed'
                                      ? 'bg-green-500'
                                      : ''
                                  }
                                >
                                  {payment.status || 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: View payment details
                                    toast({
                                      title: "Payment Details",
                                      description: `Payment ID: ${payment.id} - ${payment.customer_name}`,
                                    });
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-lg font-medium mb-2">No payments found</p>
                      <p className="text-sm mb-4">
                        No customer payments have been processed yet. Click "Process Payment" to record a new payment.
                      </p>
                      <Button 
                        onClick={() => setIsPaymentDialogOpen(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Process New Payment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Statistics */}
              {recentPayments && recentPayments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <CreditCard className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Payments</p>
                          <p className="text-2xl font-bold">
                            {recentPayments.length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${recentPayments.reduce((sum: number, p: any) => 
                              sum + parseFloat(p.amount || 0), 0
                            ).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <CheckCircle className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Confirmed</p>
                          <p className="text-2xl font-bold">
                            {recentPayments.filter((p: any) => 
                              p.status === 'POSTED' || p.status === 'confirmed'
                            ).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="open-items" className="p-4">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>AR Open Items</CardTitle>
                      <CardDescription>
                        Track all outstanding receivables linked to billing documents
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {searchDocument && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md">
                          <span className="text-sm text-blue-700">Searching: {searchDocument}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchDocument('');
                              window.history.replaceState({}, '', window.location.pathname);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/ar/open-items'] });
                          toast({ title: "Refreshed", description: "AR open items data refreshed" });
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingOpenItems ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading AR open items...</span>
                    </div>
                  ) : arOpenItems && Array.isArray(arOpenItems) && arOpenItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document #</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Billing Document</TableHead>
                            <TableHead>Posting Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Original Amount</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Aging</TableHead>
                            <TableHead>GL Account</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {arOpenItems
                            .filter((item: any) => {
                              if (!searchDocument) return true;
                              const searchLower = searchDocument.toLowerCase();
                              return (
                                item.document_number?.toLowerCase().includes(searchLower) ||
                                item.invoice_number?.toLowerCase().includes(searchLower) ||
                                item.billing_number?.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((item: any) => {
                            const isOverdue = item.due_date && new Date(item.due_date) < new Date();
                            const daysPastDue = item.due_date 
                              ? Math.floor((new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))
                              : 0;
                            
                            return (
                              <TableRow key={item.id} className={isOverdue ? 'bg-red-50' : ''}>
                                <TableCell className="font-mono text-sm">
                                  {item.document_number || '-'}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.invoice_number || '-'}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.customer_name || `Customer ${item.customer_id}`}</div>
                                    <div className="text-xs text-muted-foreground">ID: {item.customer_id}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {item.billing_number ? (
                                    <div>
                                      <div className="font-medium">{item.billing_number}</div>
                                      {item.billing_document_id && (
                                        <div className="text-xs text-muted-foreground">ID: {item.billing_document_id}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.posting_date 
                                    ? new Date(item.posting_date).toLocaleDateString()
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  <div className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                                    {item.due_date 
                                      ? new Date(item.due_date).toLocaleDateString()
                                      : '-'
                                    }
                                    {isOverdue && (
                                      <div className="text-xs text-red-500">{daysPastDue} days overdue</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {item.currency_code || 'USD'} {parseFloat(item.original_amount || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {item.currency_code || 'USD'} {parseFloat(item.outstanding_amount || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      item.status === 'Cleared' || item.status === 'cleared'
                                        ? 'default'
                                        : item.status === 'Partial' || item.status === 'partial'
                                        ? 'secondary'
                                        : 'outline'
                                    }
                                    className={
                                      item.status === 'Cleared' || item.status === 'cleared'
                                        ? 'bg-green-500'
                                        : item.status === 'Partial' || item.status === 'partial'
                                        ? 'bg-yellow-500'
                                        : ''
                                    }
                                  >
                                    {item.status || 'Open'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {item.aging_bucket ? (
                                    <Badge variant="outline">{item.aging_bucket}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.gl_account_number ? (
                                    <div>
                                      <div className="font-mono text-sm">{item.gl_account_number}</div>
                                      {item.gl_account_name && (
                                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                          {item.gl_account_name}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        toast({
                                          title: "AR Open Item Details",
                                          description: `Document: ${item.document_number}, Outstanding: ${item.currency_code || 'USD'} ${parseFloat(item.outstanding_amount || 0).toFixed(2)}`,
                                        });
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-lg font-medium mb-2">No AR open items found</p>
                      <p className="text-sm mb-4">
                        AR open items are automatically created when billing documents are posted to GL.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Post a billing document to see AR open items here.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Statistics */}
              {arOpenItems && Array.isArray(arOpenItems) && arOpenItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Open Items</p>
                          <p className="text-2xl font-bold">{arOpenItems.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Outstanding</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${arOpenItems.reduce((sum: number, item: any) => 
                              sum + parseFloat(item.outstanding_amount || 0), 0
                            ).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-sm text-gray-600">Overdue Items</p>
                          <p className="text-2xl font-bold text-red-600">
                            {arOpenItems.filter((item: any) => 
                              item.due_date && new Date(item.due_date) < new Date()
                            ).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <CheckCircle className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Open Status</p>
                          <p className="text-2xl font-bold">
                            {arOpenItems.filter((item: any) => 
                              item.status === 'Open' || item.status === 'open'
                            ).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="collections" className="p-4">
            <div className="space-y-6">
              {isLoadingCollections ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading collections data...</span>
                </div>
              ) : collectionsData ? (
                <>
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <AlertCircle className="h-8 w-8 text-red-600" />
                          <div>
                            <p className="text-sm text-gray-600">Total Overdue</p>
                            <p className="text-2xl font-bold text-red-600">
                              ${(collectionsData.statistics?.totalOverdue || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <FileText className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-sm text-gray-600">Overdue Invoices</p>
                            <p className="text-2xl font-bold">
                              {collectionsData.statistics?.overdueCount || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Clock className="h-8 w-8 text-yellow-600" />
                          <div>
                            <p className="text-sm text-gray-600">Collection Activities</p>
                            <p className="text-2xl font-bold">
                              {collectionsData.collectionActivities?.length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Users className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600">Top Customers</p>
                            <p className="text-2xl font-bold">
                              {collectionsData.topCustomers?.length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Aging Breakdown */}
                  {collectionsData.statistics && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Aging Breakdown</CardTitle>
                        <CardDescription>Overdue amounts by aging bucket</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-sm text-green-600 font-medium">Current</div>
                            <div className="text-lg font-bold text-green-700">
                              ${(collectionsData.statistics.current || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="text-sm text-yellow-600 font-medium">1-30 Days</div>
                            <div className="text-lg font-bold text-yellow-700">
                              ${(collectionsData.statistics.days_1_30 || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-sm text-orange-600 font-medium">31-60 Days</div>
                            <div className="text-lg font-bold text-orange-700">
                              ${(collectionsData.statistics.days_31_60 || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-sm text-red-600 font-medium">61-90 Days</div>
                            <div className="text-lg font-bold text-red-700">
                              ${(collectionsData.statistics.days_61_90 || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-red-100 rounded-lg">
                            <div className="text-sm text-red-700 font-medium">90+ Days</div>
                            <div className="text-lg font-bold text-red-800">
                              ${(collectionsData.statistics.days_over_90 || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top Customers by Overdue Amount */}
                  {collectionsData.topCustomers && collectionsData.topCustomers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Customers by Overdue Amount</CardTitle>
                        <CardDescription>Customers with highest outstanding balances</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {collectionsData.topCustomers.map((customer: any, index: number) => (
                            <div key={customer.customer_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{customer.customer_name || `Customer ${customer.customer_id}`}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {customer.customer_code || `ID: ${customer.customer_id}`} • {customer.invoice_count} invoice{customer.invoice_count !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-red-600">
                                  ${parseFloat(customer.total_overdue || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground">Overdue</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Overdue Invoices Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Overdue Invoices</CardTitle>
                      <CardDescription>All invoices with outstanding balances past due date</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {collectionsData.overdueInvoices && collectionsData.overdueInvoices.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Days Overdue</TableHead>
                                <TableHead>Aging Bucket</TableHead>
                                <TableHead className="text-right">Outstanding Amount</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {collectionsData.overdueInvoices.map((invoice: any) => (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-mono text-sm">
                                    {invoice.invoice_number || `INV-${invoice.id}`}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {invoice.customer_name || `Customer ${invoice.customer_id}`}
                                      </div>
                                      {invoice.customer_code && (
                                        <div className="text-sm text-muted-foreground">
                                          {invoice.customer_code}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {invoice.due_date 
                                      ? new Date(invoice.due_date).toLocaleDateString()
                                      : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={invoice.days_overdue > 90 ? 'destructive' : 'secondary'}>
                                      {invoice.days_overdue} days
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={
                                        invoice.aging_bucket === '90+ days' ? 'destructive' :
                                        invoice.aging_bucket === '61-90 days' ? 'destructive' :
                                        invoice.aging_bucket === '31-60 days' ? 'secondary' :
                                        'outline'
                                      }
                                    >
                                      {invoice.aging_bucket}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-red-600">
                                    ${parseFloat(invoice.outstanding_amount || 0).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedInvoiceId(invoice.id);
                                        setShowInvoiceDetails(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                          <p className="text-lg font-medium mb-2">No Overdue Invoices</p>
                          <p className="text-sm">All invoices are current or paid.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Collection Activities */}
                  {collectionsData.collectionActivities && collectionsData.collectionActivities.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Collection Activities</CardTitle>
                        <CardDescription>Recent collection actions and follow-ups</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {collectionsData.collectionActivities.slice(0, 10).map((activity: any) => (
                            <div key={activity.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{activity.activity_type || 'Activity'}</Badge>
                                  <span className="font-medium">{activity.customer_name || `Customer ${activity.customer_id}`}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{activity.notes || 'No description'}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {activity.activity_date 
                                      ? new Date(activity.activity_date).toLocaleDateString()
                                      : 'N/A'}
                                  </span>
                                  {activity.follow_up_date && (
                                    <span>
                                      Follow-up: {new Date(activity.follow_up_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {activity.outcome && (
                                    <Badge variant="outline" className="text-xs">
                                      {activity.outcome}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No Collections Data Available</p>
                  <p className="text-sm">Unable to load collections information.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* AR Tile System Tab Content */}
          <TabsContent value="clearing" className="p-4">
            <ARClearingManagement />
          </TabsContent>
          
          <TabsContent value="reconciliation" className="p-4">
            <ARReconciliation />
          </TabsContent>
          
          <TabsContent value="ar-tiles" className="p-4">
            <ARTileSystemContent />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Invoice Details - {(invoiceDetails as any)?.invoice_number || `Invoice ${selectedInvoiceId}`}
            </DialogTitle>
          </DialogHeader>
          
          {invoiceDetails ? (
            <div className="space-y-6">
              {/* Invoice Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Total Amount</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${parseFloat((invoiceDetails as any)?.invoice?.amount || (invoiceDetails as any)?.amount || 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Outstanding</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${parseFloat((invoiceDetails as any)?.invoice?.outstanding_amount || (invoiceDetails as any)?.outstanding_amount || 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Days Outstanding</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(invoiceDetails as any)?.aging_analysis?.days_overdue || (invoiceDetails as any)?.invoice?.days_overdue || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer & Invoice Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Customer Name:</span>
                      <div className="font-medium">{(invoiceDetails as any)?.invoice?.customer_name || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Customer ID:</span>
                      <div className="font-medium">{(invoiceDetails as any)?.invoice?.customer_id || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Credit Limit:</span>
                      <div className="font-medium">${parseFloat((invoiceDetails as any)?.invoice?.credit_limit || 0).toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Invoice Date:</span>
                      <div className="font-medium">{(invoiceDetails as any)?.invoice?.invoice_date ? new Date((invoiceDetails as any).invoice.invoice_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Due Date:</span>
                      <div className="font-medium">{(invoiceDetails as any)?.invoice?.due_date ? new Date((invoiceDetails as any).invoice.due_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Status:</span>
                      <div>
                        <Badge 
                          variant={(invoiceDetails as any)?.invoice?.status === 'paid' ? 'default' : (invoiceDetails as any)?.invoice?.status === 'open' ? 'secondary' : 'destructive'}
                          className={(invoiceDetails as any)?.invoice?.status === 'paid' ? 'bg-green-500' : (invoiceDetails as any)?.aging_analysis?.days_overdue > 30 ? 'bg-red-500' : ''}
                        >
                          {(invoiceDetails as any)?.invoice?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History */}
              {(invoiceDetails as any)?.payments && (invoiceDetails as any).payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Payment Date</th>
                            <th className="text-left p-3 font-medium">Payment Method</th>
                            <th className="text-right p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((invoiceDetails as any).payments as any[]).map((payment: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                              <td className="p-3">{payment.payment_method || 'Bank Transfer'}</td>
                              <td className="p-3 text-right font-medium">${parseFloat(payment.payment_amount || payment.amount || 0).toLocaleString()}</td>
                              <td className="p-3">{payment.payment_reference || payment.reference || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoice Line Items */}
              {(invoiceDetails as any)?.line_items && (invoiceDetails as any).line_items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Line Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Description</th>
                            <th className="text-right p-3 font-medium">Quantity</th>
                            <th className="text-right p-3 font-medium">Unit Price</th>
                            <th className="text-right p-3 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((invoiceDetails as any).line_items as any[]).map((item: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3">{item.description}</td>
                              <td className="p-3 text-right">{item.quantity}</td>
                              <td className="p-3 text-right">${parseFloat(item.unit_price).toLocaleString()}</td>
                              <td className="p-3 text-right font-medium">${parseFloat(item.line_amount || item.total_amount || (item.quantity * item.unit_price)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aging Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Aging Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Current (0-30 days)</div>
                      <div className="text-lg font-bold text-green-700">
                        ${(invoiceDetails as any)?.aging_analysis?.aging_bucket === 'Current' ? parseFloat((invoiceDetails as any)?.invoice?.outstanding_amount || 0).toLocaleString() : '0'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-yellow-600 font-medium">31-60 days</div>
                      <div className="text-lg font-bold text-yellow-700">
                        ${(invoiceDetails as any)?.aging_analysis?.aging_bucket === '31-60 days' ? parseFloat((invoiceDetails as any)?.invoice?.outstanding_amount || 0).toLocaleString() : '0'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-sm text-orange-600 font-medium">61-90 days</div>
                      <div className="text-lg font-bold text-orange-700">
                        ${(invoiceDetails as any)?.aging_analysis?.aging_bucket === '61-90 days' ? parseFloat((invoiceDetails as any)?.invoice?.outstanding_amount || 0).toLocaleString() : '0'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-sm text-red-600 font-medium">Over 90 days</div>
                      <div className="text-lg font-bold text-red-700">
                        ${(invoiceDetails as any)?.aging_analysis?.aging_bucket === '90+ days' ? parseFloat((invoiceDetails as any)?.invoice?.outstanding_amount || 0).toLocaleString() : '0'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Aging Status:</span>
                      <Badge variant={(invoiceDetails as any)?.aging_analysis?.is_overdue ? 'destructive' : 'secondary'}>
                        {(invoiceDetails as any)?.aging_analysis?.aging_bucket || 'Current'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium">Days Overdue:</span>
                      <span className={((invoiceDetails as any)?.aging_analysis?.days_overdue || 0) > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                        {(invoiceDetails as any)?.aging_analysis?.days_overdue || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invoice details...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Invoice Dialog */}
      <CreateManualInvoiceDialog
        open={isManualInvoiceDialogOpen}
        onOpenChange={setIsManualInvoiceDialogOpen}
      />
    </div>
  );
}

// Supporting components
type ARCardProps = {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  period: string;
  icon: React.ReactNode;
};

function ARCard({ title, value, change, isPositive, period, icon }: ARCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-1 text-xs mt-1">
          <span className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </span>
          <span className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? "+" : ""}{change}%
          </span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </CardContent>
    </Card>
  );
}

type ARCustomerProps = {
  name: string;
  balance: string;
  aging: string;
  creditLimit: string;
};

function ARCustomer({ name, balance, aging, creditLimit }: ARCustomerProps) {
  const isOverdue = aging !== "Current";
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">Credit limit: {creditLimit}</div>
      </div>
      <div className="text-right">
        <div className="font-medium">{balance}</div>
        <div className="text-xs">
          {isOverdue ? (
            <Badge variant="destructive" className="text-xs rounded-sm">{aging}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs rounded-sm">{aging}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

type CollectionActivityProps = {
  customer: string;
  activity: string;
  date: string;
  status: string;
};

function CollectionActivity({ customer, activity, date, status }: CollectionActivityProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{customer}</div>
        <div className="text-xs text-muted-foreground">{activity}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground">{date}</div>
        <div className="text-xs">
          <Badge 
            variant={status === "Completed" ? "default" : status === "Pending" ? "secondary" : "outline"} 
            className={`text-xs rounded-sm ${status === "Completed" ? "bg-green-500" : status === "Pending" ? "bg-amber-500" : ""}`}
          >
            {status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Payment Form Component
function PaymentForm({ onSubmit, openItems, isLoading }: any) {
  const [formData, setFormData] = useState({
    customer_id: '',
    payment_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_reference: '',
    payment_method_code: '',
    allocations: []
  });

  // Fetch all customers from API
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/master-data/customer'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/customer');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  // Fetch payment methods from API
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ['/api/ar/payment-methods'],
    queryFn: async () => {
      const response = await fetch('/api/ar/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      return response.json();
    },
  });

  const customerOpenItems = openItems.filter((item: any) => 
    item.customer_id === parseInt(formData.customer_id)
  );

  // Use customers from API, fallback to openItems if API fails
  const customers = customersData && customersData.length > 0
    ? customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        code: customer.code || customer.customer_code
      }))
    : Array.from(new Map(
        openItems.map((item: any) => [item.customer_id, {
          id: item.customer_id,
          name: item.customer_name,
          code: item.customer_code
        }])
      ).values());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer">Customer</Label>
          {isLoadingCustomers ? (
            <div className="w-full p-2 border rounded-md bg-gray-50 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading customers...</span>
            </div>
          ) : (
            <select 
              className="w-full p-2 border rounded-md"
              value={formData.customer_id}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
            >
              <option value="">Select Customer</option>
              {customers.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.code || `CUST-${customer.id}`})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Label htmlFor="payment_method">Payment Method</Label>
          {isLoadingPaymentMethods ? (
            <div className="w-full p-2 border rounded-md bg-gray-50 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading methods...</span>
            </div>
          ) : (
            <select 
              className="w-full p-2 border rounded-md"
              value={formData.payment_method_code}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_method_code: e.target.value }))}
            >
              <option value="">Select Payment Method</option>
              {paymentMethods && paymentMethods.map((method: any) => (
                <option key={method.id || method.method_code} value={method.method_code || method.id}>
                  {method.method_name || method.name || method.method_code}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Label htmlFor="payment_amount">Payment Amount</Label>
          <Input
            id="payment_amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.payment_amount || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="payment_date">Payment Date</Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="payment_reference">Reference</Label>
          <Input
            id="payment_reference"
            value={formData.payment_reference}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
            placeholder="Check #, Wire ref, etc."
          />
        </div>
      </div>

      {formData.customer_id && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Outstanding Invoices</h3>
          <div className="space-y-2">
            {customerOpenItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Invoice #{item.invoice_number}</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(item.due_date).toLocaleDateString()} • 
                    Outstanding: ${item.outstanding_amount}
                  </div>
                </div>
                <Badge variant={item.aging_bucket === 'Current' ? 'default' : 'destructive'}>
                  {item.aging_bucket}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={() => onSubmit({
            ...formData,
            payment_method_code: formData.payment_method_code || 'CASH',
            allocations: customerOpenItems.length > 0 
              ? customerOpenItems.map((item: any) => ({
                  invoice_id: item.id,
                  amount: Math.min(formData.payment_amount, parseFloat(item.outstanding_amount || item.amount || 0))
                }))
              : []
          })} 
          disabled={isLoading || !formData.customer_id || !formData.payment_amount || formData.payment_amount <= 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Process Payment'
          )}
        </Button>
      </div>
    </div>
  );
}