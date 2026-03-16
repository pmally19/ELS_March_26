import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Loader2, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceView() {
  const [, params] = useRoute("/transactions/invoice/view/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { toast } = useToast();

  const { data: invoiceResponse, isLoading, error } = useQuery({
    queryKey: ["/api/order-to-cash/billing-documents", id],
    queryFn: async () => {
      const response = await apiRequest(`/api/order-to-cash/billing-documents/${id}`);
      return await response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading invoice details...</span>
      </div>
    );
  }

  if (error || !invoiceResponse?.billingDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-destructive font-medium">Error loading invoice</div>
        <div className="text-muted-foreground">
          {(error as Error)?.message || "Invoice not found or access denied"}
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const invoice = invoiceResponse.billingDocument;

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
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Invoice {invoice.billing_number}
              {getStatusBadge(invoice.posting_status)}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
              <FileText className="h-3.5 w-3.5" />
              Billed on {invoice.billing_date ? format(new Date(invoice.billing_date), "PPP") : "N/A"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
          <Button variant="outline" onClick={() => window.location.href = `/api/order-to-cash/billing-documents/${id}/download`}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium text-right">{invoice.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-right">{invoice.customer_email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span className="font-medium text-right">{invoice.customer_address || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Document References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sales Order:</span>
              <span className="font-medium text-right underline cursor-pointer hover:text-primary" onClick={() => setLocation(`/sales/orders/view/${invoice.sales_order_id}`)}>
                {invoice.sales_order_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery:</span>
              <span className="font-medium text-right underline cursor-pointer hover:text-primary" onClick={() => setLocation(`/logistics/delivery/view/${invoice.delivery_id}`)}>
                {invoice.delivery_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium text-right">
                {invoice.due_date ? format(new Date(invoice.due_date), "MMM dd, yyyy") : "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Line Items & Pricing Breakdown</CardTitle>
          <p className="text-xs text-muted-foreground">Detailed view of products, taxes, and discounts applied.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {invoice.items?.map((item: any, index: number) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 grid grid-cols-6 gap-2 text-xs font-semibold text-muted-foreground border-b uppercase tracking-wider">
                <span>Material</span>
                <span className="col-span-2">Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Net Amount</span>
              </div>
              <div className="px-4 py-3 grid grid-cols-6 gap-2 text-sm items-center">
                <span className="font-mono font-medium">{item.material_code || item.material_id || '-'}</span>
                <span className="col-span-2">{item.material_description || item.product_name || 'N/A'}</span>
                <span className="text-right">{parseFloat(item.billing_quantity || 0).toFixed(2)} {item.unit || 'EA'}</span>
                <span className="text-right">${parseFloat(item.unit_price || 0).toLocaleString()}</span>
                <span className="text-right font-bold text-primary">${parseFloat(item.net_amount || 0).toLocaleString()}</span>
              </div>

              {/* Pricing Conditions */}
              {item.pricing_conditions && item.pricing_conditions.length > 0 && (
                <div className="border-t">
                  <div className="px-4 py-1 text-[10px] font-bold text-blue-700 bg-blue-50/50 border-b uppercase tracking-widest">
                    Pricing Conditions
                  </div>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground bg-muted/10 border-b">
                        <th className="text-left px-4 py-1.5 font-medium">Type</th>
                        <th className="text-left px-4 py-1.5 font-medium">Description</th>
                        <th className="text-left px-4 py-1.5 font-medium">Acct Key</th>
                        <th className="text-right px-4 py-1.5 font-medium">Base Value</th>
                        <th className="text-right px-4 py-1.5 font-medium">Rate</th>
                        <th className="text-right px-4 py-1.5 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/10">
                      {item.pricing_conditions.map((cond: any, ci: number) => {
                        const amount = parseFloat(cond.amount ?? cond.base_value ?? 0);
                        const isTax = cond.is_tax === true || cond.condition_type === 'MWST';
                        const isNegative = amount < 0;
                        const condType = cond.condition_type ?? cond.type ?? '';
                        if (!condType && amount === 0) return null;
                        return (
                          <tr key={ci} className={isTax ? 'bg-amber-50/30' : isNegative ? 'bg-red-50/30' : ''}>
                            <td className="px-4 py-1.5 font-mono font-bold text-gray-700">{condType || '-'}</td>
                            <td className="px-4 py-1.5 text-gray-600">{cond.condition_name ?? cond.name ?? '-'}</td>
                            <td className="px-4 py-1.5 font-mono text-blue-600 uppercase italic">{cond.account_key ?? '-'}</td>
                            <td className="px-4 py-1.5 text-right text-gray-400">${parseFloat(cond.base_value || 0).toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right text-gray-500">
                              {cond.rate != null ? parseFloat(cond.rate).toLocaleString() + (cond.calculation_type === '%' || cond.calculationType === '%' ? '%' : '') : '-'}
                            </td>
                            <td className={`px-4 py-1.5 text-right font-bold ${isTax ? 'text-amber-700' : isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                              ${Math.abs(amount).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-muted/5 border-t flex justify-end gap-6 text-xs text-muted-foreground">
                    <span>Net: <span className="font-semibold text-foreground">${parseFloat(item.net_amount || 0).toLocaleString()}</span></span>
                    <span>Tax: <span className="font-semibold text-amber-700">${parseFloat(item.tax_amount || 0).toLocaleString()}</span></span>
                    <span className="font-bold text-foreground">Item Total: ${ (parseFloat(item.net_amount || 0) + parseFloat(item.tax_amount || 0)).toLocaleString() }</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Totals */}
          <div className="flex justify-end p-4">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (Net):</span>
                <span className="font-medium">${parseFloat(invoice.net_amount || 0).toLocaleString()}</span>
              </div>
              
              {invoice.tax_breakdown && Array.isArray(invoice.tax_breakdown) && invoice.tax_breakdown.length > 0 ? (
                <div className="space-y-1.5">
                  {invoice.tax_breakdown.map((tax: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm text-amber-700">
                      <span>{tax.title || tax.rule_code || "Tax " + (index + 1)}{tax.rate_percent ? " (" + tax.rate_percent + "%)" : ""}:</span>
                      <span className="font-medium">${parseFloat(tax.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-dashed">
                    <span>Total Tax:</span>
                    <span>${parseFloat(invoice.tax_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span className="font-medium text-amber-700">${parseFloat(invoice.tax_amount || 0).toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-black border-t pt-3 text-primary">
                <span>TOTAL:</span>
                <span>${parseFloat(invoice.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
