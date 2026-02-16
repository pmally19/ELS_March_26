import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, FileDown, FileUp, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Types
type MaterialAccountDetermination = {
    id: number;
    chart_of_accounts_id: number;
    chart_of_accounts_code: string;
    chart_of_accounts_name: string;
    valuation_grouping_code_id: number;
    valuation_grouping_code: string;
    valuation_grouping_name: string;
    valuation_class_id: number;
    valuation_class_code: string;
    valuation_class_name: string;
    transaction_key_id: number;
    transaction_key_code: string;
    transaction_key_description: string;
    gl_account_id: number;
    account_number: string;
    account_name: string;
    description?: string;
    is_active: boolean;
};

type DropdownData = {
    chartOfAccounts: Array<{ id: number; code: string; name: string }>;
    valuationGroupingCodes: Array<{ id: number; code: string; name: string }>;
    valuationClasses: Array<{ id: number; class_code: string; class_name: string }>;
    transactionKeys: Array<{ id: number; code: string; description: string; business_context: string }>;
    glAccounts: Array<{ id: number; account_number: string; account_name: string; chart_of_accounts_id?: number }>;
};

// Form schema
const formSchema = z.object({
    chart_of_accounts_id: z.number({ required_error: "Chart of Accounts is required" }),
    valuation_grouping_code_id: z.number({ required_error: "Valuation Grouping Code is required" }),
    valuation_class_id: z.number({ required_error: "Valuation Class is required" }),
    transaction_key_id: z.number({ required_error: "Posting Key is required" }),
    gl_account_id: z.number({ required_error: "GL Account is required" }),
    description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function MaterialAccountDetermination() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MaterialAccountDetermination | null>(null);
    const [viewingItem, setViewingItem] = useState<MaterialAccountDetermination | null>(null);
    const [selectedCoA, setSelectedCoA] = useState<number | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
        },
    });

    // Fetch all determinations
    const { data: determinations = [], isLoading } = useQuery<MaterialAccountDetermination[]>({
        queryKey: ["/api/master-data/material-account-determination"],
    });

    // Fetch dropdown data
    const { data: dropdownData } = useQuery<DropdownData>({
        queryKey: ["/api/master-data/material-account-determination/dropdowns/all", selectedCoA],
        queryFn: async () => {
            const url = selectedCoA
                ? `/api/master-data/material-account-determination/dropdowns/all?chart_of_accounts_id=${selectedCoA}`
                : "/api/master-data/material-account-determination/dropdowns/all";
            const response = await apiRequest(url);
            return response.json();
        },
    });

    // Fetch GL Accounts filtered by Chart of Accounts
    const { data: filteredGLAccounts = [] } = useQuery({
        queryKey: ["/api/master-data/material-account-determination/gl-accounts", selectedCoA],
        queryFn: async () => {
            if (!selectedCoA) return [];
            const response = await apiRequest(`/api/master-data/material-account-determination/gl-accounts/${selectedCoA}`);
            return response.json();
        },
        enabled: !!selectedCoA,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await apiRequest("/api/master-data/material-account-determination", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-account-determination"] });
            toast({ title: "Success", description: "Material Account Determination created" });
            setIsDialogOpen(false);
            form.reset();
            setSelectedCoA(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
            const response = await apiRequest(`/api/master-data/material-account-determination/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, is_active: true }),
            });
            if (!response.ok) throw new Error("Failed to update");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-account-determination"] });
            toast({ title: "Success", description: "Material Account Determination updated" });
            setIsDialogOpen(false);
            setEditingItem(null);
            form.reset();
            setSelectedCoA(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/material-account-determination/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-account-determination"] });
            toast({ title: "Success", description: "Material Account Determination deleted" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Load editing item into form
    useEffect(() => {
        if (editingItem) {
            setSelectedCoA(editingItem.chart_of_accounts_id);
            form.reset({
                chart_of_accounts_id: editingItem.chart_of_accounts_id,
                valuation_grouping_code_id: editingItem.valuation_grouping_code_id,
                valuation_class_id: editingItem.valuation_class_id,
                transaction_key_id: editingItem.transaction_key_id,
                gl_account_id: editingItem.gl_account_id,
                description: editingItem.description || "",
            });
        }
    }, [editingItem, form]);

    const onSubmit = (data: FormData) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (item: MaterialAccountDetermination) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this determination?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleView = (item: MaterialAccountDetermination) => {
        setViewingItem(item);
        setIsViewDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
        form.reset();
        setSelectedCoA(null);
    };

    // Filter determinations
    const filteredDeterminations = determinations.filter((det) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            det.chart_of_accounts_code?.toLowerCase().includes(search) ||
            det.valuation_grouping_code?.toLowerCase().includes(search) ||
            det.valuation_class_code?.toLowerCase().includes(search) ||
            det.transaction_key_code?.toLowerCase().includes(search) ||
            det.account_number?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => window.location.href = '/master-data'}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <CardTitle>Material Account Determination </CardTitle>
                                <CardDescription>
                                    Configure automatic GL account determination for material valuation
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <FileDown className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button variant="outline" size="sm">
                                <FileUp className="mr-2 h-4 w-4" />
                                Import
                            </Button>
                            <Button onClick={() => setIsDialogOpen(true)} size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                New Determination
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by CoA, Grouping Code, Class, Posting Key..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">CoA</TableHead>
                                    <TableHead>Val. Grouping</TableHead>
                                    <TableHead>Val. Class</TableHead>
                                    <TableHead>Posting Key</TableHead>
                                    <TableHead>GL Account</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDeterminations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            No material account determinations found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDeterminations.map((det) => (
                                        <TableRow key={det.id}>
                                            <TableCell className="font-medium">{det.chart_of_accounts_code}</TableCell>
                                            <TableCell>{det.valuation_grouping_code}</TableCell>
                                            <TableCell>{det.valuation_class_code}</TableCell>
                                            <TableCell>{det.transaction_key_code}</TableCell>
                                            <TableCell>
                                                {det.account_number} - {det.account_name}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={det.is_active ? "default" : "secondary"}>
                                                    {det.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleView(det)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(det)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(det.id)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? "Edit" : "Create"} Material Account Determination
                        </DialogTitle>
                        <DialogDescription>
                            Configure GL account determination for material valuation
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Chart of Accounts */}
                                <FormField
                                    control={form.control}
                                    name="chart_of_accounts_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Chart of Accounts *</FormLabel>
                                            <Select
                                                value={field.value?.toString()}
                                                onValueChange={(value) => {
                                                    const id = parseInt(value);
                                                    field.onChange(id);
                                                    setSelectedCoA(id);
                                                    // Reset GL account when CoA changes
                                                    form.setValue("gl_account_id", 0);
                                                }}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select CoA" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {dropdownData?.chartOfAccounts?.map((coa) => (
                                                        <SelectItem key={coa.id} value={coa.id.toString()}>
                                                            {coa.code} - {coa.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Valuation Grouping Code */}
                                <FormField
                                    control={form.control}
                                    name="valuation_grouping_code_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valuation Grouping Code *</FormLabel>
                                            <Select
                                                value={field.value?.toString()}
                                                onValueChange={(value) => field.onChange(parseInt(value))}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Grouping Code" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {dropdownData?.valuationGroupingCodes?.map((vgc) => (
                                                        <SelectItem key={vgc.id} value={vgc.id.toString()}>
                                                            {vgc.code} - {vgc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Valuation Class */}
                                <FormField
                                    control={form.control}
                                    name="valuation_class_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valuation Class *</FormLabel>
                                            <Select
                                                value={field.value?.toString()}
                                                onValueChange={(value) => field.onChange(parseInt(value))}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Val. Class" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {dropdownData?.valuationClasses?.map((vc) => (
                                                        <SelectItem key={vc.id} value={vc.id.toString()}>
                                                            {vc.class_code} - {vc.class_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Transaction Key */}
                                <FormField
                                    control={form.control}
                                    name="transaction_key_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Posting Key *</FormLabel>
                                            <Select
                                                value={field.value?.toString()}
                                                onValueChange={(value) => field.onChange(parseInt(value))}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Posting Key" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {dropdownData?.transactionKeys?.map((tk) => (
                                                        <SelectItem key={tk.id} value={tk.id.toString()}>
                                                            {tk.code} - {tk.description}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* GL Account (filtered by CoA) */}
                                <FormField
                                    control={form.control}
                                    name="gl_account_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GL Account *</FormLabel>
                                            <Select
                                                value={field.value?.toString()}
                                                onValueChange={(value) => field.onChange(parseInt(value))}
                                                disabled={!selectedCoA}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={selectedCoA ? "Select GL Account" : "Select CoA first"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(selectedCoA && filteredGLAccounts.length > 0
                                                        ? filteredGLAccounts
                                                        : dropdownData?.glAccounts || []
                                                    ).map((gl: any) => (
                                                        <SelectItem key={gl.id} value={gl.id.toString()}>
                                                            {gl.account_number} - {gl.account_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} placeholder="Optional description" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={handleDialogClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingItem ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            {
                viewingItem && (
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Material Account Determination Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Determination Keys</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Chart of Accounts</p>
                                            <p className="font-medium">{viewingItem.chart_of_accounts_code} - {viewingItem.chart_of_accounts_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Valuation Grouping Code</p>
                                            <p className="font-medium">{viewingItem.valuation_grouping_code} - {viewingItem.valuation_grouping_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Valuation Class</p>
                                            <p className="font-medium">{viewingItem.valuation_class_code} - {viewingItem.valuation_class_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Posting Key</p>
                                            <p className="font-medium">{viewingItem.transaction_key_code} - {viewingItem.transaction_key_description}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">GL Account</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <p className="font-medium">{viewingItem.account_number} - {viewingItem.account_name}</p>
                                        {viewingItem.description && (
                                            <p className="mt-2 text-muted-foreground">{viewingItem.description}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                    Close
                                </Button>
                                <Button onClick={() => {
                                    setIsViewDialogOpen(false);
                                    handleEdit(viewingItem);
                                }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }
        </div >
    );
}
