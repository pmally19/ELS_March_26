import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
const exchangeRateSchema = z.object({
  from_currency: z.string().min(3, "From currency is required").max(3, "Currency must be 3 characters"),
  to_currency: z.string().min(3, "To currency is required").max(3, "Currency must be 3 characters"),
  rate_type: z.enum(["daily", "monthly", "average", "buying", "selling", "middle"]),
  exchange_rate: z.number().min(0.000001, "Exchange rate must be greater than 0"),
  rate_factor: z.number().min(1).max(10000).default(1),
  valid_from: z.string().min(1, "Valid from date is required"),
  valid_to: z.string().optional(),
  reference_rate: z.boolean().default(false),
  auto_update: z.boolean().default(false),
  data_source: z.string().max(50, "Data source must be 50 characters or less").optional(),
  rate_variance_threshold: z.number().min(0).max(100).default(5),
  approval_required: z.boolean().default(false),
  created_by: z.string().max(100, "Created by must be 100 characters or less").optional(),
  approved_by: z.string().max(100, "Approved by must be 100 characters or less").optional(),
  active: z.boolean().default(true)
});

type ExchangeRate = z.infer<typeof exchangeRateSchema> & { id: number };

export default function ExchangeRateManagement() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const { data: exchangeRates = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/exchange-rates"],
  });

  const form = useForm<z.infer<typeof exchangeRateSchema>>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: {
      from_currency: "",
      to_currency: "",
      rate_type: "daily",
      exchange_rate: 1.0,
      rate_factor: 1,
      valid_from: "",
      valid_to: "",
      reference_rate: false,
      auto_update: false,
      data_source: "",
      rate_variance_threshold: 5,
      approval_required: false,
      created_by: "",
      approved_by: "",
      active: true
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof exchangeRateSchema>) =>
      apiRequest("/api/exchange-rates", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setOpen(false);
      setEditingRate(null);
      form.reset();
      toast({ title: "Success", description: "Currency exchange rate created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create exchange rate", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof exchangeRateSchema>) =>
      apiRequest(`/api/exchange-rates/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setOpen(false);
      setEditingRate(null);
      form.reset();
      toast({ title: "Success", description: "Currency exchange rate updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update exchange rate", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/exchange-rates/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      toast({ title: "Success", description: "Currency exchange rate deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete exchange rate", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof exchangeRateSchema>) => {
    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    form.reset(rate);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingRate(null);
    form.reset();
    setOpen(true);
  };

  const rateTypes = [
    { value: "daily", label: "Daily Rate" },
    { value: "monthly", label: "Monthly Average" },
    { value: "average", label: "Average Rate" },
    { value: "buying", label: "Buying Rate" },
    { value: "selling", label: "Selling Rate" },
    { value: "middle", label: "Middle Rate" }
  ];

  const currencies = [
    "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "KRW", 
    "BRL", "MXN", "SGD", "HKD", "NOK", "SEK", "DKK", "PLN", "CZK", "HUF"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/master-data")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Currency Exchange Management</h1>
            <p className="text-muted-foreground">Configure currency conversion rates and multi-currency transaction settings</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Exchange Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRate ? "Edit Currency Exchange Rate" : "Create Currency Exchange Rate"}
                </DialogTitle>
                <DialogDescription>
                  Configure currency conversion rates for multi-currency transactions
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="from_currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select from currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map((currency) => (
                                <SelectItem key={currency} value={currency}>
                                  {currency}
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
                      name="to_currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select to currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map((currency) => (
                                <SelectItem key={currency} value={currency}>
                                  {currency}
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
                      name="rate_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rate type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rateTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                      name="exchange_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exchange Rate</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.000001"
                              min="0.000001"
                              placeholder="1.000000" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rate_factor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate Factor</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="10000" 
                              placeholder="1" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="rate_variance_threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variance Threshold (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              min="0" 
                              max="100" 
                              placeholder="5.0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 5)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valid_from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid From</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="valid_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid To (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="data_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Source</FormLabel>
                        <FormControl>
                          <Input placeholder="Bloomberg, Reuters, Central Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="created_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Created By</FormLabel>
                          <FormControl>
                            <Input placeholder="User Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="approved_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approved By</FormLabel>
                          <FormControl>
                            <Input placeholder="Approver Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRate ? "Update" : "Create"} Exchange Rate
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Currency Exchange Rates</span>
          </CardTitle>
          <CardDescription>
            Manage currency conversion rates for multi-currency business transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading currency exchange rates...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From Currency</TableHead>
                  <TableHead>To Currency</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead>Exchange Rate</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid To</TableHead>
                  <TableHead>Data Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeRates.map((rate: ExchangeRate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.from_currency}</TableCell>
                    <TableCell>{rate.to_currency}</TableCell>
                    <TableCell className="capitalize">{rate.rate_type}</TableCell>
                    <TableCell>{rate.exchange_rate.toFixed(6)}</TableCell>
                    <TableCell>{rate.valid_from}</TableCell>
                    <TableCell>{rate.valid_to || "Open"}</TableCell>
                    <TableCell>{rate.data_source || "Manual"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rate.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rate.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(rate.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}