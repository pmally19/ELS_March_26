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
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, ArrowLeft, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";

// Define the Fiscal Period type
type FiscalPeriod = {
    id: number;
    fiscalYearVariantId?: number;
    period: number;
    name: string;
    startDate: string | null;
    endDate: string | null;
    year: number;
    status: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
};

// Fiscal Period Form Schema
const fiscalPeriodSchema = z.object({
    fiscal_year_variant_id: z.number().optional(),
    period_number: z.number().min(1, "Period number must be at least 1"),
    period_name: z.string().min(1, "Period name is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    fiscal_year: z.number().min(1900, "Fiscal year is required"),
    status: z.enum(["Open", "Closed", "Locked"]).default("Open"),
    active: z.boolean().default(true),
});

export default function FiscalPeriodPage() {
    const [, setLocation] = useLocation();
    const searchParams = useSearch();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [editingFiscalPeriod, setEditingFiscalPeriod] = useState<FiscalPeriod | null>(null);

    const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriod[]>([]);
    const [filteredFiscalPeriods, setFilteredFiscalPeriods] = useState<FiscalPeriod[]>([]);
    const [fiscalPeriodsLoading, setFiscalPeriodsLoading] = useState(true);
    const [fiscalPeriodsError, setFiscalPeriodsError] = useState<Error | null>(null);

    // Fetch fiscal calendars for auto-generate
    const { data: fiscalCalendars = [] } = useQuery({
        queryKey: ["/api/master-data/fiscal-calendar"],
        queryFn: async () => {
            const response = await fetch("/api/master-data/fiscal-calendar");
            const result = await response.json();
            return result.success ? result.data : [];
        },
    });

    // Fetch fiscal year variants for auto-generate
    const { data: fiscalYearVariants = [] } = useQuery({
        queryKey: ["/api/master-data/fiscal-year-variants"],
        queryFn: async () => {
            const response = await fetch("/api/master-data/fiscal-year-variants");
            return response.json();
        },
    });

    // Parse URL parameter for variant context
    const urlParams = new URLSearchParams(searchParams);
    const variantIdFromUrl = urlParams.get('variant_id');
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variantIdFromUrl);
    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

    // Auto-fill from URL parameter when data loads
    useEffect(() => {
        if (variantIdFromUrl && fiscalYearVariants.length > 0) {
            const variant = fiscalYearVariants.find((v: any) => v.id === parseInt(variantIdFromUrl));
            if (variant && variant.fiscal_calendar_id) {
                setSelectedVariantId(variantIdFromUrl);
                setSelectedCalendarId(variant.fiscal_calendar_id.toString());
            }
        }
    }, [variantIdFromUrl, fiscalYearVariants]);

    // Fetch data function
    const fetchData = async () => {
        try {
            setFiscalPeriodsLoading(true);
            const response = await fetch("/api/master-data/fiscal-period", {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const periods = Array.isArray(data) ? data : [];
            setFiscalPeriods(periods);
            setFilteredFiscalPeriods(periods);
            setFiscalPeriodsLoading(false);
        } catch (error) {
            console.error("Error fetching fiscal periods:", error);
            setFiscalPeriodsError(error instanceof Error ? error : new Error('Failed to fetch fiscal periods'));
            setFiscalPeriodsLoading(false);
        }
    };

    // Refresh function
    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest fiscal periods...",
        });
        await fetchData();
        toast({
            title: "Data Refreshed",
            description: "Fiscal periods have been updated successfully.",
        });
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Filter fiscal periods based on search query and variant_id from URL
    useEffect(() => {
        let filtered = fiscalPeriods;

        // Filter by variant_id if present in URL
        if (variantIdFromUrl) {
            filtered = filtered.filter(
                (period) => period.fiscalYearVariantId === parseInt(variantIdFromUrl)
            );
        }

        // Filter by search query
        if (searchQuery.trim() !== "") {
            filtered = filtered.filter(
                (period) =>
                    period.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    period.year.toString().includes(searchQuery) ||
                    period.period.toString().includes(searchQuery)
            );
        }

        setFilteredFiscalPeriods(filtered);
    }, [searchQuery, fiscalPeriods, variantIdFromUrl]);

    // Form setup
    const form = useForm<z.infer<typeof fiscalPeriodSchema>>({
        resolver: zodResolver(fiscalPeriodSchema),
        defaultValues: {
            period_number: 1,
            period_name: "",
            start_date: "",
            end_date: "",
            fiscal_year: new Date().getFullYear(),
            status: "Open",
            active: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingFiscalPeriod) {
            form.reset({
                fiscal_year_variant_id: editingFiscalPeriod.fiscalYearVariantId,
                period_number: editingFiscalPeriod.period,
                period_name: editingFiscalPeriod.name,
                start_date: editingFiscalPeriod.startDate || "",
                end_date: editingFiscalPeriod.endDate || "",
                fiscal_year: editingFiscalPeriod.year,
                status: editingFiscalPeriod.status as "Open" | "Closed" | "Locked",
                active: editingFiscalPeriod.active,
            });
        } else {
            form.reset({
                period_number: 1,
                period_name: "",
                start_date: "",
                end_date: "",
                fiscal_year: new Date().getFullYear(),
                status: "Open",
                active: true,
                fiscal_year_variant_id: variantIdFromUrl ? parseInt(variantIdFromUrl) : undefined,
            });
        }
    }, [editingFiscalPeriod, form]);

    // Create mutation
    const createFiscalPeriodMutation = useMutation({
        mutationFn: (fiscalPeriod: z.infer<typeof fiscalPeriodSchema>) => {
            // Convert to API format
            const payload = {
                fiscalYearVariantId: fiscalPeriod.fiscal_year_variant_id,
                period: fiscalPeriod.period_number,
                name: fiscalPeriod.period_name,
                startDate: fiscalPeriod.start_date,
                endDate: fiscalPeriod.end_date,
                year: fiscalPeriod.fiscal_year,
                status: fiscalPeriod.status,
                active: fiscalPeriod.active,
                postingAllowed: true,
            };

            return apiRequest(`/api/master-data/fiscal-period`, {
                method: "POST",
                body: payload
            }).then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.message || "Failed to create fiscal period");
                    });
                }
                return res.json();
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Fiscal Period created successfully",
            });
            fetchData();
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create Fiscal Period",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateFiscalPeriodMutation = useMutation({
        mutationFn: (data: { id: number; fiscalPeriod: z.infer<typeof fiscalPeriodSchema> }) => {
            const payload = {
                fiscalYearVariantId: data.fiscalPeriod.fiscal_year_variant_id,
                period: data.fiscalPeriod.period_number,
                name: data.fiscalPeriod.period_name,
                startDate: data.fiscalPeriod.start_date,
                endDate: data.fiscalPeriod.end_date,
                year: data.fiscalPeriod.fiscal_year,
                status: data.fiscalPeriod.status,
                active: data.fiscalPeriod.active,
                postingAllowed: true,
            };

            return apiRequest(`/api/master-data/fiscal-period/${data.id}`, {
                method: "PUT",
                body: payload,
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Fiscal Period updated successfully",
            });
            fetchData();
            setShowDialog(false);
            setEditingFiscalPeriod(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update Fiscal Period",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteFiscalPeriodMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/fiscal-period/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Fiscal Period deleted successfully",
            });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete Fiscal Period",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof fiscalPeriodSchema>) => {
        if (editingFiscalPeriod) {
            updateFiscalPeriodMutation.mutate({ id: editingFiscalPeriod.id, fiscalPeriod: values });
        } else {
            createFiscalPeriodMutation.mutate(values);
        }
    };

    // Close dialog
    const closeDialog = () => {
        setShowDialog(false);
        setEditingFiscalPeriod(null);
        form.reset();
    };

    // Handle edit
    const handleEdit = (fiscalPeriod: FiscalPeriod) => {
        setEditingFiscalPeriod(fiscalPeriod);
        form.reset({
            fiscal_year_variant_id: fiscalPeriod.fiscal_year_variant_id,
            period_number: fiscalPeriod.period_number,
            period_name: fiscalPeriod.period_name,
            start_date: fiscalPeriod.start_date,
            end_date: fiscalPeriod.end_date,
            fiscal_year: fiscalPeriod.fiscal_year,
            status: fiscalPeriod.status as "Open" | "Closed" | "Locked",
            active: fiscalPeriod.active,
        });
        setShowDialog(true);
    };

    // Handle export
    const handleExport = () => {
        if (filteredFiscalPeriods.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no fiscal periods to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredFiscalPeriods.map(period => ({
            'Fiscal Year': period.fiscal_year,
            'Period Number': period.period_number,
            'Period Name': period.period_name,
            'Start Date': new Date(period.start_date).toLocaleDateString(),
            'End Date': new Date(period.end_date).toLocaleDateString(),
            'Status': period.status,
            'Active': period.active ? 'Yes' : 'No'
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
        link.setAttribute('download', `fiscal-periods-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredFiscalPeriods.length} fiscal periods to CSV file.`,
        });
    };

    // Handle delete
    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this Fiscal Period?")) {
            deleteFiscalPeriodMutation.mutate(id);
        }
    };

    if (fiscalPeriodsError) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                    <h3 className="text-lg font-medium">Error</h3>
                    <p>{fiscalPeriodsError.message || "An error occurred"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data/fiscal-year-variant" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Fiscal Periods</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage fiscal year periods and posting periods
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                    <Button variant="outline" onClick={() => setShowGenerateDialog(true)}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Auto Generate
                    </Button>
                    <Button onClick={() => { setEditingFiscalPeriod(null); setShowDialog(true) }}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Fiscal Period
                    </Button>
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search fiscal periods..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Table Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Fiscal Periods</CardTitle>
                    <CardDescription>
                        A list of all fiscal periods ({filteredFiscalPeriods.length})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {fiscalPeriodsLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="text-center">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500">Loading fiscal periods...</p>
                            </div>
                        </div>
                    ) : filteredFiscalPeriods.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? "No fiscal periods found matching your search." : "No fiscal periods found. Click 'New Fiscal Period' to create one."}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fiscal Year</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Period Name</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFiscalPeriods.map((period) => (
                                    <TableRow key={period.id}>
                                        <TableCell className="font-medium">{period.year}</TableCell>
                                        <TableCell>{period.period}</TableCell>
                                        <TableCell>{period.name}</TableCell>
                                        <TableCell>
                                            {period.startDate ? new Date(period.startDate).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {period.endDate ? new Date(period.endDate).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={period.status === "Open" ? "default" : period.status === "Closed" ? "secondary" : "destructive"}>
                                                {period.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(period)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(period.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingFiscalPeriod ? "Edit Fiscal Period" : "Create New Fiscal Period"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingFiscalPeriod ? "Update the fiscal period information below." : "Enter the fiscal period information below."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="fiscal_year"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fiscal Year *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1900"
                                                    max="2100"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="period_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Period Number *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="period_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Period Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., January 2026" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="start_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="end_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Open">Open</SelectItem>
                                                <SelectItem value="Closed">Closed</SelectItem>
                                                <SelectItem value="Locked">Locked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingFiscalPeriod ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Auto Generate Dialog */}
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Auto Generate Fiscal Periods</DialogTitle>
                        <DialogDescription>
                            Automatically generate fiscal periods from fiscal calendar and year variant
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const fiscal_calendar_id = parseInt(formData.get('fiscal_calendar_id') as string);
                        const fiscal_year_variant_id = parseInt(formData.get('fiscal_year_variant_id') as string);
                        const fiscal_year = parseInt(formData.get('fiscal_year') as string);

                        if (!fiscal_calendar_id || !fiscal_year_variant_id || !fiscal_year) {
                            toast({
                                title: "Error",
                                description: "Please fill all fields",
                                variant: "destructive",
                            });
                            return;
                        }

                        try {
                            const response = await apiRequest('/api/master-data/fiscal-period/generate', {
                                method: 'POST',
                                body: {
                                    fiscal_calendar_id,
                                    fiscal_year_variant_id,
                                    fiscal_year
                                }
                            });

                            if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.message || 'Failed to generate periods');
                            }

                            const result = await response.json();
                            toast({
                                title: "Success",
                                description: result.message || "Fiscal periods generated successfully",
                            });
                            setShowGenerateDialog(false);
                            fetchData();
                        } catch (error: any) {
                            toast({
                                title: "Error",
                                description: error.message || "Failed to generate fiscal periods",
                                variant: "destructive",
                            });
                        }
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fiscal Calendar *</label>
                            <Select
                                name="fiscal_calendar_id"
                                required
                                value={selectedCalendarId || undefined}
                                onValueChange={(value) => setSelectedCalendarId(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select fiscal calendar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fiscalCalendars.map((cal: any) => (
                                        <SelectItem key={cal.id} value={cal.id.toString()}>
                                            {cal.calendar_id} ({cal.number_of_periods} periods)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fiscal Year Variant *</label>
                            <Select
                                name="fiscal_year_variant_id"
                                required
                                value={selectedVariantId || undefined}
                                onValueChange={(value) => setSelectedVariantId(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select fiscal year variant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fiscalYearVariants.map((variant: any) => (
                                        <SelectItem key={variant.id} value={variant.id.toString()}>
                                            {variant.variant_id} - {variant.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fiscal Year *</label>
                            <Input
                                type="number"
                                name="fiscal_year"
                                min="1900"
                                max="2100"
                                defaultValue={new Date().getFullYear()}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowGenerateDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Generate Periods
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
