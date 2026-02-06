import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const expenseSchema = z.object({
  date: z.string().min(1, "Please enter a date"),
  amount: z.string().transform((val) => parseFloat(val)).refine((val) => val > 0, "Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  description: z.string().min(2, "Please enter a description"),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  reference: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseFormValues>;
  expenseId?: number;
  onSuccess?: () => void;
}

export default function ExpenseForm({ defaultValues, expenseId, onSuccess }: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaultValues || {
      date: new Date().toISOString().split('T')[0],
      amount: "",
      category: "",
      description: "",
      paymentMethod: "",
      reference: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      if (expenseId) {
        return apiRequest("PUT", `/api/expenses/${expenseId}`, data);
      } else {
        return apiRequest("POST", "/api/expenses", data);
      }
    },
    onSuccess: () => {
      toast({
        title: expenseId ? "Expense updated" : "Expense recorded",
        description: expenseId
          ? "The expense has been updated successfully."
          : "The expense has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ExpenseFormValues) {
    mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Inventory">Inventory</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Taxes">Taxes</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Description of the expense..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Online Payment">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference/Receipt Number</FormLabel>
                <FormControl>
                  <Input placeholder="Optional reference number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : expenseId ? "Update Expense" : "Record Expense"}
        </Button>
      </form>
    </Form>
  );
}
