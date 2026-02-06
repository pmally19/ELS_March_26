import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, AlertTriangle, FileText, Building2, DollarSign, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UnplannedDepreciationTileProps {
    onBack: () => void;
}

interface AssetInfo {
    id: number;
    asset_number: string;
    name: string;
    acquisition_cost: number;
    accumulated_depreciation: number;
    net_book_value: number;
    asset_class_name: string;
    company_code: string;
}

export default function UnplannedDepreciationTile({ onBack }: UnplannedDepreciationTileProps) {
    const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
    const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
    const [assetValueDate, setAssetValueDate] = useState(new Date().toISOString().split('T')[0]);
    const [companyCodeId, setCompanyCodeId] = useState("");
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
    const [assetId, setAssetId] = useState("");
    const [depreciationAreaId, setDepreciationAreaId] = useState("");
    const [transactionTypeId, setTransactionTypeId] = useState("");
    const [depreciationAmount, setDepreciationAmount] = useState("");
    const [reason, setReason] = useState("");
    const [reference, setReference] = useState("");
    const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch company codes from database
    const { data: companyCodes = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/company-codes'],
        queryFn: async () => {
            const response = await fetch('/api/finance-enhanced/asset-management/company-codes');
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : data.data || [];
        },
    });

    // Fetch depreciation areas from database
    const { data: depreciationAreas = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/depreciation-areas'],
        queryFn: async () => {
            const response = await fetch('/api/finance-enhanced/asset-management/depreciation-areas');
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data.filter((d: any) => d.is_active !== false) : [];
        },
    });

    // Fetch transaction types from database
    const { data: transactionTypes = [] } = useQuery({
        queryKey: ['/api/master-data/transaction-types'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/transaction-types');
            if (!response.ok) return [];
            const data = await response.json();
            // Filter for depreciation-related transaction types or return all if none match
            const allTypes = Array.isArray(data) ? data : data.data || [];
            const depTypes = allTypes.filter((t: any) => t.is_active !== false && (
                t.category === 'depreciation' ||
                t.code?.includes('DEP') ||
                t.name?.toLowerCase().includes('depreciation') ||
                t.name?.toLowerCase().includes('unplanned')
            ));
            return depTypes.length > 0 ? depTypes : allTypes.filter((t: any) => t.is_active !== false);
        },
    });

    // Fetch fiscal years - generate from current year
    const { data: fiscalYears = [] } = useQuery({
        queryKey: ['/api/fiscal-years-generated'],
        queryFn: async () => {
            // Generate fiscal years since the API might not exist
            const currentYear = new Date().getFullYear();
            return [
                { fiscal_year: currentYear + 1 },
                { fiscal_year: currentYear },
                { fiscal_year: currentYear - 1 },
                { fiscal_year: currentYear - 2 }
            ];
        },
    });

    // Fetch assets from database (filtered by company code if selected)
    const { data: assets = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/assets', companyCodeId],
        queryFn: async () => {
            let url = '/api/finance-enhanced/asset-management/assets';
            const params = new URLSearchParams();
            if (companyCodeId) params.append('company_code_id', companyCodeId);
            params.append('status', 'Active');
            if (params.toString()) url += '?' + params.toString();

            const response = await fetch(url);
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : data.data || [];
        },
        enabled: true,
    });

    // Fetch asset details when asset is selected
    const fetchAssetDetails = async (id: string) => {
        try {
            const response = await fetch(`/api/finance-enhanced/asset-management/assets/${id}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedAsset(data);
            }
        } catch (error) {
            console.error('Error fetching asset details:', error);
        }
    };

    // Post unplanned depreciation mutation
    const postDepreciationMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest('/api/asset-management/depreciation/unplanned', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        onSuccess: (data: any) => {
            toast({
                title: "Depreciation Posted",
                description: `Unplanned depreciation of $${parseFloat(depreciationAmount).toLocaleString()} posted successfully.`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
            queryClient.invalidateQueries({ queryKey: ['/api/depreciation-runs'] });
            // Reset form
            setAssetId("");
            setDepreciationAmount("");
            setReason("");
            setReference("");
            setSelectedAsset(null);
        },
        onError: (error: any) => {
            toast({
                title: "Posting Failed",
                description: error.message || "Failed to post unplanned depreciation",
                variant: "destructive",
            });
        },
    });

    const handleAssetChange = (value: string) => {
        setAssetId(value);
        if (value) {
            fetchAssetDetails(value);
        } else {
            setSelectedAsset(null);
        }
    };

    const handlePost = () => {
        // Validation
        if (!companyCodeId) {
            toast({ title: "Validation Error", description: "Please select a company code", variant: "destructive" });
            return;
        }
        if (!assetId) {
            toast({ title: "Validation Error", description: "Please select an asset", variant: "destructive" });
            return;
        }
        if (!depreciationAreaId) {
            toast({ title: "Validation Error", description: "Please select a depreciation area", variant: "destructive" });
            return;
        }
        if (!transactionTypeId) {
            toast({ title: "Validation Error", description: "Please select a transaction type", variant: "destructive" });
            return;
        }
        if (!depreciationAmount || parseFloat(depreciationAmount) <= 0) {
            toast({ title: "Validation Error", description: "Please enter a valid depreciation amount", variant: "destructive" });
            return;
        }
        if (!reason.trim()) {
            toast({ title: "Validation Error", description: "Please provide a reason for unplanned depreciation", variant: "destructive" });
            return;
        }

        // Check amount doesn't exceed book value
        if (selectedAsset && parseFloat(depreciationAmount) > selectedAsset.net_book_value) {
            toast({
                title: "Validation Error",
                description: `Depreciation amount cannot exceed current book value ($${selectedAsset.net_book_value.toLocaleString()})`,
                variant: "destructive"
            });
            return;
        }

        postDepreciationMutation.mutate({
            document_date: documentDate,
            posting_date: postingDate,
            asset_value_date: assetValueDate,
            company_code_id: parseInt(companyCodeId),
            fiscal_year: parseInt(fiscalYear),
            asset_id: parseInt(assetId),
            depreciation_area_id: parseInt(depreciationAreaId),
            transaction_type_id: parseInt(transactionTypeId),
            depreciation_amount: parseFloat(depreciationAmount),
            reason: reason,
            reference: reference || null
        });
    };

    const handleSimulate = () => {
        toast({
            title: "Simulation",
            description: "Simulation functionality - would show GL postings preview",
        });
    };

    return (
        <div className="space-y-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                    <div>
                        <h2 className="text-2xl font-bold">Unplanned Depreciation</h2>
                        <p className="text-sm text-gray-500">Post special depreciation outside normal schedule</p>
                    </div>
                </div>
                <Button variant="outline" onClick={onBack}>
                    Back to Asset Accounting
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Document Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Document Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Document Date</Label>
                                <Input
                                    type="date"
                                    value={documentDate}
                                    onChange={(e) => setDocumentDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Posting Date</Label>
                                <Input
                                    type="date"
                                    value={postingDate}
                                    onChange={(e) => setPostingDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Asset Value Date</Label>
                                <Input
                                    type="date"
                                    value={assetValueDate}
                                    onChange={(e) => setAssetValueDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Company Code *</Label>
                                <Select value={companyCodeId} onValueChange={setCompanyCodeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select company code" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyCodes.map((cc: any) => (
                                            <SelectItem key={cc.id} value={cc.id.toString()}>
                                                {cc.code} - {cc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fiscal Year</Label>
                                <Select value={fiscalYear} onValueChange={setFiscalYear}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select fiscal year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fiscalYears.map((fy: any) => (
                                            <SelectItem key={fy.fiscal_year} value={fy.fiscal_year.toString()}>
                                                {fy.fiscal_year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Reference</Label>
                                <Input
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="External reference"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Asset Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Asset Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Asset *</Label>
                                <Select value={assetId} onValueChange={handleAssetChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assets.map((asset: any) => (
                                            <SelectItem key={asset.id} value={asset.id.toString()}>
                                                {asset.asset_number} - {asset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Depreciation Area *</Label>
                                <Select value={depreciationAreaId} onValueChange={setDepreciationAreaId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select depreciation area" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {depreciationAreas.map((area: any) => (
                                            <SelectItem key={area.id} value={area.id.toString()}>
                                                {area.code} - {area.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Transaction Type *</Label>
                                <Select value={transactionTypeId} onValueChange={setTransactionTypeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select transaction type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {transactionTypes.length > 0 ? (
                                            transactionTypes.map((tt: any) => (
                                                <SelectItem key={tt.id} value={tt.id.toString()}>
                                                    {tt.code} - {tt.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="unplanned" disabled>
                                                No depreciation transaction types found
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Depreciation Amount *</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={depreciationAmount}
                                        onChange={(e) => setDepreciationAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label>Reason for Unplanned Depreciation *</Label>
                                <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Explain why this unplanned depreciation is being posted (required for audit purposes)"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex gap-4 justify-end">
                                <Button variant="outline" onClick={handleSimulate}>
                                    Simulate
                                </Button>
                                <Button
                                    onClick={handlePost}
                                    disabled={postDepreciationMutation.isPending}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {postDepreciationMutation.isPending ? 'Posting...' : 'Post Depreciation'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Asset Info */}
                <div className="space-y-6">
                    {/* Selected Asset Info */}
                    <Card className={selectedAsset ? "border-blue-200 bg-blue-50" : ""}>
                        <CardHeader>
                            <CardTitle className="text-lg">Asset Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedAsset ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Asset Number</span>
                                        <Badge variant="outline">{selectedAsset.asset_number}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Description</span>
                                        <span className="font-medium text-sm text-right max-w-[60%]">{selectedAsset.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Asset Class</span>
                                        <span className="font-medium">{selectedAsset.asset_class_name || '-'}</span>
                                    </div>
                                    <hr />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Acquisition Cost</span>
                                        <span className="font-medium">${selectedAsset.acquisition_cost?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Accumulated Depreciation</span>
                                        <span className="font-medium text-red-600">
                                            -${selectedAsset.accumulated_depreciation?.toLocaleString() || '0'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-t pt-2">
                                        <span className="text-sm font-medium">Current Book Value</span>
                                        <span className="font-bold text-lg text-green-600">
                                            ${selectedAsset.net_book_value?.toLocaleString() || '0'}
                                        </span>
                                    </div>
                                    {depreciationAmount && parseFloat(depreciationAmount) > 0 && (
                                        <>
                                            <hr />
                                            <div className="flex justify-between items-center text-orange-600">
                                                <span className="text-sm">Unplanned Depreciation</span>
                                                <span className="font-medium">-${parseFloat(depreciationAmount).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t pt-2">
                                                <span className="text-sm font-medium">New Book Value</span>
                                                <span className="font-bold text-lg">
                                                    ${Math.max(0, (selectedAsset.net_book_value || 0) - parseFloat(depreciationAmount || '0')).toLocaleString()}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>Select an asset to view details</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* GL Preview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">GL Posting Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {depreciationAmount && parseFloat(depreciationAmount) > 0 ? (
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                                        <div>
                                            <p className="font-medium">Depreciation Expense</p>
                                            <p className="text-xs text-gray-500">Debit</p>
                                        </div>
                                        <span className="font-medium">${parseFloat(depreciationAmount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                                        <div>
                                            <p className="font-medium">Accumulated Depreciation</p>
                                            <p className="text-xs text-gray-500">Credit</p>
                                        </div>
                                        <span className="font-medium">${parseFloat(depreciationAmount).toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">
                                    Enter depreciation amount to see GL preview
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Unplanned Depreciation History */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Unplanned Depreciation History</CardTitle>
                </CardHeader>
                <CardContent>
                    <UnplannedDepreciationHistory />
                </CardContent>
            </Card>
        </div>
    );
}

// Unplanned Depreciation Calculation Details Dialog
function UnplannedDepreciationDetailsDialog({ posting, open, onOpenChange }: any) {
    const { toast } = useToast();

    const formatCurrency = (amount: number | null) => {
        if (!amount && amount !== 0) return "$0.00";
        return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!posting) return null;

    // Calculate before values - ENSURE NUMERIC CONVERSION
    const depAmount = parseFloat(posting.depreciation_amount) || 0;
    const accumulatedAfter = parseFloat(posting.accumulated_depreciation_after) || 0;
    const nbvAfter = parseFloat(posting.net_book_value_after) || 0;

    const accumulatedBefore = accumulatedAfter - depAmount;
    const nbvBefore = nbvAfter + depAmount;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Unplanned Depreciation Calculation Details</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Posted on {new Date(posting.posting_date).toLocaleDateString()} -
                        Fiscal {posting.fiscal_year}/{String(posting.fiscal_period).padStart(2, '0')}
                    </p>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Asset Information Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Asset Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Asset Number</p>
                                    <p className="font-medium">{posting.asset_number}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Asset Name</p>
                                    <p className="font-medium">{posting.asset_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Asset Class</p>
                                    <p className="font-medium">{posting.asset_class_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Company Code</p>
                                    <p className="font-medium">{posting.company_code} - {posting.company_name}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calculation Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Depreciation Calculation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm">Accumulated Depreciation (Before)</span>
                                    <span className="font-medium">{formatCurrency(accumulatedBefore)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 bg-orange-50 px-3 rounded">
                                    <span className="font-semibold">Unplanned Depreciation Amount</span>
                                    <span className="font-bold text-lg text-orange-600">{formatCurrency(depAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm font-medium">Accumulated Depreciation (After)</span>
                                    <span className="font-semibold">{formatCurrency(accumulatedAfter)}</span>
                                </div>
                                <div className="h-px bg-gray-300 my-2"></div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm">Net Book Value (Before)</span>
                                    <span className="font-medium">{formatCurrency(nbvBefore)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 bg-green-50 px-3 rounded">
                                    <span className="font-semibold">Net Book Value (After)</span>
                                    <span className="font-bold text-lg text-green-600">{formatCurrency(nbvAfter)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Transaction Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Transaction Type</p>
                                    <p className="font-medium">{posting.transaction_type_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Depreciation Area</p>
                                    <p className="font-medium">{posting.depreciation_area_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Document Date</p>
                                    <p className="font-medium">{new Date(posting.document_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Reference</p>
                                    <p className="font-medium">{posting.reference || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Reason</p>
                                    <p className="font-medium">{posting.reason}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Unplanned Depreciation History Component
function UnplannedDepreciationHistory() {
    const [selectedPosting, setSelectedPosting] = useState<any>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

    const { data: history, isLoading } = useQuery({
        queryKey: ['/api/asset-management/depreciation/unplanned/history'],
        queryFn: async () => {
            const response = await fetch('/api/asset-management/depreciation/unplanned/history?limit=50');
            if (!response.ok) throw new Error('Failed to fetch unplanned depreciation history');
            return response.json();
        }
    });

    const formatCurrency = (amount: number | null) => {
        if (!amount && amount !== 0) return "$0.00";
        return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch {
            return "-";
        }
    };

    if (isLoading) {
        return <div className="text-center py-4">Loading unplanned depreciation history...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="text-sm font-medium">Recent Unplanned Depreciation Postings</div>
            {history && history.length > 0 ? (
                <div className="rounded-md border">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[140px]">
                                    Posting Date
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[180px]">
                                    Asset
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[140px]">
                                    Fiscal Year/Period
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                                    Depreciation Amount
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                                    Accumulated After
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[140px]">
                                    NBV After
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((posting: any) => (
                                <tr key={posting.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{formatDate(posting.posting_date)}</td>
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{posting.asset_number}</span>
                                            <span className="text-xs text-muted-foreground">{posting.asset_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        {posting.fiscal_year}/{String(posting.fiscal_period).padStart(2, '0')}
                                    </td>
                                    <td className="p-4 align-middle text-right font-semibold text-orange-600">
                                        {formatCurrency(posting.depreciation_amount)}
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        {formatCurrency(posting.accumulated_depreciation_after)}
                                    </td>
                                    <td className="p-4 align-middle text-right font-medium">
                                        {formatCurrency(posting.net_book_value_after)}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => {
                                                setSelectedPosting(posting);
                                                setIsDetailsDialogOpen(true);
                                            }}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View Calculations
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No unplanned depreciation postings found.
                </div>
            )}

            {/* Details Dialog */}
            <UnplannedDepreciationDetailsDialog
                posting={selectedPosting}
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
            />
        </div>
    );
}
