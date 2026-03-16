import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, TrendingUp, DollarSign, Plus, Eye, Calculator, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function GLEnhanced() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "General Ledger Enhanced - MallyERP";
  }, []);

  // Fetch GL statistics
  const { data: glStats } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/statistics'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/gl/statistics');
      return await response.json();
    },
  });

  // Fetch GL accounts
  const { data: glAccounts } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/accounts'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/gl/accounts');
      return await response.json();
    },
  });

  // Fetch GL documents
  const { data: glDocuments, isLoading: isLoadingDocuments, error: documentsError } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/documents'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance-enhanced/gl/documents');
        const data = await response.json();
        console.log('GL Documents fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching GL documents:', error);
        return [];
      }
    },
  });

  // Fetch posting keys
  const { data: postingKeys } = useQuery({
    queryKey: ['/api/finance-enhanced/posting-keys'],
    queryFn: async () => {
      const response = await apiRequest('/api/finance-enhanced/posting-keys');
      return await response.json();
    },
  });

  // Post draft document mutation
  const postDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/finance-enhanced/gl/documents/${documentId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post document');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/gl/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/gl/statistics'] });
      toast({ 
        title: "Success", 
        description: `Document ${data.document?.document_number || ''} posted successfully` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to post document", 
        variant: "destructive" 
      });
    }
  });

  // Fetch document details mutation
  const fetchDocumentDetails = async (documentId: number) => {
    try {
      const response = await fetch(`/api/finance-enhanced/gl/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      const data = await response.json();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch document details",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleViewDocument = async (doc: any) => {
    const details = await fetchDocumentDetails(doc.id);
    if (details) {
      setSelectedDocument(details);
      setIsViewDialogOpen(true);
    }
  };

  const handlePostDocument = (doc: any) => {
    if (window.confirm(`Post document ${doc.document_number}? This action cannot be undone.`)) {
      postDocumentMutation.mutate(doc.id);
    }
  };

  // Create GL document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      const response = await fetch('/api/finance-enhanced/gl/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create GL document');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/gl/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/gl/statistics'] });
      toast({ 
        title: "Success", 
        description: `GL document ${data.document_number || 'created'} created successfully with status: ${data.status || 'Draft'}` 
      });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create GL document", 
        variant: "destructive" 
      });
    }
  });

  const StatCard = ({ title, value, icon: Icon, badge }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value || 0}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
            <h1 className="text-3xl font-bold">General Ledger Enhanced</h1>
            <p className="text-muted-foreground">Complete GL document processing, posting, and reporting</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create GL Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create General Ledger Document</DialogTitle>
            </DialogHeader>
            <GLDocumentForm 
              onSubmit={(data) => createDocumentMutation.mutate(data)}
              glAccounts={glAccounts || []}
              postingKeys={postingKeys || []}
              isLoading={createDocumentMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total GL Accounts"
          value={glStats?.total_accounts || 0}
          icon={BookOpen}
          badge="Active"
        />
        <StatCard
          title="Balance Sheet Accounts"
          value={glStats?.balance_sheet_accounts || 0}
          icon={FileText}
          badge="Assets & Liabilities"
        />
        <StatCard
          title="P&L Accounts"
          value={glStats?.pl_accounts || 0}
          icon={TrendingUp}
          badge="Revenue & Expenses"
        />
        <StatCard
          title="Posted Documents"
          value={glStats?.posted_documents || 0}
          icon={DollarSign}
          badge={`$${parseFloat(glStats?.posted_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="documents">GL Documents</TabsTrigger>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
          <TabsTrigger value="customer-line-items">Customer Line Items</TabsTrigger>
          <TabsTrigger value="vendor-line-items">Vendor Line Items</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                GL Processing Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Document Processing</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Draft Documents:</span>
                      <Badge variant="outline">{glStats?.draft_documents || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Posted Documents:</span>
                      <Badge variant="default">{glStats?.posted_documents || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Posted Amount:</span>
                      <Badge variant="secondary">${parseFloat(glStats?.posted_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Account Structure</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Active Accounts:</span>
                      <Badge variant="default">{glStats?.active_accounts || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Balance Sheet:</span>
                      <Badge variant="outline">{glStats?.balance_sheet_accounts || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>P&L Accounts:</span>
                      <Badge variant="outline">{glStats?.pl_accounts || 0}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                All active GL accounts in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!glAccounts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-muted-foreground">Loading GL accounts...</p>
                  </div>
                </div>
              ) : glAccounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No GL accounts found</p>
                  <p className="text-sm mt-2">Create GL accounts in Master Data to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Account Group</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {glAccounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.account_number || 'N/A'}</TableCell>
                        <TableCell>{account.account_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.account_type || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{account.account_group || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={account.is_active ? "default" : "secondary"}>
                            {account.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GL Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-muted-foreground">Loading GL documents...</p>
                  </div>
                </div>
              ) : documentsError ? (
                <div className="text-center py-8 text-red-500">
                  Error loading GL documents. Please try again.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Number</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Posting Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {glDocuments && glDocuments.length > 0 ? (
                      glDocuments.map((doc: any) => (
                        <TableRow key={doc.id || doc.document_number}>
                          <TableCell className="font-mono">{doc.document_number || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.document_type || 'GL'}</Badge>
                          </TableCell>
                          <TableCell>
                            {doc.posting_date 
                              ? new Date(doc.posting_date).toLocaleDateString() 
                              : doc.document_date 
                                ? new Date(doc.document_date).toLocaleDateString()
                                : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            ${parseFloat(doc.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={doc.status === 'Posted' ? "default" : "secondary"}>
                              {doc.status || 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{doc.line_count || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {doc.status !== 'Posted' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePostDocument(doc)}
                                  disabled={postDocumentMutation.isPending}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  title="Post Document"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No GL documents found. Create your first GL document to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="line-items" className="space-y-6">
          <GLLineItemsTab />
        </TabsContent>

        <TabsContent value="customer-line-items" className="space-y-6">
          <CustomerLineItemsTab />
        </TabsContent>

        <TabsContent value="vendor-line-items" className="space-y-6">
          <VendorLineItemsTab />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Generate trial balance report for period-end closing</p>
                <Button className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Generate Trial Balance
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Statements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Balance Sheet and P&L statement generation</p>
                <Button className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Statements
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              GL Document: {selectedDocument?.document_number || ''}
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Document Type</Label>
                  <p className="text-sm">{selectedDocument.document_type || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <Badge variant={selectedDocument.status === 'Posted' ? "default" : "secondary"}>
                    {selectedDocument.status || 'Draft'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Posting Date</Label>
                  <p className="text-sm">
                    {selectedDocument.posting_date 
                      ? new Date(selectedDocument.posting_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Company Code</Label>
                  <p className="text-sm">{selectedDocument.company_code || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Currency</Label>
                  <p className="text-sm">{selectedDocument.currency || 'USD'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total Amount</Label>
                  <p className="text-sm font-semibold">
                    ${parseFloat(selectedDocument.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {selectedDocument.reference && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">Reference</Label>
                    <p className="text-sm">{selectedDocument.reference}</p>
                  </div>
                )}
              </div>

              {selectedDocument.items && selectedDocument.items.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Line Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Line</TableHead>
                        <TableHead>GL Account</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDocument.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.line_item || idx + 1}</TableCell>
                          <TableCell className="font-mono">{item.gl_account || item.account_number || 'N/A'}</TableCell>
                          <TableCell>{item.account_name || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {parseFloat(item.debit_amount || 0) > 0 ? `$${parseFloat(item.debit_amount || 0).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {parseFloat(item.credit_amount || 0) > 0 ? `$${parseFloat(item.credit_amount || 0).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedDocument.status !== 'Posted' && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => {
                          setIsViewDialogOpen(false);
                          handlePostDocument(selectedDocument);
                        }}
                        disabled={postDocumentMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {postDocumentMutation.isPending ? 'Posting...' : 'Post Document'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// GL Line Items Tab Component
function GLLineItemsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [glAccountFilter, setGlAccountFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [chartOfAccountsFilter, setChartOfAccountsFilter] = useState("");
  const [fiscalYearFilter, setFiscalYearFilter] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState("all");
  const [specialTransactionsFilter, setSpecialTransactionsFilter] = useState("all");
  const { toast } = useToast();

  // Fetch company codes for filter
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/company-code');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cc: any) => cc.active !== false) : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch GL accounts for filter
  const { data: glAccounts = [] } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/accounts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance-enhanced/gl/accounts');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch chart of accounts for filter
  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ['/api/master-data/chart-of-accounts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/chart-of-accounts');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((coa: any) => coa.isActive !== false) : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch fiscal year variants
  const { data: fiscalYearVariants = [] } = useQuery({
    queryKey: ['/api/master-data/fiscal-year-variants'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/fiscal-year-variants');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Build query params
  const queryParams = new URLSearchParams();
  if (documentFilter) queryParams.set('document_number', documentFilter);
  if (glAccountFilter) queryParams.set('gl_account', glAccountFilter);
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (dateFrom) queryParams.set('date_from', dateFrom);
  if (dateTo) queryParams.set('date_to', dateTo);
  if (companyFilter) queryParams.set('company_code', companyFilter);
  if (chartOfAccountsFilter) queryParams.set('chart_of_accounts_id', chartOfAccountsFilter);
  if (fiscalYearFilter) queryParams.set('fiscal_year', fiscalYearFilter);
  if (itemStatusFilter !== 'all') queryParams.set('item_status', itemStatusFilter);
  if (specialTransactionsFilter !== 'all') queryParams.set('special_transactions', specialTransactionsFilter);

  // Fetch GL line items - refetches automatically when filters change
  const { data: lineItemsData, isLoading, error } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/line-items', documentFilter, glAccountFilter, statusFilter, dateFrom, dateTo, companyFilter, chartOfAccountsFilter, fiscalYearFilter, itemStatusFilter, specialTransactionsFilter],
    queryFn: async () => {
      const url = `/api/finance-enhanced/gl/line-items?${queryParams.toString()}`;
      const response = await apiRequest(url);
      if (!response.ok) {
        throw new Error('Failed to fetch line items');
      }
      const data = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const lineItems = lineItemsData?.line_items || [];
  const totalCount = lineItemsData?.total || 0;

  // Filter by search term (client-side for document number, account name, description)
  const filteredLineItems = lineItems.filter((item: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (item.document_number || '').toLowerCase().includes(search) ||
      (item.gl_account || '').toLowerCase().includes(search) ||
      (item.account_name || '').toLowerCase().includes(search) ||
      (item.description || '').toLowerCase().includes(search) ||
      (item.company_name || '').toLowerCase().includes(search)
    );
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setDocumentFilter("");
    setGlAccountFilter("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setCompanyFilter("");
    setChartOfAccountsFilter("");
    setFiscalYearFilter("");
    setItemStatusFilter("all");
    setSpecialTransactionsFilter("all");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GL Line Items
          </CardTitle>
          <Badge variant="secondary">{totalCount} total items</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Search line items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Document Number</Label>
            <Input
              placeholder="Filter by document..."
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">GL Account</Label>
            <Select 
              value={glAccountFilter || "NONE"} 
              onValueChange={(value) => setGlAccountFilter(value === "NONE" ? "" : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">All accounts</SelectItem>
                {glAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.account_number}>
                    {account.account_number} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Company Code</Label>
            <Select 
              value={companyFilter || "NONE"} 
              onValueChange={(value) => setCompanyFilter(value === "NONE" ? "" : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">All companies</SelectItem>
                {companyCodes.map((cc: any) => (
                  <SelectItem key={cc.id} value={cc.code}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Chart of Accounts</Label>
            <Select 
              value={chartOfAccountsFilter || "NONE"} 
              onValueChange={(value) => setChartOfAccountsFilter(value === "NONE" ? "" : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All charts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">All charts</SelectItem>
                {chartOfAccounts.map((coa: any) => (
                  <SelectItem key={coa.id} value={coa.id?.toString()}>
                    {coa.code} - {coa.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Fiscal Year</Label>
            <Select 
              value={fiscalYearFilter || "NONE"} 
              onValueChange={(value) => setFiscalYearFilter(value === "NONE" ? "" : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">All years</SelectItem>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Item Status</Label>
            <Select value={itemStatusFilter} onValueChange={setItemStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="open">Open Items</SelectItem>
                <SelectItem value="cleared">Cleared Items</SelectItem>
                <SelectItem value="noted">Noted Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Special GL Transactions</Label>
            <Select value={specialTransactionsFilter} onValueChange={setSpecialTransactionsFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="yes">Special Only</SelectItem>
                <SelectItem value="no">Regular Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex items-end">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-9 w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Line Items Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-muted-foreground">Loading line items...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading line items. Please try again.
          </div>
        ) : filteredLineItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No line items found</p>
            <p className="text-sm mt-2">Try adjusting your filters or create a new GL document</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document #</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Chart of Accounts</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Item Status</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLineItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.document_number || 'N/A'}
                        {item.is_special_transaction && (
                          <Badge variant="outline" className="ml-1 text-xs">Special</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.line_item || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.posting_date
                          ? new Date(item.posting_date).toLocaleDateString()
                          : item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {item.fiscal_year || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.company_name || item.company_code || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.gl_account || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.account_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.chart_of_accounts_code ? (
                          <span className="font-mono">{item.chart_of_accounts_code}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(item.debit_amount || 0) > 0
                          ? `$${parseFloat(item.debit_amount || 0).toFixed(2)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(item.credit_amount || 0) > 0
                          ? `$${parseFloat(item.credit_amount || 0).toFixed(2)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        {item.is_open_item && (
                          <Badge variant="outline" className="mr-1">Open</Badge>
                        )}
                        {item.is_cleared && (
                          <Badge variant="default" className="mr-1">Cleared</Badge>
                        )}
                        {item.open_item_status && (
                          <Badge variant="secondary" className="text-xs">{item.open_item_status}</Badge>
                        )}
                        {!item.is_open_item && !item.is_cleared && !item.open_item_status && '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === 'Posted' || item.status === 'POSTED' ? 'default' : 'secondary'}
                        >
                          {item.status || item.posting_status || 'Draft'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredLineItems.length > 0 && (
              <div className="px-4 py-3 bg-muted/50 border-t text-sm text-muted-foreground">
                Showing {filteredLineItems.length} of {totalCount} line items
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Customer Line Items Tab Component
function CustomerLineItemsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [glAccountFilter, setGlAccountFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const { toast } = useToast();

  // Fetch customers for filter
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/customers');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch company codes for filter
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/company-code');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cc: any) => cc.active !== false) : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch GL accounts for filter
  const { data: glAccounts = [] } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/accounts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance-enhanced/gl/accounts');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Build query params
  const queryParams = new URLSearchParams();
  if (customerFilter && customerFilter !== 'NONE') queryParams.set('customer_id', customerFilter);
  if (documentFilter) queryParams.set('document_number', documentFilter);
  if (glAccountFilter && glAccountFilter !== 'NONE') queryParams.set('gl_account', glAccountFilter);
  if (dateFrom) queryParams.set('date_from', dateFrom);
  if (dateTo) queryParams.set('date_to', dateTo);
  if (companyFilter && companyFilter !== 'NONE') queryParams.set('company_code', companyFilter);
  if (documentTypeFilter !== 'all') queryParams.set('document_type', documentTypeFilter);

  // Fetch customer GL line items
  const { data: lineItemsData, isLoading, error } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/customer-line-items', customerFilter, documentFilter, glAccountFilter, dateFrom, dateTo, companyFilter, documentTypeFilter],
    queryFn: async () => {
      const url = `/api/finance-enhanced/gl/customer-line-items?${queryParams.toString()}`;
      const response = await apiRequest(url);
      if (!response.ok) {
        throw new Error('Failed to fetch customer line items');
      }
      const data = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const lineItems = lineItemsData?.line_items || [];
  const totalCount = lineItemsData?.total || 0;

  // Client-side search filtering
  const filteredLineItems = lineItems.filter((item: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.document_number?.toLowerCase().includes(term) ||
      item.customer_name?.toLowerCase().includes(term) ||
      item.customer_number?.toLowerCase().includes(term) ||
      item.gl_account?.toLowerCase().includes(term) ||
      item.account_name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.source_document_number?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numAmount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customer Line Items</CardTitle>
          <CardDescription>
            GL entries related to customer transactions (billing documents and payments)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search line items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerFilter || 'NONE'} onValueChange={(value) => setCustomerFilter(value === 'NONE' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All customers</SelectItem>
                  {customers.filter((customer: any) => customer.id).map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.customer_number || customer.customer_code || ''} - {customer.customer_name || customer.name || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="BILLING">Billing</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>GL Account</Label>
              <Select value={glAccountFilter || 'NONE'} onValueChange={(value) => setGlAccountFilter(value === 'NONE' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All accounts</SelectItem>
                  {glAccounts.slice(0, 100).filter((account: any) => account.account_number).map((account: any) => (
                    <SelectItem key={account.id} value={account.account_number}>
                      {account.account_number} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company Code</Label>
              <Select value={companyFilter || 'NONE'} onValueChange={(value) => setCompanyFilter(value === 'NONE' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All companies</SelectItem>
                  {companyCodes.filter((cc: any) => cc.code).map((cc: any) => (
                    <SelectItem key={cc.id} value={cc.code}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input
                placeholder="Filter by document number"
                value={documentFilter}
                onChange={(e) => setDocumentFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border rounded-md">
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Loading customer line items...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Error loading customer line items. Please try again.
              </div>
            ) : filteredLineItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customer line items found</p>
                <p className="text-sm mt-2">Try adjusting your filters or create customer invoices</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posting Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Source Document</TableHead>
                      <TableHead>Document Number</TableHead>
                      <TableHead>GL Account</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Company</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLineItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.posting_date)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.customer_name || '-'}</div>
                            {item.customer_number && (
                              <div className="text-xs text-muted-foreground">{item.customer_number}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.source_document_type === 'PAYMENT' ? 'default' : 'secondary'}>
                            {item.source_document_type || '-'}
                          </Badge>
                          {item.source_document_number && (
                            <div className="text-xs text-muted-foreground mt-1">{item.source_document_number}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{item.document_number || '-'}</TableCell>
                        <TableCell className="font-mono">{item.gl_account || '-'}</TableCell>
                        <TableCell>{item.account_name || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.description || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(item.debit_amount || 0) > 0 ? formatCurrency(item.debit_amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(item.credit_amount || 0) > 0 ? formatCurrency(item.credit_amount) : '-'}
                        </TableCell>
                        <TableCell>{item.company_name || item.company_code || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredLineItems.length > 0 && (
              <div className="p-4 border-t text-sm text-muted-foreground">
                Showing {filteredLineItems.length} of {totalCount} customer line items
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Vendor Line Items Tab Component
function VendorLineItemsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [glAccountFilter, setGlAccountFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const { toast } = useToast();

  // Fetch vendors for filter
  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/master-data/vendors'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/vendors');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch company codes for filter
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/company-code');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cc: any) => cc.active !== false) : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch GL accounts for filter
  const { data: glAccounts = [] } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/accounts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance-enhanced/gl/accounts');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
  });

  // Build query params
  const queryParams = new URLSearchParams();
  if (vendorFilter && vendorFilter !== 'NONE') queryParams.set('vendor_id', vendorFilter);
  if (documentFilter) queryParams.set('document_number', documentFilter);
  if (glAccountFilter && glAccountFilter !== 'NONE') queryParams.set('gl_account', glAccountFilter);
  if (dateFrom) queryParams.set('date_from', dateFrom);
  if (dateTo) queryParams.set('date_to', dateTo);
  if (companyFilter && companyFilter !== 'NONE') queryParams.set('company_code', companyFilter);
  if (documentTypeFilter !== 'all') queryParams.set('document_type', documentTypeFilter);

  // Fetch vendor GL line items
  const { data: lineItemsData, isLoading, error } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/vendor-line-items', vendorFilter, documentFilter, glAccountFilter, dateFrom, dateTo, companyFilter, documentTypeFilter],
    queryFn: async () => {
      const url = `/api/finance-enhanced/gl/vendor-line-items?${queryParams.toString()}`;
      const response = await apiRequest(url);
      if (!response.ok) {
        throw new Error('Failed to fetch vendor line items');
      }
      const data = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const lineItems = lineItemsData?.line_items || [];
  const totalCount = lineItemsData?.total || 0;

  // Client-side search filtering
  const filteredLineItems = lineItems.filter((item: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.document_number?.toLowerCase().includes(term) ||
      item.vendor_name?.toLowerCase().includes(term) ||
      item.vendor_number?.toLowerCase().includes(term) ||
      item.gl_account?.toLowerCase().includes(term) ||
      item.account_name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.source_document_number?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numAmount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Line Items</CardTitle>
          <CardDescription>
            GL entries related to vendor transactions (AP invoices and vendor payments)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search line items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorFilter || 'NONE'} onValueChange={(value) => setVendorFilter(value === 'NONE' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All vendors</SelectItem>
                  {vendors.filter((vendor: any) => vendor.id).map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.code || vendor.vendor_code || ''} - {vendor.name || vendor.vendor_name || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>GL Account</Label>
              <Select value={glAccountFilter || 'NONE'} onValueChange={(value) => setGlAccountFilter(value === 'NONE' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All accounts</SelectItem>
                  {glAccounts.slice(0, 100).filter((account: any) => account.account_number).map((account: any) => (
                    <SelectItem key={account.id} value={account.account_number}>
                      {account.account_number} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company Code</Label>
              <Select value={companyFilter || 'NONE'} onValueChange={(value) => setCompanyFilter(value === 'NONE' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All companies</SelectItem>
                  {companyCodes.filter((cc: any) => cc.code).map((cc: any) => (
                    <SelectItem key={cc.id} value={cc.code}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input
                placeholder="Filter by document number"
                value={documentFilter}
                onChange={(e) => setDocumentFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border rounded-md">
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Loading vendor line items...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Error loading vendor line items. Please try again.
              </div>
            ) : filteredLineItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vendor line items found</p>
                <p className="text-sm mt-2">Try adjusting your filters or create vendor invoices</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posting Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Source Document</TableHead>
                      <TableHead>Document Number</TableHead>
                      <TableHead>GL Account</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Company</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLineItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.posting_date)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.vendor_name || '-'}</div>
                            {item.vendor_number && (
                              <div className="text-xs text-muted-foreground">{item.vendor_number}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.source_document_type === 'PAYMENT' || item.source_document_type === 'VENDOR_PAYMENT' || item.source_document_type === 'AP_PAYMENT' ? 'default' : 'secondary'}>
                            {item.source_document_type || '-'}
                          </Badge>
                          {item.source_document_number && (
                            <div className="text-xs text-muted-foreground mt-1">{item.source_document_number}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{item.document_number || '-'}</TableCell>
                        <TableCell className="font-mono">{item.gl_account || '-'}</TableCell>
                        <TableCell>{item.account_name || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.description || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(item.debit_amount || 0) > 0 ? formatCurrency(item.debit_amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(item.credit_amount || 0) > 0 ? formatCurrency(item.credit_amount) : '-'}
                        </TableCell>
                        <TableCell>{item.company_name || item.company_code || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredLineItems.length > 0 && (
              <div className="p-4 border-t text-sm text-muted-foreground">
                Showing {filteredLineItems.length} of {totalCount} vendor line items
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// GL Document Form Component
function GLDocumentForm({ onSubmit, glAccounts: initialGlAccounts, postingKeys, isLoading }: any) {
  const { toast } = useToast();
  
  // State for selected company code
  const [selectedCompanyCodeId, setSelectedCompanyCodeId] = useState<number | string | null>(null);
  
  // Fetch company codes
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/company-code');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cc: any) => cc.active !== false) : [];
      } catch (error) {
        console.error('Error fetching company codes:', error);
        return [];
      }
    },
  });
  
  // Fetch GL accounts filtered by selected company code
  const { data: glAccounts = [] } = useQuery({
    queryKey: ['/api/finance-enhanced/gl/accounts', selectedCompanyCodeId],
    queryFn: async () => {
      try {
        const url = selectedCompanyCodeId 
          ? `/api/finance-enhanced/gl/accounts?company_code_id=${selectedCompanyCodeId}`
          : '/api/finance-enhanced/gl/accounts';
        const response = await apiRequest(url);
        return await response.json();
      } catch (error) {
        return initialGlAccounts || [];
      }
    },
    enabled: true,
  });

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['/api/master-data/currency'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/currency');
        const data = await response.json();
        if (Array.isArray(data)) {
          return data.filter((c: any) => c.isActive !== false);
        } else if (data.currencies && Array.isArray(data.currencies)) {
          return data.currencies.filter((c: any) => c.isActive !== false);
        }
        return [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
  });

  const [formData, setFormData] = useState({
    document_number: '',
    document_type: 'Adjustment',
    posting_date: new Date().toISOString().split('T')[0],
    document_date: new Date().toISOString().split('T')[0],
    company_code_id: companyCodes && companyCodes.length > 0 ? companyCodes[0].id : '',
    currency_id: currencies && currencies.length > 0 ? currencies[0].id : '',
    total_amount: 0,
    reference: '',
    items: [
      { gl_account_id: '', debit_amount: '', credit_amount: '', description: '' }
    ]
  });

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { gl_account_id: '', debit_amount: '', credit_amount: '', description: '' }]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  useEffect(() => {
    if (companyCodes && companyCodes.length > 0 && !formData.company_code_id) {
      const firstCompanyId = companyCodes[0].id;
      setFormData(prev => ({ ...prev, company_code_id: firstCompanyId }));
      setSelectedCompanyCodeId(firstCompanyId);
    }
  }, [companyCodes]);

  useEffect(() => {
    if (currencies && currencies.length > 0 && !formData.currency_id) {
      setFormData(prev => ({ ...prev, currency_id: currencies[0].id }));
    }
  }, [currencies]);

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const debit = parseFloat(item.debit_amount?.toString() || '0') || 0;
      const credit = parseFloat(item.credit_amount?.toString() || '0') || 0;
      return sum + debit + credit;
    }, 0);
  };

  const validateForm = () => {
    if (!formData.posting_date) {
      toast({ title: "Validation Error", description: "Posting date is required", variant: "destructive" });
      return false;
    }

    if (!formData.company_code_id) {
      toast({ title: "Validation Error", description: "Company code is required", variant: "destructive" });
      return false;
    }

    if (!formData.currency_id) {
      toast({ title: "Validation Error", description: "Currency is required", variant: "destructive" });
      return false;
    }

    // Validate items
    const validItems = formData.items.filter(item => item.gl_account_id);
    if (validItems.length < 2) {
      toast({ title: "Validation Error", description: "At least 2 line items are required", variant: "destructive" });
      return false;
    }

    let totalDebits = 0;
    let totalCredits = 0;
    for (const item of validItems) {
      if (!item.gl_account_id) {
        toast({ title: "Validation Error", description: "All items must have a GL account selected", variant: "destructive" });
        return false;
      }

      const debit = parseFloat(item.debit_amount?.toString() || '0') || 0;
      const credit = parseFloat(item.credit_amount?.toString() || '0') || 0;

      if (debit > 0 && credit > 0) {
        toast({ title: "Validation Error", description: "Line item cannot have both debit and credit amounts", variant: "destructive" });
        return false;
      }

      if (debit === 0 && credit === 0) {
        toast({ title: "Validation Error", description: "Each line item must have either a debit or credit amount", variant: "destructive" });
        return false;
      }

      totalDebits += debit;
      totalCredits += credit;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast({ 
        title: "Validation Error", 
        description: `Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)})`, 
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Filter out empty items and prepare data
    const validItems = formData.items
      .filter(item => item.gl_account_id)
      .map(item => ({
        gl_account_id: item.gl_account_id,
        debit_amount: parseFloat(item.debit_amount?.toString() || '0') || 0,
        credit_amount: parseFloat(item.credit_amount?.toString() || '0') || 0,
        description: item.description || ''
      }));

    const submitData = {
      ...formData,
      items: validItems,
      total_amount: calculateTotal()
    };

    onSubmit(submitData);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="document_number">Document Number (Optional - Auto-generated if empty)</Label>
          <Input
            id="document_number"
            value={formData.document_number}
            onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
            placeholder="Leave empty for auto-generation"
          />
        </div>
        <div>
          <Label htmlFor="document_type">Document Type</Label>
          <Select value={formData.document_type} onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Invoice">Invoice</SelectItem>
              <SelectItem value="Payment">Payment</SelectItem>
              <SelectItem value="Adjustment">Adjustment</SelectItem>
              <SelectItem value="Accrual">Accrual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="posting_date">Posting Date *</Label>
          <Input
            id="posting_date"
            type="date"
            value={formData.posting_date}
            onChange={(e) => setFormData(prev => ({ ...prev, posting_date: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="document_date">Document Date</Label>
          <Input
            id="document_date"
            type="date"
            value={formData.document_date}
            onChange={(e) => setFormData(prev => ({ ...prev, document_date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="company_code_id">Company *</Label>
          <Select 
            value={formData.company_code_id ? String(formData.company_code_id) : ''} 
            onValueChange={(value) => {
              const companyId = parseInt(value);
              setFormData(prev => ({ ...prev, company_code_id: companyId }));
              setSelectedCompanyCodeId(companyId);
              // Clear GL account selections when company code changes
              setFormData(prev => ({
                ...prev,
                items: prev.items.map(item => ({ ...item, gl_account_id: '' }))
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companyCodes.map((cc: any) => (
                <SelectItem key={cc.id} value={String(cc.id)}>
                  {cc.code} - {cc.company_name || cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="currency_id">Currency *</Label>
          <Select 
            value={formData.currency_id ? String(formData.currency_id) : ''} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr: any) => (
                <SelectItem key={curr.id} value={String(curr.id)}>
                  {curr.currency_code || curr.code} - {curr.currency_name || curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="reference">Reference</Label>
        <Textarea
          id="reference"
          value={formData.reference}
          onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
          placeholder="Enter reference information..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <Button type="button" onClick={addLine} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Line
          </Button>
        </div>
        
        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
              <div>
                <Label>GL Account</Label>
                <Select value={item.gl_account_id} onValueChange={(value) => updateItem(index, 'gl_account_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccounts && glAccounts.length > 0 ? (
                      glAccounts.filter((acc: any) => acc.is_active !== false).map((account: any) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.account_number} - {account.account_name} {account.account_type ? `(${account.account_type})` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="NO_ACCOUNTS" disabled>
                        {formData.company_code_id ? 'No accounts available for selected company' : 'Please select a company first'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Debit Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.debit_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateItem(index, 'debit_amount', value);
                    // Clear credit if debit is entered
                    if (value && parseFloat(value) > 0) {
                      setFormData(prev => ({
                        ...prev,
                        items: prev.items.map((item, i) => 
                          i === index ? { ...item, credit_amount: '' } : item
                        )
                      }));
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Credit Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.credit_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateItem(index, 'credit_amount', value);
                    // Clear debit if credit is entered
                    if (value && parseFloat(value) > 0) {
                      setFormData(prev => ({
                        ...prev,
                        items: prev.items.map((item, i) => 
                          i === index ? { ...item, debit_amount: '' } : item
                        )
                      }));
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Line item description"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm space-y-1">
          <div className="text-lg font-semibold">
            Total Amount: ${calculateTotal().toFixed(2)}
          </div>
          <div className="text-muted-foreground text-xs">
            Total Debits: ${formData.items.reduce((sum, item) => sum + (parseFloat(item.debit_amount?.toString() || '0') || 0), 0).toFixed(2)} | 
            Total Credits: ${formData.items.reduce((sum, item) => sum + (parseFloat(item.credit_amount?.toString() || '0') || 0), 0).toFixed(2)}
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Creating...' : 'Create Document'}
        </Button>
      </div>
    </div>
  );
}