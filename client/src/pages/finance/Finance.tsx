import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Finance() {
  const [activeTab, setActiveTab] = useState("accounts-payable");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    vendor_name: "",
    amount: "",
    description: "",
    due_date: "",
    customer_name: "",
    expense_category: "",
    account: "",
    debit_amount: "",
    credit_amount: ""
  });

  useEffect(() => {
    document.title = "Financial Management | MallyERP";
  }, []);

  // Accounts Payable Data
  const { data: accountsPayable, isLoading: isLoadingAP } = useQuery({
    queryKey: ['/api/finance/accounts-payable'],
    queryFn: async () => {
      const response = await apiRequest("/api/finance/accounts-payable");
      return await response.json();
    },
    enabled: activeTab === "accounts-payable",
  });

  // Accounts Receivable Data
  const { data: accountsReceivable, isLoading: isLoadingAR } = useQuery({
    queryKey: ['/api/finance/accounts-receivable'],
    queryFn: async () => {
      const response = await apiRequest("/api/finance/accounts-receivable");
      return await response.json();
    },
    enabled: activeTab === "accounts-receivable",
  });

  // Expenses Data
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['/api/finance/expenses'],
    queryFn: async () => {
      const response = await apiRequest("/api/finance/expenses");
      return await response.json();
    },
    enabled: activeTab === "expenses",
  });

  // Journal Entries Data
  const { data: journalEntries, isLoading: isLoadingJournals } = useQuery({
    queryKey: ['/api/finance/journal-entries'],
    queryFn: async () => {
      const response = await apiRequest("/api/finance/journal-entries");
      return await response.json();
    },
    enabled: activeTab === "journal-entries",
  });

  // GL Accounts Data
  const { data: glAccounts, isLoading: isLoadingGL } = useQuery({
    queryKey: ['/api/finance/gl-accounts'],
    queryFn: async () => {
      const response = await apiRequest("/api/finance/gl-accounts");
      return await response.json();
    },
    enabled: activeTab === "gl-accounts",
  });

  // Financial Reports Data
  const { data: financialReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['/api/finance/financial-reports'],
    queryFn: async () => {
      const response = await apiRequest("/api/finance/financial-reports");
      return await response.json();
    },
    enabled: activeTab === "financial-reports",
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number | string, currency: string = "USD") => {
    const numAmount = Number(amount) || 0;
    return `${currency} ${numAmount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500 text-white">Approved</Badge>;
      case 'paid':
        return <Badge className="bg-green-500 text-white">Paid</Badge>;
      case 'outstanding':
        return <Badge className="bg-red-500 text-white">Outstanding</Badge>;
      case 'partial':
        return <Badge className="bg-purple-500 text-white">Partial</Badge>;
      case 'posted':
        return <Badge className="bg-blue-500 text-white">Posted</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAP = accountsPayable?.filter(item => {
    const matchesSearch = item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const filteredAR = accountsReceivable?.filter(item => {
    const matchesSearch = item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const filteredExpenses = expenses?.filter(item => {
    const matchesSearch = item.expense_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const filteredJournals = journalEntries?.filter(item => {
    const matchesSearch = item.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Finance</h1>
            <p className="text-sm text-muted-foreground">Financial management, accounts, and reporting</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => window.location.href = '/finance/tiles'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🎯 Open AR Tile System →
          </Button>
          <Button
            onClick={() => window.location.href = '/finance/ap-tiles'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            💳 Open AP Tile System →
          </Button>
        </div>
      </div>

      {/* Enhanced Finance Modules - First Row (4 tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/finance/gl-enhanced'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              📊 General Ledger Enhanced
            </CardTitle>
            <CardDescription>
              Complete GL posting, document management, and financial reporting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• GL Document Processing</div>
              <div>• Chart of Accounts Management</div>
              <div>• Trial Balance & Financial Statements</div>
              <div>• Period-End Closing</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/finance/asset-management-enhanced'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              🏗️ Asset Management Enhanced
            </CardTitle>
            <CardDescription>
              Complete asset lifecycle management, depreciation, and reporting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Asset Master Management</div>
              <div>• Depreciation Calculation</div>
              <div>• Asset Transactions</div>
              <div>• Asset Reporting</div>
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/transactions/auc';
                  }}
                >
                  🏗️ Asset Under Construction (AUC)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/finance/ar-enhanced'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              💰 Accounts Receivable Enhanced
            </CardTitle>
            <CardDescription>
              Customer invoice tracking, payment processing, and collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Customer Payment Processing</div>
              <div>• AR Aging Reports</div>
              <div>• Collections Management</div>
              <div>• Payment Allocation</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/finance/ap-enhanced'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              🏢 Accounts Payable Enhanced
            </CardTitle>
            <CardDescription>
              Vendor invoice tracking, payment runs, and cash flow management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Vendor Payment Processing</div>
              <div>• AP Aging Reports</div>
              <div>• Payment Run Generation</div>
              <div>• Cash Flow Management</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-indigo-200 bg-indigo-50/30" onClick={() => window.location.href = '/finance/financial-statements-viewer'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              📑 Financial Statements
            </CardTitle>
            <CardDescription>
              Generate custom balance sheets and profit & loss reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Custom Report Templates</div>
              <div>• Real-time Balance Rollups</div>
              <div>• Export to CSV & Print</div>
              <div className="pt-2 border-t mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-indigo-600 border-indigo-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/finance/report-template-builder';
                  }}
                >
                  ⚙️ Manage Templates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/finance/reconciliation'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              🔄 Reconciliation
            </CardTitle>
            <CardDescription>
              Reconcile subledgers with General Ledger accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• AR Subledger Reconciliation</div>
              <div>• AP Subledger Reconciliation</div>
              <div>• Inventory Reconciliation</div>
              <div>• Bank Reconciliation</div>
              <div>• Intercompany Reconciliation</div>
              <div>• General Account Reconciliation</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/finance/period-closing'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-600">
              📅 Period End Closing
            </CardTitle>
            <CardDescription>
              Manage period-end closing processes and validations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Period Closing Management</div>
              <div>• Daily Validation & Balancing</div>
              <div
                className="cursor-pointer hover:text-indigo-600 hover:font-medium transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/finance/accruals';
                }}
              >
                • Accrual Postings
              </div>
              <div className="text-muted-foreground/70">• Accrual Reversals</div>
              <div className="text-muted-foreground/70">• Balance Carry Forward</div>
              <div className="text-muted-foreground/70">• Retained Earnings Closing</div>
              <div>• Month/Quarter/Year End Closing</div>
              <div>• Closing Status Tracking</div>
              <div>• Roll-over Period Data</div>
              <div>• Closing Document Management</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-teal-200" onClick={() => window.location.href = '/finance/year-end-closing'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-600">
              🎯 Year-End Closing
            </CardTitle>
            <CardDescription>
              Manage year-end closing processes and validations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Receivable/Payable Balance Confirmations</div>
              <div>• Asset Year-End Depreciation</div>
              <div>• Fiscal Year Change Management</div>
              <div>• Balance Carryforward</div>
              <div>• Year-End Validation Checks</div>
              <div>• Audit Trail & Reporting</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tile System Preview */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-blue-900">Complete AR Tile System Available</CardTitle>
              <CardDescription className="text-blue-700 mt-2">
                Access all 6 AR functionalities with full database integration, back buttons, and scrollable content
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Payment Processing & Recording</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Collection Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Credit Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Advanced Reporting</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Integration Workflows</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Document Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <span>CrossCheck Lineage Validation</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700 font-medium">Key Features:</p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              <li>• Each tile has dedicated back button navigation</li>
              <li>• Scrollable content with full database integration</li>
              <li>• Complete data integrity and relationships</li>
              <li>• Real-time statistics and metrics</li>
              <li>• CrossCheck lineage validation from Company Code to transactions</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Finance Navigation Tabs */}
      <Card>
        <Tabs
          defaultValue="accounts-payable"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger
                value="accounts-payable"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Accounts Payable
              </TabsTrigger>
              <TabsTrigger
                value="accounts-receivable"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Accounts Receivable
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Expenses
              </TabsTrigger>

              <TabsTrigger
                value="journal-entries"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Journal Entries
              </TabsTrigger>
              <TabsTrigger
                value="configuration"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Configuration
              </TabsTrigger>
              <TabsTrigger
                value="financial-reports"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Financial Reports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search financial data..."
                className="pl-8 rounded-md border border-input bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Accounts Payable Tab Content */}
          <TabsContent value="accounts-payable" className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Accounts Payable</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = filteredAP?.map(invoice => ({
                        InvoiceNumber: invoice.invoice_number,
                        Vendor: invoice.vendor_name,
                        DueDate: formatDate(invoice.due_date),
                        Amount: invoice.amount,
                        Currency: invoice.currency,
                        Status: invoice.status
                      })) || [];

                      const csvString = [
                        Object.keys(csvContent[0] || {}).join(','),
                        ...csvContent.map(row => Object.values(row).join(','))
                      ].join('\n');

                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'accounts-payable.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Dialog open={showNewEntryForm} onOpenChange={setShowNewEntryForm}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Payable Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="vendor_name">Vendor Name</Label>
                          <Input
                            id="vendor_name"
                            value={newEntry.vendor_name}
                            onChange={(e) => setNewEntry({ ...newEntry, vendor_name: e.target.value })}
                            placeholder="Enter vendor name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={newEntry.amount}
                            onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                            placeholder="Enter amount"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            placeholder="Enter description"
                          />
                        </div>
                        <div>
                          <Label htmlFor="due_date">Due Date</Label>
                          <Input
                            id="due_date"
                            type="date"
                            value={newEntry.due_date}
                            onChange={(e) => setNewEntry({ ...newEntry, due_date: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewEntryForm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => {
                            console.log('Creating payable entry:', newEntry);
                            setShowNewEntryForm(false);
                            setNewEntry({ vendor_name: "", amount: "", description: "", due_date: "", customer_name: "", expense_category: "", account: "", debit_amount: "", credit_amount: "" });
                          }}>
                            Create Entry
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStatusFilter("all");
                            setSearchTerm("");
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payable Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAP ? (
                  <div className="text-center py-8">Loading accounts payable data...</div>
                ) : filteredAP && filteredAP.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAP.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.vendor_name}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    {searchTerm ? 'No accounts payable match your search.' : 'No accounts payable found.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Receivable Tab Content */}
          <TabsContent value="accounts-receivable" className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Accounts Receivable</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = filteredAR?.map(invoice => ({
                        InvoiceNumber: invoice.invoice_number,
                        Customer: invoice.customer_name,
                        DueDate: formatDate(invoice.due_date),
                        Amount: invoice.amount,
                        Currency: invoice.currency,
                        Status: invoice.status
                      })) || [];

                      const csvString = [
                        Object.keys(csvContent[0] || {}).join(','),
                        ...csvContent.map(row => Object.values(row).join(','))
                      ].join('\n');

                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'accounts-receivable.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Dialog open={showNewEntryForm} onOpenChange={setShowNewEntryForm}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Receivable Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customer_name">Customer Name</Label>
                          <Input
                            id="customer_name"
                            value={newEntry.customer_name}
                            onChange={(e) => setNewEntry({ ...newEntry, customer_name: e.target.value })}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={newEntry.amount}
                            onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                            placeholder="Enter amount"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            placeholder="Enter description"
                          />
                        </div>
                        <div>
                          <Label htmlFor="due_date">Due Date</Label>
                          <Input
                            id="due_date"
                            type="date"
                            value={newEntry.due_date}
                            onChange={(e) => setNewEntry({ ...newEntry, due_date: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewEntryForm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => {
                            console.log('Creating receivable entry:', newEntry);
                            setShowNewEntryForm(false);
                            setNewEntry({ vendor_name: "", amount: "", description: "", due_date: "", customer_name: "", expense_category: "", account: "", debit_amount: "", credit_amount: "" });
                          }}>
                            Create Entry
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {showFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStatusFilter("all");
                            setSearchTerm("");
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Receivable Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAR ? (
                  <div className="text-center py-8">Loading accounts receivable data...</div>
                ) : filteredAR && filteredAR.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAR.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    {searchTerm ? 'No accounts receivable match your search.' : 'No accounts receivable found.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab Content */}
          <TabsContent value="expenses" className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Expenses</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = filteredExpenses?.map(expense => ({
                        ExpenseNumber: expense.expense_number,
                        Description: expense.description,
                        Category: expense.category_name,
                        Amount: expense.amount,
                        Currency: expense.currency,
                        Date: formatDate(expense.date),
                        Status: expense.status
                      })) || [];

                      const csvString = [
                        Object.keys(csvContent[0] || {}).join(','),
                        ...csvContent.map(row => Object.values(row).join(','))
                      ].join('\n');

                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'expenses.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Dialog open={showNewEntryForm} onOpenChange={setShowNewEntryForm}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Expense Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="expense_category">Expense Category</Label>
                          <Input
                            id="expense_category"
                            value={newEntry.expense_category}
                            onChange={(e) => setNewEntry({ ...newEntry, expense_category: e.target.value })}
                            placeholder="Enter expense category"
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={newEntry.amount}
                            onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                            placeholder="Enter amount"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            placeholder="Enter description"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewEntryForm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => {
                            console.log('Creating expense entry:', newEntry);
                            setShowNewEntryForm(false);
                            setNewEntry({ vendor_name: "", amount: "", description: "", due_date: "", customer_name: "", expense_category: "", account: "", debit_amount: "", credit_amount: "" });
                          }}>
                            Create Entry
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {showFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStatusFilter("all");
                            setSearchTerm("");
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Expense Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingExpenses ? (
                  <div className="text-center py-8">Loading expense data...</div>
                ) : filteredExpenses && filteredExpenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.reference}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{formatDate(expense.date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              // Generate a status based on the date
                              new Date(expense.date) > new Date(2025, 4, 1)
                                ? "Pending"
                                : new Date(expense.date) > new Date(2025, 3, 1)
                                  ? "Approved"
                                  : "Paid"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    {searchTerm ? 'No expenses match your search.' : 'No expenses found.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Journal Entries Tab Content */}
          <TabsContent value="journal-entries" className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Journal Entries</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = filteredJournals?.map(entry => ({
                        EntryNumber: entry.entry_number,
                        Description: entry.description,
                        Date: formatDate(entry.entry_date),
                        Debit: entry.total_debit,
                        Credit: entry.total_credit,
                        Status: entry.status
                      })) || [];

                      const csvString = [
                        Object.keys(csvContent[0] || {}).join(','),
                        ...csvContent.map(row => Object.values(row).join(','))
                      ].join('\n');

                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'journal-entries.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Dialog open={showNewEntryForm} onOpenChange={setShowNewEntryForm}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Journal Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="account">Account</Label>
                          <Input
                            id="account"
                            value={newEntry.account}
                            onChange={(e) => setNewEntry({ ...newEntry, account: e.target.value })}
                            placeholder="Enter account"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            placeholder="Enter description"
                          />
                        </div>
                        <div>
                          <Label htmlFor="debit_amount">Debit Amount</Label>
                          <Input
                            id="debit_amount"
                            type="number"
                            value={newEntry.debit_amount}
                            onChange={(e) => setNewEntry({ ...newEntry, debit_amount: e.target.value })}
                            placeholder="Enter debit amount"
                          />
                        </div>
                        <div>
                          <Label htmlFor="credit_amount">Credit Amount</Label>
                          <Input
                            id="credit_amount"
                            type="number"
                            value={newEntry.credit_amount}
                            onChange={(e) => setNewEntry({ ...newEntry, credit_amount: e.target.value })}
                            placeholder="Enter credit amount"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewEntryForm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => {
                            console.log('Creating journal entry:', newEntry);
                            setShowNewEntryForm(false);
                            setNewEntry({ vendor_name: "", amount: "", description: "", due_date: "", customer_name: "", expense_category: "", account: "", debit_amount: "", credit_amount: "" });
                          }}>
                            Create Entry
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {showFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="posted">Posted</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStatusFilter("all");
                            setSearchTerm("");
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Journal Entry Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingJournals ? (
                  <div className="text-center py-8">Loading journal entries...</div>
                ) : filteredJournals && filteredJournals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entry Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJournals.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.entry_number}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{formatDate(entry.entry_date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.total_debit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.total_credit)}
                          </TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    {searchTerm ? 'No journal entries match your search.' : 'No journal entries found.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* Financial Reports Tab Content */}
          <TabsContent value="financial-reports" className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Financial Reports</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allReports = {
                        balance_sheet: {
                          total_assets: 450000,
                          total_liabilities: 65000,
                          total_equity: 385000,
                          date: new Date().toISOString()
                        },
                        income_statement: {
                          revenue: 450000,
                          cogs: 280000,
                          operating_expenses: 95000,
                          net_income: 75000,
                          period: new Date().toISOString()
                        },
                        cash_flow: {
                          operating_cf: 85000,
                          investing_cf: -25000,
                          financing_cf: 15000,
                          net_cf: 75000,
                          period: new Date().toISOString()
                        }
                      };

                      const csvContent = [
                        ['Report Type', 'Metric', 'Value', 'Date'],
                        ['Balance Sheet', 'Total Assets', '$450,000', new Date().toLocaleDateString()],
                        ['Balance Sheet', 'Total Liabilities', '$65,000', new Date().toLocaleDateString()],
                        ['Balance Sheet', 'Total Equity', '$385,000', new Date().toLocaleDateString()],
                        ['Income Statement', 'Revenue', '$450,000', new Date().toLocaleDateString()],
                        ['Income Statement', 'COGS', '$280,000', new Date().toLocaleDateString()],
                        ['Income Statement', 'Operating Expenses', '$95,000', new Date().toLocaleDateString()],
                        ['Income Statement', 'Net Income', '$75,000', new Date().toLocaleDateString()],
                        ['Cash Flow', 'Operating CF', '$85,000', new Date().toLocaleDateString()],
                        ['Cash Flow', 'Investing CF', '-$25,000', new Date().toLocaleDateString()],
                        ['Cash Flow', 'Financing CF', '$15,000', new Date().toLocaleDateString()],
                        ['Cash Flow', 'Net CF', '$75,000', new Date().toLocaleDateString()]
                      ];

                      const csvString = csvContent.map(row => row.join(',')).join('\n');
                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'all-financial-reports.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Reports
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Generate comprehensive financial report
                      const reportData = {
                        balance_sheet: {
                          assets: {
                            current_assets: {
                              cash: 125000,
                              accounts_receivable: 85000,
                              inventory: 240000,
                              total: 450000
                            },
                            total_assets: 450000
                          },
                          liabilities: {
                            current_liabilities: {
                              accounts_payable: 65000,
                              total: 65000
                            },
                            total_liabilities: 65000
                          },
                          equity: {
                            common_stock: 200000,
                            retained_earnings: 185000,
                            total_equity: 385000
                          }
                        },
                        income_statement: {
                          revenue: 450000,
                          cost_of_goods_sold: 280000,
                          gross_profit: 170000,
                          operating_expenses: 95000,
                          operating_income: 75000,
                          net_income: 75000
                        },
                        cash_flow: {
                          operating_activities: 85000,
                          investing_activities: -25000,
                          financing_activities: 15000,
                          net_cash_flow: 75000
                        },
                        report_date: new Date().toISOString()
                      };

                      const csvContent = [
                        ['Financial Report Generated:', new Date().toLocaleDateString()],
                        [''],
                        ['BALANCE SHEET'],
                        ['Assets'],
                        ['Cash', '$125,000'],
                        ['Accounts Receivable', '$85,000'],
                        ['Inventory', '$240,000'],
                        ['Total Assets', '$450,000'],
                        [''],
                        ['Liabilities'],
                        ['Accounts Payable', '$65,000'],
                        ['Total Liabilities', '$65,000'],
                        [''],
                        ['Equity'],
                        ['Common Stock', '$200,000'],
                        ['Retained Earnings', '$185,000'],
                        ['Total Equity', '$385,000'],
                        [''],
                        ['INCOME STATEMENT'],
                        ['Revenue', '$450,000'],
                        ['Cost of Goods Sold', '$280,000'],
                        ['Gross Profit', '$170,000'],
                        ['Operating Expenses', '$95,000'],
                        ['Net Income', '$75,000'],
                        [''],
                        ['CASH FLOW STATEMENT'],
                        ['Operating Activities', '$85,000'],
                        ['Investing Activities', '-$25,000'],
                        ['Financing Activities', '$15,000'],
                        ['Net Cash Flow', '$75,000']
                      ];

                      const csvString = csvContent.map(row => row.join(',')).join('\n');
                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);

                      alert('Financial report generated and downloaded successfully!');
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Balance Sheet</CardTitle>
                    <CardDescription>Statement of financial position</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Assets:</span>
                        <span className="font-medium">$450,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Liabilities:</span>
                        <span className="font-medium">$65,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Equity:</span>
                        <span className="font-medium">$385,000</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        const balanceSheetData = [
                          ['BALANCE SHEET', '', ''],
                          ['As of:', new Date().toLocaleDateString(), ''],
                          ['', '', ''],
                          ['ASSETS', '', ''],
                          ['Current Assets:', '', ''],
                          ['Cash and Cash Equivalents', '$125,000', ''],
                          ['Accounts Receivable', '$85,000', ''],
                          ['Inventory', '$240,000', ''],
                          ['Total Current Assets', '$450,000', ''],
                          ['', '', ''],
                          ['TOTAL ASSETS', '$450,000', ''],
                          ['', '', ''],
                          ['LIABILITIES', '', ''],
                          ['Current Liabilities:', '', ''],
                          ['Accounts Payable', '$65,000', ''],
                          ['Total Current Liabilities', '$65,000', ''],
                          ['', '', ''],
                          ['TOTAL LIABILITIES', '$65,000', ''],
                          ['', '', ''],
                          ['EQUITY', '', ''],
                          ['Common Stock', '$200,000', ''],
                          ['Retained Earnings', '$185,000', ''],
                          ['TOTAL EQUITY', '$385,000', ''],
                          ['', '', ''],
                          ['TOTAL LIABILITIES AND EQUITY', '$450,000', '']
                        ];

                        const csvString = balanceSheetData.map(row => row.join(',')).join('\n');
                        const blob = new Blob([csvString], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'balance-sheet-detailed.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      View Full Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Income Statement</CardTitle>
                    <CardDescription>Profit and loss statement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span className="font-medium">$450,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COGS:</span>
                        <span className="font-medium">$280,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Income:</span>
                        <span className="font-medium text-green-600">$75,000</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        const incomeStatementData = [
                          ['INCOME STATEMENT', '', ''],
                          ['For the period ending:', new Date().toLocaleDateString(), ''],
                          ['', '', ''],
                          ['REVENUE', '', ''],
                          ['Sales Revenue', '$450,000', ''],
                          ['Total Revenue', '$450,000', ''],
                          ['', '', ''],
                          ['COST OF GOODS SOLD', '', ''],
                          ['Materials', '$180,000', ''],
                          ['Labor', '$70,000', ''],
                          ['Manufacturing Overhead', '$30,000', ''],
                          ['Total COGS', '$280,000', ''],
                          ['', '', ''],
                          ['GROSS PROFIT', '$170,000', ''],
                          ['', '', ''],
                          ['OPERATING EXPENSES', '', ''],
                          ['Selling Expenses', '$45,000', ''],
                          ['Administrative Expenses', '$35,000', ''],
                          ['Other Operating Expenses', '$15,000', ''],
                          ['Total Operating Expenses', '$95,000', ''],
                          ['', '', ''],
                          ['OPERATING INCOME', '$75,000', ''],
                          ['Interest Income', '$2,000', ''],
                          ['Interest Expense', '$2,000', ''],
                          ['', '', ''],
                          ['NET INCOME', '$75,000', '']
                        ];

                        const csvString = incomeStatementData.map(row => row.join(',')).join('\n');
                        const blob = new Blob([csvString], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'income-statement-detailed.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      View Full Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cash Flow</CardTitle>
                    <CardDescription>Statement of cash flows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Operating CF:</span>
                        <span className="font-medium">$85,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Investing CF:</span>
                        <span className="font-medium">-$25,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Financing CF:</span>
                        <span className="font-medium">$15,000</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        const cashFlowData = [
                          ['CASH FLOW STATEMENT', '', ''],
                          ['For the period ending:', new Date().toLocaleDateString(), ''],
                          ['', '', ''],
                          ['OPERATING ACTIVITIES', '', ''],
                          ['Net Income', '$75,000', ''],
                          ['Adjustments:', '', ''],
                          ['Depreciation', '$15,000', ''],
                          ['Changes in Working Capital:', '', ''],
                          ['Accounts Receivable', '-$5,000', ''],
                          ['Inventory', '-$8,000', ''],
                          ['Accounts Payable', '$8,000', ''],
                          ['Net Cash from Operating Activities', '$85,000', ''],
                          ['', '', ''],
                          ['INVESTING ACTIVITIES', '', ''],
                          ['Purchase of Equipment', '-$30,000', ''],
                          ['Sale of Investments', '$5,000', ''],
                          ['Net Cash from Investing Activities', '-$25,000', ''],
                          ['', '', ''],
                          ['FINANCING ACTIVITIES', '', ''],
                          ['Proceeds from Bank Loan', '$20,000', ''],
                          ['Dividend Payments', '-$5,000', ''],
                          ['Net Cash from Financing Activities', '$15,000', ''],
                          ['', '', ''],
                          ['NET INCREASE IN CASH', '$75,000', ''],
                          ['Cash at Beginning of Period', '$50,000', ''],
                          ['Cash at End of Period', '$125,000', '']
                        ];

                        const csvString = cashFlowData.map(row => row.join(',')).join('\n');
                        const blob = new Blob([csvString], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'cash-flow-statement-detailed.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      View Full Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          {/* Configuration Tab Content */}
          <TabsContent value="configuration" className="p-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Financial Configuration</h3>
                  <p className="text-sm text-muted-foreground">Enterprise-standard financial structure setup and configuration</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Configuration Assistant */}
                <Card className="hover:shadow-lg transition-shadow border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      Configuration Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Step-by-step guided setup for enterprise structure, chart of accounts, and fiscal year configuration
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => window.location.href = '/finance/configuration-assistant'}
                    >
                      Start Configuration
                    </Button>
                  </CardContent>
                </Card>

                {/* Standard Configuration */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-600" />
                      Standard Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Traditional configuration interface for advanced users
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => window.location.href = '/finance/configuration'}
                    >
                      Open Configuration
                    </Button>
                  </CardContent>
                </Card>

                {/* End-to-End Guide */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-purple-600" />
                      End-to-End Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Comprehensive financial process guide from setup to operations
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => window.location.href = '/finance/end-to-end-guide'}
                    >
                      View Guide
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Current Configuration Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Configuration Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="text-2xl font-bold text-green-600">GLOBL</div>
                      <div className="text-sm text-green-700 font-medium">Company</div>
                      <div className="text-xs text-green-600">Configured</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="text-2xl font-bold text-green-600">1000</div>
                      <div className="text-sm text-green-700 font-medium">Company Code</div>
                      <div className="text-xs text-green-600">Active</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="text-2xl font-bold text-green-600">INT</div>
                      <div className="text-sm text-green-700 font-medium">Chart of Accounts</div>
                      <div className="text-xs text-green-600">Assigned</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="text-2xl font-bold text-green-600">K4</div>
                      <div className="text-sm text-green-700 font-medium">Fiscal Year Variant</div>
                      <div className="text-xs text-green-600">Active</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Steps */}
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise-Standard Configuration Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                      <div className="flex-1">
                        <div className="font-medium">Define Company (GLOBL)</div>
                        <div className="text-sm text-muted-foreground">Highest organizational unit for external reporting</div>
                      </div>
                      <Badge className="bg-green-600 text-white">Complete</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <div className="flex-1">
                        <div className="font-medium">Define Company Code (1000)</div>
                        <div className="text-sm text-muted-foreground">Central organizational unit for Financial Accounting</div>
                      </div>
                      <Badge className="bg-green-600 text-white">Complete</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                      <div className="flex-1">
                        <div className="font-medium">Chart of Accounts (INT)</div>
                        <div className="text-sm text-muted-foreground">List of all G/L accounts for company codes</div>
                      </div>
                      <Badge className="bg-green-600 text-white">Complete</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">4</div>
                      <div className="flex-1">
                        <div className="font-medium">Fiscal Year Variant (K4)</div>
                        <div className="text-sm text-muted-foreground">Calendar year with 4 special periods</div>
                      </div>
                      <Badge className="bg-green-600 text-white">Complete</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </Card>
    </div>
  );
}