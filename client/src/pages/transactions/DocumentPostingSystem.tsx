import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Plus, Edit2, FileText, BookOpen, CheckCircle, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

// Document Posting System Type Definitions - matches accounting_documents table
interface PostingDocument {
  id: number;
  document_number: string;
  document_type: string;
  posting_date: string;
  document_date: string;
  reference: string | null;
  currency: string;
  exchange_rate: number;
  company_code: string;
  fiscal_year: number;
  period: number;
  total_debit: number;
  total_credit: number;
  total_amount: number;
  status: string;
  user_created: string;
  created_at: string;
  updated_at: string;
  header_text?: string | null;
  source_module?: string | null;
  source_document_id?: number | null;
  source_document_type?: string | null;
}

interface DocumentItem {
  id: string;
  documentNumber: string;
  itemNumber: string;
  glAccount: string;
  debitAmount: number;
  creditAmount: number;
  text: string;
  costCenter: string;
  profitCenter: string;
  segment: string;
}

export default function DocumentPostingSystem() {
  const permissions = useAgentPermissions();
  const [selectedDocument, setSelectedDocument] = useState<PostingDocument | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Query accounting documents from database
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/ar/accounting-documents', selectedCompany],
    queryFn: async () => {
      const response = await apiRequest(`/api/ar/accounting-documents?company_code=${selectedCompany}`);
      return await response.json();
    },
  });

  // Fetch company codes for dropdown
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await apiRequest('/api/master-data/company-codes');
      if (!res.ok) throw new Error('Failed to fetch company codes');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Use real data from database
  const sapDocuments: PostingDocument[] = documents as PostingDocument[];

  const documentItems: DocumentItem[] = [
    {
      id: 'ITEM-001',
      documentNumber: '1900000001',
      itemNumber: '001',
      glAccount: '130000',
      debitAmount: 125000.00,
      creditAmount: 0,
      text: 'Customer Invoice - Product Sales',
      costCenter: 'CC-1000',
      profitCenter: 'PC-SALES',
      segment: 'MANUFACTURING'
    },
    {
      id: 'ITEM-002',
      documentNumber: '1900000001',
      itemNumber: '002',
      glAccount: '400000',
      debitAmount: 0,
      creditAmount: 125000.00,
      text: 'Revenue Recognition',
      costCenter: '',
      profitCenter: 'PC-SALES',
      segment: 'MANUFACTURING'
    }
  ];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Posted': return 'bg-green-100 text-green-800';
      case 'Parked': return 'bg-yellow-100 text-yellow-800';
      case 'Reversed': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePostDocument = (document: PostingDocument): void => {
    // Document posting functionality
    console.log('Posting document:', document.document_number);
  };

  const handleReverseDocument = (document: PostingDocument): void => {
    // Document reversal functionality
    console.log('Reversing document:', document.document_number);
  };

  const handleBack = (): void => {
    window.history.back();
  };

  const getDocumentTypeDescription = (docType: string): string => {
    const types: { [key: string]: string } = {
      'SA': 'General Ledger Document',
      'KR': 'Vendor Invoice',
      'DR': 'Customer Invoice',
      'ZP': 'Payment Document',
      'AB': 'Asset Document',
      'DZ': 'Payment on Account'
    };
    const code = docType.split(' - ')[0];
    return types[code] || 'Unknown Document Type';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Document Posting System</h1>
          <Badge variant="secondary">Finance Module</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companyCodes.map((cc) => (
                <SelectItem key={cc.id} value={cc.code}>
                  {cc.code} - {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="default">
            <Plus className="h-4 w-4 mr-2" />
            New Posting
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{sapDocuments.length}</div>
                <p className="text-xs text-gray-600">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {sapDocuments.filter(d => d.status === 'Posted').length}
                </div>
                <p className="text-xs text-gray-600">Posted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {sapDocuments.filter(d => d.status === 'Parked').length}
                </div>
                <p className="text-xs text-gray-600">Parked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatAmount(sapDocuments.reduce((sum, doc) => sum + (doc.total_amount || 0), 0))}
                </div>
                <p className="text-xs text-gray-600">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Document Overview</TabsTrigger>
          <TabsTrigger value="posting">Posting Operations</TabsTrigger>
          <TabsTrigger value="line-items">Line Item Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Document Header Overview
              </CardTitle>
              <CardDescription>
                Financial documents for Company Code {selectedCompany} - Fiscal Year 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Doc Type</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Document Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Exchange Rate</TableHead>
                    <TableHead>Company Code</TableHead>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right">Total Credit</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User Created</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-600 mt-2">Loading documents...</p>
                      </TableCell>
                    </TableRow>
                  ) : sapDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">No accounting documents found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sapDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-sm">{doc.id}</TableCell>
                        <TableCell className="font-mono font-bold">{doc.document_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.document_type}</div>
                            <div className="text-sm text-gray-600">{getDocumentTypeDescription(doc.document_type)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{doc.posting_date ? format(new Date(doc.posting_date), "MMM dd, yyyy") : "-"}</TableCell>
                        <TableCell>{doc.document_date ? format(new Date(doc.document_date), "MMM dd, yyyy") : "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{doc.reference || "-"}</TableCell>
                        <TableCell>{doc.currency}</TableCell>
                        <TableCell>{doc.exchange_rate?.toFixed(4) || "1.0000"}</TableCell>
                        <TableCell className="font-mono">{doc.company_code}</TableCell>
                        <TableCell>{doc.fiscal_year}</TableCell>
                        <TableCell>{doc.period}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(doc.total_debit || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(doc.total_credit || 0)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatAmount(doc.total_amount || 0)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(doc.status || 'Pending')}>
                            {doc.status || 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{doc.user_created || "System"}</TableCell>
                        <TableCell className="text-sm">{doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy HH:mm") : "-"}</TableCell>
                        <TableCell className="text-sm">{doc.updated_at ? format(new Date(doc.updated_at), "MMM dd, yyyy HH:mm") : "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowDialog(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {doc.status === 'Parked' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePostDocument(doc)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Posting Operations</CardTitle>
              <CardDescription>Create new financial postings and manage document lifecycle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Create GL Posting</h3>
                        <p className="text-sm text-gray-600">General Ledger Document (SA)</p>
                        <Button className="mt-2" size="sm">Create Posting</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Customer Invoice</h3>
                        <p className="text-sm text-gray-600">Accounts Receivable (DR)</p>
                        <Button className="mt-2" size="sm" variant="outline">Create Invoice</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">Vendor Invoice</h3>
                        <p className="text-sm text-gray-600">Accounts Payable (KR)</p>
                        <Button className="mt-2" size="sm" variant="outline">Process Invoice</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">Payment Posting</h3>
                        <p className="text-sm text-gray-600">Payment Document (ZP)</p>
                        <Button className="mt-2" size="sm" variant="outline">Process Payment</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="line-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Line Items</CardTitle>
              <CardDescription>Detailed line item analysis with GL Account breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead>Debit Amount</TableHead>
                    <TableHead>Credit Amount</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Text</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.documentNumber}</TableCell>
                      <TableCell>{item.itemNumber}</TableCell>
                      <TableCell className="font-mono font-bold">{item.glAccount}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.debitAmount > 0 ? formatAmount(item.debitAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.creditAmount > 0 ? formatAmount(item.creditAmount) : '-'}
                      </TableCell>
                      <TableCell className="font-mono">{item.costCenter || '-'}</TableCell>
                      <TableCell>{item.text}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Document {selectedDocument?.document_number} - {selectedDocument?.document_type}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Number</Label>
                <Input value={selectedDocument?.document_number || ''} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Input value={selectedDocument?.document_type || ''} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Posting Date</Label>
                <Input value={selectedDocument?.posting_date || ''} />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={selectedDocument?.reference || ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Header Text</Label>
              <Input value={selectedDocument?.header_text || ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input value={formatAmount(selectedDocument?.total_amount || 0)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedDocument?.status || ''}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Parked">Parked</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}