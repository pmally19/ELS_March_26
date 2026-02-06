import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface CreateAUCDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateAUCDialog({ open, onOpenChange, onSuccess }: CreateAUCDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch company codes
    const { data: companyCodes } = useQuery({
        queryKey: ['company-codes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/company-codes');
            if (!response.ok) throw new Error('Failed to fetch company codes');
            return response.json();
        },
    });

    // Fetch asset classes
    const { data: assetClasses } = useQuery({
        queryKey: ['asset-classes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/asset-classes');
            if (!response.ok) throw new Error('Failed to fetch asset classes');
            return response.json();
        },
    });

    // Fetch cost centers
    const { data: costCenters } = useQuery({
        queryKey: ['cost-centers'],
        queryFn: async () => {
            const response = await fetch('/api/cost-centers');
            if (!response.ok) throw new Error('Failed to fetch cost centers');
            return response.json();
        },
    });

    // Fetch plants
    const { data: plants } = useQuery({
        queryKey: ['plants'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/plants');
            if (!response.ok) throw new Error('Failed to fetch plants');
            return response.json();
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/auc-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create AUC');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aucs'] });
            toast({
                title: 'Success',
                description: 'AUC created successfully',
            });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        createMutation.mutate({
            asset_description: formData.get('asset_description'),
            asset_class_id: parseInt(formData.get('asset_class_id') as string),
            company_code_id: parseInt(formData.get('company_code_id') as string),
            cost_center_id: formData.get('cost_center_id')
                ? parseInt(formData.get('cost_center_id') as string)
                : undefined,
            plant_id: formData.get('plant_id')
                ? parseInt(formData.get('plant_id') as string)
                : undefined,
            construction_start_date: formData.get('construction_start_date'),
            planned_capitalization_date: formData.get('planned_capitalization_date') || undefined,
            wip_account_code: formData.get('wip_account_code'),
            settlement_profile: formData.get('settlement_profile') || undefined,
            user_id: 1, // TODO: Get from auth context
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Asset Under Construction</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="asset_description">Asset Description *</Label>
                            <Input
                                id="asset_description"
                                name="asset_description"
                                required
                                placeholder="e.g., New Building Construction"
                            />
                        </div>

                        <div>
                            <Label htmlFor="company_code_id">Company Code *</Label>
                            <Select name="company_code_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company code" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companyCodes?.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.id.toString()}>
                                            {cc.code} - {cc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="asset_class_id">Asset Class *</Label>
                            <Select name="asset_class_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select asset class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assetClasses?.map((ac: any) => (
                                        <SelectItem key={ac.id} value={ac.id.toString()}>
                                            {ac.code} - {ac.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="cost_center_id">Cost Center</Label>
                            <Select name="cost_center_id">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select cost center" />
                                </SelectTrigger>
                                <SelectContent>
                                    {costCenters?.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.id.toString()}>
                                            {cc.cost_center} - {cc.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="plant_id">Plant</Label>
                            <Select name="plant_id">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select plant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plants?.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.code} - {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="wip_account_code">WIP Account Code *</Label>
                            <Input
                                id="wip_account_code"
                                name="wip_account_code"
                                required
                                placeholder="e.g., 150000"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Work-in-Progress GL account
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="settlement_profile">Settlement Profile</Label>
                            <Input
                                id="settlement_profile"
                                name="settlement_profile"
                                placeholder="e.g., FULL_CAP"
                            />
                        </div>

                        <div>
                            <Label htmlFor="construction_start_date">Construction Start Date *</Label>
                            <Input
                                id="construction_start_date"
                                name="construction_start_date"
                                type="date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div>
                            <Label htmlFor="planned_capitalization_date">Planned Capitalization Date</Label>
                            <Input
                                id="planned_capitalization_date"
                                name="planned_capitalization_date"
                                type="date"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : 'Create AUC'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
