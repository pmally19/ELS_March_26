import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Play, Edit, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ParkedDocument {
  id: number;
  document_number: string;
  vendor_id: number;
  vendor_name: string;
  document_type: string;
  document_date: string;
  amount: number;
  currency: string;
  status: string;
  parked_by: string;
  parked_date: string;
  incomplete_reason: string;
  line_item_count: number;
}

interface LineItem {
  id?: number;
  line_number: number;
  gl_account: string;
  amount_document_currency: number;
  debit_credit: string;
  tax_code?: string;
  cost_center?: string;
  line_item_text?: string;
}

export default function DocumentParkingTile() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ParkedDocument | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ line_number: 1, gl_account: '', amount_document_currency: 0, debit_credit: 'D' }]);
  const queryClient = useQueryClient();

  // Fetch parked documents - using invoices with status 'parked' or similar
  const { data: invoices } = useQuery({
    queryKey: ['/api/ap/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/ap/invoices?status=parked');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
    refetchInterval: 30000
  });

  const parkedDocuments = invoices && Array.isArray(invoices) 
    ? invoices.map((inv: any) => ({
        id: inv.id,
        document_number: inv.invoice_number,
        vendor_id: inv.vendor_id,
        vendor_name: inv.vendor_name,
        document_type: 'invoice',
        document_date: inv.invoice_date,
        amount: parseFloat(inv.net_amount || inv.amount || 0),
        currency: inv.currency || 'USD',
        status: 'parked',
        parked_by: 'System',
        parked_date: inv.created_at,
        incomplete_reason: inv.notes || 'Pending completion',
        line_item_count: 1
      }))
    : [];

  // Fetch vendors for dropdown
  const { data: vendors } = useQuery({
    queryKey: ['/api/ap/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendors');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Enhanced statistics - derived from invoices
  const enhancedStats = {
    parked_documents: parkedDocuments.length,
    pending_posting: parkedDocuments.filter((doc: any) => doc.status === 'parked').length,
    posted_today: 0,
    line_items: parkedDocuments.reduce((sum: number, doc: any) => sum + (doc.line_item_count || 1), 0)
  };

  // Create parked document mutation - create as pending invoice
  const createParkedDocMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create invoice with status 'pending' or 'parked'
      const response = await fetch('/api/ap/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: parseInt(String(data.vendor_id || '0')),
          invoice_number: String(data.document_number || `INV-${Date.now()}`),
          invoice_date: String(data.document_date || data.invoice_date || new Date().toISOString().split('T')[0]),
          due_date: String(data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          amount: parseFloat(String(data.amount || '0')),
          net_amount: parseFloat(String(data.amount || '0')),
          tax_amount: 0,
          discount_amount: 0,
          payment_terms: String(data.payment_terms || 'NET30'),
          status: 'pending',
          notes: String(data.incomplete_reason || data.document_header_text || 'Parked document'),
          company_code_id: data.company_code_id ? parseInt(String(data.company_code_id)) : null,
          currency_id: null,
          purchase_order_id: null,
          plant_id: null
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to park document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ap/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/invoice-statistics'] });
      setIsCreateDialogOpen(false);
      setLineItems([{ line_number: 1, gl_account: '', amount_document_currency: 0, debit_credit: 'D' }]);
    }
  });

  // Post parked document mutation - update invoice status to approved
  const postDocumentMutation = useMutation({
    mutationFn: async ({ documentId, postedBy }: { documentId: number, postedBy: string }) => {
      // Update invoice status to approved
      const response = await fetch(`/api/ap/invoices`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const invoicesData = await response.json();
      const invoices = invoicesData.data || invoicesData || [];
      const invoice = invoices.find((inv: any) => inv.id === documentId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // For now, just return success - actual posting would update the invoice status
      return { success: true, message: 'Document posting not yet fully implemented' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ap/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/invoice-statistics'] });
    }
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      line_number: lineItems.length + 1, 
      gl_account: '', 
      amount_document_currency: 0, 
      debit_credit: 'D' 
    }]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    // Renumber line items
    updated.forEach((item, i) => item.line_number = i + 1);
    setLineItems(updated);
  };

  const handleCreateDocument = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const formDataObj: any = Object.fromEntries(formData.entries());
    
    // Build data object with proper types (not using FormData for complex types)
    const data: any = {
      vendor_id: formDataObj.vendor_id || '',
      document_number: formDataObj.document_number || '',
      document_date: formDataObj.document_date || '',
      invoice_date: formDataObj.invoice_date || '',
      due_date: formDataObj.due_date || '',
      amount: formDataObj.amount || '0',
      payment_terms: formDataObj.payment_terms || 'NET30',
      incomplete_reason: formDataObj.incomplete_reason || '',
      document_header_text: formDataObj.document_header_text || '',
      company_code_id: formDataObj.company_code_id || null,
      line_items: lineItems.filter(item => item.gl_account && item.amount_document_currency),
      calculate_tax: formData.has('calculate_tax'),
      parked_by: 'Current User', // In real app, get from session
    };
    
    createParkedDocMutation.mutate(data);
  };

  const handlePostDocument = (document: ParkedDocument) => {
    postDocumentMutation.mutate({
      documentId: document.id,
      postedBy: 'Current User'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parked':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Parked</Badge>;
      case 'posted':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Posted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Parking
            </CardTitle>
            <CardDescription>
              Save incomplete vendor invoices for later completion and posting
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-50">
            <FileText className="w-3 h-3 mr-1" />
            NEW
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parked">Parked Documents</TabsTrigger>
            <TabsTrigger value="create">Park Document</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">
                  {enhancedStats?.parked_documents || 0}
                </div>
                <div className="text-sm text-orange-600">Parked Documents</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {parkedDocuments?.filter((doc: ParkedDocument) => doc.status === 'parked').length || 0}
                </div>
                <div className="text-sm text-blue-600">Pending Posting</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {parkedDocuments?.filter((doc: ParkedDocument) => doc.status === 'posted').length || 0}
                </div>
                <div className="text-sm text-green-600">Posted</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Park New Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Park Document</DialogTitle>
                    <DialogDescription>
                      Save an incomplete vendor invoice for later completion
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateDocument} className="space-y-6">
                    {/* Header Information */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_id">Vendor *</Label>
                        <Select name="vendor_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors?.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document_date">Document Date *</Label>
                        <Input name="document_date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="posting_date">Posting Date *</Label>
                        <Input name="posting_date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company_code">Company Code</Label>
                        <Input name="company_code" placeholder="e.g., 1020" defaultValue="1020" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency *</Label>
                        <Select name="currency" defaultValue="USD">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input name="amount" type="number" step="0.01" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invoice_date">Invoice Date</Label>
                        <Input name="invoice_date" type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reference">Reference</Label>
                        <Input name="reference" placeholder="Reference number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment_terms">Payment Terms</Label>
                        <Input name="payment_terms" placeholder="e.g., NET30" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document_header_text">Document Header Text</Label>
                      <Textarea name="document_header_text" placeholder="Additional document information" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="incomplete_reason">Reason for Parking</Label>
                      <Textarea name="incomplete_reason" placeholder="Why is this document being parked?" required />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch name="calculate_tax" />
                      <Label>Calculate tax automatically</Label>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Line Items</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Line
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {lineItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-6 gap-2 p-2 border rounded">
                            <Input
                              placeholder="G/L Account"
                              value={item.gl_account}
                              onChange={(e) => updateLineItem(index, 'gl_account', e.target.value)}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={item.amount_document_currency}
                              onChange={(e) => updateLineItem(index, 'amount_document_currency', parseFloat(e.target.value) || 0)}
                            />
                            <Select
                              value={item.debit_credit}
                              onValueChange={(value) => updateLineItem(index, 'debit_credit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="D">Debit</SelectItem>
                                <SelectItem value="C">Credit</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Tax Code"
                              value={item.tax_code || ''}
                              onChange={(e) => updateLineItem(index, 'tax_code', e.target.value)}
                            />
                            <Input
                              placeholder="Cost Center"
                              value={item.cost_center || ''}
                              onChange={(e) => updateLineItem(index, 'cost_center', e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              disabled={lineItems.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createParkedDocMutation.isPending}>
                        {createParkedDocMutation.isPending ? 'Parking...' : 'Park Document'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Recent Parked Documents */}
            <div className="space-y-2">
              <h4 className="font-medium">Recent Parked Documents</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parkedDocuments?.slice(0, 5).map((doc: ParkedDocument) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_number}</TableCell>
                      <TableCell>{doc.vendor_name}</TableCell>
                      <TableCell>{doc.currency} {doc.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(doc.document_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {doc.status === 'parked' && (
                            <Button
                              size="sm"
                              onClick={() => handlePostDocument(doc)}
                              disabled={postDocumentMutation.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="parked" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">All Parked Documents</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Document Date</TableHead>
                    <TableHead>Parked By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parkedDocuments?.map((doc: ParkedDocument) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_number}</TableCell>
                      <TableCell>{doc.vendor_name}</TableCell>
                      <TableCell>{doc.currency} {doc.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(doc.document_date).toLocaleDateString()}</TableCell>
                      <TableCell>{doc.parked_by}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelectedDocument(doc)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {doc.status === 'parked' && (
                            <Button
                              size="sm"
                              onClick={() => handlePostDocument(doc)}
                              disabled={postDocumentMutation.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Park a New Document</h3>
              <p className="text-gray-600 mb-4">
                Use the "Park New Document" button to save incomplete vendor invoices
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Park Document
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}