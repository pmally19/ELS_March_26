import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Package, TruckIcon, DollarSign } from 'lucide-react';

interface VendorMaterial {
    material_id: number;
    material_code: string;
    material_name: string;
    material_description: string;
    vendor_material_code: string | null;
    unit_price: string;
    currency: string;
    minimum_order_quantity: string;
    lead_time_days: number;
    is_preferred: boolean;
    notes: string | null;
}

interface Vendor {
    id: number;
    code: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    payment_terms: string;
    currency: string;
    materials_count: string;
    has_preferred_materials: number;
    materials: VendorMaterial[];
    total_materials_matched: number;
    coverage_percentage: string;
}

interface VendorSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendors: Vendor[];
    onSelectVendor: (vendorId: number) => void;
    isLoading?: boolean;
}

export default function VendorSelectionDialog({
    open,
    onOpenChange,
    vendors,
    onSelectVendor,
    isLoading = false
}: VendorSelectionDialogProps) {
    const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

    const handleConfirm = () => {
        if (selectedVendorId) {
            onSelectVendor(selectedVendorId);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Vendor for Purchase Order</DialogTitle>
                    <DialogDescription>
                        Choose a vendor for the selected purchase requisition materials.
                        Vendors are ranked by coverage and preference.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading vendors...</p>
                        </div>
                    </div>
                ) : vendors.length === 0 ? (
                    <div className="text-center p-8">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No Vendors Found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            No vendors are registered to supply these materials.
                            <br />
                            Please add vendor-material assignments first.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {vendors.map((vendor) => (
                            <Card
                                key={vendor.id}
                                className={`cursor-pointer transition-all ${selectedVendorId === vendor.id
                                        ? 'ring-2 ring-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                    }`}
                                onClick={() => setSelectedVendorId(vendor.id)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">{vendor.name}</CardTitle>
                                                <Badge variant="outline">{vendor.code}</Badge>
                                                {parseFloat(vendor.coverage_percentage) === 100 && (
                                                    <Badge variant="default" className="bg-green-600">
                                                        100% Coverage
                                                    </Badge>
                                                )}
                                                {vendor.has_preferred_materials > 0 && (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                        Preferred
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>📧 {vendor.email || 'N/A'}</span>
                                                <span>📞 {vendor.phone || 'N/A'}</span>
                                                <span>💳 {vendor.payment_terms || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">
                                                {vendor.coverage_percentage}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {vendor.total_materials_matched} materials
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold mb-3">Materials Supplied:</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Price</TableHead>
                                                    <TableHead className="text-center">Lead Time</TableHead>
                                                    <TableHead className="text-right">Min Order Qty</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vendor.materials.map((material) => (
                                                    <TableRow key={material.material_id}>
                                                        <TableCell className="font-medium">
                                                            <div>{material.material_code}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {material.material_name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate" title={material.material_description}>
                                                            {material.material_description || '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <DollarSign className="h-3 w-3" />
                                                                {material.currency} {parseFloat(material.unit_price).toFixed(2)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <TruckIcon className="h-3 w-3" />
                                                                {material.lead_time_days} days
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {parseFloat(material.minimum_order_quantity).toFixed(3)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {material.is_preferred && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                                                    Preferred
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={!selectedVendorId}
                            >
                                Create Purchase Order
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
