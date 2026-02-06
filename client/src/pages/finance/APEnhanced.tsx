import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, DollarSign, Clock, AlertTriangle, FileText, CreditCard, TrendingDown, Users, Database, CheckCircle, Truck, ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateManualVendorInvoiceDialog } from "@/components/finance/CreateManualVendorInvoiceDialog";

// AP Tile System Component
function APTileSystemContent() {
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  const { data: apStats } = useQuery({
    queryKey: ['/api/finance-enhanced/ap/statistics'],
  });

  const apTiles = [
    {
      id: "vendor-management",
      title: "Enhanced Vendor Management",
      icon: <Building className="h-8 w-8 text-blue-600" />,
      description: "Comprehensive vendor master data, blocking controls, and change tracking",
      stats: apStats?.vendor_management || { vendors: 0, blocked: 0, changes: 0 },
      color: "blue"
    },
    {
      id: "document-parking", 
      title: "Document Parking",
      icon: <FileText className="h-8 w-8 text-green-600" />,
      description: "Save incomplete invoices with line item management and workflow approval",
      stats: apStats?.document_parking || { parked: 0, pending: 0, approved: 0 },
      color: "green"
    },
    {
      id: "payment-management",
      title: "Advanced Payment Management", 
      icon: <CreditCard className="h-8 w-8 text-purple-600" />,
      description: "Down payments, installment plans, complex payment scenarios",
      stats: apStats?.payment_management || { downpayments: 0, installments: 0, scheduled: 0 },
      color: "purple"
    },
    {
      id: "purchase-integration",
      title: "Purchase Order Integration",
      icon: <Truck className="h-8 w-8 text-orange-600" />,
      description: "Three-way matching, goods receipt verification, service entry sheets",
      stats: apStats?.purchase_integration || { matched: 0, pending: 0, exceptions: 0 },
      color: "orange"
    },
    {
      id: "workflow-automation",
      title: "Workflow Automation",
      icon: <Database className="h-8 w-8 text-indigo-600" />,
      description: "Automated AP workflows, approval routing, and process optimization",
      stats: apStats?.workflow_automation || { active: 0, completed: 0, failed: 0 },
      color: "indigo"
    },
    {
      id: "vendor-analytics",
      title: "Vendor Analytics & Reporting", 
      icon: <Users className="h-8 w-8 text-red-600" />,
      description: "Advanced vendor performance analytics and comprehensive reporting",
      stats: apStats?.vendor_analytics || { reports: 0, analytics: 0, scorecards: 0 },
      color: "red"
    },
    {
      id: "compliance-validation",
      title: "Compliance & Validation",
      icon: <CheckCircle className="h-8 w-8 text-emerald-600" />,
      description: "Regulatory compliance checks, data validation, and audit trails",
      stats: apStats?.compliance || { compliant: 0, violations: 0, audits: 0 },
      color: "emerald"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apTiles.map((tile) => (
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
                  <div className="font-semibold">{Object.values(tile.stats)[0]}</div>
                  <div className="text-muted-foreground">{Object.keys(tile.stats)[0]}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Object.values(tile.stats)[1]}</div>
                  <div className="text-muted-foreground">{Object.keys(tile.stats)[1]}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Object.values(tile.stats)[2]}</div>
                  <div className="text-muted-foreground">{Object.keys(tile.stats)[2]}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTile && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {apTiles.find(t => t.id === selectedTile)?.title} - Detailed View
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setSelectedTile(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              {apTiles.find(t => t.id === selectedTile)?.title} functionality would be implemented here with full business logic.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function APEnhanced() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isManualInvoiceDialogOpen, setIsManualInvoiceDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Accounts Payable Enhanced - MallyERP";
  }, []);

  // Fetch AP statistics
  const { data: apStats } = useQuery({
    queryKey: ['/api/finance-enhanced/ap/statistics'],
    queryFn: async () => {
      const response = await fetch('/api/finance-enhanced/ap/statistics');
      if (!response.ok) return {};
      const data = await response.json();
      return data.data || data || {};
    },
  });

  // Fetch AP open items
  const { data: apOpenItems = [], isLoading: isLoadingOpenItems } = useQuery({
    queryKey: ['/api/finance-enhanced/ap/open-items'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ap/open-items');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching AP open items:', error);
        return [];
      }
    },
  });

  // Fetch AP aging report
  const { data: apAgingReport = [] } = useQuery({
    queryKey: ['/api/finance-enhanced/ap/aging-report'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/finance-enhanced/ap/aging-report');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error('Error fetching AP aging report:', error);
        return [];
      }
    },
  });

  const StatCard = ({ title, value, icon: Icon, badge, color = "default" }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value || 0}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            {badge && (
              <Badge variant={color === "danger" ? "destructive" : "secondary"}>
                {badge}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getAgingColor = (bucket: string) => {
    switch (bucket) {
      case 'Current': return 'text-green-600';
      case '30Days': return 'text-yellow-600';
      case '60Days': return 'text-orange-600';
      case 'Over90': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open': return <Badge variant="destructive">Open</Badge>;
      case 'Partial': return <Badge variant="outline">Partial</Badge>;
      case 'Cleared': return <Badge variant="default">Cleared</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Accounts Payable Enhanced</h1>
            <p className="text-muted-foreground">Vendor invoice tracking, payment processing, and cash flow management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsManualInvoiceDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Bill
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <FileText className="h-4 w-4 mr-2" />
            Payment Run
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Payables"
          value={`$${((apStats as any)?.total_outstanding || 0).toLocaleString()}`}
          icon={DollarSign}
          badge={`${(apStats as any)?.total_open_items || 0} Items`}
          color="default"
        />
        <StatCard
          title="Current (0-30 days)"
          value={`$${((apStats as any)?.current_amount || 0).toLocaleString()}`}
          icon={Clock}
          badge="Due Soon"
          color="default"
        />
        <StatCard
          title="30-60 Days"
          value={`$${((apStats as any)?.thirty_days_amount || 0).toLocaleString()}`}
          icon={AlertTriangle}
          badge="Overdue"
          color="warning"
        />
        <StatCard
          title="Over 90 Days"
          value={`$${((apStats as any)?.over_ninety_amount || 0).toLocaleString()}`}
          icon={TrendingDown}
          badge="Critical"
          color="danger"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="open-items">Open Items</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="payments">Payment Processing</TabsTrigger>
          <TabsTrigger value="ap-tiles">AP Tiles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Priority */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Payment Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current (0-30 days)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(((apStats as any)?.current_amount || 0) / ((apStats as any)?.total_outstanding || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        ${((apStats as any)?.current_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>30-60 Days</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(((apStats as any)?.thirty_days_amount || 0) / ((apStats as any)?.total_outstanding || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        ${((apStats as any)?.thirty_days_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>60-90 Days</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(((apStats as any)?.sixty_days_amount || 0) / ((apStats as any)?.total_outstanding || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        ${((apStats as any)?.sixty_days_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Over 90 Days</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(((apStats as any)?.over_ninety_amount || 0) / ((apStats as any)?.total_outstanding || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        ${((apStats as any)?.over_ninety_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Open Items:</span>
                    <Badge variant="destructive">{(apStats as any)?.open_items || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Partial Payments:</span>
                    <Badge variant="outline">{(apStats as any)?.partial_items || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cleared Items:</span>
                    <Badge variant="default">{(apStats as any)?.cleared_items || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Rate:</span>
                    <Badge variant="secondary">
                      {(apStats as any)?.total_open_items ? 
                        Math.round(((apStats as any).cleared_items / (apStats as any).total_open_items) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="open-items" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Open Payables</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOpenItems ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                          Loading open items...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !apOpenItems || (Array.isArray(apOpenItems) && apOpenItems.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No open payables found
                      </TableCell>
                    </TableRow>
                  ) : (
                    (Array.isArray(apOpenItems) ? apOpenItems : []).map((item: any) => (
                      <TableRow key={item.id || `${item.invoice_number}-${item.vendor_id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.vendor_name || 'Unknown Vendor'}</div>
                            <div className="text-sm text-muted-foreground">{item.vendor_code || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{item.invoice_number || item.document_number || '-'}</TableCell>
                        <TableCell>
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>${Number(item.original_amount || item.net_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">${Number(item.outstanding_amount || item.original_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getAgingColor(item.aging_bucket || 'Current')}
                          >
                            {item.aging_bucket || 'Current'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status || 'Open')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Aging Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>30 Days</TableHead>
                    <TableHead>60 Days</TableHead>
                    <TableHead>Over 90</TableHead>
                    <TableHead>Total Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!apAgingReport || (Array.isArray(apAgingReport) && apAgingReport.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No aging data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    (Array.isArray(apAgingReport) ? apAgingReport : []).map((vendor: any, index: number) => (
                      <TableRow key={vendor.vendor_code || vendor.vendor_name || index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vendor.vendor_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{vendor.vendor_code || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-green-600">${Number(vendor.current_balance || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-yellow-600">${Number(vendor.thirty_days || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-orange-600">${Number(vendor.sixty_days || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">${Number(vendor.over_ninety || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">${Number(vendor.total_outstanding || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing Center</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Payment Run Processing</h3>
                <p className="text-muted-foreground mb-4">
                  Execute vendor payments and manage cash flow
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Payment Run
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Payments
                  </Button>
                  <Button variant="outline" className="w-full">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Priority Payments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AP Tile System Tab Content */}
        <TabsContent value="ap-tiles" className="p-4">
          <APTileSystemContent />
        </TabsContent>
      </Tabs>

      {/* Manual Vendor Invoice Dialog */}
      <CreateManualVendorInvoiceDialog
        open={isManualInvoiceDialogOpen}
        onOpenChange={setIsManualInvoiceDialogOpen}
      />
    </div>
  );
}