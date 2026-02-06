import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AssetRetirementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId?: number;
    assetNumber?: string;
    assetName?: string;
    currentValue?: number;
    acquisitionCost?: number;
    onSuccess?: () => void;
}

export function AssetRetirementDialog({
    open,
    onOpenChange,
    assetId,
    assetNumber,
    assetName,
    currentValue,
    acquisitionCost,
    onSuccess
}: AssetRetirementDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        asset_id: assetId?.toString() || '',
        retirement_date: new Date().toISOString().split('T')[0],
        disposal_amount: '',
        retirement_reason: '',
        scrap: false,
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open && assetId) {
            setFormData({
                asset_id: assetId.toString(),
                retirement_date: new Date().toISOString().split('T')[0],
                disposal_amount: '',
                retirement_reason: '',
                scrap: false,
            });
        }
    }, [open, assetId]);

    // Fetch assets (only if no assetId provided)
    const { data: assets = [] } = useQuery({
        queryKey: ['/api/finance-enhanced/asset-management/assets'],
        queryFn: async () => {
            const response = await fetch('/api/finance-enhanced/asset-management/assets?status=Active');
            if (!response.ok) return [];
            return response.json();
        },
        enabled: !assetId && open,
    });

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await fetch('/api/asset-management/retirement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset_id: parseInt(data.asset_id),
                    retirement_date: data.retirement_date,
                    disposal_amount: data.disposal_amount ? parseFloat(data.disposal_amount) : 0,
                    retirement_reason: data.retirement_reason,
                    scrap: data.scrap,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || 'Retirement failed');
            }
            return response.json();
        },
        onSuccess: (data) => {
            const gainLossText = data.gain_loss >= 0
                ? `Gain: $${Math.abs(data.gain_loss).toFixed(2)}`
                : `Loss: $${Math.abs(data.gain_loss).toFixed(2)}`;

            toast({
                title: 'Asset Retired Successfully',
                description: `Transaction ID: ${data.transaction_id}. ${gainLossText}`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/assets'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance-enhanced/asset-management/statistics'] });
            queryClient.invalidateQueries({ queryKey: ['/api/asset-management/transactions'] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
            setFormData({
                asset_id: '',
                retirement_date: new Date().toISOString().split('T')[0],
                disposal_amount: '',
                retirement_reason: '',
                scrap: false,
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Retirement Failed',
                description: error.message || 'Failed to retire asset',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.retirement_reason.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please provide a reason for retirement',
                variant: 'destructive',
            });
            return;
        }

        mutation.mutate(formData);
    };

    // Calculate estimated gain/loss
    const bookValue = currentValue || 0;
    const disposalAmt = formData.disposal_amount ? parseFloat(formData.disposal_amount) : 0;
    const estimatedGainLoss = disposalAmt - bookValue;
    const isGain = estimatedGainLoss >= 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Retire Asset</DialogTitle>
                        <DialogDescription>
                            {assetNumber && assetName
                                ? `Retire ${assetNumber} - ${assetName}`
                                : 'Record the retirement or disposal of an asset'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Current Asset Value Info */}
                        {currentValue !== undefined && (
                            <div className="bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-medium">Current Book Value:</span>
                                    <span className="font-bold">{formatCurrency(currentValue)}</span>
                                </div>
                                {acquisitionCost !== undefined && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Original acquisition cost: {formatCurrency(acquisitionCost)}
                                    </div>
                                )}
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
                                        <SelectValue placeholder="Select asset to retire" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select an asset</SelectItem>
                                        {assets.filter((a: any) => a.status === 'Active' || a.is_active).map((asset: any) => (
                                            <SelectItem key={asset.id} value={asset.id.toString()}>
                                                {asset.asset_number || asset.asset_code} - {asset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Retirement Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="retirement_date">Retirement Date *</Label>
                            <Input
                                id="retirement_date"
                                type="date"
                                value={formData.retirement_date}
                                onChange={(e) => setFormData({ ...formData, retirement_date: e.target.value })}
                                required
                            />
                        </div>

                        {/* Disposal Amount */}
                        <div className="grid gap-2">
                            <Label htmlFor="disposal_amount">Disposal Amount (if sold)</Label>
                            <Input
                                id="disposal_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.disposal_amount}
                                onChange={(e) => setFormData({ ...formData, disposal_amount: e.target.value })}
                                disabled={formData.scrap}
                            />
                            <p className="text-sm text-muted-foreground">
                                Leave empty or set to 0 if scrapped with no sale value
                            </p>
                        </div>

                        {/* Retirement Reason */}
                        <div className="grid gap-2">
                            <Label htmlFor="retirement_reason">Retirement Reason *</Label>
                            <Textarea
                                id="retirement_reason"
                                placeholder="Reason for retirement (e.g., End of useful life, Damage, Obsolete, Sold)..."
                                value={formData.retirement_reason}
                                onChange={(e) => setFormData({ ...formData, retirement_reason: e.target.value })}
                                required
                                rows={3}
                            />
                        </div>

                        {/* Scrap Checkbox */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="scrap"
                                checked={formData.scrap}
                                onCheckedChange={(checked) => {
                                    setFormData({
                                        ...formData,
                                        scrap: checked as boolean,
                                        disposal_amount: checked ? '0' : formData.disposal_amount
                                    });
                                }}
                            />
                            <Label htmlFor="scrap" className="font-normal cursor-pointer">
                                Mark as scrap (no sale value)
                            </Label>
                        </div>

                        {/* Gain/Loss Preview */}
                        {currentValue !== undefined && (
                            <Alert variant={isGain ? "default" : "destructive"} className="mt-2">
                                {isGain ? (
                                    <TrendingUp className="h-4 w-4" />
                                ) : (
                                    <TrendingDown className="h-4 w-4" />
                                )}
                                <AlertTitle>
                                    Estimated {isGain ? 'Gain' : 'Loss'} on Disposal
                                </AlertTitle>
                                <AlertDescription>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span>Book Value:</span>
                                            <span>{formatCurrency(bookValue)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Disposal Amount:</span>
                                            <span>{formatCurrency(disposalAmt)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-1">
                                            <span>{isGain ? 'Gain:' : 'Loss:'}</span>
                                            <span className={isGain ? 'text-green-600' : 'text-red-600'}>
                                                {isGain ? '+' : '-'}{formatCurrency(Math.abs(estimatedGainLoss))}
                                            </span>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Warning */}
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                                This action will mark the asset as <strong>Retired</strong> and remove it from active depreciation.
                                This action cannot be easily undone.
                            </AlertDescription>
                        </Alert>
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
                        <Button type="submit" disabled={mutation.isPending} variant="destructive">
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Retire Asset
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
