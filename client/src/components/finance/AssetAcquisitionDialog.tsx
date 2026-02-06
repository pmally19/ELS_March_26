import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AssetAcquisitionDialogProps {
    assetId?: number;
    assetNumber?: string;
    assetName?: string;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AssetAcquisitionDialog({
    assetId,
    assetNumber,
    assetName,
    trigger,
    open: controlledOpen,
    onOpenChange,
    onSuccess,
}: AssetAcquisitionDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [internalOpen, setInternalOpen] = useState(false);

    // Support both controlled and uncontrolled modes
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? (onOpenChange || (() => { })) : setInternalOpen;

    const [formData, setFormData] = useState({
        // keep asset_id as string for controlled input even if assetId is number
        asset_id: assetId ? assetId.toString() : '',
        acquisition_date: new Date().toISOString().split('T')[0],
        acquisition_cost: '',
        vendor_id: '',
        invoice_number: '',
        notes: '',
    });

    // Fetch vendors
    const { data: vendors = [] } = useQuery({
        queryKey: ['/api/master-data/vendors'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/vendors');
            if (!response.ok) return [];
            return response.json();
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await fetch('/api/asset-management/acquisition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset_id: assetId ?? parseInt(data.asset_id, 10),
                    acquisition_date: data.acquisition_date,
                    acquisition_cost: parseFloat(data.acquisition_cost),
                    vendor_id: data.vendor_id ? parseInt(data.vendor_id, 10) : undefined,
                    invoice_number: data.invoice_number || undefined,
                    notes: data.notes || undefined,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(
                    error.error || error.message || 'Failed to record acquisition',
                );
            }
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Asset Acquired',
                // FIX: typo in assetName + template string
                description: `Successfully recorded acquisition for ${assetName || 'asset'
                    }`,
            });
            queryClient.invalidateQueries({
                queryKey: ['/api/master-data/assets'],
            });
            queryClient.invalidateQueries({
                queryKey: ['/api/asset-management/transactions'],
            });
            queryClient.invalidateQueries({
                queryKey: ['/api/finance-enhanced/asset-management/assets'],
            });
            setOpen(false);
            if (onSuccess) onSuccess();
            setFormData({
                asset_id: assetId ? assetId.toString() : '',
                acquisition_date: new Date().toISOString().split('T')[0],
                acquisition_cost: '',
                vendor_id: '',
                invoice_number: '',
                notes: '',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Acquisition Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Record Asset Acquisition</DialogTitle>
                        <DialogDescription>
                            {assetNumber && assetName
                                ? // FIX: remove spaces inside template placeholders
                                `Record acquisition for ${assetNumber} - ${assetName}`
                                : 'Record the acquisition of an asset with cost and vendor details'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="acquisition_date">Acquisition Date *</Label>
                            <Input
                                id="acquisition_date"
                                type="date"
                                value={formData.acquisition_date}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        acquisition_date: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="acquisition_cost">Acquisition Cost *</Label>
                            <Input
                                id="acquisition_cost"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.acquisition_cost}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        acquisition_cost: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="vendor">Vendor (Optional)</Label>
                            <Select
                                value={formData.vendor_id || "none"}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, vendor_id: value === "none" ? "" : value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {vendors.map((vendor: any) => (
                                        <SelectItem
                                            key={vendor.id}
                                            value={vendor.id.toString()}
                                        >
                                            {vendor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="invoice_number">
                                Invoice Number (Optional)
                            </Label>
                            <Input
                                id="invoice_number"
                                placeholder="INV-12345"
                                value={formData.invoice_number}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        invoice_number: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Input
                                id="notes"
                                placeholder="Additional notes"
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        notes: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Record Acquisition
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
