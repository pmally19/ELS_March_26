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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, ArrowLeft, RefreshCw, MoreHorizontal, Calendar as CalendarIcon, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Define the Fiscal Calendar type
type FiscalCalendar = {
    id: number;
    calendar_id: string;
    start_date: string;
    end_date: string;
    number_of_periods: number;
    active: boolean;
    created_at: string;
    updated_at: string;
};

// Fiscal Calendar Form Schema
const fiscalCalendarSchema = z.object({
    calendar_id: z.string().min(2, "Calendar ID is required").max(20, "Calendar ID must be at most 20 characters"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    number_of_periods: z.number().min(1, "Must have at least 1 period").max(52, "Cannot exceed 52 periods"),
    active: z.boolean().default(true),
});

export default function FiscalCalendarPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingFiscalCalendar, setEditingFiscalCalendar] = useState<FiscalCalendar | null>(null);
    const [viewingFiscalCalendarDetails, setViewingFiscalCalendarDetails] = useState<FiscalCalendar | null>(null);
    const [isFiscalCalendarDetailsOpen, setIsFiscalCalendarDetailsOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [fiscalCalendars, setFiscalCalendars] = useState<FiscalCalendar[]>([]);
    const [filteredFiscalCalendars, setFilteredFiscalCalendars] = useState<FiscalCalendar[]>([]);
    const [fiscalCalendarsLoading, setFiscalCalendarsLoading] = useState(true);
    const [fiscalCalendarsError, setFiscalCalendarsError] = useState<Error | null>(null);

    // Fetch data function
    const fetchData = async () => {
        try {
            setFiscalCalendarsLoading(true);
            const response = await fetch("/api/master-data/fiscal-calendar", {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.success ? result.data : [];
            setFiscalCalendars(data);
            setFilteredFiscalCalendars(data);
            setFiscalCalendarsLoading(false);
        } catch (error) {
            console.error("Error fetching fiscal calendars:", error);
            setFiscalCalendarsError(error instanceof Error ? error : new Error('Failed to fetch fiscal calendars'));
            setFiscalCalendarsLoading(false);
        }
    };

    // Refresh function
    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest fiscal calendars...",
        });
        await fetchData();
        toast({
            title: "Data Refreshed",
            description: "Fiscal calendars have been updated successfully.",
        });
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Filter fiscal calendars based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredFiscalCalendars(fiscalCalendars);
        } else {
            setFilteredFiscalCalendars(
                fiscalCalendars.filter(
                    (calendar) =>
                        calendar.calendar_id.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, fiscalCalendars]);

    // Form setup
    const form = useForm<z.infer<typeof fiscalCalendarSchema>>({
        resolver: zodResolver(fiscalCalendarSchema),
        defaultValues: {
            calendar_id: "",
            start_date: "",
            end_date: "",
            number_of_periods: 12,
            active: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingFiscalCalendar) {
            form.reset({
                calendar_id: editingFiscalCalendar.calendar_id,
                start_date: editingFiscalCalendar.start_date,
                end_date: editingFiscalCalendar.end_date,
                number_of_periods: editingFiscalCalendar.number_of_periods,
                active: editingFiscalCalendar.active,
            });
        } else {
            form.reset({
                calendar_id: "",
                start_date: "",
                end_date: "",
                number_of_periods: 12,
                active: true,
            });
        }
    }, [editingFiscalCalendar, form]);

    // Create mutation
    const createFiscalCalendarMutation = useMutation({
        mutationFn: (fiscalCalendar: z.infer<typeof fiscalCalendarSchema>) => {
            return apiRequest(`/api/master-data/fiscal-calendar`, {
                method: "POST",
                body: JSON.stringify(fiscalCalendar)
            }).then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || "Failed to create fiscal calendar");
                    });
                }
                return res.json();
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Fiscal Calendar created successfully",
            });
            fetchData();
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create Fiscal Calendar",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateFiscalCalendarMutation = useMutation({
        mutationFn: (data: { id: number; fiscalCalendar: z.infer<typeof fiscalCalendarSchema> }) => {
            return apiRequest(`/api/master-data/fiscal-calendar/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.fiscalCalendar),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Fiscal Calendar updated successfully",
            });
            fetchData();
            setShowDialog(false);
            setEditingFiscalCalendar(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update Fiscal Calendar",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteFiscalCalendarMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/fiscal-calendar/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Fiscal Calendar deleted successfully",
            });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete Fiscal Calendar",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof fiscalCalendarSchema>) => {
        const updatedValues: any = {
            ...values,
            calendar_id: values.calendar_id.toUpperCase(),
        };

        if (editingFiscalCalendar) {
            updateFiscalCalendarMutation.mutate({ id: editingFiscalCalendar.id, fiscalCalendar: updatedValues });
        } else {
            createFiscalCalendarMutation.mutate(updatedValues);
        }
    };

    // Close dialog
    const closeDialog = () => {
        setShowDialog(false);
        setEditingFiscalCalendar(null);
        form.reset();
    };

    // Handle edit
    const handleEdit = (fiscalCalendar: FiscalCalendar) => {
        setEditingFiscalCalendar(fiscalCalendar);
        form.reset({
            calendar_id: fiscalCalendar.calendar_id,
            start_date: fiscalCalendar.start_date,
            end_date: fiscalCalendar.end_date,
            number_of_periods: fiscalCalendar.number_of_periods,
            active: fiscalCalendar.active,
        });
        setShowDialog(true);
    };

    // Handle export
    const handleExport = () => {
        if (filteredFiscalCalendars.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no fiscal calendars to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredFiscalCalendars.map(calendar => ({
            'Calendar ID': calendar.calendar_id,
            'Start Date': new Date(calendar.start_date).toLocaleDateString(),
            'End Date': new Date(calendar.end_date).toLocaleDateString(),
            'Number of Periods': calendar.number_of_periods,
            'Status': calendar.active ? 'Active' : 'Inactive'
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
        link.setAttribute('download', `fiscal-calendars-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredFiscalCalendars.length} fiscal calendars to CSV file.`,
        });
    };

    // Handle delete
    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this Fiscal Calendar?")) {
            deleteFiscalCalendarMutation.mutate(id);
        }
    };

    // Open fiscal calendar details
    const openFiscalCalendarDetails = (calendar: FiscalCalendar) => {
        setViewingFiscalCalendarDetails(calendar);
        setIsFiscalCalendarDetailsOpen(true);
    };

    if (fiscalCalendarsError) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                    <h3 className="text-lg font-medium">Error</h3>
                    <p>{fiscalCalendarsError.message || "An error occurred"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Fiscal Calendar</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage fiscal calendars and posting periods
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Fiscal Calendar
                    </Button>
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search fiscal calendars..."
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
                    <CardTitle>Fiscal Calendars</CardTitle>
                    <CardDescription>
                        A list of all fiscal calendars ({filteredFiscalCalendars.length})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {fiscalCalendarsLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="text-center">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500">Loading fiscal calendars...</p>
                            </div>
                        </div>
                    ) : filteredFiscalCalendars.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? "No fiscal calendars found matching your search." : "No fiscal calendars found. Click 'New Fiscal Calendar' to create one."}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Calendar ID</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Periods</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFiscalCalendars.map((calendar) => (
                                    <TableRow
                                        key={calendar.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => openFiscalCalendarDetails(calendar)}
                                    >
                                        <TableCell className="font-medium">{calendar.calendar_id}</TableCell>
                                        <TableCell>{new Date(calendar.start_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(calendar.end_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{calendar.number_of_periods}</TableCell>
                                        <TableCell>
                                            <Badge variant={calendar.active ? "default" : "secondary"}>
                                                {calendar.active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openFiscalCalendarDetails(calendar)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(calendar)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(calendar.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                            {editingFiscalCalendar ? "Edit Fiscal Calendar" : "Create New Fiscal Calendar"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingFiscalCalendar ? "Update the fiscal calendar information below." : "Enter the fiscal calendar information below."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="calendar_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Calendar ID *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., FC2026" {...field} />
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
                                name="number_of_periods"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number of Periods *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="52"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingFiscalCalendar ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Fiscal Calendar Details Dialog */}
            <Dialog open={isFiscalCalendarDetailsOpen} onOpenChange={setIsFiscalCalendarDetailsOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
                    {viewingFiscalCalendarDetails && (
                        <>
                            <DialogHeader className="flex-shrink-0">
                                <div className="flex items-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsFiscalCalendarDetailsOpen(false)}
                                        className="flex items-center space-x-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>Back</span>
                                    </Button>
                                    <div className="flex-1">
                                        <DialogTitle>Fiscal Calendar Details</DialogTitle>
                                        <DialogDescription>
                                            Comprehensive information about {viewingFiscalCalendarDetails.calendar_id}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto space-y-6 px-1">
                                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">{viewingFiscalCalendarDetails.calendar_id}</h3>
                                        <div className="flex items-center mt-1">
                                            <Badge
                                                variant={viewingFiscalCalendarDetails.active ? "default" : "secondary"}
                                                className={viewingFiscalCalendarDetails.active ? "bg-green-100 text-green-800" : ""}
                                            >
                                                {viewingFiscalCalendarDetails.active ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsFiscalCalendarDetailsOpen(false);
                                                handleEdit(viewingFiscalCalendarDetails);
                                            }}
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-200"
                                            onClick={() => {
                                                setIsFiscalCalendarDetailsOpen(false);
                                                handleDelete(viewingFiscalCalendarDetails.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex items-center">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            Calendar Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <dl className="space-y-3">
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">Calendar ID:</dt>
                                                <dd className="text-sm text-gray-900 font-semibold">{viewingFiscalCalendarDetails.calendar_id}</dd>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">Start Date:</dt>
                                                <dd className="text-sm text-gray-900">{new Date(viewingFiscalCalendarDetails.start_date).toLocaleDateString()}</dd>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">End Date:</dt>
                                                <dd className="text-sm text-gray-900">{new Date(viewingFiscalCalendarDetails.end_date).toLocaleDateString()}</dd>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">Number of Periods:</dt>
                                                <dd className="text-sm text-gray-900">{viewingFiscalCalendarDetails.number_of_periods}</dd>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">Duration:</dt>
                                                <dd className="text-sm text-gray-900">
                                                    {Math.ceil((new Date(viewingFiscalCalendarDetails.end_date).getTime() - new Date(viewingFiscalCalendarDetails.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                                </dd>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">Status:</dt>
                                                <dd className="text-sm text-gray-900 capitalize">
                                                    {viewingFiscalCalendarDetails.active ? "Active" : "Inactive"}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <dt className="text-sm font-medium text-gray-500">Created:</dt>
                                                <dd className="text-sm text-gray-900">
                                                    {new Date(viewingFiscalCalendarDetails.created_at).toLocaleString()}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between py-2">
                                                <dt className="text-sm font-medium text-gray-500">Last Updated:</dt>
                                                <dd className="text-sm text-gray-900">
                                                    {new Date(viewingFiscalCalendarDetails.updated_at).toLocaleString()}
                                                </dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
