import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  purchase_order_id: z.string().min(1, "Purchase Order is required"),
  goods_receipt_id: z.string().optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.date(),
  due_date: z.date().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreatePOInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PurchaseOrder {
  id: number;
  order_number: string;
  vendor_id: number;
  vendor_name?: string;
  currency?: string;
  status?: string;
}

interface GoodsReceipt {
  id: number;
  receipt_number?: string;
  purchase_order_id: number;
  material_code?: string;
  quantity?: number;
  unit_price?: number;
  total_value?: number;
  status?: string;
}

interface POItem {
  id: number;
  material_id: number | null;
  material_code: string | null;
  description: string | null;
  quantity: number;
  invoiced_quantity: number;
  unit: string | null;
  unit_price: number;
  tax_rate?: number;
}

export function CreatePOInvoiceDialog({ open, onOpenChange }: CreatePOInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Default due date (30 days from invoice date)
  const initialDueDate = new Date();
  initialDueDate.setDate(initialDueDate.getDate() + 30);

  // Helper function to validate and sanitize currency code
  const getValidCurrency = (currency: string | undefined | null): string => {
    if (!currency || typeof currency !== 'string') return 'USD';  // Formatting fallback only
    const trimmed = currency.trim().toUpperCase();
    // Currency codes must be exactly 3 uppercase letters
    if (trimmed.length === 3 && /^[A-Z]{3}$/.test(trimmed)) {
      return trimmed;
    }
    return 'USD'; // Formatting fallback only
  };

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase/orders"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/purchase/orders", { method: "GET" });
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
  });

  // Fetch goods receipts
  const { data: goodsReceipts = [], isLoading: grLoading } = useQuery<GoodsReceipt[]>({
    queryKey: ["/api/purchase/receipts"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/purchase/receipts", { method: "GET" });
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error("Error fetching goods receipts:", error);
        return [];
      }
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchase_order_id: "",
      goods_receipt_id: undefined,
      invoice_number: "",
      invoice_date: new Date(),
      due_date: initialDueDate,
      currency: "",  // No hardcoded default, will be set from PO
      notes: "",
    },
  });

  // Fetch PO items when PO is selected
  const selectedPOId = form.watch("purchase_order_id");
  const { data: poItems = [] } = useQuery<POItem[]>({
    queryKey: ["/api/purchase/orders", selectedPOId, "items"],
    queryFn: async () => {
      if (!selectedPOId) return [];
      try {
        const response = await apiRequest(`/api/purchase/orders/${selectedPOId}/items`, { method: "GET" });
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        console.error("Error fetching PO items:", error);
        return [];
      }
    },
    enabled: !!selectedPOId,
  });

  const selectedPO = purchaseOrders.find(
    (po) => String(po.id) === form.watch("purchase_order_id")
  );

  // Filter goods receipts by selected PO
  const filteredGoodsReceipts = form.watch("purchase_order_id")
    ? goodsReceipts.filter(
      (gr) => String(gr.purchase_order_id) === form.watch("purchase_order_id")
    )
    : [];

  // Auto-fill currency from PO
  useEffect(() => {
    if (selectedPO?.currency) {
      const validCurrency = getValidCurrency(selectedPO.currency);
      form.setValue("currency", validCurrency);
    }
  }, [selectedPO, form]);

  // Calculate invoice totals from PO items
  const calculateTotals = () => {
    let netTotal = 0;
    let taxTotal = 0;

    poItems.forEach((item) => {
      const remainingQty = item.quantity - (item.invoiced_quantity || 0);
      if (remainingQty > 0) {
        const netAmount = remainingQty * (item.unit_price || 0);
        const taxRate = item.tax_rate || 0;
        const taxAmount = netAmount * (taxRate / 100);
        netTotal += netAmount;
        taxTotal += taxAmount;
      }
    });

    return {
      netTotal: netTotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      grossTotal: (netTotal + taxTotal).toFixed(2),
    };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!selectedPO || !selectedPO.vendor_id) {
        toast({
          title: "Error",
          description: "Purchase order or vendor information is missing. Please select a valid purchase order.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Build invoice items from PO items
      const invoiceItems = poItems
        .filter((item) => {
          const remainingQty = item.quantity - (item.invoiced_quantity || 0);
          return remainingQty > 0;
        })
        .map((item) => {
          const remainingQty = item.quantity - (item.invoiced_quantity || 0);
          return {
            material_id: item.material_id,
            material_code: item.material_code,
            description: item.description || "",
            quantity: remainingQty,
            unit: item.unit || "EA",
            unit_price: item.unit_price || 0,
            tax_rate: item.tax_rate || 0,
          };
        });

      if (invoiceItems.length === 0) {
        toast({
          title: "Error",
          description: "No items available to invoice. All items may already be invoiced.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Generate invoice number if not provided
      let invoiceNumber = data.invoice_number && data.invoice_number.trim() !== ""
        ? data.invoice_number.trim()
        : `VINV-PO-${selectedPO.order_number}-${Date.now()}`;

      const payload = {
        vendor_id: selectedPO.vendor_id,
        invoice_number: invoiceNumber,
        invoice_date: format(data.invoice_date, "yyyy-MM-dd"),
        due_date: data.due_date ? format(data.due_date, "yyyy-MM-dd") : undefined,
        purchase_order_id: parseInt(data.purchase_order_id),
        goods_receipt_id: data.goods_receipt_id && data.goods_receipt_id.trim() !== "" ? parseInt(data.goods_receipt_id) : undefined,
        items: invoiceItems,
        currency: getValidCurrency(data.currency),
        notes: data.notes || undefined,
        perform_validation: true,
      };

      const response = await apiRequest("/api/ap/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create invoice");
      }

      // Invalidate queries to refresh the invoice list
      queryClient.invalidateQueries({ queryKey: ["/api/ap/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ap/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/ap/open-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ap/vendors/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ap/pending-payments"] });

      toast({
        title: "Invoice created successfully",
        description: `Invoice ${result.invoice_id ? `#${result.invoice_id}` : invoiceNumber} has been created and posted.`,
      });

      // Close the dialog and reset form
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice from Purchase Order</DialogTitle>
          <DialogDescription>
            Create a vendor invoice linked to a purchase order and optionally a goods receipt.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Order *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={poLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purchase order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={String(po.id)}>
                            {po.order_number} {po.vendor_name ? `- ${po.vendor_name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goods_receipt_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goods Receipt (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || undefined)}
                      value={field.value || undefined}
                      disabled={grLoading || !form.watch("purchase_order_id")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goods receipt (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredGoodsReceipts.length > 0 ? (
                          filteredGoodsReceipts.map((gr) => (
                            <SelectItem key={gr.id} value={String(gr.id)}>
                              {gr.receipt_number || `GR-${gr.id}`}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No goods receipts available for this PO
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PO Items Preview */}
            {selectedPO && poItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Invoice Items (from Purchase Order)</h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Ordered</TableHead>
                        <TableHead className="text-right">Invoiced</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Tax Rate</TableHead>
                        <TableHead className="text-right">Net Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item) => {
                        const remainingQty = item.quantity - (item.invoiced_quantity || 0);
                        const netAmount = remainingQty * (item.unit_price || 0);
                        const taxRate = item.tax_rate || 0;
                        const taxAmount = netAmount * (taxRate / 100);
                        const totalAmount = netAmount + taxAmount;

                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.material_code || "-"}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.invoiced_quantity || 0}</TableCell>
                            <TableCell className="text-right font-medium">
                              {remainingQty > 0 ? (
                                <span className="text-green-600">{remainingQty}</span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: getValidCurrency(form.watch("currency")),
                              }).format(item.unit_price || 0)}
                            </TableCell>
                            <TableCell className="text-right">{taxRate}%</TableCell>
                            <TableCell className="text-right font-mono">
                              {remainingQty > 0
                                ? new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: getValidCurrency(form.watch("currency")),
                                }).format(netAmount)
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Totals */}
            {selectedPO && poItems.length > 0 && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Total:</span>
                    <span className="font-mono">{totals.netTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Total:</span>
                    <span className="font-mono">{totals.taxTotal}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Gross Total:</span>
                    <span className="font-mono">{totals.grossTotal}</span>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or comments..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedPO || poItems.length === 0}>
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

