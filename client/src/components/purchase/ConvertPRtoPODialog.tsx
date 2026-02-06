import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface ConvertPRtoPODialogProps {
    prId: number | null;
    prNumber?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    filteredVendors?: Vendor[]; // Add filtered vendors prop
}

interface Vendor {
    id: number;
    code: string;
    name: string;
}

interface PODocumentType {
    id: number;
    code: string;
    name: string;
    numberRangeCode?: string;
    numberRangeName?: string;
}

export default function ConvertPRtoPODialog({
    prId,
    prNumber,
    open,
    onOpenChange,
    onSuccess,
    filteredVendors,
}: ConvertPRtoPODialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [vendorId, setVendorId] = useState('');
    const [poDocumentTypeId, setPoDocumentTypeId] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('NET30');
    const [notes, setNotes] = useState('');

    // Only fetch all vendors if filteredVendors prop is NOT provided
    const shouldFetchAllVendors = filteredVendors === undefined;

    const { data: fetchedVendors = [], isLoading: loadingVendors } = useQuery<Vendor[]>({
        queryKey: ['/api/purchase/vendors'],
        queryFn: async () => {
            const data = await apiRequest<Vendor[]>('/api/purchase/vendors', 'GET');
            return Array.isArray(data) ? data : [];
        },
        enabled: shouldFetchAllVendors && open, // Only fetch if filtered vendors not provided
    });

    // Use filtered vendors if provided, otherwise use fetched vendors
    const vendors = filteredVendors !== undefined ? filteredVendors : fetchedVendors;

    // Fetch PO document types
    const { data: poDocumentTypes = [] } = useQuery<PODocumentType[]>({
        queryKey: ['/api/master-data/po-document-types'],
        queryFn: async () => {
            const data = await apiRequest<PODocumentType[]>('/api/master-data/po-document-types', 'GET');
            return Array.isArray(data) ? data.filter((type: any) => type.isActive !== false) : [];
        },
        enabled: open,
    });

    // Fetch PR details to get delivery/required date
    const { data: prDetails, isSuccess: prDetailsLoaded } = useQuery({
        queryKey: [`/api/purchase/requisitions/${prId}`],
        queryFn: async () => {
            if (!prId) return null;
            return await apiRequest(`/api/purchase/requisitions/${prId}`, 'GET');
        },
        enabled: !!prId && open,
    });

    // Auto-fill delivery date from PR
    useEffect(() => {
        if (open && prDetails && !deliveryDate) {
            // Try to find the earliest required date from items
            if (prDetails.items && prDetails.items.length > 0) {
                // Find earliest date
                const dates = prDetails.items
                    .map((item: any) => item.required_date)
                    .filter((d: string) => d);

                if (dates.length > 0) {
                    // Sort and pick earliest
                    const sortedDates = dates.sort();
                    const bestDate = new Date(sortedDates[0]).toISOString().split('T')[0];
                    setDeliveryDate(bestDate);
                } else if (prDetails.requisition_date) {
                    // Fallback to Requisition Date + 7 days
                    const reqDate = new Date(prDetails.requisition_date);
                    reqDate.setDate(reqDate.getDate() + 7);
                    setDeliveryDate(reqDate.toISOString().split('T')[0]);
                }
            } else if (prDetails.requisition_date && !prDetails.items?.length) {
                // Even if no items, maybe use header date
                const reqDate = new Date(prDetails.requisition_date);
                reqDate.setDate(reqDate.getDate() + 7);
                setDeliveryDate(reqDate.toISOString().split('T')[0]);
            }
        }
    }, [open, prDetails, deliveryDate]);

    // Convert mutation
    const convertMutation = useMutation({
        mutationFn: async () => {
            if (!vendorId) {
                throw new Error('Please select a vendor');
            }

            if (!poDocumentTypeId) {
                throw new Error('Please select a PO document type');
            }

            const data = await apiRequest(
                `/api/purchase/requisitions/${prId}/convert-to-po`,
                'POST',
                {
                    vendor_id: parseInt(vendorId),
                    po_document_type_id: parseInt(poDocumentTypeId),
                    delivery_date: deliveryDate || null,
                    payment_terms: paymentTerms,
                    notes: notes || null,
                }
            );

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/purchase/requisitions'] });
            queryClient.invalidateQueries({ queryKey: [`/api/purchase/requisitions/${prId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/purchase/orders'] });

            toast({
                title: 'Success',
                description: `Purchase requisition converted to PO ${data.po.order_number}`,
            });

            // Reset form
            setVendorId('');
            setPoDocumentTypeId('');
            setDeliveryDate('');
            setPaymentTerms('NET30');
            setNotes('');

            onOpenChange(false);
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleConvert = () => {
        convertMutation.mutate();
    };

    const handleCancel = () => {
        setVendorId('');
        setPoDocumentTypeId('');
        setDeliveryDate('');
        setPaymentTerms('NET30');
        setNotes('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Convert to Purchase Order</DialogTitle>
                    <DialogDescription>
                        Convert PR {prNumber} to a Purchase Order
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Vendor Selection */}
                    <div>
                        <Label htmlFor="vendor">Vendor *</Label>
                        <Select value={vendorId} onValueChange={setVendorId} disabled={loadingVendors || vendors.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    vendors.length === 0
                                        ? "No vendors available for these materials"
                                        : "Select vendor"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {vendors.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No vendors found for the materials in this PR.
                                        <br />
                                        Please add vendor-material assignments first.
                                    </div>
                                ) : (
                                    vendors.map((vendor) => (
                                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                            {vendor.code} - {vendor.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {filteredVendors !== undefined && vendors.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Showing {vendors.length} vendor(s) who supply the materials in this PR
                            </p>
                        )}
                    </div>

                    {/* PO Document Type Selection */}
                    <div>
                        <Label htmlFor="poDocumentType">PO Document Type *</Label>
                        <Select value={poDocumentTypeId} onValueChange={setPoDocumentTypeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select PO type" />
                            </SelectTrigger>
                            <SelectContent>
                                {poDocumentTypes.length > 0 ? (
                                    poDocumentTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {type.code} - {type.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="loading" disabled>Loading PO types...</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        {poDocumentTypeId && (() => {
                            const selectedType = poDocumentTypes.find(
                                (t) => t.id.toString() === poDocumentTypeId
                            );
                            return selectedType?.numberRangeCode ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Number Range: {selectedType.numberRangeCode}
                                    {selectedType.numberRangeName && ` (${selectedType.numberRangeName})`}
                                </p>
                            ) : null;
                        })()}
                    </div>

                    {/* Delivery Date */}
                    <div>
                        <Label htmlFor="deliveryDate">Delivery Date</Label>
                        <Input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* Payment Terms */}
                    <div>
                        <Label htmlFor="paymentTerms">Payment Terms</Label>
                        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                                <SelectItem value="NET15">Net 15 Days</SelectItem>
                                <SelectItem value="NET30">Net 30 Days</SelectItem>
                                <SelectItem value="NET45">Net 45 Days</SelectItem>
                                <SelectItem value="NET60">Net 60 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes for the purchase order..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel} disabled={convertMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleConvert} disabled={convertMutation.isPending || !vendorId || !poDocumentTypeId}>
                        {convertMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Converting...
                            </>
                        ) : (
                            'Convert to PO'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
