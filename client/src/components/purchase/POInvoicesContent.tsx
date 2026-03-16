import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Eye, FileText, Plus, Download, Filter, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePOInvoiceDialog } from "./CreatePOInvoiceDialog";

interface POInvoice {
  id: number;
  invoice_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_code?: string;
  invoice_date: string;
  due_date: string;
  amount: string | number;
  net_amount: string | number;
  tax_amount: string | number;
  status: string;
  purchase_order_id: number | null;
  order_number?: string;
  currency?: string;
  created_at: string;
}

interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  line_item: number;
  material_id: number | null;
  material_code: string | null;
  quantity: number;
  unit: string | null;
  unit_price: string | number;
  net_amount: string | number | null;
  tax_rate: number | null;
  tax_amount: string | number | null;
  total_price: string | number;
  description: string | null;
}

export default function POInvoicesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<POInvoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // Fetch AP invoices linked to purchase orders
  const { data: invoices = [], isLoading, error, refetch } = useQuery<POInvoice[]>({
    queryKey: ['/api/ap/invoices'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ap/invoices', { method: 'GET' });
        const data = await response.json();
        // Filter to show only invoices with purchase_order_id
        const allInvoices = data.data || data || [];
        return allInvoices.filter((inv: POInvoice) => inv.purchase_order_id !== null && inv.purchase_order_id !== undefined);
      } catch (error) {
        console.error('Error fetching PO invoices:', error);
        return [];
      }
    },
  });

  // Fetch invoice line items when invoice is selected
  const { data: invoiceItems = [] } = useQuery<InvoiceLineItem[]>({
    queryKey: ['/api/ap/invoice', selectedInvoice?.id, 'items'],
    queryFn: async () => {
      if (!selectedInvoice?.id) return [];
      try {
        const response = await apiRequest(`/api/ap/invoice/${selectedInvoice.id}/items`, { method: 'GET' });
        const data = await response.json();
        return data.data || data || [];
      } catch (error) {
        console.error('Error fetching invoice items:', error);
        return [];
      }
    },
    enabled: !!selectedInvoice?.id,
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.vendor_name?.toLowerCase().includes(searchLower) ||
      invoice.vendor_code?.toLowerCase().includes(searchLower) ||
      invoice.order_number?.toLowerCase().includes(searchLower) ||
      invoice.status?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: string | number | null | undefined, currency?: string) => {
    if (amount === null || amount === undefined) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const currencyCode = currency || 'USD';  // Use provided currency or fallback to USD for formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'open' || statusLower === 'posted') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Open</Badge>;
    } else if (statusLower === 'partial' || statusLower === 'partially paid') {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    } else if (statusLower === 'paid' || statusLower === 'closed') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (statusLower === 'overdue') {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const handleViewDetails = (invoice: POInvoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  // **FIX: Add invoice approval handler**
  const handleApproveInvoice = async (invoice: POInvoice) => {
    try {
      const response = await apiRequest(`/api/ap/invoices/${invoice.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: 'Current User',
          notes: 'Approved via UI'
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Invoice ${invoice.invoice_number} approved successfully`
        });
        refetch(); // Refresh invoice list
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to approve invoice',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error approving invoice',
        variant: 'destructive'
      });
      console.error('Approve error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices by number, vendor, PO, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast({ title: "Refreshed", description: "Invoice data refreshed" });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({ title: "Filter", description: "Filter functionality coming soon" });
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({ title: "Export", description: "Export functionality coming soon" });
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Invoices</CardTitle>
          <CardDescription>
            Vendor invoices linked to purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading invoices...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading invoices. Please try again.
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.vendor_name || '-'}</div>
                          {invoice.vendor_code && (
                            <div className="text-xs text-muted-foreground">{invoice.vendor_code}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.order_number || `PO-${invoice.purchase_order_id}`}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.net_amount, invoice.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Approve button - only show for Open/pending_approval status */}
                          {(invoice.status === 'Open' || invoice.status === 'pending_approval') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveInvoice(invoice)}
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve Invoice"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {/* View details button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(invoice)}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No invoices match your search.' : 'No purchase order invoices found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Invoice {selectedInvoice?.invoice_number} - {selectedInvoice?.vendor_name}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              {/* Invoice Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Number</div>
                  <div className="font-medium">{selectedInvoice.invoice_number}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Date</div>
                  <div>{formatDate(selectedInvoice.invoice_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div>{formatDate(selectedInvoice.due_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Purchase Order</div>
                  <div>{selectedInvoice.order_number || `PO-${selectedInvoice.purchase_order_id}`}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Currency</div>
                  <div>{selectedInvoice.currency || '—'}</div>
                </div>
              </div>

              {/* Invoice Line Items */}
              <div>
                <h3 className="font-semibold mb-2">Line Items</h3>
                {invoiceItems.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Line</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Net Amount</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.line_item}</TableCell>
                            <TableCell>{item.material_code || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.description || '-'}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.net_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.tax_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(item.total_price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No line items found for this invoice.
                  </div>
                )}
              </div>

              {/* Invoice Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Amount:</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.net_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Amount:</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Amount:</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <CreatePOInvoiceDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            refetch(); // Refresh invoice list when dialog closes
          }
        }}
      />
    </div>
  );
}

