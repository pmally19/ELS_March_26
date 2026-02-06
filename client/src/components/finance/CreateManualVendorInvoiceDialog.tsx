import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
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

const lineItemSchema = z.object({
  material_id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().min(1, "Quantity is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Quantity must be greater than 0"
  ),
  unit: z.string().default("EA"),
  unit_price: z.string().min(1, "Unit price is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Unit price must be 0 or greater"
  ),
  tax_rate: z.string().default("0").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
    "Tax rate must be between 0 and 100"
  ),
  profit_center: z.string().optional(),
  cost_center: z.string().optional(),
});

const formSchema = z.object({
  vendor_id: z.string().min(1, "Vendor is required"),
  invoice_date: z.date(),
  due_date: z.date().optional(),
  company_code_id: z.string().optional(),
  currency: z.string().optional(),
  payment_terms: z.string().optional(),
  reference: z.string().optional(),
  invoice_number: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateManualVendorInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateManualVendorInvoiceDialog({ open, onOpenChange }: CreateManualVendorInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();



  // Default due date (30 days from invoice date)
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendor_id: "",
      invoice_date: new Date(),
      due_date: defaultDueDate,
      company_code_id: "",
      currency: "USD",
      payment_terms: "",
      reference: "",
      invoice_number: "",
      line_items: [
        {
          material_id: "",
          description: "",
          quantity: "1",
          unit: "EA",
          unit_price: "0",
          tax_rate: "0",
          profit_center: "",
          cost_center: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  });

  // Calculate totals
  const calculateTotals = () => {
    const lineItems = form.watch("line_items");
    let netTotal = 0;
    let taxTotal = 0;

    lineItems.forEach((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const netAmount = quantity * unitPrice;
      const taxAmount = netAmount * (taxRate / 100);
      netTotal += netAmount;
      taxTotal += taxAmount;
    });

    return {
      netTotal: netTotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      grossTotal: (netTotal + taxTotal).toFixed(2),
    };
  };

  const totals = calculateTotals();

  // Watch vendor selection to auto-fill currency and payment terms
  const selectedVendorId = form.watch("vendor_id");

  // Fetch vendors
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/master-data/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/vendors");
      if (!response.ok) throw new Error("Failed to fetch vendors");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch company codes
  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/master-data/company-codes"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/company-codes");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch payment terms
  const { data: paymentTerms = [] } = useQuery({
    queryKey: ["/api/master-data/payment-terms"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/payment-terms");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch vendor materials (filtered by selected vendor)
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["/api/master-data/vendor-materials/vendor", selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const response = await fetch(`/api/master-data/vendor-materials/vendor/${selectedVendorId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedVendorId,
  });

  // Fetch profit centers
  const { data: profitCenters = [] } = useQuery({
    queryKey: ["/api/master-data/profit-center"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/profit-center");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch cost centers
  const { data: costCenters = [] } = useQuery({
    queryKey: ["/api/master-data/cost-center"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/cost-center");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    if (selectedVendorId && vendors.length > 0) {
      const selectedVendor = vendors.find((v: any) => String(v.id) === selectedVendorId);
      if (selectedVendor) {
        // Auto-fill currency if vendor has currency (always update when vendor changes)
        if (selectedVendor.currency) {
          form.setValue("currency", selectedVendor.currency);
        }
        // Auto-fill payment terms if vendor has payment terms (only if not already set)
        if (selectedVendor.payment_terms && !form.getValues("payment_terms")) {
          form.setValue("payment_terms", selectedVendor.payment_terms);
        }
        // Auto-fill company code if vendor has company code (only if not already set)
        if (selectedVendor.company_code_id && !form.getValues("company_code_id")) {
          form.setValue("company_code_id", String(selectedVendor.company_code_id));
        }
      }
    }
  }, [selectedVendorId, vendors, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        vendor_id: parseInt(data.vendor_id),
        invoice_date: format(data.invoice_date, "yyyy-MM-dd"),
        due_date: data.due_date ? format(data.due_date, "yyyy-MM-dd") : undefined,
        company_code_id: data.company_code_id ? parseInt(data.company_code_id) : undefined,
        currency: data.currency || undefined,
        payment_terms: data.payment_terms || undefined,
        reference: data.reference || undefined,
        invoice_number: data.invoice_number && data.invoice_number.trim() !== "" ? data.invoice_number : undefined,
        line_items: data.line_items.map((item) => ({
          material_id: item.material_id && item.material_id.trim() !== "" ? parseInt(item.material_id) : undefined,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
          profit_center: item.profit_center && item.profit_center.trim() !== "" ? item.profit_center : undefined,
          cost_center: item.cost_center && item.cost_center.trim() !== "" ? item.cost_center : undefined,
        })),
      };

      const response = await fetch("/api/ap/manual-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create invoice");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/ap/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/ap/open-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ap/vendors/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ap/pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ap/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/vendors"] });
      toast({
        title: "Invoice created and posted",
        description: `Manual vendor invoice ${result.data?.invoice_number || ""} has been created and posted successfully.${result.data?.accounting_document_number ? ` Accounting Document: ${result.data.accounting_document_number}` : ''}`,
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating manual vendor invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1400px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Manual Vendor Invoice</DialogTitle>
          <DialogDescription>
            Create a new vendor invoice manually without a purchase order or goods receipt.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto flex-1 pr-2">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={vendorsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={String(vendor.id)}>
                            {vendor.name} ({vendor.vendor_code || vendor.code || vendor.vendor_number || ""})
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
                name="company_code_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Code</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companyCodes.map((cc: any) => (
                          <SelectItem key={cc.id} value={String(cc.id)}>
                            {cc.code} - {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
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
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentTerms.map((term: any) => (
                          <SelectItem key={term.id || term.code} value={term.code || term.id}>
                            {term.code || term.name}
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
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional reference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel>Line Items *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      material_id: "",
                      description: "",
                      quantity: "1",
                      unit: "EA",
                      unit_price: "0",
                      tax_rate: "0",
                      profit_center: "",
                      cost_center: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Material</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[90px]">Quantity</TableHead>
                      <TableHead className="min-w-[80px]">Unit</TableHead>
                      <TableHead className="min-w-[110px]">Unit Price</TableHead>
                      <TableHead className="min-w-[90px]">Tax Rate %</TableHead>
                      <TableHead className="min-w-[130px]">Cost Center</TableHead>
                      <TableHead className="min-w-[130px]">Profit Center</TableHead>
                      <TableHead className="min-w-[100px]">Total</TableHead>
                      <TableHead className="min-w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const quantity = parseFloat(form.watch(`line_items.${index}.quantity`)) || 0;
                      const unitPrice = parseFloat(form.watch(`line_items.${index}.unit_price`)) || 0;
                      const taxRate = parseFloat(form.watch(`line_items.${index}.tax_rate`)) || 0;
                      const netAmount = quantity * unitPrice;
                      const taxAmount = netAmount * (taxRate / 100);
                      const total = netAmount + taxAmount;

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.material_id`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => {
                                      // Convert "NONE" back to empty string for form storage
                                      const actualValue = value === "NONE" ? "" : value;
                                      field.onChange(actualValue);
                                      if (value && value !== "NONE" && materials.length > 0) {
                                        const assignment = materials.find(
                                          (m: any) => String(m.material?.id || m.materialId) === value
                                        );

                                        if (assignment && assignment.material) {
                                          const material = assignment.material;

                                          // Auto-fill description
                                          if (material.name || material.description) {
                                            form.setValue(
                                              `line_items.${index}.description`,
                                              material.name || material.description || ""
                                            );
                                          }
                                          // Auto-fill unit
                                          if (material.base_uom || material.baseUom) {
                                            form.setValue(
                                              `line_items.${index}.unit`,
                                              material.base_uom || material.baseUom || "EA"
                                            );
                                          }
                                          // Auto-fill unit price - prioritize assignment price, then material base price
                                          // Check for various price field names in assignment and material
                                          const price = assignment.unit_price || assignment.unitPrice || material.base_unit_price || material.baseUnitPrice || 0;
                                          form.setValue(
                                            `line_items.${index}.unit_price`,
                                            String(price)
                                          );

                                          // Auto-fill profit center from material
                                          if (material.profit_center || material.profitCenter) {
                                            const profitCenter = material.profit_center || material.profitCenter;
                                            if (profitCenter) {
                                              form.setValue(
                                                `line_items.${index}.profit_center`,
                                                String(profitCenter)
                                              );
                                            }
                                          }
                                          // Auto-fill cost center from material
                                          if (material.cost_center || material.costCenter) {
                                            const costCenter = material.cost_center || material.costCenter;
                                            if (costCenter) {
                                              form.setValue(
                                                `line_items.${index}.cost_center`,
                                                String(costCenter)
                                              );
                                            }
                                          }
                                        }
                                      }
                                    }}
                                    value={field.value === "" ? "NONE" : field.value}
                                    disabled={materialsLoading || !selectedVendorId}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={selectedVendorId ? "Select material" : "Select vendor first"} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="NONE">None</SelectItem>
                                      {materials.map((assignment: any) => {
                                        const mat = assignment.material || {};
                                        return (
                                          <SelectItem key={mat.id || assignment.materialId} value={String(mat.id || assignment.materialId)}>
                                            {mat.code || mat.material_code || ""} - {mat.name || mat.description || ""}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} placeholder="Item description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        form.trigger(`line_items.${index}.quantity`);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.unit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} placeholder="EA" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.unit_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        form.trigger(`line_items.${index}.unit_price`);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.tax_rate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        form.trigger(`line_items.${index}.tax_rate`);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.cost_center`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => {
                                      const actualValue = value === "none" ? "" : value;
                                      field.onChange(actualValue);
                                    }}
                                    value={field.value === "" ? "none" : field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select cost center" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {costCenters.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.cost_center_code || cc.code || String(cc.id)}>
                                          {cc.cost_center_code || cc.code || ""} - {cc.description || cc.name || ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`line_items.${index}.profit_center`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => {
                                      const actualValue = value === "none" ? "" : value;
                                      field.onChange(actualValue);
                                    }}
                                    value={field.value === "" ? "none" : field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select profit center" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {profitCenters.map((pc: any) => (
                                        <SelectItem key={pc.id} value={pc.profit_center || pc.code || String(pc.id)}>
                                          {pc.profit_center || pc.code || ""} - {pc.description || pc.name || ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            ${total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-[400px] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Subtotal:</span>
                    <span className="text-sm">${totals.netTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tax:</span>
                    <span className="text-sm">${totals.taxTotal}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold">${totals.grossTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

