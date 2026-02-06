import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Package, History, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';
import VendorSelectionDialog from './VendorSelectionDialog';

interface PRDetailDialogProps {
    prId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApprove?: (prId: number) => void;
    onReject?: (prId: number) => void;
    onConvert?: (prId: number) => void;
}

interface PRDetail {
    id: number;
    requisition_number: string;
    requisition_date: string;
    requested_by: string;
    cost_center: string;
    cost_center_description: string;
    total_value: number;
    currency_code: string;
    status: string;
    approval_status: string;
    priority: string;
    department: string;
    justification: string;
    project_code: string;
    notes: string;
    approved_at: string;
    rejected_at: string;
    rejection_reason: string;
    converted_to_po_id: number;
    created_at: string;
}

interface PRItem {
    id: number;
    line_number: number;
    material_id: number;
    material_code: string;
    material_name: string;
    material_number: string;
    description: string;
    quantity: number;
    unit_of_measure: string;
    unit_price: number;
    total_price: number;
    estimated_unit_price: number;
    estimated_total_price: number;
    required_date: string;
    // New fields
    material_group: string;
    material_group_id: number;
    storage_location: string;
    storage_location_id: number;
    purchasing_group: string;
    purchasing_group_id: number;
    purchasing_org: string;
    purchasing_organization_id: number;
    cost_center: string;
    cost_center_id: number;
    plant_id: number;
    plant_code: string;
}

interface PRHistory {
    id: number;
    action: string;
    performed_by: string;
    old_status: string;
    new_status: string;
    comments: string;
    created_at: string;
}

export default function PRDetailDialog({
    prId,
    open,
    onOpenChange,
    onApprove,
    onReject,
    onConvert,
}: PRDetailDialogProps) {
    const [activeTab, setActiveTab] = useState('details');
    const [showVendorDialog, setShowVendorDialog] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);

    // Fetch PR details
    const { data: prDetail, isLoading: loadingDetail } = useQuery<PRDetail>({
        queryKey: [`/api/purchase/requisitions/${prId}`],
        enabled: open && !!prId,
        queryFn: async () => {
            const data = await apiRequest<PRDetail>(`/api/purchase/requisitions/${prId}`, 'GET');
            return data;
        },
    });

    // Fetch PR items
    const { data: prItems = [], isLoading: loadingItems } = useQuery<PRItem[]>({
        queryKey: [`/api/purchase/requisitions/${prId}/items`],
        enabled: open && !!prId,
        queryFn: async () => {
            const data = await apiRequest<PRItem[]>(`/api/purchase/requisitions/${prId}/items`, 'GET');
            return Array.isArray(data) ? data : [];
        },
    });

    // Fetch PR history
    const { data: prHistory = [], isLoading: loadingHistory } = useQuery<PRHistory[]>({
        queryKey: [`/api/purchase/requisitions/${prId}/history`],
        enabled: open && !!prId,
        queryFn: async () => {
            const data = await apiRequest<PRHistory[]>(`/api/purchase/requisitions/${prId}/history`, 'GET');
            return Array.isArray(data) ? data : [];
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'DRAFT':
                return <Badge variant="outline">Draft</Badge>;
            case 'SUBMITTED':
            case 'PENDING':
                return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
            case 'APPROVED':
                return <Badge className="bg-green-500 text-white">Approved</Badge>;
            case 'REJECTED':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'CONVERTED_TO_PO':
                return <Badge className="bg-blue-500 text-white">Converted to PO</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority?.toUpperCase()) {
            case 'URGENT':
            case 'HIGH':
                return <Badge className="bg-red-500 text-white">High</Badge>;
            case 'MEDIUM':
                return <Badge className="bg-orange-500 text-white">Medium</Badge>;
            case 'LOW':
                return <Badge className="bg-green-500 text-white">Low</Badge>;
            default:
                return <Badge variant="outline">{priority || 'Not Set'}</Badge>;
        }
    };

    // Handle Convert to PO
    const handleConvertToPO = async () => {
        if (!prDetail || !prItems || prItems.length === 0) {
            console.error('No PR items found');
            return;
        }

        // Extract material IDs from PR items
        const materialIds = prItems
            .filter(item => item.material_id)
            .map(item => item.material_id);

        if (materialIds.length === 0) {
            console.error('No valid material IDs found');
            return;
        }

        try {
            setLoadingVendors(true);
            const response = await apiRequest(
                `/api/purchase/vendors/by-materials?materialIds=${materialIds.join(',')}`,
                'GET'
            );
            setVendors(response.vendors || []);
            setShowVendorDialog(true);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            // TODO: Show error toast
        } finally {
            setLoadingVendors(false);
        }
    };

    const handleVendorSelect = (vendorId: number) => {
        console.log('Selected vendor:', vendorId);
        // TODO: Create PO with selected vendor and PR items
        if (onConvert) {
            onConvert(prId);
        }
        setShowVendorDialog(false);
        onOpenChange(false);
    };

    if (!prId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Purchase Requisition Details</DialogTitle>
                        {prDetail && (
                            <div className="flex items-center gap-2">
                                {getStatusBadge(prDetail.approval_status)}
                                <span className="text-sm font-mono text-muted-foreground">
                                    {prDetail.requisition_number}
                                </span>
                                {prDetail.approval_status === 'APPROVED' && !prDetail.converted_to_po_id && (
                                    <Button
                                        size="sm"
                                        onClick={handleConvertToPO}
                                        disabled={loadingVendors}
                                        className="ml-2"
                                    >
                                        {loadingVendors ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Loading Vendors...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRight className="h-4 w-4 mr-2" />
                                                Convert to PO
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {loadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : prDetail ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">
                                <FileText className="h-4 w-4 mr-2" />
                                Details
                            </TabsTrigger>
                            <TabsTrigger value="items">
                                <Package className="h-4 w-4 mr-2" />
                                Items ({prItems.length})
                            </TabsTrigger>
                            <TabsTrigger value="history">
                                <History className="h-4 w-4 mr-2" />
                                History
                            </TabsTrigger>
                        </TabsList>

                        {/* Details Tab */}
                        <TabsContent value="details" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Requisition Number</div>
                                    <div className="font-mono">{prDetail.requisition_number}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Status</div>
                                    <div>{getStatusBadge(prDetail.approval_status)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Requested By</div>
                                    <div>{prDetail.requested_by || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Requisition Date</div>
                                    <div>
                                        {prDetail.requisition_date
                                            ? new Date(prDetail.requisition_date).toLocaleDateString()
                                            : '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Department</div>
                                    <div>{prDetail.department || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Priority</div>
                                    <div>{getPriorityBadge(prDetail.priority)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Project Code</div>
                                    <div>{prDetail.project_code || '—'}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-sm text-muted-foreground">Justification</div>
                                    <div className="mt-1 p-3 bg-muted rounded-md">
                                        {prDetail.justification || '—'}
                                    </div>
                                </div>
                                {prDetail.notes && (
                                    <div className="col-span-2">
                                        <div className="text-sm text-muted-foreground">Notes</div>
                                        <div className="mt-1 p-3 bg-muted rounded-md">{prDetail.notes}</div>
                                    </div>
                                )}
                                {prDetail.rejection_reason && (
                                    <div className="col-span-2">
                                        <div className="text-sm text-destructive">Rejection Reason</div>
                                        <div className="mt-1 p-3 bg-destructive/10 rounded-md text-destructive">
                                            {prDetail.rejection_reason}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Value</div>
                                    <div className="text-2xl font-bold">
                                        {prDetail.currency_code} {prDetail.total_value?.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Created Date</div>
                                    <div>
                                        {prDetail.created_at
                                            ? new Date(prDetail.created_at).toLocaleString()
                                            : '—'}
                                    </div>
                                </div>
                                {prDetail.approved_at && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Approved At</div>
                                        <div>{new Date(prDetail.approved_at).toLocaleString()}</div>
                                    </div>
                                )}
                                {prDetail.rejected_at && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Rejected At</div>
                                        <div>{new Date(prDetail.rejected_at).toLocaleString()}</div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4">
                                {prDetail.approval_status === 'PENDING' && (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => onReject?.(prDetail.id)}
                                            className="text-destructive"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                        <Button onClick={() => onApprove?.(prDetail.id)}>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                    </>
                                )}

                            </div>
                        </TabsContent>

                        {/* Items Tab */}
                        <TabsContent value="items">
                            {loadingItems ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : prItems.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Matl. Group</TableHead>
                                                <TableHead>Storage Loc</TableHead>
                                                <TableHead>Purch. Group</TableHead>
                                                <TableHead>Purch. Org</TableHead>
                                                <TableHead>Cost Center</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead>UoM</TableHead>
                                                <TableHead className="text-right">Unit Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {prItems.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.line_number}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div>{item.material_code || `Material #${item.material_id}`}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.material_name || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[200px] truncate" title={item.description}>
                                                            {item.description || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {item.material_group || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {item.storage_location || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {item.purchasing_group || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {item.purchasing_org || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {item.cost_center || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                    <TableCell>{item.unit_of_measure || 'EA'}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {item.estimated_unit_price?.toFixed(2) || '0.00'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {item.estimated_total_price?.toFixed(2) || '0.00'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No items found
                                </div>
                            )}
                        </TabsContent>

                        {/* History Tab */}
                        <TabsContent value="history">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : prHistory.length > 0 ? (
                                <div className="space-y-4">
                                    {prHistory.map((entry) => (
                                        <div key={entry.id} className="flex gap-4 p-4 border rounded-md">
                                            <div className="flex-shrink-0">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <History className="h-4 w-4 text-primary" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-medium">{entry.action}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(entry.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    By: {entry.performed_by || 'System'}
                                                </div>
                                                {entry.old_status && entry.new_status && (
                                                    <div className="text-sm mt-1">
                                                        Status: {entry.old_status} → {entry.new_status}
                                                    </div>
                                                )}
                                                {entry.comments && (
                                                    <div className="text-sm mt-2 p-2 bg-muted rounded">
                                                        {entry.comments}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No history found
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Purchase requisition not found
                    </div>
                )}
            </DialogContent>

            {/* Vendor Selection Dialog */}
            <VendorSelectionDialog
                open={showVendorDialog}
                onOpenChange={setShowVendorDialog}
                vendors={vendors}
                onSelectVendor={handleVendorSelect}
                isLoading={loadingVendors}
            />
        </Dialog>
    );
}
