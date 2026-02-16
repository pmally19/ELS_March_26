
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Loader2,
    ArrowLeft,
    Check,
    X,
    RefreshCw,
    Truck
} from "lucide-react";
import { Link } from "wouter";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ShippingPointDetermination = {
    id: number;
    shippingConditionKey: string;
    loadingGroupCode: string;
    plantCode: string;
    proposedShippingPoint: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

// Custom validation function
const validateShippingPointDetermination = (data: Partial<ShippingPointDetermination>) => {
    const errors: Record<string, string> = {};

    if (!data.shippingConditionKey) errors.shippingConditionKey = "Shipping Condition is required";
    if (!data.loadingGroupCode) errors.loadingGroupCode = "Loading Group is required";
    if (!data.plantCode) errors.plantCode = "Plant is required";
    if (!data.proposedShippingPoint) errors.proposedShippingPoint = "Proposed Shipping Point is required";

    return errors;
};

export default function ShippingPointDetermination() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<ShippingPointDetermination>>({
        isActive: true
    });
    const [itemToDelete, setItemToDelete] = useState<ShippingPointDetermination | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch determinations
    const { data: determinations = [], isLoading } = useQuery<ShippingPointDetermination[]>({
        queryKey: ['/api/master-data/shipping-point-determination'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/shipping-point-determination');
            if (!response.ok) throw new Error('Failed to fetch determinations');
            return response.json();
        }
    });

    // Fetch Transporation Zones (Shipping Conditions)
    const { data: shippingConditions = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/shipping-condition-keys'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/shipping-condition-keys');
            if (!response.ok) return [];
            return response.json();
        }
    });

    // Fetch Loading Groups
    const { data: loadingGroups = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/loading-groups'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/loading-groups');
            if (!response.ok) return [];
            return response.json();
        }
    });

    // Fetch Plants (Assuming we have an endpoint, otherwise mock or adjust)
    // Using existing master data endpoint for plants if available, or just mocking for now if not exposed
    const { data: plants = [] } = useQuery<any[]>({
        queryKey: ['/api/plants'],
        queryFn: async () => {
            const response = await fetch('/api/plants'); // Ensure this endpoint exists
            if (!response.ok) return [];
            // Extract data if it comes in a wrapper
            const data = await response.json();
            return Array.isArray(data) ? data : (data.data || []);
        }
    });

    // Fetch Shipping Points
    const { data: shippingPoints = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/shipping-point'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/shipping-point');
            if (!response.ok) return [];
            return response.json();
        }
    });


    // Filtered determinations
    const filteredDeterminations = determinations.filter(item =>
        item.shippingConditionKey?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.loadingGroupCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.plantCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (newItem: Partial<ShippingPointDetermination>) => {
            const response = await fetch('/api/master-data/shipping-point-determination', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create rule');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/shipping-point-determination'] });
            setIsAddDialogOpen(false);
            resetForm();
            toast({ title: "Success", description: "Determination rule created successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (item: Partial<ShippingPointDetermination>) => {
            const response = await fetch(`/api/master-data/shipping-point-determination/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update rule');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/shipping-point-determination'] });
            setIsEditDialogOpen(false);
            resetForm();
            toast({ title: "Success", description: "Determination rule updated successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/master-data/shipping-point-determination/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete rule');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/shipping-point-determination'] });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
            toast({ title: "Success", description: "Determination rule deleted successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleSave = () => {
        const errors = validateShippingPointDetermination(currentItem);
        setValidationErrors(errors);

        if (Object.keys(errors).length === 0) {
            if (currentItem.id) {
                updateMutation.mutate(currentItem);
            } else {
                createMutation.mutate(currentItem);
            }
        }
    };

    const openEditDialog = (item: ShippingPointDetermination) => {
        setCurrentItem(item);
        setValidationErrors({});
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (item: ShippingPointDetermination) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const resetForm = () => {
        setCurrentItem({ isActive: true });
        setValidationErrors({});
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/dashboard">
                            <span className="hover:text-primary cursor-pointer">Dashboard</span>
                        </Link>
                        <span>/</span>
                        <Link href="/master-data">
                            <span className="hover:text-primary cursor-pointer">Master Data</span>
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">Shipping Point Determination</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Shipping Point Determination
                    </h1>
                    <p className="text-muted-foreground">
                        Configure rules to automatically determine Shipping Points based on Shipping Conditions, Loading Groups, and Plants.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/master-data">
                        <Button variant="outline" size="sm" className="h-9">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} size="sm" className="h-9 bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Rule
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-white/50 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search rules..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 bg-white border-slate-200"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[200px] font-semibold text-slate-700">Shipping Condition</TableHead>
                                    <TableHead className="w-[200px] font-semibold text-slate-700">Loading Group</TableHead>
                                    <TableHead className="w-[150px] font-semibold text-slate-700">Plant</TableHead>
                                    <TableHead className="font-semibold text-slate-700 text-center text-primary">Proposed Shipping Point</TableHead>
                                    <TableHead className="w-[100px] text-center font-semibold text-slate-700">Status</TableHead>
                                    <TableHead className="w-[100px] text-right font-semibold text-slate-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                <span>Loading determination rules...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDeterminations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No rules found. Create a new rule to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDeterminations.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-slate-100 font-mono">
                                                        {item.shippingConditionKey}
                                                    </Badge>
                                                    {/* Optional: Add description lookup here */}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-100 font-mono">
                                                    {item.loadingGroupCode}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-100 font-mono">
                                                    {item.plantCode}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2 font-medium text-emerald-700">
                                                    <Truck className="h-4 w-4" />
                                                    {item.proposedShippingPoint}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={item.isActive ? "default" : "secondary"}
                                                    className={item.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}
                                                >
                                                    {item.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(item as ShippingPointDetermination)}
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(item as ShippingPointDetermination)}
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog
                open={isAddDialogOpen || isEditDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsAddDialogOpen(false);
                        setIsEditDialogOpen(false);
                        resetForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isAddDialogOpen ? "Add Determination Rule" : "Edit Determination Rule"}</DialogTitle>
                        <DialogDescription>
                            Configure the shipping point determination logic.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Shipping Condition</Label>
                            <Select
                                value={currentItem.shippingConditionKey || ""}
                                onValueChange={(val) => setCurrentItem({ ...currentItem, shippingConditionKey: val })}
                            >
                                <SelectTrigger className={validationErrors.shippingConditionKey ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select Shipping Condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shippingConditions.map((sc: any) => (
                                        <SelectItem key={sc.keyCode} value={sc.keyCode}>
                                            {sc.keyCode} - {sc.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {validationErrors.shippingConditionKey && (
                                <p className="text-xs text-red-500">{validationErrors.shippingConditionKey}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Loading Group</Label>
                            <Select
                                value={currentItem.loadingGroupCode || ""}
                                onValueChange={(val) => setCurrentItem({ ...currentItem, loadingGroupCode: val })}
                            >
                                <SelectTrigger className={validationErrors.loadingGroupCode ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select Loading Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingGroups.map((lg: any) => (
                                        <SelectItem key={lg.code} value={lg.code}>
                                            {lg.code} - {lg.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {validationErrors.loadingGroupCode && (
                                <p className="text-xs text-red-500">{validationErrors.loadingGroupCode}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Plant</Label>
                            <Select
                                value={currentItem.plantCode || ""}
                                onValueChange={(val) => setCurrentItem({ ...currentItem, plantCode: val })}
                            >
                                <SelectTrigger className={validationErrors.plantCode ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select Plant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plants.map((p: any) => (
                                        <SelectItem key={p.code} value={p.code}>
                                            {p.code} - {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {validationErrors.plantCode && (
                                <p className="text-xs text-red-500">{validationErrors.plantCode}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-primary font-semibold">Proposed Shipping Point</Label>
                            {/* 
                    Ideally, we'd fetch shipping points from an API. 
                    Since we're assuming the API might not exist or we need to be safe, 
                    we can either plain input or try to select if data exists
                */}
                            {shippingPoints.length > 0 ? (
                                <Select
                                    value={currentItem.proposedShippingPoint || ""}
                                    onValueChange={(val) => setCurrentItem({ ...currentItem, proposedShippingPoint: val })}
                                >
                                    <SelectTrigger className={`border-emerald-200 bg-emerald-50 ${validationErrors.proposedShippingPoint ? "border-red-500" : ""}`}>
                                        <SelectValue placeholder="Select Target Shipping Point" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shippingPoints.map((sp: any) => (
                                            <SelectItem key={sp.code} value={sp.code}>
                                                {sp.code} - {sp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={currentItem.proposedShippingPoint || ""}
                                    onChange={(e) => setCurrentItem({ ...currentItem, proposedShippingPoint: e.target.value })}
                                    placeholder="Enter Shipping Point Code (e.g. 1000)"
                                    maxLength={4}
                                    className={`font-mono uppercase bg-emerald-50 border-emerald-200 ${validationErrors.proposedShippingPoint ? "border-red-500" : ""}`}
                                />
                            )}

                            {validationErrors.proposedShippingPoint && (
                                <p className="text-xs text-red-500">{validationErrors.proposedShippingPoint}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                                Target Shipping Point that will be automatically assigned.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Switch
                                checked={currentItem.isActive}
                                onCheckedChange={(checked) => setCurrentItem({ ...currentItem, isActive: checked })}
                            />
                            <Label>Active Status</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setIsEditDialogOpen(false); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isAddDialogOpen ? "Create Rule" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Determination Rule</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this rule? This matching logic will no longer be applied.
                        </DialogDescription>
                    </DialogHeader>

                    {itemToDelete && (
                        <div className="p-4 bg-slate-50 rounded-md border text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipping Condition:</span>
                                <span className="font-medium">{itemToDelete.shippingConditionKey}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Loading Group:</span>
                                <span className="font-medium">{itemToDelete.loadingGroupCode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plant:</span>
                                <span className="font-medium">{itemToDelete.plantCode}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Delete Rule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
