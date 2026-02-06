import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, DollarSign, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface InvoiceProcessingTileProps {
  onBack: () => void;
}

export default function InvoiceProcessingTile({ onBack }: InvoiceProcessingTileProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AP invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/ap/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/ap/invoices');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Fetch invoice statistics
  const { data: invoiceStats = {} } = useQuery({
    queryKey: ['/api/ap/invoice-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/invoice-statistics');
      if (!response.ok) return {};
      const data = await response.json();
      return data.data || data || {};
    },
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/ap/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendors');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Fetch invoice line items when an invoice is selected
  const { data: invoiceItems = [] } = useQuery({
    queryKey: ['/api/ap/invoice-items', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return [];
      try {
        const response = await fetch(`/api/ap/invoice/${selectedInvoice.id}/items`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || data || [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedInvoice?.id,
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      return await apiRequest('/api/ap/create-invoice', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Invoice Created",
        description: "New invoice has been created and is pending approval.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/invoice-statistics'] });
      setShowInvoiceForm(false);
      setVendorId("");
      setInvoiceNumber("");
      setAmount("");
      setDueDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredInvoices = Array.isArray(invoices) 
    ? invoices.filter((invoice: any) =>
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending_approval':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500 text-white">Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-800 text-white">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateInvoice = () => {
    if (!vendorId || !invoiceNumber || !amount || !dueDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createInvoiceMutation.mutate({
      vendor_id: vendorId,
      invoice_number: invoiceNumber,
      amount: parseFloat(amount),
      due_date: dueDate,
      invoice_date: new Date().toISOString(),
      status: 'pending_approval',
      created_by: 'Current User',
      created_date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Invoice Processing</h2>
        <Button variant="outline" onClick={onBack}>
          Back to AP Dashboard
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-blue-600">
                  {invoiceStats.total_invoices || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {invoiceStats.pending_approval || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  ${Number(invoiceStats?.total_value || 0).toFixed(0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {invoiceStats.overdue_count || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Creation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create New Invoice</CardTitle>
            <Button
              onClick={() => setShowInvoiceForm(!showInvoiceForm)}
              variant={showInvoiceForm ? "outline" : "default"}
            >
              {showInvoiceForm ? 'Hide Form' : 'New Invoice'}
            </Button>
          </div>
        </CardHeader>
        {showInvoiceForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(vendors) && vendors.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-2025-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                onClick={handleCreateInvoice}
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice List</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No invoices found</TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.vendor_name}</TableCell>
                      <TableCell>${Number(invoice.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{invoice.due_date}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              View complete details for invoice {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Invoice Number</Label>
                  <p className="text-sm">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Vendor</Label>
                  <p className="text-sm">{selectedInvoice.vendor_name || 'N/A'}</p>
                  {selectedInvoice.vendor_code && (
                    <p className="text-xs text-muted-foreground">Code: {selectedInvoice.vendor_code}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-semibold">Invoice Date</Label>
                  <p className="text-sm">
                    {selectedInvoice.invoice_date 
                      ? new Date(selectedInvoice.invoice_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Due Date</Label>
                  <p className="text-sm">
                    {selectedInvoice.due_date 
                      ? new Date(selectedInvoice.due_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Payment Terms</Label>
                  <p className="text-sm">{selectedInvoice.payment_terms || 'N/A'}</p>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-semibold">Net Amount</Label>
                  <p className="text-lg font-bold">${Number(selectedInvoice.net_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Tax Amount</Label>
                  <p className="text-lg font-bold">${Number(selectedInvoice.tax_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total Amount</Label>
                  <p className="text-lg font-bold text-primary">${Number(selectedInvoice.amount || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Line Items */}
              {invoiceItems.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Line Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Tax Rate</TableHead>
                        <TableHead>Net Amount</TableHead>
                        <TableHead>Tax Amount</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item: any, index: number) => (
                        <TableRow key={item.id || index}>
                          <TableCell>{item.line_item || index + 1}</TableCell>
                          <TableCell>{item.description || 'N/A'}</TableCell>
                          <TableCell>{item.quantity || '0'} {item.unit || ''}</TableCell>
                          <TableCell>${Number(item.unit_price || 0).toFixed(2)}</TableCell>
                          <TableCell>{Number(item.tax_rate || 0).toFixed(2)}%</TableCell>
                          <TableCell>${Number(item.net_amount || 0).toFixed(2)}</TableCell>
                          <TableCell>${Number(item.tax_amount || 0).toFixed(2)}</TableCell>
                          <TableCell>${Number(item.total_price || item.net_amount + item.tax_amount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Additional Information */}
              {(selectedInvoice.notes || selectedInvoice.reference) && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Additional Information</Label>
                  {selectedInvoice.notes && (
                    <div className="mb-2">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <p className="text-sm">{selectedInvoice.notes}</p>
                    </div>
                  )}
                  {selectedInvoice.reference && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reference</Label>
                      <p className="text-sm">{selectedInvoice.reference}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}