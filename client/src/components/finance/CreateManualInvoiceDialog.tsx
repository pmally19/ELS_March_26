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
  customer_id: z.string().min(1, "Customer is required"),
  billing_date: z.date(),
  due_date: z.date().optional(),
  company_code_id: z.string().optional(),
  currency: z.string().optional(),
  payment_terms: z.string().optional(),
  reference: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateManualInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateManualInvoiceDialog({ open, onOpenChange }: CreateManualInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/master-data/customer"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/customer");
      if (!response.ok) throw new Error("Failed to fetch customers");
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

  // Fetch products/materials
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["/api/master-data/materials"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/materials");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Default due date (30 days from billing date)
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      billing_date: new Date(),
      due_date: defaultDueDate,
      company_code_id: "",
      currency: "USD",
      payment_terms: "",
      reference: "",
      line_items: [
        {
          material_id: "",
          description: "",
          quantity: "1",
          unit: "EA",
          unit_price: "0",
          tax_rate: "0",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  });

  // Watch customer selection to auto-fill currency and payment terms
  const selectedCustomerId = form.watch("customer_id");
  
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const selectedCustomer = customers.find((c: any) => String(c.id) === selectedCustomerId);
      if (selectedCustomer) {
        // Auto-fill currency if customer has currency (always update when customer changes)
        if (selectedCustomer.currency) {
          form.setValue("currency", selectedCustomer.currency);
        }
        // Auto-fill payment terms if customer has payment terms (only if not already set)
        if (selectedCustomer.payment_terms && !form.getValues("payment_terms")) {
          form.setValue("payment_terms", selectedCustomer.payment_terms);
        }
      }
    }
  }, [selectedCustomerId, customers, form]);

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: parseInt(data.customer_id),
        billing_date: format(data.billing_date, "yyyy-MM-dd"),
        due_date: data.due_date ? format(data.due_date, "yyyy-MM-dd") : undefined,
        company_code_id: data.company_code_id ? parseInt(data.company_code_id) : undefined,
        currency: data.currency || undefined,
        payment_terms: data.payment_terms || undefined,
        reference: data.reference || undefined,
        line_items: data.line_items.map((item) => ({
          material_id: item.material_id && item.material_id.trim() !== "" ? parseInt(item.material_id) : undefined,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
        })),
      };

      const response = await fetch("/api/ar/manual-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to create invoice";
        throw new Error(errorMessage);
      }
      
      // Validate response structure
      if (!result.success) {
        throw new Error(result.error || result.message || "Invoice creation failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ar/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/ar/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/ar/open-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance-enhanced/ar/aging-report"] });
      toast({
        title: "Invoice created and posted",
        description: `Invoice ${result.data?.billing_number || ""} has been created and posted successfully.${result.data?.accounting_document_number ? ` Accounting Document: ${result.data.accounting_document_number}` : ''}`,
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Error creating manual invoice:", error);
      // Extract error message from various possible formats
      let errorMessage = "Failed to create invoice. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
          <DialogTitle>Create Manual Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice manually without a sales order or delivery document.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={customersLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer: any) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.name} ({customer.customer_code || customer.code || customer.customer_number || ""})
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="billing_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Billing Date *</FormLabel>
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
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Product</TableHead>
                      <TableHead className="w-[250px]">Description</TableHead>
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="w-[100px]">Unit</TableHead>
                      <TableHead className="w-[120px]">Unit Price</TableHead>
                      <TableHead className="w-[100px]">Tax Rate %</TableHead>
                      <TableHead className="w-[100px]">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
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
                                        const selectedMaterial = materials.find(
                                          (m: any) => String(m.id) === value
                                        );
                                        if (selectedMaterial) {
                                          // Auto-fill description
                                          if (selectedMaterial.name || selectedMaterial.description) {
                                            form.setValue(
                                              `line_items.${index}.description`,
                                              selectedMaterial.name || selectedMaterial.description || ""
                                            );
                                          }
                                          // Auto-fill unit
                                          if (selectedMaterial.base_uom || selectedMaterial.base_unit) {
                                            form.setValue(
                                              `line_items.${index}.unit`,
                                              selectedMaterial.base_uom || selectedMaterial.base_unit || "EA"
                                            );
                                          }
                                          // Auto-fill unit price
                                          if (selectedMaterial.base_unit_price || selectedMaterial.base_price) {
                                            const price = selectedMaterial.base_unit_price || selectedMaterial.base_price || 0;
                                            form.setValue(
                                              `line_items.${index}.unit_price`,
                                              String(price)
                                            );
                                          }
                                        }
                                      }
                                    }}
                                    value={field.value === "" ? "NONE" : field.value}
                                    disabled={materialsLoading}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="NONE">None</SelectItem>
                                      {materials.map((material: any) => (
                                        <SelectItem key={material.id} value={String(material.id)}>
                                          {material.code || material.material_code || ""} - {material.name || material.description || ""}
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

