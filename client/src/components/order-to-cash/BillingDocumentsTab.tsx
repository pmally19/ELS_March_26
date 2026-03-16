import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  FileText,
  Eye,
  Truck,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function BillingDocumentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showDeliveriesDialog, setShowDeliveriesDialog] = useState(false);

  // Fetch billing documents
  const { data: billingDocs, isLoading: loadingBilling, refetch: refetchBillingDocs } = useQuery({
    queryKey: ["/api/order-to-cash/billing-documents"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/billing-documents");
      return await response.json();
    },
  });

  // Fetch deliveries ready for billing
  const { data: deliveriesForBilling, isLoading: loadingDeliveries, refetch: refetchDeliveriesForBilling } = useQuery({
    queryKey: ["/api/order-to-cash/deliveries-for-billing"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/deliveries-for-billing");
      return await response.json();
    },
  });

  // Create billing document mutation
  const createBillingMutation = useMutation({
    mutationFn: async (deliveryId: number) => {
      const response = await apiRequest("/api/order-to-cash/billing-documents", {
        method: "POST",
        body: JSON.stringify({ deliveryId }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Created Successfully",
        description: `Billing document ${data.billingDocument?.billingNumber} created with total amount ${data.billingDocument?.totalAmount}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/billing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/deliveries-for-billing"] });
      setShowDeliveriesDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Invoice Creation Failed",
        description: error.message || "Failed to create billing document",
        variant: "destructive",
      });
    },
  });

  // View invoice details
  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const response = await apiRequest(`/api/order-to-cash/billing-documents/${invoiceId}`);
      const data = await response.json();
      setSelectedInvoice(data.billingDocument);
      setShowInvoiceDetails(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return <Badge variant="default">Open</Badge>;
      case "PAID":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "OVERDUE":
        return <Badge variant="secondary">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Receipt className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold">
                {billingDocs?.data?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Total Invoices</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <div className="text-2xl font-bold">
                {billingDocs?.data?.filter((d: any) => d.posting_status === "OPEN").length || 0}
              </div>
              <div className="text-sm text-gray-600">Open Invoices</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Truck className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold">
                {deliveriesForBilling?.data?.filter((d: any) => d.canBeBilled).length || 0}
              </div>
              <div className="text-sm text-gray-600">Ready to Bill</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CreditCard className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold">
                $
                {(
                  billingDocs?.data?.reduce(
                    (sum: number, doc: any) => sum + parseFloat(doc.total_amount || 0),
                    0
                  ) || 0
                ).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => setShowDeliveriesDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Receipt className="h-4 w-4 mr-2" />
          Create Invoice from Delivery
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            // Invalidate and refetch both queries
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/billing-documents"] }),
              queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/deliveries-for-billing"] }),
              refetchBillingDocs(),
              refetchDeliveriesForBilling(),
            ]);
            toast({
              title: "Data Refreshed",
              description: "Billing documents and deliveries data has been updated",
            });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Billing Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Documents</CardTitle>
          <p className="text-sm text-gray-600">All created invoices and their status</p>
        </CardHeader>
        <CardContent>
          {loadingBilling ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading billing documents...</p>
            </div>
          ) : !billingDocs?.data || billingDocs.data.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No billing documents found</p>
              <p className="text-sm text-gray-500">Create your first invoice from a delivered order</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingDocs.data.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.billing_number}</TableCell>
                    <TableCell>{doc.customer_name}</TableCell>
                    <TableCell>{doc.sales_order_number}</TableCell>
                    <TableCell>{doc.delivery_number}</TableCell>
                    <TableCell>
                      {doc.billing_date ? format(new Date(doc.billing_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {doc.due_date ? format(new Date(doc.due_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        ${parseFloat(doc.total_amount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Tax: ${parseFloat(doc.tax_amount || 0).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.posting_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(doc.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/api/order-to-cash/billing-documents/${doc.id}/download`}
                        >
                          <Download className="h-4 w-4" />
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

      {/* Deliveries Ready for Billing Dialog */}
      <Dialog open={showDeliveriesDialog} onOpenChange={setShowDeliveriesDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Invoice from Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingDeliveries ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-600 mt-2">Loading deliveries...</p>
              </div>
            ) : !deliveriesForBilling?.data || deliveriesForBilling.data.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No deliveries ready for billing</p>
                <p className="text-sm text-gray-500">Complete a delivery first to create an invoice</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery Number</TableHead>
                    <TableHead>Sales Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-right">Estimated Amount</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveriesForBilling.data.map((delivery: any) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                      <TableCell>{delivery.sales_order_number}</TableCell>
                      <TableCell>{delivery.customer_name}</TableCell>
                      <TableCell>
                        {delivery.delivery_date
                          ? format(new Date(delivery.delivery_date), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(delivery.estimated_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {delivery.billingBlocked ? (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">Blocked</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => createBillingMutation.mutate(delivery.id)}
                            disabled={createBillingMutation.isPending}
                          >
                            {createBillingMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Receipt className="h-4 w-4 mr-2" />
                                Create Invoice
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.billing_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Customer Information (Sold-To/Bill-To)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-1">
                      <div><span className="font-medium">Name:</span> {selectedInvoice.customer_name}</div>
                      <div><span className="font-medium">Email:</span> {selectedInvoice.customer_email}</div>
                      <div>
                        <span className="font-medium">Address:</span><br/> 
                        {selectedInvoice.customer_address}<br/>
                        {[selectedInvoice.city, selectedInvoice.state, selectedInvoice.postal_code].filter(Boolean).join(', ')}
                      </div>
                    </div>

                    {selectedInvoice.ship_to_address && (
                      <div className="space-y-1 pt-2 border-t">
                        <span className="font-semibold text-xs text-gray-500 uppercase">Ship-To Address</span>
                        <div>
                          {selectedInvoice.ship_to_address}<br/>
                          {[selectedInvoice.ship_to_city, selectedInvoice.ship_to_state].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Invoice Date:</span>{" "}
                      {selectedInvoice.billing_date
                        ? format(new Date(selectedInvoice.billing_date), "MMM dd, yyyy")
                        : "-"}
                    </div>
                    <div>
                      <span className="font-medium">Due Date:</span>{" "}
                      {selectedInvoice.due_date
                        ? format(new Date(selectedInvoice.due_date), "MMM dd, yyyy")
                        : "-"}
                    </div>
                    <div>
                      <span className="font-medium">Sales Order:</span>{" "}
                      {selectedInvoice.sales_order_number}
                    </div>
                    <div>
                      <span className="font-medium">Delivery:</span> {selectedInvoice.delivery_number}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items with Pricing Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Invoice Line Items &amp; Price Breakdown</CardTitle>
                  <p className="text-xs text-gray-500">Pricing chain: List Price → Discounts → Net Value → Tax → Total</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInvoice.items?.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      {/* Item summary row */}
                      <div className="bg-gray-50 px-4 py-2 grid grid-cols-6 gap-2 text-xs font-semibold text-gray-600 border-b">
                        <span>Material</span>
                        <span className="col-span-2">Description</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Unit Price</span>
                        <span className="text-right">Net Amount</span>
                      </div>
                      <div className="px-4 py-2 grid grid-cols-6 gap-2 text-sm">
                        <span className="font-medium">{item.material_code || item.material_id || '-'}</span>
                        <span className="col-span-2">{item.material_description || item.product_name || 'N/A'}</span>
                        <span className="text-right">{parseFloat(item.billing_quantity || 0).toFixed(2)} {item.unit || 'EA'}</span>
                        <span className="text-right">{parseFloat(item.unit_price || 0).toFixed(2)}</span>
                        <span className="text-right font-semibold">{parseFloat(item.net_amount || 0).toFixed(2)}</span>
                      </div>

                      {/* Pricing Conditions from sales_order_item_conditions */}
                      {item.pricing_conditions && item.pricing_conditions.length > 0 && (
                        <div className="border-t">
                          <div className="px-4 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border-b">
                            Pricing Conditions
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 bg-gray-50 border-b">
                                <th className="text-left px-3 py-1">Step</th>
                                <th className="text-left px-3 py-1">Type</th>
                                <th className="text-left px-3 py-1">Description</th>
                                <th className="text-left px-3 py-1">Acct Key</th>
                                <th className="text-right px-3 py-1">Base Value</th>
                                <th className="text-right px-3 py-1">Rate</th>
                                <th className="text-right px-3 py-1">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.pricing_conditions.map((cond: any, ci: number) => {
                                const amount = parseFloat(cond.amount ?? cond.base_value ?? 0);
                                const isTax = cond.is_tax === true || cond.condition_type === 'MWST';
                                const isNegative = amount < 0;
                                const isCost = cond.condition_type === 'VPRS';
                                const condType = cond.condition_type ?? cond.type ?? '';
                                if (!condType && amount === 0) return null;
                                return (
                                  <tr key={ci} className={"border-b last:border-0 " + (
                                    isTax ? 'bg-amber-50' :
                                      isNegative ? 'bg-red-50' :
                                        isCost ? 'bg-gray-50' : ''
                                  )}>
                                    <td className="px-3 py-1 font-mono text-gray-400">{cond.step ?? cond.step_number ?? '-'}</td>
                                    <td className="px-3 py-1 font-mono font-bold">{condType || '-'}</td>
                                    <td className="px-3 py-1">{cond.condition_name ?? cond.name ?? '-'}</td>
                                    <td className="px-3 py-1 font-mono text-blue-600 text-xs">{cond.account_key ?? '-'}</td>
                                    <td className="px-3 py-1 text-right">{parseFloat(cond.base_value || 0).toFixed(2)}</td>
                                    <td className="px-3 py-1 text-right">{cond.rate != null ? parseFloat(cond.rate).toFixed(2) + (cond.calculation_type === '%' || cond.calculationType === '%' ? '%' : '') : '-'}</td>
                                    <td className={"px-3 py-1 text-right font-semibold " + (
                                      isTax ? 'text-amber-700' : isNegative ? 'text-red-600' : isCost ? 'text-gray-400' : 'text-gray-900'
                                    )}>
                                      {isNegative ? '-' : ''}
                                      {Math.abs(amount).toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="px-4 py-2 bg-gray-50 border-t flex justify-end gap-6 text-xs">
                            <span>Net: <span className="font-semibold">{parseFloat(item.net_amount || 0).toFixed(2)}</span></span>
                            <span>Tax: <span className="font-semibold text-amber-700">{parseFloat(item.tax_amount || 0).toFixed(2)}</span></span>
                            <span className="font-bold">Item Total: {(parseFloat(item.net_amount || 0) + parseFloat(item.tax_amount || 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Document Totals */}
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                      <span>Net Amount:</span>
                      <span className="font-semibold">{parseFloat(selectedInvoice.net_amount || 0).toFixed(2)}</span>
                    </div>
                    {selectedInvoice.tax_breakdown && Array.isArray(selectedInvoice.tax_breakdown) && selectedInvoice.tax_breakdown.length > 0 ? (
                      <div className="space-y-1">
                        {selectedInvoice.tax_breakdown.map((tax: any, index: number) => (
                          <div key={index} className="flex justify-between text-amber-700">
                            <span>{tax.title || tax.rule_code || "Tax " + (index + 1)}{tax.rate_percent ? " (" + tax.rate_percent + "%)" : ""}:</span>
                            <span className="font-semibold">{parseFloat(tax.amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm text-gray-600 pt-1 border-t">
                          <span>Total Tax Amount:</span>
                          <span>{parseFloat(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span>Tax Amount:</span>
                        <span className="font-semibold text-amber-700">{parseFloat(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total Amount:</span>
                      <span>{parseFloat(selectedInvoice.total_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

