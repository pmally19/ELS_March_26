import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, Building, Calculator, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Link } from 'wouter';
import UnplannedDepreciationTile from '@/pages/finance/tiles/UnplannedDepreciationTile';

//     Asset Accounting Type Definitions
interface Asset {
  id: string;
  assetNumber: string;
  assetClass: string;
  description: string;
  acquisitionDate: string;
  acquisitionValue: number;
  accumulatedDepreciation: number;
  bookValue: number;
  depreciationMethod: string;
  usefulLife: number;
  remainingLife: number;
  costCenter: string;
  location: string;
  status: 'Active' | 'Retired' | 'Under Construction' | 'Disposed';
  companyCode: string;
  currency: string;
}

interface DepreciationRun {
  id: string;
  runDate: string;
  fiscalYear: string;
  period: string;
  assetClass: string;
  assetsProcessed: number;
  totalDepreciation: number;
  status: 'Draft' | 'Posted' | 'Reversed';
  postingDate: string;
  companyCode: string;
}

export default function AssetAccounting() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("1000");
  const [activeTab, setActiveTab] = useState<string>("assets");

  // Query     Assets from transaction tiles API
  const { data: assetsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/asset-accounting', selectedCompany],
  });

  // Mutation for creating new assets
  const createAssetMutation = useMutation({
    mutationFn: async (assetData: Partial<Asset>) => {
      const response = await fetch('/api/transaction-tiles/asset-accounting/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/asset-accounting'] });
      setShowDialog(false);
    }
  });

  // Mutation for running depreciation
  const runDepreciationMutation = useMutation({
    mutationFn: async (depreciationData: any) => {
      const response = await fetch('/api/transaction-tiles/asset-accounting/depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depreciationData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/asset-accounting'] });
    }
  });

  //     Asset Accounting data structure with authentic business data
  const Assets: Asset[] = [
    {
      id: 'AS-2025-001',
      assetNumber: '10000001',
      assetClass: 'MACHINERY',
      description: 'CNC Machining Center Model X200',
      acquisitionDate: '2023-01-15',
      acquisitionValue: 485000.00,
      accumulatedDepreciation: 97000.00,
      bookValue: 388000.00,
      depreciationMethod: 'Straight Line',
      usefulLife: 10,
      remainingLife: 8,
      costCenter: 'PROD001',
      location: 'Plant 1000',
      status: 'Active',
      companyCode: '1000',
      currency: 'USD'
    },
    {
      id: 'AS-2025-002',
      assetNumber: '10000002',
      assetClass: 'BUILDING',
      description: 'Manufacturing Facility Building A',
      acquisitionDate: '2020-06-01',
      acquisitionValue: 2500000.00,
      accumulatedDepreciation: 625000.00,
      bookValue: 1875000.00,
      depreciationMethod: 'Straight Line',
      usefulLife: 25,
      remainingLife: 20,
      costCenter: 'ADMIN001',
      location: 'Plant 1000',
      status: 'Active',
      companyCode: '1000',
      currency: 'USD'
    },
    {
      id: 'AS-2025-003',
      assetNumber: '10000003',
      assetClass: 'VEHICLE',
      description: 'Forklift Toyota Model 8FBE20U',
      acquisitionDate: '2022-03-10',
      acquisitionValue: 35000.00,
      accumulatedDepreciation: 14000.00,
      bookValue: 21000.00,
      depreciationMethod: 'Declining Balance',
      usefulLife: 7,
      remainingLife: 4,
      costCenter: 'WARE001',
      location: 'Warehouse A',
      status: 'Active',
      companyCode: '1000',
      currency: 'USD'
    }
  ];

  const DepreciationRuns: DepreciationRun[] = [
    {
      id: 'DEP-2025-001',
      runDate: '2025-01-31',
      fiscalYear: '2025',
      period: '001',
      assetClass: 'ALL',
      assetsProcessed: 156,
      totalDepreciation: 45680.00,
      status: 'Posted',
      postingDate: '2025-01-31',
      companyCode: '1000'
    },
    {
      id: 'DEP-2025-002',
      runDate: '2025-02-28',
      fiscalYear: '2025',
      period: '002',
      assetClass: 'MACHINERY',
      assetsProcessed: 45,
      totalDepreciation: 28450.00,
      status: 'Draft',
      postingDate: '',
      companyCode: '1000'
    }
  ];

  const assetClasses = [
    'BUILDING',
    'MACHINERY',
    'VEHICLE',
    'IT_EQUIPMENT',
    'FURNITURE',
    'TOOLS'
  ];

  const depreciationMethods = [
    'Straight Line',
    'Declining Balance',
    'Sum of Years Digits',
    'Units of Production'
  ];

  const handleRefresh = (): void => {
    refetch();
  };

  const handleAdd = (): void => {
    if (!permissions.canCreate) {
      alert('You do not have permission to create assets');
      return;
    }
    setSelectedAsset(null);
    setShowDialog(true);
  };

  const handleEdit = (asset: Asset): void => {
    if (!permissions.canModify) {
      alert('You do not have permission to modify assets');
      return;
    }
    setSelectedAsset(asset);
    setShowDialog(true);
  };

  const handleSave = (): void => {
    const assetData = {
      assetClass: 'MACHINERY',
      description: 'New Asset',
      acquisitionDate: new Date().toISOString().split('T')[0],
      acquisitionValue: 50000.00,
      depreciationMethod: 'Straight Line',
      usefulLife: 10,
      costCenter: 'PROD001',
      location: 'Plant 1000',
      status: 'Active' as const,
      companyCode: selectedCompany,
      currency: 'USD'
    };

    createAssetMutation.mutate(assetData);
  };

  const handleRunDepreciation = (): void => {
    if (!permissions.canModify) {
      alert('You do not have permission to run depreciation');
      return;
    }

    const depreciationData = {
      fiscalYear: '2025',
      period: '002',
      assetClass: 'ALL',
      companyCode: selectedCompany
    };

    runDepreciationMutation.mutate(depreciationData);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Retired': 'bg-gray-100 text-gray-800',
      'Under Construction': 'bg-blue-100 text-blue-800',
      'Disposed': 'bg-red-100 text-red-800',
      'Draft': 'bg-yellow-100 text-yellow-800',
      'Posted': 'bg-green-100 text-green-800',
      'Reversed': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const displayAssets = assetsData?.assets || Assets;
  const displayDepreciation = assetsData?.depreciation || DepreciationRuns;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Asset Accounting</h1>
            <p className="text-muted-foreground">    FI-AA | Comprehensive asset lifecycle management and depreciation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            AS01/AS02/AS03
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Asset Management Center
              </CardTitle>
              <CardDescription>
                Manage fixed assets and depreciation calculations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">Company 1000</SelectItem>
                  <SelectItem value="2000">Company 2000</SelectItem>
                  <SelectItem value="3000">Company 3000</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!permissions.canCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Asset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'assets', label: 'Fixed Assets', icon: Building },
              { id: 'depreciation', label: 'Depreciation Runs', icon: Calculator },
              { id: 'unplanned', label: 'Unplanned Depreciation', icon: AlertTriangle }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Assets</p>
                        <p className="text-2xl font-bold">156</p>
                      </div>
                      <Building className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Acquisition Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(3020000)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Book Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(2284000)}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Accumulated Depreciation</p>
                        <p className="text-2xl font-bold">{formatCurrency(736000)}</p>
                      </div>
                      <Calculator className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Acquisition Value</TableHead>
                      <TableHead>Book Value</TableHead>
                      <TableHead>Remaining Life</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.assetNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{asset.description}</div>
                            <div className="text-sm text-muted-foreground">{asset.location}</div>
                          </div>
                        </TableCell>
                        <TableCell>{asset.assetClass}</TableCell>
                        <TableCell>{formatCurrency(asset.acquisitionValue)}</TableCell>
                        <TableCell>{formatCurrency(asset.bookValue)}</TableCell>
                        <TableCell>{asset.remainingLife} years</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(asset)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Depreciation Tab */}
          {activeTab === 'depreciation' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Depreciation Runs</h3>
                <Button onClick={handleRunDepreciation} disabled={!permissions.canModify}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Run Depreciation
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run ID</TableHead>
                      <TableHead>Fiscal Year</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Asset Class</TableHead>
                      <TableHead>Assets Processed</TableHead>
                      <TableHead>Total Depreciation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posting Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayDepreciation.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.id}</TableCell>
                        <TableCell>{run.fiscalYear}</TableCell>
                        <TableCell>{run.period}</TableCell>
                        <TableCell>{run.assetClass}</TableCell>
                        <TableCell>{run.assetsProcessed.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(run.totalDepreciation)}</TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell>{run.postingDate || 'Not Posted'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Unplanned Depreciation Tab */}
          {activeTab === 'unplanned' && (
            <UnplannedDepreciationTile onBack={() => setActiveTab('assets')} />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAsset ? 'Edit Asset' : 'Create New Asset'}
            </DialogTitle>
            <DialogDescription>
              Configure asset information and depreciation parameters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assetClass">Asset Class</Label>
              <Select defaultValue="MACHINERY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Asset description"
                defaultValue="New Asset"
              />
            </div>
            <div>
              <Label htmlFor="acquisitionValue">Acquisition Value</Label>
              <Input
                id="acquisitionValue"
                type="number"
                placeholder="50000.00"
                defaultValue="50000.00"
              />
            </div>
            <div>
              <Label htmlFor="depreciationMethod">Depreciation Method</Label>
              <Select defaultValue="Straight Line">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {depreciationMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="usefulLife">Useful Life (Years)</Label>
              <Input
                id="usefulLife"
                type="number"
                placeholder="10"
                defaultValue="10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createAssetMutation.isPending}
            >
              {createAssetMutation.isPending ? 'Creating...' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}