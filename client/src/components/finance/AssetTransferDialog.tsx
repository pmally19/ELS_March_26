import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AssetTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId?: number;
    assetNumber?: string;
    assetName?: string;
    currentCostCenter?: string;
    currentCompanyCode?: string;
    onSuccess?: () => void;
}

export function AssetTransferDialog({
    open,
    onOpenChange,
    assetId,
    assetNumber,
    assetName,
    currentCostCenter,
    currentCompanyCode,
    onSuccess
}: AssetTransferDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        asset_id: assetId?.toString() || '',
        to_cost_center_id: '',
        to_company_code_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        reason: '',
    });

    // Reset form when dialog opens with new asset
    useEffect(() => {
        if (open && assetId) {
            setFormData(prev => ({
                ...prev,
                asset_id: assetId.toString(),
                to_cost_center_id: '',
                to_company_code_id: '',
                transfer_date: new Date().toISOString().split('T')[0],
                reason: '',
            }));
        }
    }, [open, assetId]);

    // Fetch assets (only if no assetId provided)
    const { data: assets = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/assets'],
        queryFn: async () => {
            const response = await fetch('/api/finance-enhanced/asset-management/assets');
            if (!response.ok) return [];
            return response.json();
        },
        enabled: !assetId && open,
    });

    // Fetch cost centers
    const { data: costCenters = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/cost-centers'],
        queryFn: async () => {
            const response = await fetch('/api/finance-enhanced/asset-management/cost-centers');
            if (!response.ok) return [];
            return response.json();
        },
        enabled: open,
    });

    // Fetch company codes
    const { data: companyCodes = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/company-codes'],
        queryFn: async () => {
            const response = await fetch('/api/finance-enhanced/asset-management/company-codes');
            if (!response.ok) return [];
            return response.json();
        },
        enabled: open,
    });

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await fetch('/api/asset-management/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset_id: parseInt(data.asset_id),
                    to_cost_center_id: data.to_cost_center_id ? parseInt(data.to_cost_center_id) : undefined,
                    to_company_code_id: data.to_company_code_id ? parseInt(data.to_company_code_id) : undefined,
                    transfer_date: data.transfer_date,
                    reason: data.reason,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || 'Transfer failed');
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: 'Asset Transferred Successfully',
                description: `Transaction ID: ${data.transaction_id}`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/assets'] });
            queryClient.invalidateQueries({ queryKey: ['/api/asset-management/transactions'] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
            setFormData({
                asset_id: '',
                to_cost_center_id: '',
                to_company_code_id: '',
                transfer_date: new Date().toISOString().split('T')[0],
                reason: '',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Transfer Failed',
                description: error.message || 'Failed to transfer asset',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.to_cost_center_id && !formData.to_company_code_id) {
            toast({
                title: 'Validation Error',
                description: 'Please select either a cost center or company code to transfer to',
                variant: 'destructive',
            });
            return;
        }

        if (!formData.reason.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please provide a reason for the transfer',
                variant: 'destructive',
            });
            return;
        }

        mutation.mutate(formData);
    };

    const getSelectedCostCenterName = () => {
        if (!formData.to_cost_center_id) return null;
        const cc = costCenters.find((c: any) => c.id.toString() === formData.to_cost_center_id);
        return cc ? `${cc.cost_center || cc.code} - ${cc.description || cc.name}` : null;
    };

    const getSelectedCompanyName = () => {
        if (!formData.to_company_code_id) return null;
        const company = companyCodes.find((c: any) => c.id.toString() === formData.to_company_code_id);
        return company ? `${company.code} - ${company.name}` : null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Transfer Asset</DialogTitle>
                        <DialogDescription>
                            {assetNumber && assetName
                                ? `Transfer ${assetNumber} - ${assetName}`
                                : 'Transfer asset to a different cost center or company code'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Current Assignment Info */}
                        {(currentCostCenter || currentCompanyCode) && (
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                <div className="font-medium mb-1">Current Assignment:</div>
                                {currentCostCenter && <div>Cost Center: {currentCostCenter}</div>}
                                {currentCompanyCode && <div>Company Code: {currentCompanyCode}</div>}
                            </div>
                        )}

                        {/* Asset Selection (only if no assetId provided) */}
                        {!assetId && (
                            <div className="grid gap-2">
                                <Label htmlFor="asset">Asset *</Label>
                                <Select
                                    value={formData.asset_id || "none"}
                                    onValueChange={(value) => setFormData({ ...formData, asset_id: value === "none" ? "" : value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select an asset</SelectItem>
                                        {assets.map((asset: any) => (
                                            <SelectItem key={asset.id} value={asset.id.toString()}>
                                                {asset.asset_number || asset.asset_code} - {asset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Transfer Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="transfer_date">Transfer Date *</Label>
                            <Input
                                id="transfer_date"
                                type="date"
                                value={formData.transfer_date}
                                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                                required
                            />
                        </div>

                        {/* To Cost Center */}
                        <div className="grid gap-2">
                            <Label htmlFor="to_cost_center">To Cost Center</Label>
                            <Select
                                value={formData.to_cost_center_id || "none"}
                                onValueChange={(value) => setFormData({ ...formData, to_cost_center_id: value === "none" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select cost center" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {costCenters.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.id.toString()}>
                                            {cc.cost_center || cc.code} - {cc.description || cc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* To Company Code */}
                        <div className="grid gap-2">
                            <Label htmlFor="to_company">To Company Code</Label>
                            <Select
                                value={formData.to_company_code_id || "none"}
                                onValueChange={(value) => setFormData({ ...formData, to_company_code_id: value === "none" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company code" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {companyCodes.map((company: any) => (
                                        <SelectItem key={company.id} value={company.id.toString()}>
                                            {company.code} - {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reason */}
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Reason for transfer (e.g., Employee relocated, Department restructuring)..."
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                                rows={3}
                            />
                        </div>

                        {/* Transfer Summary */}
                        {(formData.to_cost_center_id || formData.to_company_code_id) && formData.reason && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Transfer Summary</AlertTitle>
                                <AlertDescription className="text-sm">
                                    <div className="mt-2 space-y-1">
                                        {getSelectedCostCenterName() && (
                                            <div>• New Cost Center: {getSelectedCostCenterName()}</div>
                                        )}
                                        {getSelectedCompanyName() && (
                                            <div>• New Company Code: {getSelectedCompanyName()}</div>
                                        )}
                                        <div>• Effective Date: {formData.transfer_date}</div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Transfer Asset
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
