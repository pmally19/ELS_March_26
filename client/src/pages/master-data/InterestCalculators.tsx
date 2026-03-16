import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Search, Calculator, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface InterestCalculator {
    id: number;
    calculatorCode: string;
    calculatorName: string;
    interestType: string;
    calculationBasis: string;
    frequency: string;
    formula?: string;
    defaultRate?: string;
    roundingMethod: string;
    roundingPrecision: number;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const CALCULATION_BASES = [
    { value: '365', label: '365 Days (Actual/365)' },
    { value: '360', label: '360 Days (30/360)' },
    { value: 'actual', label: 'Actual/Actual' },
];

const FREQUENCIES = [
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
];

const ROUNDING_METHODS = [
    { value: 'round_nearest', label: 'Round to Nearest' },
    { value: 'round_up', label: 'Round Up' },
    { value: 'round_down', label: 'Round Down' },
    { value: 'no_rounding', label: 'No Rounding' },
];

const schema = z.object({
    calculatorCode: z.string().min(2, "Code must be at least 2 characters").max(20, "Code must be 20 characters or less").regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, and underscores only"),
    calculatorName: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
    interestType: z.string().min(1, "Interest type is required"),
    calculationBasis: z.enum(['365', '360', 'actual'], { errorMap: () => ({ message: "Please select a calculation basis" }) }),
    frequency: z.enum(['daily', 'monthly', 'quarterly', 'annually'], { errorMap: () => ({ message: "Please select a frequency" }) }),
    formula: z.string().optional(),
    defaultRate: z.number().min(0, "Rate cannot be negative").max(100, "Rate cannot exceed 100%").optional(),
    roundingMethod: z.enum(['round_nearest', 'round_up', 'round_down', 'no_rounding']),
    roundingPrecision: z.number().min(0, "Precision must be at least 0").max(6, "Precision cannot exceed 6"),
    description: z.string().optional(),
    isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function InterestCalculators() {
    const [open, setOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<InterestCalculator | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch interest calculators
    const { data: calculators = [], isLoading, refetch } = useQuery<InterestCalculator[]>({
        queryKey: ["/api/master-data/interest-calculators"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/interest-calculators");
            return await response.json();
        },
    });

    // Fetch calculation types from calculation_methods for the dropdown
    const { data: calculationTypes = [] } = useQuery<{ method_code: string; method_name: string; calculation_type: string }[]>({
        queryKey: ["/api/master-data/calculation-methods"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/calculation-methods");
            const methods = await response.json();
            return methods;
        },
    });

    // Extract unique calculation types for the dropdown
    const uniqueCalculationTypes = Array.from(
        new Set(calculationTypes.map(m => m.calculation_type))
    ).filter(Boolean).map(type => ({
        value: type.toLowerCase(),
        label: type.charAt(0).toUpperCase() + type.slice(1)
    }));

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            calculatorCode: "",
            calculatorName: "",
            interestType: "simple",
            calculationBasis: "365",
            frequency: "daily",
            formula: "",
            defaultRate: undefined,
            roundingMethod: "round_nearest",
            roundingPrecision: 2,
            description: "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (editing) {
            form.reset({
                calculatorCode: editing.calculatorCode,
                calculatorName: editing.calculatorName,
                interestType: editing.interestType as any,
                calculationBasis: editing.calculationBasis as any,
                frequency: editing.frequency as any,
                formula: editing.formula || "",
                defaultRate: editing.defaultRate ? parseFloat(editing.defaultRate) : undefined,
                roundingMethod: editing.roundingMethod as any || "round_nearest",
                roundingPrecision: editing.roundingPrecision || 2,
                description: editing.description || "",
                isActive: editing.isActive,
            });
        } else {
            form.reset({
                calculatorCode: "",
                calculatorName: "",
                interestType: "simple",
                calculationBasis: "365",
                frequency: "daily",
                formula: "",
                defaultRate: undefined,
                roundingMethod: "round_nearest",
                roundingPrecision: 2,
                description: "",
                isActive: true,
            });
        }
    }, [editing, form]);

    const createMutation = useMutation({
        mutationFn: async (data: FormValues) => {
            const response = await apiRequest("/api/master-data/interest-calculators", {
                method: "POST",
                body: data,
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/interest-calculators"] });
            toast({ title: "Success", description: "Interest calculator created successfully" });
            setOpen(false);
            setEditing(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
            const response = await apiRequest(`/api/master-data/interest-calculators/${id}`, {
                method: "PUT",
                body: data,
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/interest-calculators"] });
            toast({ title: "Success", description: "Interest calculator updated successfully" });
            setOpen(false);
            setEditing(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/interest-calculators/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/interest-calculators"] });
            toast({ title: "Success", description: "Interest calculator deleted successfully" });
            setDeleteDialogOpen(false);
            setDeletingId(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (values: FormValues) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const handleEdit = (calculator: InterestCalculator) => {
        setEditing(calculator);
        setOpen(true);
    };

    const handleDelete = (id: number) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            deleteMutation.mutate(deletingId);
        }
    };

    const filtered = calculators.filter(
        (c) =>
            c.calculatorCode.toLowerCase().includes(search.toLowerCase()) ||
            c.calculatorName.toLowerCase().includes(search.toLowerCase()) ||
            (c.description?.toLowerCase() || "").includes(search.toLowerCase())
    );

    useEffect(() => {
        document.title = "Interest Calculators | MallyERP";
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/master-data" className="p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Interest Calculators</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage interest calculation methods for financial transactions
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Calculator
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search calculators by code, name, or description..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Calculators ({filtered.length})</CardTitle>
                    <CardDescription>
                        Configure interest calculation methods for different financial scenarios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                                    <TableHead className="hidden md:table-cell">Basis</TableHead>
                                    <TableHead className="hidden xl:table-cell">Frequency</TableHead>
                                    <TableHead className="hidden xl:table-cell">Rate %</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {search
                                                ? "No calculators match your search"
                                                : "No calculators found. Create your first one to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((calc) => (
                                        <TableRow key={calc.id}>
                                            <TableCell className="font-mono font-semibold">{calc.calculatorCode}</TableCell>
                                            <TableCell className="font-medium">{calc.calculatorName}</TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge variant="outline">
                                                    {uniqueCalculationTypes.find(t => t.value === calc.interestType)?.label || calc.interestType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{calc.calculationBasis}</TableCell>
                                            <TableCell className="hidden xl:table-cell capitalize">{calc.frequency}</TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                {calc.defaultRate ? `${calc.defaultRate}%` : "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={calc.isActive ? "default" : "secondary"}>
                                                    {calc.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(calc)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(calc.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            {editing ? "Edit" : "Create"} Interest Calculator
                        </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="calculatorCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Calculator Code *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g., INT_DAILY"
                                                        maxLength={20}
                                                        className="uppercase"
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                </FormControl>
                                                <FormDescription>2-20 uppercase characters (e.g., INT_DAILY, INT001)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="calculatorName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Calculator Name *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g., Daily Simple Interest" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} rows={2} placeholder="Optional detailed description" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Interest Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Interest Configuration</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="interestType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Interest Type *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {uniqueCalculationTypes.map((type) => (
                                                            <SelectItem key={type.value} value={type.value}>
                                                                {type.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>From Calculation Methods master data</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="calculationBasis"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Calculation Basis *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select basis" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CALCULATION_BASES.map((basis) => (
                                                            <SelectItem key={basis.value} value={basis.value}>
                                                                {basis.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="frequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Frequency *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select frequency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {FREQUENCIES.map((freq) => (
                                                            <SelectItem key={freq.value} value={freq.value}>
                                                                {freq.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="formula"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Calculation Formula</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        rows={2}
                                                        placeholder="e.g., principal * rate * days / 365"
                                                    />
                                                </FormControl>
                                                <FormDescription>Optional custom calculation formula</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="defaultRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Default Rate (%)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                        {...field}
                                                        value={field.value || ""}
                                                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                                    />
                                                </FormControl>
                                                <FormDescription>Optional default interest rate</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Rounding Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Rounding Configuration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="roundingMethod"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rounding Method *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {ROUNDING_METHODS.map((method) => (
                                                            <SelectItem key={method.value} value={method.value}>
                                                                {method.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="roundingPrecision"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Decimal Precision *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="6"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormDescription>Number of decimal places (0-6)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="border rounded-md p-4">
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div>
                                                <FormLabel className="!mt-0">Active</FormLabel>
                                                <FormDescription>Enable this calculator for use in the system</FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {editing ? "Updating..." : "Creating..."}
                                        </>
                                    ) : (
                                        <>{editing ? "Update" : "Create"}</>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Interest Calculator</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this calculator? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
