import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, ArrowRight, ArrowLeft, Edit, Eye, Info, ChevronDown, ChevronRight, ListFilter } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Schema for form validation
const determinationSchema = z.object({
    sales_organization_id: z.string().min(1, "Sales Organization is required"),
    distribution_channel_id: z.string().min(1, "Distribution Channel is required"),
    division_id: z.string().min(1, "Division is required"),
    customer_pricing_procedure_id: z.string().min(1, "Customer Pricing Procedure is required"),
    document_pricing_procedure_id: z.string().min(1, "Document Pricing Procedure is required"),
    pricing_procedure_id: z.string().min(1, "Target Pricing Procedure is required"),
});

type DeterminationForm = z.infer<typeof determinationSchema>;

export default function PricingProcedureDetermination() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [viewingItem, setViewingItem] = useState<any | null>(null);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [adminDataOpen, setAdminDataOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

    // Initialize form
    const form = useForm<DeterminationForm>({
        resolver: zodResolver(determinationSchema),
        defaultValues: {
            sales_organization_id: "",
            distribution_channel_id: "",
            division_id: "",
            customer_pricing_procedure_id: "",
            document_pricing_procedure_id: "",
            pricing_procedure_id: ""
        }
    });

    // --- Data Fetching ---

    // Main data: Pricing Determinations
    const { data: determinations = [], isLoading } = useQuery({
        queryKey: ['/api/master-data/pricing-procedure-determination'],
    });

    // Dropdown data sources
    const { data: salesOrgs = [] } = useQuery({ queryKey: ['/api/master-data/sales-organization'] });
    const { data: distChannels = [] } = useQuery({ queryKey: ['/api/master-data/distribution-channels'] });
    const { data: divisions = [] } = useQuery({ queryKey: ['/api/master-data/divisions'] });
    const { data: custProcedures = [] } = useQuery({ queryKey: ['/api/master-data/customer-pricing-procedures'] });
    const { data: docProcedures = [] } = useQuery({ queryKey: ['/api/master-data/document-pricing-procedures'] });
    const { data: pricingProcedures = [] } = useQuery({ queryKey: ['/api/pricing-procedures'] });


    // --- Mutations ---

    const createMutation = useMutation({
        mutationFn: async (data: DeterminationForm) => {
            // Convert string IDs to numbers for API
            const payload = {
                sales_organization_id: parseInt(data.sales_organization_id),
                distribution_channel_id: parseInt(data.distribution_channel_id),
                division_id: parseInt(data.division_id),
                customer_pricing_procedure_id: parseInt(data.customer_pricing_procedure_id),
                document_pricing_procedure_id: parseInt(data.document_pricing_procedure_id),
                pricing_procedure_id: parseInt(data.pricing_procedure_id),
            };

            return apiRequest('/api/master-data/pricing-procedure-determination', {
                method: 'POST',
                body: payload,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/pricing-procedure-determination'] });
            setIsDialogOpen(false);
            form.reset();
            toast({
                title: "Success",
                description: "Pricing determination rule created successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create determination rule",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiRequest(`/api/master-data/pricing-procedure-determination/${id}`, {
                method: 'DELETE',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/pricing-procedure-determination'] });
            toast({
                title: "Success",
                description: "Determination rule deleted successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete determination rule",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: DeterminationForm) => {
        createMutation.mutate(data);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        form.reset({
            sales_organization_id: item.sales_organization_id?.toString() || "",
            distribution_channel_id: item.distribution_channel_id?.toString() || "",
            division_id: item.division_id?.toString() || "",
            customer_pricing_procedure_id: item.customer_pricing_procedure_id?.toString() || "",
            document_pricing_procedure_id: item.document_pricing_procedure_id?.toString() || "",
            pricing_procedure_id: item.pricing_procedure_id?.toString() || ""
        });
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
        form.reset();
    };

    const handleViewDetails = (item: any) => {
        setViewingItem(item);
        setShowViewDialog(true);
        setAdminDataOpen(false);
    };

    // Filter logic
    const filteredDeterminations = determinations.filter((item: any) =>
        item.sales_org_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sales_organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pricing_procedure_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/master-data")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pricing Procedure Determination</h1>
                        <p className="text-muted-foreground mt-2">
                            Configure automatic pricing procedure selection based on Sales Area and Pricing Procedures.
                        </p>
                    </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Determination Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? "Edit Determination Rule" : "Create Determination Rule"}</DialogTitle>
                            <DialogDescription>
                                Link a Sales Area, Customer Pricing Procedure, and Document Pricing Procedure to a target Pricing Procedure.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Sales Organization */}
                                <div className="space-y-2">
                                    <Label>Sales Organization</Label>
                                    <Controller
                                        control={form.control}
                                        name="sales_organization_id"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Sales Org" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {salesOrgs.map((org: any) => (
                                                        <SelectItem key={org.id} value={org.id.toString()}>
                                                            {org.code} - {org.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.sales_organization_id && (
                                        <p className="text-destructive text-sm">{form.formState.errors.sales_organization_id.message}</p>
                                    )}
                                </div>

                                {/* Distribution Channel */}
                                <div className="space-y-2">
                                    <Label>Distribution Channel</Label>
                                    <Controller
                                        control={form.control}
                                        name="distribution_channel_id"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Channel" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {distChannels.map((dc: any) => (
                                                        <SelectItem key={dc.id} value={dc.id.toString()}>
                                                            {dc.code} - {dc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.distribution_channel_id && (
                                        <p className="text-destructive text-sm">{form.formState.errors.distribution_channel_id.message}</p>
                                    )}
                                </div>

                                {/* Division */}
                                <div className="space-y-2">
                                    <Label>Division</Label>
                                    <Controller
                                        control={form.control}
                                        name="division_id"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Division" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {divisions.map((div: any) => (
                                                        <SelectItem key={div.id} value={div.id.toString()}>
                                                            {div.code} - {div.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.division_id && (
                                        <p className="text-destructive text-sm">{form.formState.errors.division_id.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Customer Pricing Procedure */}
                                <div className="space-y-2">
                                    <Label>Customer Pricing Procedure</Label>
                                    <Controller
                                        control={form.control}
                                        name="customer_pricing_procedure_id"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Cust. Procedure" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {custProcedures.map((cp: any) => (
                                                        <SelectItem key={cp.id} value={cp.id.toString()}>
                                                            {cp.procedure_code} - {cp.description}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.customer_pricing_procedure_id && (
                                        <p className="text-destructive text-sm">{form.formState.errors.customer_pricing_procedure_id.message}</p>
                                    )}
                                </div>

                                {/* Document Pricing Procedure */}
                                <div className="space-y-2">
                                    <Label>Document Pricing Procedure</Label>
                                    <Controller
                                        control={form.control}
                                        name="document_pricing_procedure_id"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Doc. Procedure" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {docProcedures.map((dp: any) => (
                                                        <SelectItem key={dp.id} value={dp.id.toString()}>
                                                            {dp.pricing_procedure_code} - {dp.description}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.document_pricing_procedure_id && (
                                        <p className="text-destructive text-sm">{form.formState.errors.document_pricing_procedure_id.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-2">
                                {/* Target Pricing Procedure */}
                                <div className="space-y-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <ArrowRight className="h-4 w-4" /> Target Pricing Procedure
                                    </Label>
                                    <Controller
                                        control={form.control}
                                        name="pricing_procedure_id"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Pricing Procedure to Apply" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {pricingProcedures.map((pp: any) => (
                                                        <SelectItem key={pp.id} value={pp.id.toString()}>
                                                            {pp.procedure_code} - {pp.procedure_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.pricing_procedure_id && (
                                        <p className="text-destructive text-sm">{form.formState.errors.pricing_procedure_id.message}</p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button variant="outline" type="button" onClick={handleCloseDialog}>Cancel</Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? (editingItem ? "Updating..." : "Creating...") : (editingItem ? "Update Rule" : "Create Rule")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* View Details Dialog */}
                <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle>Pricing Procedure Determination Details</DialogTitle>
                            <DialogDescription>
                                Rule resolving Pricing Procedures relative to Sales Area Contexts.
                            </DialogDescription>
                        </DialogHeader>

                        {viewingItem && (
                            <div className="flex-1 overflow-y-auto space-y-6 p-6 pt-2">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex items-center">
                                            <ListFilter className="h-4 w-4 mr-2" />
                                            Determined References
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <dl className="grid grid-cols-2 gap-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Sales Area</dt>
                                                <dd className="text-sm font-bold text-gray-900 mt-1">
                                                    {viewingItem.sales_org_code} / {viewingItem.distribution_channel_code} / {viewingItem.division_code}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Target Pricing Procedure</dt>
                                                <dd className="text-sm font-bold text-blue-700 mt-1">{viewingItem.pricing_procedure_code} - {viewingItem.pricing_procedure_name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Customer Proc.</dt>
                                                <dd className="text-sm text-gray-900"><Badge variant="secondary">{viewingItem.customer_pricing_procedure_code}</Badge></dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Document Proc.</dt>
                                                <dd className="text-sm text-gray-900"><Badge variant="secondary">{viewingItem.document_pricing_procedure_code}</Badge></dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </Card>

                                {/* ── Administrative Data (SAP ECC style) ────────────────── */}
                                <div className="border rounded-md overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setAdminDataOpen(o => !o)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <Info className="h-3.5 w-3.5" />
                                            Administrative Data
                                        </span>
                                        {adminDataOpen
                                            ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                            : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                    </button>

                                    {adminDataOpen && (
                                        <dl className="px-4 py-3 space-y-2 bg-white">
                                            <div className="flex justify-between items-center">
                                                <dt className="text-xs text-gray-400">Created on</dt>
                                                <dd className="text-xs text-gray-500">
                                                    {viewingItem.created_at
                                                        ? new Date(viewingItem.created_at).toLocaleString()
                                                        : '—'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <dt className="text-xs text-gray-400">Created by (User ID)</dt>
                                                <dd className="text-xs text-gray-500">
                                                    {viewingItem.created_by ?? '—'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <dt className="text-xs text-gray-400">Last changed on</dt>
                                                <dd className="text-xs text-gray-500">
                                                    {viewingItem.updated_at
                                                        ? new Date(viewingItem.updated_at).toLocaleString()
                                                        : '—'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <dt className="text-xs text-gray-400">Last changed by (User ID)</dt>
                                                <dd className="text-xs text-gray-500">
                                                    {viewingItem.updated_by ?? '—'}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <dt className="text-xs text-gray-400">Tenant ID</dt>
                                                <dd className="text-xs text-gray-500">
                                                    {viewingItem.tenant_id ?? '—'}
                                                </dd>
                                            </div>
                                            {viewingItem._deletedAt && (
                                                <div className="flex justify-between items-center">
                                                    <dt className="text-xs text-red-500 font-medium">Deleted on</dt>
                                                    <dd className="text-xs text-red-500 font-medium">
                                                        {new Date(viewingItem._deletedAt).toLocaleString()}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Determination Rules</CardTitle>
                    <CardDescription>
                        Manage rules for automatic pricing procedure determination.
                    </CardDescription>
                    <div className="mt-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search rules..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sales Org</TableHead>
                                    <TableHead>Dist. Channel</TableHead>
                                    <TableHead>Division</TableHead>
                                    <TableHead>Cust. Proc.</TableHead>
                                    <TableHead>Doc. Proc.</TableHead>
                                    <TableHead>Determined Procedure</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Loading rules...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDeterminations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No determination rules found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDeterminations.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.sales_org_code}
                                            </TableCell>
                                            <TableCell>{item.distribution_channel_code}</TableCell>
                                            <TableCell>{item.division_code}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{item.customer_pricing_procedure_code}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{item.document_pricing_procedure_code}</Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold text-primary">
                                                {item.pricing_procedure_code}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleViewDetails(item)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => deleteMutation.mutate(item.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
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
        </div>
    );
}
