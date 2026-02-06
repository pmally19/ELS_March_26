import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Plus, Coins, RefreshCw, TrendingUp, Globe } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Currency form schema
const currencySchema = z.object({
  currencyCode: z.string().min(3).max(3).toUpperCase(),
  currencyName: z.string().min(1),
  symbol: z.string().min(1),
  decimalPlaces: z.number().min(0).max(4).default(2),
  isActive: z.boolean().default(true),
});

type CurrencyFormData = z.infer<typeof currencySchema>;

// Exchange rate form schema
const exchangeRateSchema = z.object({
  fromCurrencyId: z.number(),
  toCurrencyId: z.number(),
  exchangeRate: z.number().positive(),
  rateDate: z.string(),
});

type ExchangeRateFormData = z.infer<typeof exchangeRateSchema>;

export default function CurrenciesNew() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch currencies and statistics
  const { data: currenciesData, isLoading: isLoadingCurrencies } = useQuery({
    queryKey: ["/api/currencies"],
    queryFn: () => apiRequest("/api/currencies"),
  });

  const { data: statisticsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/currencies/statistics"],
    queryFn: () => apiRequest("/api/currencies/statistics"),
  });

  // Initialize sample data
  const initializeSampleDataMutation = useMutation({
    mutationFn: () => apiRequest("/api/currencies/initialize-sample-data", {
      method: "POST",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currencies/statistics"] });
      toast({
        title: "Success",
        description: "Sample currency data initialized successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize sample data",
        variant: "destructive",
      });
    },
  });

  // Create currency mutation
  const createCurrencyMutation = useMutation({
    mutationFn: (data: CurrencyFormData) => apiRequest("/api/currencies", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currencies/statistics"] });
      setIsCreateDialogOpen(false);
      createCurrencyForm.reset();
      toast({
        title: "Success",
        description: "Currency created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create currency",
        variant: "destructive",
      });
    },
  });

  // Create exchange rate mutation
  const createExchangeRateMutation = useMutation({
    mutationFn: (data: ExchangeRateFormData) => apiRequest("/api/currencies/exchange-rates", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      setIsRateDialogOpen(false);
      exchangeRateForm.reset();
      toast({
        title: "Success",
        description: "Exchange rate updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exchange rate",
        variant: "destructive",
      });
    },
  });

  // Currency revaluation mutation
  const revaluationMutation = useMutation({
    mutationFn: (data: { currencyId: number; newRate: number; companyCodeId: number }) => 
      apiRequest("/api/currencies/revaluation", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      toast({
        title: "Currency Revaluation Complete",
        description: `Revaluation impact: ${data.impact?.revaluationAmount || 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to execute currency revaluation",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const createCurrencyForm = useForm<CurrencyFormData>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      currencyCode: "",
      currencyName: "",
      symbol: "",
      decimalPlaces: 2,
      isActive: true,
    },
  });

  const exchangeRateForm = useForm<ExchangeRateFormData>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: {
      rateDate: new Date().toISOString().split('T')[0],
    },
  });

  // Auto-initialize sample data if no currencies exist
  useEffect(() => {
    if ((currenciesData as any)?.currencies?.length === 0) {
      initializeSampleDataMutation.mutate();
    }
  }, [currenciesData]);

  const currencies = (currenciesData as any)?.currencies || [];
  const statistics = (statisticsData as any)?.statistics || {};

  const handleCreateCurrency = (data: CurrencyFormData) => {
    createCurrencyMutation.mutate(data);
  };

  const handleCreateExchangeRate = (data: ExchangeRateFormData) => {
    createExchangeRateMutation.mutate(data);
  };

  const handleRevaluation = (currencyId: number) => {
    // Use sample revaluation data for demonstration
    revaluationMutation.mutate({
      currencyId,
      newRate: 1.1234,
      companyCodeId: 1,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/master-data">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Master Data
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Currency Configuration</h1>
            <p className="text-muted-foreground">
              Manage currencies, exchange rates, and multi-currency operations
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalActiveCurrencies || 0}</div>
            <p className="text-xs text-muted-foreground">Configured currencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Currency</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.baseCurrency || 'USD'}</div>
            <p className="text-xs text-muted-foreground">Primary currency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Revaluations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.recentRevaluations || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">Multi-currency enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="space-x-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Currency
          </Button>
          <Button variant="outline" onClick={() => setIsRateDialogOpen(true)}>
            Update Exchange Rate
          </Button>
          <Button 
            variant="outline" 
            onClick={() => initializeSampleDataMutation.mutate()}
            disabled={initializeSampleDataMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Initialize Sample Data
          </Button>
        </div>
      </div>

      {/* Currencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Master Data</CardTitle>
          <CardDescription>
            Manage currency configurations and exchange rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCurrencies ? (
            <div className="text-center py-8">Loading currencies...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Decimal Places</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Base Currency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No currencies configured. Click "Initialize Sample Data" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  currencies.map((currency: any) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-semibold">{currency.currencyCode}</TableCell>
                      <TableCell>{currency.currencyName}</TableCell>
                      <TableCell className="text-lg">{currency.symbol}</TableCell>
                      <TableCell>{currency.decimalPlaces}</TableCell>
                      <TableCell>
                        <Badge variant={currency.isActive ? "default" : "secondary"}>
                          {currency.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {currency.isBaseCurrency && (
                          <Badge variant="outline">Base Currency</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevaluation(currency.id)}
                            disabled={revaluationMutation.isPending}
                          >
                            Revalue
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Currency Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>
              Create a new currency configuration for multi-currency operations.
            </DialogDescription>
          </DialogHeader>
          <Form {...createCurrencyForm}>
            <form onSubmit={createCurrencyForm.handleSubmit(handleCreateCurrency)} className="space-y-4">
              <FormField
                control={createCurrencyForm.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Code</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="USD"
                        maxLength={3}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCurrencyForm.control}
                name="currencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="US Dollar" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCurrencyForm.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="$" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCurrencyForm.control}
                name="decimalPlaces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimal Places</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min={0} 
                        max={4}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCurrencyForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Currency</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCurrencyMutation.isPending}>
                  {createCurrencyMutation.isPending ? "Creating..." : "Create Currency"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Exchange Rate Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Exchange Rate</DialogTitle>
            <DialogDescription>
              Set a new exchange rate between currencies.
            </DialogDescription>
          </DialogHeader>
          <Form {...exchangeRateForm}>
            <form onSubmit={exchangeRateForm.handleSubmit(handleCreateExchangeRate)} className="space-y-4">
              <FormField
                control={exchangeRateForm.control}
                name="fromCurrencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Currency</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency: any) => (
                          <SelectItem key={currency.id} value={currency.id.toString()}>
                            {currency.currencyCode} - {currency.currencyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exchangeRateForm.control}
                name="toCurrencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Currency</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency: any) => (
                          <SelectItem key={currency.id} value={currency.id.toString()}>
                            {currency.currencyCode} - {currency.currencyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exchangeRateForm.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.000001"
                        placeholder="1.234567"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exchangeRateForm.control}
                name="rateDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createExchangeRateMutation.isPending}>
                  {createExchangeRateMutation.isPending ? "Updating..." : "Update Rate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}