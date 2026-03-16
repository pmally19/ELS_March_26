import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Calendar,
  ArrowLeft,
  RefreshCw,
  Eye,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VendorPaymentProcessing from "./VendorPaymentProcessing";
import { CreateManualVendorInvoiceDialog } from "@/components/finance/CreateManualVendorInvoiceDialog";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AccountsPayable() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchDocument, setSearchDocument] = useState<string>('');
  const [isManualInvoiceDialogOpen, setIsManualInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  // Fetch AP statistics
  const { data: apStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/ap/statistics'],
    queryFn: async () => {
      const response = await apiRequest('/api/ap/statistics');
      return await response.json();
    },
  });

  // Fetch AP open items for upcoming payments
  const { data: apOpenItems, isLoading: isLoadingOpenItems, refetch: refetchAPOpenItems } = useQuery({
    queryKey: ['/api/finance-enhanced/ap/open-items'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance-enhanced/ap/open-items');
        return await response.json();
      } catch (error) {
        console.error('Error fetching AP open items:', error);
        return [];
      }
    },
  });

  // Fetch top vendors
  const { data: topVendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['/api/ap/vendors/top'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ap/vendors/top');
        return await response.json();
      } catch (error) {
        console.error('Error fetching top vendors:', error);
        return [];
      }
    },
    enabled: activeTab === "overview",
  });

  // Calculate totals
  const totalPayables = apStats?.total_outstanding || 0;
  const billsDueThisWeek = apOpenItems?.filter((item: any) => {
    const dueDate = new Date(item.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow;
  }).reduce((sum: number, item: any) => sum + (item.outstanding_amount || 0), 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            <h1 className="text-2xl font-bold">Accounts Payable (AP)</h1>
            <p className="text-sm text-muted-foreground">Manage vendor invoices and payment processing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refetchAPOpenItems();
              toast({ title: "Refreshed", description: "AP data refreshed" });
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
            New Bill
          </Button>
        </div>
      </div>

      {/* AP Navigation Tabs */}
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
                value="bills" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Bills
              </TabsTrigger>
              <TabsTrigger 
                value="vendors" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Vendors
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Payments
              </TabsTrigger>
              <TabsTrigger 
                value="open-items" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Open Items
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Reports
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Overview Tab Content */}
          <TabsContent value="overview" className="p-4">
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading AP statistics...</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Summary KPI Cards */}
                  <APCard 
                    title="Total Payables" 
                    value={formatCurrency(totalPayables)} 
                    change={0} 
                    isPositive={false}
                    period="current outstanding"
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                  />
                  <APCard 
                    title="Bills Due This Week" 
                    value={formatCurrency(billsDueThisWeek)} 
                    change={0} 
                    isPositive={false}
                    period="due in 7 days"
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                  />
                  <APCard 
                    title="Open Items" 
                    value={apStats?.total_open_items || 0} 
                    change={0} 
                    isPositive={true}
                    period="total open invoices"
                    icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
                
                {/* Bills by Due Date */}
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bills by Due Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingOpenItems ? (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Loading bills data...
                        </div>
                      ) : apOpenItems && apOpenItems.length > 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Chart visualization would appear here
                        </div>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No bills data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Additional AP Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Vendors by Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingVendors ? (
                        <div className="text-center py-4 text-muted-foreground">Loading vendors...</div>
                      ) : topVendors && topVendors.length > 0 ? (
                        <div className="space-y-4">
                          {topVendors.slice(0, 3).map((vendor: any, index: number) => (
                            <APVendor 
                              key={index}
                              name={vendor.vendor_name || vendor.name || 'Unknown Vendor'}
                              spend={formatCurrency(vendor.total_spend || vendor.spend || 0)}
                              outstanding={formatCurrency(vendor.outstanding_amount || vendor.outstanding || 0)}
                              paymentTerms={vendor.payment_terms || vendor.terms || 'N/A'}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">No vendor data available</div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingOpenItems ? (
                        <div className="text-center py-4 text-muted-foreground">Loading payments...</div>
                      ) : apOpenItems && apOpenItems.length > 0 ? (
                        <div className="space-y-4">
                          {apOpenItems
                            .filter((item: any) => {
                              const dueDate = new Date(item.due_date);
                              const today = new Date();
                              const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                              return dueDate >= today && dueDate <= monthFromNow;
                            })
                            .slice(0, 3)
                            .map((item: any, index: number) => {
                              const dueDate = new Date(item.due_date);
                              const today = new Date();
                              const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              let status = "Scheduled";
                              if (daysUntilDue <= 7) status = "Due Soon";
                              if (daysUntilDue < 0) status = "Overdue";
                              
                              return (
                                <UpcomingPayment 
                                  key={index}
                                  vendor={item.vendor_name || item.vendor_code || 'Unknown Vendor'}
                                  amount={formatCurrency(item.outstanding_amount || 0)}
                                  dueDate={formatDate(item.due_date)}
                                  status={status}
                                />
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">No upcoming payments</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Other tabs content */}
          <TabsContent value="bills" className="p-4">
            <div className="text-center py-8 text-muted-foreground">
              Bills management interface would appear here
            </div>
          </TabsContent>
          
          <TabsContent value="vendors" className="p-4">
            <div className="text-center py-8 text-muted-foreground">
              Vendor management interface would appear here
            </div>
          </TabsContent>
          
          <TabsContent value="payments" className="p-4">
            <VendorPaymentProcessing />
          </TabsContent>
          
          <TabsContent value="open-items" className="p-4">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>AP Open Items</CardTitle>
                      <CardDescription>
                        Track all outstanding payables linked to vendor invoices
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
                          refetchAPOpenItems();
                          toast({ title: "Refreshed", description: "AP open items data refreshed" });
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
                      <span className="ml-2 text-muted-foreground">Loading AP open items...</span>
                    </div>
                  ) : apOpenItems && Array.isArray(apOpenItems) && apOpenItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document #</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Vendor</TableHead>
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
                          {apOpenItems
                            .filter((item: any) => {
                              if (!searchDocument) return true;
                              const searchLower = searchDocument.toLowerCase();
                              return (
                                item.document_number?.toLowerCase().includes(searchLower) ||
                                item.invoice_number?.toLowerCase().includes(searchLower) ||
                                item.documentNumber?.toLowerCase().includes(searchLower) ||
                                item.invoiceNumber?.toLowerCase().includes(searchLower)
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
                                    {item.document_number || item.documentNumber || '-'}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {item.invoice_number || item.invoiceNumber || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{item.vendor_name || `Vendor ${item.vendor_id || item.vendorId || 'N/A'}`}</div>
                                      {item.vendor_code && (
                                        <div className="text-xs text-muted-foreground">Code: {item.vendor_code}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {item.posting_date || item.postingDate
                                      ? new Date(item.posting_date || item.postingDate).toLocaleDateString()
                                      : '-'
                                    }
                                  </TableCell>
                                  <TableCell>
                                    <div className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                                      {item.due_date || item.dueDate
                                        ? new Date(item.due_date || item.dueDate).toLocaleDateString()
                                        : '-'
                                      }
                                      {isOverdue && (
                                        <div className="text-xs text-red-500">{daysPastDue} days overdue</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ${parseFloat(item.original_amount || item.originalAmount || 0).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    ${parseFloat(item.outstanding_amount || item.outstandingAmount || 0).toLocaleString('en-US', {
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
                                    {item.aging_bucket || item.agingBucket ? (
                                      <Badge variant="outline">{item.aging_bucket || item.agingBucket}</Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.gl_account_name ? (
                                      <div>
                                        <div className="font-mono text-sm">{item.gl_account_number || item.glAccountNumber || '-'}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                          {item.gl_account_name}
                                        </div>
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
                                            title: "AP Open Item Details",
                                            description: `Document: ${item.document_number || item.documentNumber}, Outstanding: $${parseFloat(item.outstanding_amount || item.outstandingAmount || 0).toFixed(2)}`,
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
                      <p className="text-lg font-medium mb-2">No AP open items found</p>
                      <p className="text-sm mb-4">
                        AP open items are automatically created when vendor invoices are posted to GL.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Post a vendor invoice to see AP open items here.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Statistics */}
              {apOpenItems && Array.isArray(apOpenItems) && apOpenItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Open Items</p>
                          <p className="text-2xl font-bold">{apOpenItems.length}</p>
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
                            ${apOpenItems.reduce((sum: number, item: any) => 
                              sum + parseFloat(item.outstanding_amount || item.outstandingAmount || 0), 0
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
                        <Clock className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-sm text-gray-600">Overdue Items</p>
                          <p className="text-2xl font-bold text-red-600">
                            {apOpenItems.filter((item: any) => 
                              (item.due_date || item.dueDate) && new Date(item.due_date || item.dueDate) < new Date()
                            ).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <DollarSign className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Open Status</p>
                          <p className="text-2xl font-bold">
                            {apOpenItems.filter((item: any) => 
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
          
          <TabsContent value="reports" className="p-4">
            <div className="text-center py-8 text-muted-foreground">
              AP reports and analytics would appear here
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Manual Vendor Invoice Dialog */}
      <CreateManualVendorInvoiceDialog
        open={isManualInvoiceDialogOpen}
        onOpenChange={setIsManualInvoiceDialogOpen}
      />
    </div>
  );
}

// Supporting components
type APCardProps = {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  period: string;
  icon: React.ReactNode;
};

function APCard({ title, value, change, isPositive, period, icon }: APCardProps) {
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

type APVendorProps = {
  name: string;
  spend: string;
  outstanding: string;
  paymentTerms: string;
};

function APVendor({ name, spend, outstanding, paymentTerms }: APVendorProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">Terms: {paymentTerms}</div>
      </div>
      <div className="text-right">
        <div className="font-medium">{spend}</div>
        <div className="text-xs text-muted-foreground">Outstanding: {outstanding}</div>
      </div>
    </div>
  );
}

type UpcomingPaymentProps = {
  vendor: string;
  amount: string;
  dueDate: string;
  status: string;
};

function UpcomingPayment({ vendor, amount, dueDate, status }: UpcomingPaymentProps) {
  // Status is now handled via className directly
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{vendor}</div>
        <div className="text-xs text-muted-foreground">{dueDate}</div>
      </div>
      <div className="text-right">
        <div className="font-medium">{amount}</div>
        <Badge 
          variant="outline"
          className={`text-xs rounded-sm ${
            status === "Due Soon" ? "bg-amber-500 text-white" : 
            status === "Scheduled" ? "bg-green-500 text-white" : 
            status === "Overdue" ? "bg-red-500 text-white" : ""
          }`}
        >
          {status}
        </Badge>
      </div>
    </div>
  );
}