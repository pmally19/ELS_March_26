import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Define the Document Pricing Procedure type
type DocumentPricingProcedure = {
    id: number;
    procedure_code: string;
    procedure_name: string;
    description?: string;
    pricing_control: 'Normal' | 'No Pricing' | 'Redetermine';
    manual_price_allowed: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

// Form Schema
const pricingProcedureSchema = z.object({
    procedure_code: z.string()
        .min(1, "Procedure code is required")
        .max(10, "Procedure code must be at most 10 characters")
        .regex(/^[A-Z0-9]+$/, "Only uppercase letters and numbers allowed"),
    procedure_name: z.string()
        .min(1, "Procedure name is required")
        .max(100, "Procedure name must be at most 100 characters"),
    description: z.string().optional(),
    pricing_control: z.enum(['Normal', 'No Pricing', 'Redetermine']),
    manual_price_allowed: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

export default function DocumentPricingProcedures() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingProcedure, setEditingProcedure] = useState<DocumentPricingProcedure | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch pricing procedures
    const [procedures, setProcedures] = useState<DocumentPricingProcedure[]>([]);
    const [filteredProcedures, setFilteredProcedures] = useState<DocumentPricingProcedure[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/master-data/document-pricing-procedures");
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            setProcedures(data);
            setFilteredProcedures(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching pricing procedures:", error);
            setLoading(false);
            toast({
                title: "Error",
                description: "Failed to fetch pricing procedures",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter procedures based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredProcedures(procedures);
        } else {
            setFilteredProcedures(
                procedures.filter(
                    (proc) =>
                        proc.procedure_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        proc.procedure_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, procedures]);

    const form = useForm<z.infer<typeof pricingProcedureSchema>>({
        resolver: zodResolver(pricingProcedureSchema),
        defaultValues: {
            procedure_code: "",
            procedure_name: "",
            description: "",
            pricing_control: "Normal",
            manual_price_allowed: false,
            is_active: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingProcedure) {
            form.reset({
                procedure_code: editingProcedure.procedure_code,
                procedure_name: editingProcedure.procedure_name,
                description: editingProcedure.description || "",
                pricing_control: editingProcedure.pricing_control,
                manual_price_allowed: editingProcedure.manual_price_allowed,
                is_active: editingProcedure.is_active,
            });
        } else {
            form.reset({
                procedure_code: "",
                procedure_name: "",
                description: "",
                pricing_control: "Normal",
                manual_price_allowed: false,
                is_active: true,
            });
        }
    }, [editingProcedure, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: z.infer<typeof pricingProcedureSchema>) => {
            return apiRequest(`/api/master-data/document-pricing-procedures`, {
                method: "POST",
                body: JSON.stringify(data)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Pricing procedure created successfully",
            });
            fetchData();
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create pricing procedure",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: number; procedure: z.infer<typeof pricingProcedureSchema> }) => {
            return apiRequest(`/api/master-data/document-pricing-procedures/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.procedure),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Pricing procedure updated successfully",
            });
            fetchData();
            setShowDialog(false);
            setEditingProcedure(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update pricing procedure",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/document-pricing-procedures/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Pricing procedure deleted successfully",
            });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete pricing procedure",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: z.infer<typeof pricingProcedureSchema>) => {
        const updatedValues = {
            ...values,
            procedure_code: values.procedure_code.toUpperCase(),
        };

        if (editingProcedure) {
            updateMutation.mutate({ id: editingProcedure.id, procedure: updatedValues });
        } else {
            createMutation.mutate(updatedValues);
        }
    };

    const handleEdit = (procedure: DocumentPricingProcedure) => {
        setEditingProcedure(procedure);
        setShowDialog(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this pricing procedure?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExport = () => {
        if (filteredProcedures.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no pricing procedures to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredProcedures.map(proc => ({
            'Procedure Code': proc.procedure_code,
            'Procedure Name': proc.procedure_name,
            'Description': proc.description || '',
            'Pricing Control': proc.pricing_control,
            'Manual Price Allowed': proc.manual_price_allowed ? 'Yes' : 'No',
            'Status': proc.is_active ? 'Active' : 'Inactive'
        }));

        const headers = Object.keys(exportData[0]);
        const csvContent = [
            headers.join(','),
            ...exportData.map(row =>
                headers.map(header => `"${row[header]}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `document-pricing-procedures-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredProcedures.length} pricing procedures to CSV file.`,
        });
    };

    // Helper function to get badge variant for pricing control
    const getPricingControlBadge = (control: string) => {
        switch (control) {
            case 'Normal':
                return <Badge className="bg-blue-100 text-blue-800">Normal</Badge>;
            case 'No Pricing':
                return <Badge variant="secondary">No Pricing</Badge>;
            case 'Redetermine':
                return <Badge className="bg-orange-100 text-orange-800">Redetermine</Badge>;
            default:
                return <Badge variant="outline">{control}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Document Pricing Procedures</h1>
                        <p className="text-sm text-muted-foreground">
                            Configure document-level pricing rules and controls
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                    <Button onClick={() => { setEditingProcedure(null); setShowDialog(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Procedure
                    </Button>
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search pricing procedures..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchData}
                    disabled={loading}
                    title="Refresh pricing procedures data"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Pricing Procedures Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pricing Procedures</CardTitle>
                    <CardDescription>
                        All document pricing procedure codes in your system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead className="w-[120px]">Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[140px]">Pricing Control</TableHead>
                                        <TableHead className="w-[120px] text-center">Manual Price</TableHead>
                                        <TableHead className="hidden lg:table-cell">Description</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredProcedures.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                No pricing procedures found. {searchQuery ? "Try a different search." : "Create your first pricing procedure."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProcedures.map((procedure) => (
                                            <TableRow key={procedure.id}>
                                                <TableCell className="font-medium font-mono">{procedure.procedure_code}</TableCell>
                                                <TableCell className="font-medium">{procedure.procedure_name}</TableCell>
                                                <TableCell>{getPricingControlBadge(procedure.pricing_control)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={procedure.manual_price_allowed ? "default" : "secondary"}>
                                                        {procedure.manual_price_allowed ? "Yes" : "No"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">{procedure.description || '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={procedure.is_active ? "default" : "secondary"}>
                                                        {procedure.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(procedure)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(procedure.id)}
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
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProcedure ? 'Edit Pricing Procedure' : 'Create Pricing Procedure'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProcedure ? 'Update the pricing procedure details' : 'Add a new document pricing procedure'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="procedure_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Procedure Code *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="ZDOC1"
                                                {...field}
                                                disabled={!!editingProcedure}
                                                className="font-mono uppercase"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="procedure_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Procedure Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Standard Order Pricing" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Optional description of this pricing procedure..."
                                                {...field}
                                                rows={2}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pricing_control"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pricing Control *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select pricing control" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Normal">Normal - Standard pricing determination</SelectItem>
                                                <SelectItem value="No Pricing">No Pricing - Skip pricing calculation</SelectItem>
                                                <SelectItem value="Redetermine">Redetermine - Recalculate on changes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Controls how pricing is calculated for this document type
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="manual_price_allowed"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Manual Price Allowed</FormLabel>
                                            <FormDescription>
                                                Allow users to manually override calculated prices
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Active Status</FormLabel>
                                            <FormDescription>
                                                Enable or disable this pricing procedure
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Procedure'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
