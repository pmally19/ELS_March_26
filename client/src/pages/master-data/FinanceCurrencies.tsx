import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Coins, 
  DollarSign, 
  Euro, 
  RefreshCw, 
  Settings, 
  Building, 
  Globe,
  TrendingUp,
  Calculator,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Trash2
} from "lucide-react";
import { Link } from "wouter";

interface Currency {
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  decimal_places: number;
  is_active: boolean;
  is_hard_currency: boolean;
  iso_country_code: string;
  central_bank_rate_source: string;
  current_usd_rate: number;
  last_rate_update: string;
}

interface ExchangeRate {
  rate_date: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  rate_source: string;
  from_currency_name: string;
  to_currency_name: string;
}

interface CompanySetting {
  company_code: string;
  company_name?: string;
  local_currency_code: string;
  group_currency_code: string;
  parallel_currency_code?: string;
  exchange_rate_type: string;
  translation_method?: string;
  revaluation_frequency: string;
  local_currency_name?: string;
  local_currency_symbol?: string;
  group_currency_name?: string;
  group_currency_symbol?: string;
}

export default function FinanceCurrencies() {
  const [newRateData, setNewRateData] = useState({
    fromCurrency: '',
    toCurrency: '',
    exchangeRate: '',
    rateSource: ''
  });
  const [conversionData, setConversionData] = useState({
    amount: '',
    fromCurrency: '',
    toCurrency: ''
  });
  const [newCurrencyData, setNewCurrencyData] = useState({
    currency_code: '',
    currency_name: '',
    currency_symbol: '',
    decimal_places: '',
    is_active: '',
    is_hard_currency: '',
    iso_country_code: '',
    central_bank_rate_source: '',
    current_usd_rate: ''
  });
  const [isNewCurrencyDialogOpen, setIsNewCurrencyDialogOpen] = useState(false);
  const [isNewCompanySettingDialogOpen, setIsNewCompanySettingDialogOpen] = useState(false);
  const [isEditCompanySettingDialogOpen, setIsEditCompanySettingDialogOpen] = useState(false);
  const [editingCompanySetting, setEditingCompanySetting] = useState<CompanySetting | null>(null);
  const [deletingCompanyCode, setDeletingCompanyCode] = useState<string | null>(null);
  const [newCompanySettingData, setNewCompanySettingData] = useState({
    company_code: '',
    local_currency_code: '',
    group_currency_code: '',
    parallel_currency_code: '',
    exchange_rate_type: 'Spot Rate',
    translation_method: 'Average Rate',
    revaluation_frequency: 'Monthly'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch global currencies
  const { data: currenciesData, isLoading: currenciesLoading } = useQuery({
    queryKey: ['/api/finance-currency/global-currencies'],
    queryFn: () => fetch('/api/finance-currency/global-currencies').then(res => res.json())
  });

  // Fetch exchange rates
  const { data: ratesData, isLoading: ratesLoading } = useQuery({
    queryKey: ['/api/finance-currency/exchange-rates'],
    queryFn: () => fetch('/api/finance-currency/exchange-rates').then(res => res.json())
  });

  // Fetch company settings
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/finance-currency/company-settings'],
    queryFn: () => fetch('/api/finance-currency/company-settings').then(res => res.json())
  });

  // Fetch statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/finance-currency/statistics'],
    queryFn: () => fetch('/api/finance-currency/statistics').then(res => res.json())
  });

  // Fetch company codes for dropdown
  const { data: companyCodes = [], isLoading: companyCodesLoading } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: () => fetch('/api/master-data/company-code').then(res => res.json())
  });

  // Add exchange rate mutation
  const addRateMutation = useMutation({
    mutationFn: (rates: any[]) => 
      fetch('/api/finance-currency/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update exchange rate');
        }
        return data;
      }),
    onSuccess: (data) => {
      toast({
        title: "Exchange Rate Updated",
        description: data.message || "Daily exchange rate has been successfully updated."
      });
      // Invalidate and refetch exchange rates
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/exchange-rates'] });
      queryClient.refetchQueries({ queryKey: ['/api/finance-currency/exchange-rates'] });
      // Reset form
      setNewRateData({ fromCurrency: '', toCurrency: '', exchangeRate: '', rateSource: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update exchange rate. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Create new currency mutation
  const createCurrencyMutation = useMutation({
    mutationFn: (currencyData: any) => 
      fetch('/api/finance-currency/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currencyData)
      }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Currency Created",
        description: "New currency has been successfully added."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/global-currencies'] });
      setNewCurrencyData({
        currency_code: '',
        currency_name: '',
        currency_symbol: '',
        decimal_places: '',
        is_active: '',
        is_hard_currency: '',
        iso_country_code: '',
        central_bank_rate_source: '',
        current_usd_rate: ''
      });
      setIsNewCurrencyDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create currency. Please try again.",
        variant: "destructive"
      });
    }
  });

  // AWS sync mutation
  const awsSyncMutation = useMutation({
    mutationFn: () => 
      fetch('/api/finance-currency/sync-aws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "AWS Sync Complete",
        description: `Successfully synced ${data.syncedTables || 0} currency tables to AWS.`
      });
    },
    onError: () => {
      toast({
        title: "AWS Sync Failed",
        description: "Failed to sync currency tables to AWS. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update exchange rates mutation
  const updateRatesMutation = useMutation({
    mutationFn: () => 
      fetch('/api/finance-currency/update-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Rates Updated",
        description: "Exchange rates have been updated from live market data."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/exchange-rates'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update exchange rates. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Create company setting mutation
  const createCompanySettingMutation = useMutation({
    mutationFn: (settingData: any) => 
      fetch('/api/finance-currency/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData)
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create company setting');
        }
        return data;
      }),
    onSuccess: () => {
      toast({
        title: "Company Setting Created",
        description: "Company currency setting has been successfully created."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/statistics'] });
      setNewCompanySettingData({
        company_code: '',
        local_currency_code: '',
        group_currency_code: '',
        parallel_currency_code: '',
        exchange_rate_type: 'Spot Rate',
        translation_method: 'Average Rate',
        revaluation_frequency: 'Monthly'
      });
      setIsNewCompanySettingDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create company setting. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update company setting mutation
  const updateCompanySettingMutation = useMutation({
    mutationFn: ({ companyCode, settingData }: { companyCode: string; settingData: any }) => 
      fetch(`/api/finance-currency/company-settings/${companyCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData)
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update company setting');
        }
        return data;
      }),
    onSuccess: () => {
      toast({
        title: "Company Setting Updated",
        description: "Company currency setting has been successfully updated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/statistics'] });
      setIsEditCompanySettingDialogOpen(false);
      setEditingCompanySetting(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update company setting. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete company setting mutation
  const deleteCompanySettingMutation = useMutation({
    mutationFn: (companyCode: string) => 
      fetch(`/api/finance-currency/company-settings/${companyCode}`, {
        method: 'DELETE'
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete company setting');
        }
        return data;
      }),
    onSuccess: () => {
      toast({
        title: "Company Setting Deleted",
        description: "Company currency setting has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance-currency/statistics'] });
      setDeletingCompanyCode(null);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete company setting. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update history query
  const { data: updateHistory } = useQuery({
    queryKey: ['/api/finance-currency/update-history'],
    queryFn: () => 
      fetch('/api/finance-currency/update-history')
        .then(res => res.json())
  });

  // Fetch ERP integration data
  const { data: integrationData, isLoading: integrationLoading } = useQuery({
    queryKey: ['/api/finance-currency/erp-integration'],
    queryFn: () => 
      fetch('/api/finance-currency/erp-integration')
        .then(res => res.json())
  });

  // Currency conversion query
  const { data: conversionResult, isLoading: conversionLoading } = useQuery({
    queryKey: ['/api/finance-currency/convert', conversionData],
    queryFn: () => 
      fetch(`/api/finance-currency/convert?amount=${conversionData.amount}&fromCurrency=${conversionData.fromCurrency}&toCurrency=${conversionData.toCurrency}`)
        .then(res => res.json()),
    enabled: !!(conversionData.amount && conversionData.fromCurrency && conversionData.toCurrency)
  });

  const handleAddRate = () => {
    if (!newRateData.fromCurrency || !newRateData.toCurrency || !newRateData.exchangeRate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all exchange rate fields.",
        variant: "destructive"
      });
      return;
    }

    if (!newRateData.rateSource || newRateData.rateSource === '__none__') {
      toast({
        title: "Rate Source Required",
        description: "Please select a rate source for the exchange rate.",
        variant: "destructive"
      });
      return;
    }

    const rates = [{
      fromCurrency: newRateData.fromCurrency,
      toCurrency: newRateData.toCurrency,
      exchangeRate: parseFloat(newRateData.exchangeRate),
      rateSource: newRateData.rateSource || 'Manual Entry'
    }];

    addRateMutation.mutate(rates);
  };

  const handleCreateCurrency = () => {
    // Validate all required fields - no defaults
    if (!newCurrencyData.currency_code || !newCurrencyData.currency_name || !newCurrencyData.currency_symbol ||
        !newCurrencyData.decimal_places || newCurrencyData.is_active === '' || 
        newCurrencyData.is_hard_currency === '' || !newCurrencyData.central_bank_rate_source ||
        !newCurrencyData.current_usd_rate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields: currency code, name, symbol, decimal places, active status, hard currency status, rate source, and USD rate.",
        variant: "destructive"
      });
      return;
    }

    // Convert string values to proper types
    const isActiveValue = typeof newCurrencyData.is_active === 'string' 
      ? (newCurrencyData.is_active === 'true' || newCurrencyData.is_active === '1')
      : Boolean(newCurrencyData.is_active);
    
    const isHardCurrencyValue = typeof newCurrencyData.is_hard_currency === 'string'
      ? (newCurrencyData.is_hard_currency === 'true' || newCurrencyData.is_hard_currency === '1')
      : Boolean(newCurrencyData.is_hard_currency);

    const currencyPayload = {
      currency_code: newCurrencyData.currency_code,
      currency_name: newCurrencyData.currency_name,
      currency_symbol: newCurrencyData.currency_symbol,
      decimal_places: parseInt(newCurrencyData.decimal_places),
      is_active: isActiveValue,
      is_hard_currency: isHardCurrencyValue,
      iso_country_code: newCurrencyData.iso_country_code || null,
      central_bank_rate_source: newCurrencyData.central_bank_rate_source,
      current_usd_rate: parseFloat(newCurrencyData.current_usd_rate)
    };

    createCurrencyMutation.mutate(currencyPayload);
  };

  const handleAwsSync = () => {
    awsSyncMutation.mutate();
  };

  const handleUpdateRates = () => {
    updateRatesMutation.mutate();
  };

  const handleCreateCompanySetting = () => {
    if (!newCompanySettingData.company_code || !newCompanySettingData.local_currency_code || 
        !newCompanySettingData.group_currency_code || !newCompanySettingData.exchange_rate_type ||
        !newCompanySettingData.translation_method || !newCompanySettingData.revaluation_frequency) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createCompanySettingMutation.mutate(newCompanySettingData);
  };

  const handleEditCompanySetting = (setting: CompanySetting) => {
    setEditingCompanySetting(setting);
    setNewCompanySettingData({
      company_code: setting.company_code,
      local_currency_code: setting.local_currency_code || '',
      group_currency_code: setting.group_currency_code || '',
      parallel_currency_code: setting.parallel_currency_code || '',
      exchange_rate_type: setting.exchange_rate_type || 'Spot Rate',
      translation_method: setting.translation_method || 'Average Rate',
      revaluation_frequency: setting.revaluation_frequency || 'Monthly'
    });
    setIsEditCompanySettingDialogOpen(true);
  };

  const handleUpdateCompanySetting = () => {
    if (!editingCompanySetting || !newCompanySettingData.local_currency_code || 
        !newCompanySettingData.group_currency_code || !newCompanySettingData.exchange_rate_type ||
        !newCompanySettingData.translation_method || !newCompanySettingData.revaluation_frequency) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    updateCompanySettingMutation.mutate({
      companyCode: editingCompanySetting.company_code,
      settingData: {
        local_currency_code: newCompanySettingData.local_currency_code,
        group_currency_code: newCompanySettingData.group_currency_code,
        parallel_currency_code: newCompanySettingData.parallel_currency_code,
        exchange_rate_type: newCompanySettingData.exchange_rate_type,
        translation_method: newCompanySettingData.translation_method,
        revaluation_frequency: newCompanySettingData.revaluation_frequency
      }
    });
  };

  const handleDeleteCompanySetting = (companyCode: string) => {
    setDeletingCompanyCode(companyCode);
  };

  const confirmDeleteCompanySetting = () => {
    if (deletingCompanyCode) {
      deleteCompanySettingMutation.mutate(deletingCompanyCode);
    }
  };

  const currencies = currenciesData?.currencies || [];
  const exchangeRates = ratesData?.exchangeRates || [];
  const companySettings = companiesData?.companySettings || [];
  const statistics = statsData?.statistics || {};

  if (currenciesLoading || ratesLoading || companiesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/master-data">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Master Data
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6 text-green-600" />
              Finance Master Data - Global Currencies
            </h1>
            <p className="text-gray-600">
              Enterprise currency management with global integration across all ERP modules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isNewCurrencyDialogOpen} onOpenChange={setIsNewCurrencyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Coins className="h-4 w-4 mr-2" />
                New Currency
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button 
            onClick={handleUpdateRates} 
            variant="default" 
            size="sm"
            disabled={updateRatesMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {updateRatesMutation.isPending ? 'Updating...' : 'Update Rates'}
          </Button>
          <Button 
            onClick={handleAwsSync} 
            variant="outline" 
            size="sm"
            disabled={awsSyncMutation.isPending}
          >
            <Globe className="h-4 w-4 mr-2" />
            {awsSyncMutation.isPending ? 'Syncing...' : 'Sync to AWS'}
          </Button>
          <Button onClick={() => queryClient.invalidateQueries()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Currencies</p>
                <p className="text-xl font-bold">{statistics.totalActiveCurrencies}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Hard Currencies</p>
                <p className="text-xl font-bold">{statistics.hardCurrencies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Rate History</p>
                <p className="text-xl font-bold">{statistics.rateHistoryDays || 0} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Companies</p>
                <p className="text-xl font-bold">{statistics.configuredCompanies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Last Update</p>
                <p className="text-xs font-medium">
                  {statistics.latestRateDate ? new Date(statistics.latestRateDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="currencies" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="currencies">Global Currencies</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="companies">Company Settings</TabsTrigger>
          <TabsTrigger value="conversion">Currency Converter</TabsTrigger>
          <TabsTrigger value="integration">ERP Integration</TabsTrigger>
          <TabsTrigger value="history">Update History</TabsTrigger>
        </TabsList>

        {/* Global Currencies Tab */}
        <TabsContent value="currencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Currency Master Data
              </CardTitle>
              <CardDescription>
                Manage global currencies with enterprise integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency Code</TableHead>
                    <TableHead>Currency Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>USD Rate</TableHead>
                    <TableHead>Central Bank</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency: Currency) => (
                    <TableRow key={currency.currency_code}>
                      <TableCell className="font-medium">{currency.currency_code}</TableCell>
                      <TableCell>{currency.currency_name}</TableCell>
                      <TableCell className="text-lg">{currency.currency_symbol}</TableCell>
                      <TableCell>
                        <Badge variant={currency.is_hard_currency ? "default" : "secondary"}>
                          {currency.is_hard_currency ? "Hard Currency" : "Regional"}
                        </Badge>
                      </TableCell>
                      <TableCell>{currency.iso_country_code}</TableCell>
                      <TableCell className="font-mono">
                        {currency.current_usd_rate ? Number(currency.current_usd_rate).toFixed(4) : '-'}
                      </TableCell>
                      <TableCell className="text-xs">{currency.central_bank_rate_source}</TableCell>
                      <TableCell>
                        <Badge variant={currency.is_active ? "default" : "destructive"}>
                          {currency.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exchange Rates Tab */}
        <TabsContent value="rates">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Daily Exchange Rates
                  </CardTitle>
                  <CardDescription>
                    Current exchange rates with daily updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ratesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading exchange rates...</span>
                    </div>
                  ) : exchangeRates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exchange Rates Found</h3>
                      <p className="text-sm text-gray-600 mb-4 max-w-md">
                        No exchange rates have been added yet. Use the form on the right to add your first exchange rate.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exchangeRates.slice(0, 10).map((rate: ExchangeRate, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {rate.from_currency}
                              {rate.from_currency_name && (
                                <div className="text-xs text-gray-500">{rate.from_currency_name}</div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {rate.to_currency}
                              {rate.to_currency_name && (
                                <div className="text-xs text-gray-500">{rate.to_currency_name}</div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-lg">
                              {Number(rate.exchange_rate).toFixed(6)}
                            </TableCell>
                            <TableCell>
                              {rate.rate_date ? new Date(rate.rate_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{rate.rate_source || 'N/A'}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Add Exchange Rate
                </CardTitle>
                <CardDescription>
                  Update daily exchange rates manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fromCurrency">From Currency</Label>
                  <Select 
                    value={newRateData.fromCurrency || undefined} 
                    onValueChange={(value) => 
                      setNewRateData(prev => ({ ...prev, fromCurrency: value }))
                    }
                    disabled={currenciesLoading || currencies.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={currenciesLoading ? "Loading..." : currencies.length === 0 ? "No currencies available" : "Select currency"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length > 0 ? (
                        currencies
                          .filter((currency: Currency) => currency.is_active)
                          .map((currency: Currency) => (
                            <SelectItem key={currency.currency_code} value={currency.currency_code}>
                              {currency.currency_code} - {currency.currency_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="toCurrency">To Currency</Label>
                  <Select 
                    value={newRateData.toCurrency || undefined} 
                    onValueChange={(value) => 
                      setNewRateData(prev => ({ ...prev, toCurrency: value }))
                    }
                    disabled={currenciesLoading || currencies.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={currenciesLoading ? "Loading..." : currencies.length === 0 ? "No currencies available" : "Select currency"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length > 0 ? (
                        currencies
                          .filter((currency: Currency) => currency.is_active)
                          .map((currency: Currency) => (
                            <SelectItem key={currency.currency_code} value={currency.currency_code}>
                              {currency.currency_code} - {currency.currency_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="exchangeRate">Exchange Rate</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="0.000001"
                    placeholder="1.234567"
                    value={newRateData.exchangeRate}
                    onChange={(e) => setNewRateData(prev => ({ ...prev, exchangeRate: e.target.value }))}
                  />
                  {newRateData.fromCurrency && newRateData.toCurrency && (
                    <p className="text-xs text-gray-500 mt-1">
                      1 {newRateData.fromCurrency} = {newRateData.exchangeRate || '?'} {newRateData.toCurrency}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="rateSource">Rate Source</Label>
                  <Select 
                    value={newRateData.rateSource || undefined} 
                    onValueChange={(value) => 
                      setNewRateData(prev => ({ ...prev, rateSource: value === "__none__" ? "" : value }))
                    }
                    disabled={currenciesLoading || currencies.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={currenciesLoading ? "Loading..." : currencies.length === 0 ? "No rate sources available" : "Select rate source"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length > 0 ? (
                        <>
                          <SelectItem value="__none__">None</SelectItem>
                          {Array.from(new Set(currencies
                            .map((c: Currency) => c.central_bank_rate_source)
                            .filter(Boolean)
                          )).map((source: string) => (
                            <SelectItem key={`source-${source}`} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <SelectItem value="__no_sources__" disabled>No rate sources available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAddRate} 
                  className="w-full"
                  disabled={addRateMutation.isPending || !newRateData.fromCurrency || !newRateData.toCurrency || !newRateData.exchangeRate}
                >
                  {addRateMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  Update Rate
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Company Settings Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Company Currency Configuration
                  </CardTitle>
                  <CardDescription>
                    Currency settings for each company code across the ERP system
                  </CardDescription>
                </div>
                <Dialog open={isNewCompanySettingDialogOpen} onOpenChange={setIsNewCompanySettingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      <Building className="h-4 w-4 mr-2" />
                      New Company Setting
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Company Currency Setting</DialogTitle>
                      <DialogDescription>
                        Configure currency settings for a company code. All fields are required.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="col-span-2">
                        <Label htmlFor="company_code">Company Code *</Label>
                        <Select 
                          value={newCompanySettingData.company_code} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, company_code: value }))
                          }
                          disabled={companyCodesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={companyCodesLoading ? "Loading..." : "Select company code"} />
                          </SelectTrigger>
                          <SelectContent>
                            {companyCodes.length > 0 ? (
                              companyCodes.map((company: any) => (
                                <SelectItem key={company.code} value={company.code}>
                                  {company.code} - {company.name || 'N/A'}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_companies__" disabled>No company codes available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="local_currency_code">Local Currency *</Label>
                        <Select 
                          value={newCompanySettingData.local_currency_code} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, local_currency_code: value }))
                          }
                          disabled={currenciesLoading || currencies.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={currenciesLoading ? "Loading..." : "Select currency"} />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.length > 0 ? (
                              currencies
                                .filter((currency: Currency) => currency.is_active)
                                .map((currency: Currency) => (
                                  <SelectItem key={currency.currency_code} value={currency.currency_code}>
                                    {currency.currency_code} - {currency.currency_name}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="group_currency_code">Group Currency *</Label>
                        <Select 
                          value={newCompanySettingData.group_currency_code} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, group_currency_code: value }))
                          }
                          disabled={currenciesLoading || currencies.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={currenciesLoading ? "Loading..." : "Select currency"} />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.length > 0 ? (
                              currencies
                                .filter((currency: Currency) => currency.is_active)
                                .map((currency: Currency) => (
                                  <SelectItem key={currency.currency_code} value={currency.currency_code}>
                                    {currency.currency_code} - {currency.currency_name}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="parallel_currency_code">Parallel Currency (Optional)</Label>
                        <Select 
                          value={newCompanySettingData.parallel_currency_code || undefined} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, parallel_currency_code: value === "__none__" ? "" : value }))
                          }
                          disabled={currenciesLoading || currencies.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {currencies.length > 0 ? (
                              currencies
                                .filter((currency: Currency) => currency.is_active)
                                .map((currency: Currency) => (
                                  <SelectItem key={currency.currency_code} value={currency.currency_code}>
                                    {currency.currency_code} - {currency.currency_name}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="exchange_rate_type">Exchange Rate Type *</Label>
                        <Select 
                          value={newCompanySettingData.exchange_rate_type} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, exchange_rate_type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select rate type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spot Rate">Spot Rate</SelectItem>
                            <SelectItem value="Average Rate">Average Rate</SelectItem>
                            <SelectItem value="Closing Rate">Closing Rate</SelectItem>
                            <SelectItem value="Historical Rate">Historical Rate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="translation_method">Translation Method *</Label>
                        <Select 
                          value={newCompanySettingData.translation_method} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, translation_method: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Average Rate">Average Rate</SelectItem>
                            <SelectItem value="Closing Rate">Closing Rate</SelectItem>
                            <SelectItem value="Spot Rate">Spot Rate</SelectItem>
                            <SelectItem value="Historical Rate">Historical Rate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="revaluation_frequency">Revaluation Frequency *</Label>
                        <Select 
                          value={newCompanySettingData.revaluation_frequency} 
                          onValueChange={(value) => 
                            setNewCompanySettingData(prev => ({ ...prev, revaluation_frequency: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                            <SelectItem value="Yearly">Yearly</SelectItem>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsNewCompanySettingDialogOpen(false)}
                        disabled={createCompanySettingMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateCompanySetting}
                        disabled={createCompanySettingMutation.isPending}
                      >
                        {createCompanySettingMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Building className="h-4 w-4 mr-2" />
                            Create Setting
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading company settings...</span>
                </div>
              ) : companySettings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Company Settings Found</h3>
                  <p className="text-sm text-gray-600 mb-4 max-w-md">
                    No company currency configurations have been set up yet. Company currency settings can be configured through the company code master data or financial configuration modules.
                  </p>
                  <div className="text-xs text-gray-500">
                    Company settings link company codes to their local, group, and parallel currencies.
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Code</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Local Currency</TableHead>
                      <TableHead>Group Currency</TableHead>
                      <TableHead>Parallel Currency</TableHead>
                      <TableHead>Rate Type</TableHead>
                      <TableHead>Revaluation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companySettings.map((setting: CompanySetting, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{setting.company_code}</TableCell>
                        <TableCell>{setting.company_name || '-'}</TableCell>
                        <TableCell>
                          {setting.local_currency_code ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{setting.local_currency_code}</span>
                              {setting.local_currency_symbol && (
                                <span className="text-lg">{setting.local_currency_symbol}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {setting.local_currency_name && (
                            <div className="text-xs text-gray-500">{setting.local_currency_name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {setting.group_currency_code ? (
                            <Badge variant="outline">{setting.group_currency_code}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {setting.parallel_currency_code ? (
                            <Badge variant="secondary">{setting.parallel_currency_code}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{setting.exchange_rate_type || '-'}</TableCell>
                        <TableCell>{setting.revaluation_frequency || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCompanySetting(setting)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCompanySetting(setting.company_code)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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

          {/* Edit Company Setting Dialog */}
          <Dialog open={isEditCompanySettingDialogOpen} onOpenChange={setIsEditCompanySettingDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Company Currency Setting</DialogTitle>
                <DialogDescription>
                  Update currency settings for company code: {editingCompanySetting?.company_code}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Company Code</Label>
                  <Input
                    value={editingCompanySetting?.company_code || ''}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Company code cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="edit_local_currency_code">Local Currency *</Label>
                  <Select 
                    value={newCompanySettingData.local_currency_code} 
                    onValueChange={(value) => 
                      setNewCompanySettingData(prev => ({ ...prev, local_currency_code: value }))
                    }
                    disabled={currenciesLoading || currencies.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={currenciesLoading ? "Loading..." : "Select currency"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length > 0 ? (
                        currencies
                          .filter((currency: Currency) => currency.is_active)
                          .map((currency: Currency) => (
                            <SelectItem key={currency.currency_code} value={currency.currency_code}>
                              {currency.currency_code} - {currency.currency_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_group_currency_code">Group Currency *</Label>
                  <Select 
                    value={newCompanySettingData.group_currency_code} 
                    onValueChange={(value) => 
                      setNewCompanySettingData(prev => ({ ...prev, group_currency_code: value }))
                    }
                    disabled={currenciesLoading || currencies.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={currenciesLoading ? "Loading..." : "Select currency"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length > 0 ? (
                        currencies
                          .filter((currency: Currency) => currency.is_active)
                          .map((currency: Currency) => (
                            <SelectItem key={currency.currency_code} value={currency.currency_code}>
                              {currency.currency_code} - {currency.currency_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_parallel_currency_code">Parallel Currency (Optional)</Label>
                  <Select 
                    value={newCompanySettingData.parallel_currency_code || undefined} 
                    onValueChange={(value) => 
                      setNewCompanySettingData(prev => ({ ...prev, parallel_currency_code: value === "__none__" ? "" : value }))
                    }
                    disabled={currenciesLoading || currencies.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {currencies.length > 0 ? (
                        currencies
                          .filter((currency: Currency) => currency.is_active)
                          .map((currency: Currency) => (
                            <SelectItem key={currency.currency_code} value={currency.currency_code}>
                              {currency.currency_code} - {currency.currency_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_currencies__" disabled>No currencies available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_exchange_rate_type">Exchange Rate Type *</Label>
                  <Select 
                    value={newCompanySettingData.exchange_rate_type} 
                    onValueChange={(value) => 
                      setNewCompanySettingData(prev => ({ ...prev, exchange_rate_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spot Rate">Spot Rate</SelectItem>
                      <SelectItem value="Average Rate">Average Rate</SelectItem>
                      <SelectItem value="Closing Rate">Closing Rate</SelectItem>
                      <SelectItem value="Historical Rate">Historical Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_translation_method">Translation Method *</Label>
                  <Select 
                    value={newCompanySettingData.translation_method} 
                    onValueChange={(value) => 
                      setNewCompanySettingData(prev => ({ ...prev, translation_method: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Average Rate">Average Rate</SelectItem>
                      <SelectItem value="Closing Rate">Closing Rate</SelectItem>
                      <SelectItem value="Spot Rate">Spot Rate</SelectItem>
                      <SelectItem value="Historical Rate">Historical Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_revaluation_frequency">Revaluation Frequency *</Label>
                  <Select 
                    value={newCompanySettingData.revaluation_frequency} 
                    onValueChange={(value) => 
                      setNewCompanySettingData(prev => ({ ...prev, revaluation_frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditCompanySettingDialogOpen(false);
                    setEditingCompanySetting(null);
                  }}
                  disabled={updateCompanySettingMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCompanySetting}
                  disabled={updateCompanySettingMutation.isPending}
                >
                  {updateCompanySettingMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Update Setting
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deletingCompanyCode !== null} onOpenChange={(open) => !open && setDeletingCompanyCode(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Company Currency Setting</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the currency setting for company code <strong>{deletingCompanyCode}</strong>? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCompanyCode(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteCompanySetting}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteCompanySettingMutation.isPending}
                >
                  {deleteCompanySettingMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Currency Converter Tab */}
        <TabsContent value="conversion">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Currency Converter
                </CardTitle>
                <CardDescription>
                  Real-time currency conversion using enterprise exchange rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={conversionData.amount}
                    onChange={(e) => setConversionData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromCurrency">From Currency</Label>
                    <Select value={conversionData.fromCurrency} onValueChange={(value) => 
                      setConversionData(prev => ({ ...prev, fromCurrency: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency: Currency) => (
                          <SelectItem key={currency.currency_code} value={currency.currency_code}>
                            {currency.currency_code} - {currency.currency_symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="toCurrency">To Currency</Label>
                    <Select value={conversionData.toCurrency} onValueChange={(value) => 
                      setConversionData(prev => ({ ...prev, toCurrency: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency: Currency) => (
                          <SelectItem key={currency.currency_code} value={currency.currency_code}>
                            {currency.currency_code} - {currency.currency_symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {conversionLoading && (
                  <div className="flex items-center justify-center p-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Converting...
                  </div>
                )}
              </CardContent>
            </Card>

            {conversionResult?.success && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Conversion Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-6 border rounded-lg bg-gray-50">
                      <div className="text-2xl font-bold text-gray-900">
                        {conversionResult.conversion.convertedAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6
                        })}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {conversionResult.conversion.toCurrency}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Original Amount:</span>
                        <span className="font-medium">
                          {conversionResult.conversion.originalAmount} {conversionResult.conversion.fromCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exchange Rate:</span>
                        <span className="font-mono">
                          {conversionResult.conversion.exchangeRate.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate Date:</span>
                        <span>{new Date(conversionResult.conversion.rateDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate Source:</span>
                        <Badge variant="outline">{conversionResult.conversion.rateSource}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ERP Integration Tab */}
        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                ERP Module Integration
              </CardTitle>
              <CardDescription>
                Currency integration across all MallyERP modules following enterprise architecture
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading integration data...</span>
                </div>
              ) : integrationData?.integration ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600">Active Currencies</p>
                            <p className="text-xl font-bold">{integrationData.integration.summary?.totalActiveCurrencies || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600">Exchange Rates</p>
                            <p className="text-xl font-bold">{integrationData.integration.summary?.totalExchangeRates || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-sm text-gray-600">Company Settings</p>
                            <p className="text-xl font-bold">{integrationData.integration.summary?.totalCompanySettings || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm text-gray-600">Integrated Modules</p>
                            <p className="text-xl font-bold">{integrationData.integration.summary?.integratedModules || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Module Integration Details */}
                  {integrationData.integration.modules && integrationData.integration.modules.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Module Integration Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {integrationData.integration.modules.map((module: any, index: number) => (
                          <Card key={index}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-base">{module.name}</CardTitle>
                                  <CardDescription>{module.description}</CardDescription>
                                </div>
                                <Badge variant={module.integrationStatus === 'Active' ? 'default' : 'secondary'}>
                                  {module.integrationStatus}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">Currency Usage</p>
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <p className="text-gray-500">Currencies</p>
                                      <p className="font-semibold">{module.currencyUsage?.uniqueCurrencies || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Transactions</p>
                                      <p className="font-semibold">{module.currencyUsage?.totalTransactions || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">With Currency</p>
                                      <p className="font-semibold">{module.currencyUsage?.transactionsWithCurrency || 0}</p>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">Features</p>
                                  <div className="flex flex-wrap gap-2">
                                    {module.features?.map((feature: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {feature}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Settings className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Module Integration Data</h3>
                      <p className="text-sm text-gray-600 mb-4 max-w-md">
                        Currency integration data will appear here once transactions are created in Sales, Purchase, Finance, or Inventory modules.
                      </p>
                      <div className="text-xs text-gray-500">
                        The system automatically tracks currency usage across all ERP modules.
                      </div>
                    </div>
                  )}

                  {/* Integration Architecture Info */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-1">Enterprise Currency Integration</p>
                          <p className="text-xs text-blue-700">
                            All ERP modules automatically use the global currency master data for transactions. 
                            Exchange rates are applied automatically based on transaction dates and company currency settings.
                            Currency revaluation runs according to configured frequencies for each company.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Integration Data</h3>
                  <p className="text-sm text-gray-600">
                    Please try refreshing the page or contact support if the issue persists.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Update History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Exchange Rate Update History
              </CardTitle>
              <CardDescription>
                Track daily exchange rate updates from external API sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {updateHistory?.history?.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Last {updateHistory.totalUpdates} updates ({updateHistory.period})
                    </div>
                    <Button
                      onClick={handleUpdateRates}
                      disabled={updateRatesMutation.isPending}
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {updateRatesMutation.isPending ? 'Updating...' : 'Manual Update'}
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Currencies Updated</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {updateHistory.history.map((update: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {new Date(update.update_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {update.provider_used || 'Manual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {update.currencies_updated}
                          </TableCell>
                          <TableCell>
                            <Badge variant={update.status === 'success' ? 'default' : 'destructive'}>
                              {update.status === 'success' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {update.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {update.notes}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {new Date(update.created_at).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Update History</h3>
                  <p className="text-gray-600 mb-4">
                    Exchange rate updates will appear here once you start using automatic or manual updates.
                  </p>
                  <Button
                    onClick={handleUpdateRates}
                    disabled={updateRatesMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {updateRatesMutation.isPending ? 'Updating...' : 'Start First Update'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Currency Dialog */}
      <Dialog open={isNewCurrencyDialogOpen} onOpenChange={setIsNewCurrencyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Currency</DialogTitle>
            <DialogDescription>
              Add a new currency to the global finance system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency_code" className="text-right">
                Code
              </Label>
              <Input
                id="currency_code"
                value={newCurrencyData.currency_code}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, currency_code: e.target.value})}
                className="col-span-3"
                placeholder="e.g., EUR"
                maxLength={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency_name" className="text-right">
                Name
              </Label>
              <Input
                id="currency_name"
                value={newCurrencyData.currency_name}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, currency_name: e.target.value})}
                className="col-span-3"
                placeholder="e.g., Euro"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency_symbol" className="text-right">
                Symbol
              </Label>
              <Input
                id="currency_symbol"
                value={newCurrencyData.currency_symbol}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, currency_symbol: e.target.value})}
                className="col-span-3"
                placeholder="e.g., €"
                maxLength={5}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="iso_country_code" className="text-right">
                Country
              </Label>
              <Input
                id="iso_country_code"
                value={newCurrencyData.iso_country_code}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, iso_country_code: e.target.value})}
                className="col-span-3"
                placeholder="e.g., DE"
                maxLength={2}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="decimal_places" className="text-right">
                Decimal Places
              </Label>
              <Input
                id="decimal_places"
                type="number"
                min="0"
                max="6"
                value={newCurrencyData.decimal_places}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, decimal_places: e.target.value})}
                className="col-span-3"
                placeholder="Enter decimal places"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                Active
              </Label>
              <Select
                value={newCurrencyData.is_active.toString()}
                onValueChange={(value) => setNewCurrencyData({...newCurrencyData, is_active: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_hard_currency" className="text-right">
                Hard Currency
              </Label>
              <Select
                value={newCurrencyData.is_hard_currency.toString()}
                onValueChange={(value) => setNewCurrencyData({...newCurrencyData, is_hard_currency: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Hard Currency</SelectItem>
                  <SelectItem value="false">Regional Currency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="central_bank_rate_source" className="text-right">
                Rate Source
              </Label>
              <Input
                id="central_bank_rate_source"
                value={newCurrencyData.central_bank_rate_source}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, central_bank_rate_source: e.target.value})}
                className="col-span-3"
                placeholder="Enter rate source"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current_usd_rate" className="text-right">
                USD Rate
              </Label>
              <Input
                id="current_usd_rate"
                type="number"
                step="0.0001"
                value={newCurrencyData.current_usd_rate}
                onChange={(e) => setNewCurrencyData({...newCurrencyData, current_usd_rate: e.target.value})}
                className="col-span-3"
                placeholder="Enter USD rate"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              onClick={handleCreateCurrency}
              disabled={createCurrencyMutation.isPending}
            >
              {createCurrencyMutation.isPending ? 'Creating...' : 'Create Currency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}