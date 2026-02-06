import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, FileText, Eye, AlertCircle, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface InvoiceVerification {
  id: number;
  invoiceNumber: string;
  salesOrderNumber: string;
  customerName: string;
  invoiceDate: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_required';
  verifiedBy?: string;
  verificationDate?: string;
  verificationNotes?: string;
  approvalLevel: number;
  requiredApprovals: number;
  currentApprovers: string[];
  lineItems: InvoiceLineItem[];
}

interface InvoiceLineItem {
  id: number;
  materialCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  verified: boolean;
  discrepancyNotes?: string;
}

export default function InvoiceVerification() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceVerification | null>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [verificationData, setVerificationData] = useState({
    status: '',
    notes: '',
    lineItemAdjustments: [] as any[]
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoices pending verification
  const { data: pendingInvoices = [], isLoading } = useQuery({
    queryKey: ['/api/sales/invoice-verification', 'pending'],
    queryFn: async () => {
      const response = await apiRequest('/api/sales/invoice-verification?status=pending');
      return Array.isArray(response) ? response : samplePendingInvoices;
    }
  });

  // Fetch all invoices for verification history
  const { data: allInvoices = [] } = useQuery({
    queryKey: ['/api/sales/invoice-verification', 'all'],
    queryFn: async () => {
      const response = await apiRequest('/api/sales/invoice-verification');
      return Array.isArray(response) ? response : [...samplePendingInvoices, ...sampleCompletedInvoices];
    }
  });

  // Submit verification
  const verifyInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/sales/invoice-verification', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice verification completed successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/invoice-verification'] });
      setVerificationDialog(false);
      setSelectedInvoice(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete invoice verification",
        variant: "destructive"
      });
    }
  });

  const handleVerification = (action: 'approve' | 'reject' | 'revision') => {
    if (!selectedInvoice) return;

    const verificationPayload = {
      invoiceId: selectedInvoice.id,
      action,
      notes: verificationData.notes,
      lineItemAdjustments: verificationData.lineItemAdjustments,
      verifiedBy: 'Current User', // Get from session
      verificationDate: new Date().toISOString()
    };

    verifyInvoiceMutation.mutate(verificationPayload);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: "bg-yellow-100 text-yellow-800" },
      approved: { icon: CheckCircle, color: "bg-green-100 text-green-800" },
      rejected: { icon: XCircle, color: "bg-red-100 text-red-800" },
      revision_required: { icon: AlertCircle, color: "bg-orange-100 text-orange-800" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    
    return (
      <Badge className={config?.color || "bg-gray-100 text-gray-800"}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredInvoices = selectedTab === 'pending' 
    ? pendingInvoices 
    : allInvoices.filter(inv => inv.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoice Verification</h1>
          <p className="text-sm text-muted-foreground">Verify and approve customer invoices before finalization</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Verification ({pendingInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed Verifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices Pending Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading invoices...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Sales Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.salesOrderNumber}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell>{invoice.currency} {invoice.amount.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.amount > 10000 ? "destructive" : "secondary"}>
                            {invoice.amount > 10000 ? "High" : "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setVerificationDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified By</TableHead>
                    <TableHead>Verification Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{invoice.currency} {invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {invoice.verifiedBy || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.verificationDate 
                          ? new Date(invoice.verificationDate).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <FileText className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Verification Dialog */}
      <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Verify Invoice: {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p>{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sales Order</Label>
                  <p>{selectedInvoice.salesOrderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Invoice Date</Label>
                  <p>{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="font-bold">{selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Line Items Verification */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Invoice Line Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Line Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.materialCode}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{selectedInvoice.currency} {item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>{selectedInvoice.currency} {item.lineAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.verified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Verification Notes */}
              <div>
                <Label htmlFor="verification-notes">Verification Notes</Label>
                <Textarea
                  id="verification-notes"
                  placeholder="Add verification comments, discrepancies, or approval notes..."
                  value={verificationData.notes}
                  onChange={(e) => setVerificationData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setVerificationDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleVerification('reject')}
                  disabled={verifyInvoiceMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => handleVerification('revision')}
                  disabled={verifyInvoiceMutation.isPending}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Request Revision
                </Button>
                <Button 
                  onClick={() => handleVerification('approve')}
                  disabled={verifyInvoiceMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sample data for development
const samplePendingInvoices: InvoiceVerification[] = [
  {
    id: 1,
    invoiceNumber: "INV-2024-1001",
    salesOrderNumber: "SO-2024-0501",
    customerName: "TechNova Inc",
    invoiceDate: "2024-01-15",
    amount: 15750.00,
    currency: "USD",
    status: "pending",
    approvalLevel: 1,
    requiredApprovals: 2,
    currentApprovers: ["Manager A", "Director B"],
    lineItems: [
      {
        id: 1,
        materialCode: "TECH-001",
        description: "Advanced Software License",
        quantity: 5,
        unitPrice: 2500.00,
        lineAmount: 12500.00,
        verified: true
      },
      {
        id: 2,
        materialCode: "SUPP-002",
        description: "Implementation Services",
        quantity: 1,
        unitPrice: 3250.00,
        lineAmount: 3250.00,
        verified: false,
        discrepancyNotes: "Verify service delivery completion"
      }
    ]
  },
  {
    id: 2,
    invoiceNumber: "INV-2024-1002",
    salesOrderNumber: "SO-2024-0502",
    customerName: "Global Manufacturing Corp",
    invoiceDate: "2024-01-16",
    amount: 8900.00,
    currency: "USD",
    status: "pending",
    approvalLevel: 1,
    requiredApprovals: 1,
    currentApprovers: ["Supervisor C"],
    lineItems: [
      {
        id: 3,
        materialCode: "PROD-105",
        description: "Industrial Equipment",
        quantity: 2,
        unitPrice: 4450.00,
        lineAmount: 8900.00,
        verified: true
      }
    ]
  }
];

const sampleCompletedInvoices: InvoiceVerification[] = [
  {
    id: 3,
    invoiceNumber: "INV-2024-0995",
    salesOrderNumber: "SO-2024-0495",
    customerName: "Retail Solutions Ltd",
    invoiceDate: "2024-01-10",
    amount: 5200.00,
    currency: "USD",
    status: "approved",
    verifiedBy: "John Smith",
    verificationDate: "2024-01-12",
    verificationNotes: "All line items verified against delivery confirmation",
    approvalLevel: 2,
    requiredApprovals: 2,
    currentApprovers: [],
    lineItems: []
  }
];