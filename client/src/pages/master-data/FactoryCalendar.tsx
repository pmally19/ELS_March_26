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
    FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Download, FileUp, ArrowLeft, RefreshCw, MoreHorizontal, Calendar as CalendarIcon, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define Factory Calendar type
type FactoryCalendar = {
    id: string;
    calendarId: string;
    calendarCode: string;
    description: string;
    countryCode?: string;
    holidayCalendar?: string;
    workingDays?: string;
    shiftsPerDay?: number;
    annualHours?: number;
    weeklyHours?: number;
    dailyHours?: number;
    saturdayWorking?: boolean;
    sundayWorking?: boolean;
    createdDate?: string;
    status?: string;
    createdBy?: number;
    updatedBy?: number;
    tenantId?: string;
    createdAt?: string;
    updatedAt?: string;
};

// Factory Calendar Form Schema
const factoryCalendarSchema = z.object({
    calendarId: z.string().min(1, "Calendar ID is required").max(10, "Calendar ID must be at most 10 characters"),
    calendarCode: z.string().min(1, "Calendar code is required").max(50, "Calendar code must be at most 50 characters"),
    description: z.string().min(1, "Description is required").max(200, "Description must be at most 200 characters"),
    countryCode: z.string().optional(),
    holidayCalendar: z.string().optional(),
    workingDays: z.string().optional(),
    shiftsPerDay: z.coerce.number().min(1).max(10).default(1),
    annualHours: z.coerce.number().optional(),
    weeklyHours: z.coerce.number().optional(),
    dailyHours: z.coerce.number().optional(),
    saturdayWorking: z.boolean().default(false),
    sundayWorking: z.boolean().default(false),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export default function FactoryCalendar() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<FactoryCalendar | null>(null);
    const [activeTab, setActiveTab] = useState("basic");
    const [viewingCalendarDetails, setViewingCalendarDetails] = useState<FactoryCalendar | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [showAdminData, setShowAdminData] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const permissions = useAgentPermissions();

    // Fetch factory calendars
    const [calendars, setCalendars] = useState<FactoryCalendar[]>([]);
    const [filteredCalendars, setFilteredCalendars] = useState<FactoryCalendar[]>([]);
    const [calendarsLoading, setCalendarsLoading] = useState(true);
    const [calendarsError, setCalendarsError] = useState<Error | null>(null);

    // Fetch holiday calendars for dropdown
    const { data: holidayCalendars = [] } = useQuery<any[]>({
        queryKey: ['/api/holiday-calendars'],
        queryFn: async () => {
            const response = await fetch('/api/holiday-calendars', {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch holiday calendars');
            return response.json();
        },
    });

    // Fetch data function
    const fetchData = async () => {
        try {
            setCalendarsLoading(true);
            const response = await fetch("/api/factory-calendars", {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const mappedData = Array.isArray(data) ? data : [];
            setCalendars(mappedData);
            setFilteredCalendars(mappedData);
            setCalendarsLoading(false);
        } catch (error) {
            console.error("Error fetching factory calendars:", error);
            setCalendarsError(error instanceof Error ? error : new Error('Failed to fetch factory calendars'));
            setCalendarsLoading(false);
        }
    };

    // Refresh function
    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest factory calendars...",
        });
        await fetchData();
        toast({
            title: "Data Refreshed",
            description: "Factory calendars have been updated successfully.",
        });
    };

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    // Filter calendars based on search
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredCalendars(calendars);
        } else {
            setFilteredCalendars(
                calendars.filter(
                    (calendar) =>
                        calendar.calendarId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        calendar.calendarCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        calendar.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        calendar.workingDays?.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, calendars]);

    // Form setup
    const form = useForm<z.infer<typeof factoryCalendarSchema>>({
        resolver: zodResolver(factoryCalendarSchema),
        defaultValues: {
            calendarId: "",
            calendarCode: "",
            description: "",
            countryCode: "",
            holidayCalendar: "",
            workingDays: "",
            shiftsPerDay: 1,
            annualHours: 0,
            weeklyHours: 40,
            dailyHours: 8,
            saturdayWorking: false,
            sundayWorking: false,
            status: "ACTIVE",
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingCalendar) {
            form.reset({
                calendarId: editingCalendar.calendarId,
                calendarCode: editingCalendar.calendarCode,
                description: editingCalendar.description,
                countryCode: editingCalendar.countryCode || "",
                holidayCalendar: editingCalendar.holidayCalendar || "",
                workingDays: editingCalendar.workingDays || "",
                shiftsPerDay: editingCalendar.shiftsPerDay || 1,
                annualHours: editingCalendar.annualHours || 0,
                weeklyHours: editingCalendar.weeklyHours || 40,
                dailyHours: editingCalendar.dailyHours || 8,
                saturdayWorking: editingCalendar.saturdayWorking || false,
                sundayWorking: editingCalendar.sundayWorking || false,
                status: (editingCalendar.status as any) || "ACTIVE",
            });
        } else {
            form.reset();
        }
    }, [editingCalendar, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (calendar: z.infer<typeof factoryCalendarSchema>) => {
            return apiRequest(`/api/factory-calendars`, {
                method: "POST",
                body: JSON.stringify(calendar)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Factory calendar created successfully",
            });
            fetchData();
            setShowDialog(false);
            setActiveTab("basic");
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create factory calendar",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: string; calendar: z.infer<typeof factoryCalendarSchema> }) => {
            return apiRequest(`/api/factory-calendars/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.calendar),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Factory calendar updated successfully",
            });
            fetchData();
            setShowDialog(false);
            setEditingCalendar(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update factory calendar",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => {
            return apiRequest(`/api/factory-calendars/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Factory calendar deleted successfully",
            });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete factory calendar",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof factoryCalendarSchema>) => {
        const updatedValues: any = {
            ...values,
            calendarId: values.calendarId.toUpperCase(),
            calendarCode: values.calendarCode.toUpperCase(),
        };

        if (editingCalendar) {
            updateMutation.mutate({ id: editingCalendar.id, calendar: updatedValues });
        } else {
            createMutation.mutate(updatedValues);
        }
    };

    // Close dialog
    const closeDialog = () => {
        setShowDialog(false);
        setEditingCalendar(null);
        form.reset();
    };

    // Handle edit
    const handleEdit = (calendar: FactoryCalendar) => {
        setEditingCalendar(calendar);
        form.reset({
            calendarId: calendar.calendarId,
            calendarCode: calendar.calendarCode,
            description: calendar.description,
            countryCode: calendar.countryCode || "",
            holidayCalendar: calendar.holidayCalendar || "",
            workingDays: calendar.workingDays || "",
            shiftsPerDay: calendar.shiftsPerDay || 1,
            annualHours: calendar.annualHours || 0,
            weeklyHours: calendar.weeklyHours || 40,
            dailyHours: calendar.dailyHours || 8,
            saturdayWorking: calendar.saturdayWorking || false,
            sundayWorking: calendar.sundayWorking || false,
            status: (calendar.status as any) || "ACTIVE",
        });
        setShowDialog(true);
    };

    // Handle delete
    const handleDelete = (calendar: FactoryCalendar) => {
        if (window.confirm(`Are you sure you want to delete factory calendar ${calendar.calendarId}?`)) {
            deleteMutation.mutate(calendar.id);
        }
    };

    // Handle export
    const handleExport = () => {
        if (filteredCalendars.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no factory calendars to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredCalendars.map(calendar => ({
            'Calendar ID': calendar.calendarId,
            'Calendar Code': calendar.calendarCode,
            'Description': calendar.description,
            'Country Code': calendar.countryCode || '',
            'Working Days': calendar.workingDays || '',
            'Shifts Per Day': calendar.shiftsPerDay || '',
            'Daily Hours': calendar.dailyHours || '',
            'Weekly Hours': calendar.weeklyHours || '',
            'Annual Hours': calendar.annualHours || '',
            'Saturday Working': calendar.saturdayWorking ? 'Yes' : 'No',
            'Sunday Working': calendar.sundayWorking ? 'Yes' : 'No',
            'Status': calendar.status || 'ACTIVE',
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
        link.setAttribute('download', `factory-calendars-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredCalendars.length} factory calendars to CSV file.`,
        });
    };

    // Open details dialog
    const openDetails = (calendar: FactoryCalendar) => {
        setViewingCalendarDetails(calendar);
        setIsDetailsOpen(true);
    };

    if (calendarsError) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                    <h3 className="text-lg font-medium">Error</h3>
                    <p>{calendarsError.message || "An error occurred"}</p>
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
                        <h1 className="text-2xl font-bold">Factory Calendars</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage working time calendars for capacity planning
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {permissions.hasDataModificationRights ? (
                        <>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                Export to Excel
                            </Button>
                            <Button onClick={() => setShowDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Factory Calendar
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Bar with Refresh */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search factory calendars..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={calendarsLoading}
                    title="Refresh factory calendars data"
                >
                    <RefreshCw className={`h-4 w-4 ${calendarsLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Factory Calendars Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Factory Calendars</CardTitle>
                    <CardDescription>
                        All working time calendars for plants, work centers, and shipping points
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Calendar ID</TableHead>
                                        <TableHead>Calendar Code</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="hidden sm:table-cell">Working Days</TableHead>
                                        <TableHead className="hidden md:table-cell text-center">Shifts/Day</TableHead>
                                        <TableHead className="hidden md:table-cell text-center">Daily Hours</TableHead>
                                        <TableHead className="hidden lg:table-cell text-center">Weekly Hours</TableHead>
                                        <TableHead className="hidden lg:table-cell text-center">Weekend</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calendarsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredCalendars.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center h-24">
                                                No factory calendars found. {searchQuery ? "Try a different search." : "Create your first factory calendar."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCalendars.map((calendar) => (
                                            <TableRow
                                                key={calendar.id}
                                                className="cursor-pointer hover:bg-gray-50"
                                                onClick={() => openDetails(calendar)}
                                            >
                                                <TableCell className="font-medium">{calendar.calendarId}</TableCell>
                                                <TableCell>{calendar.calendarCode}</TableCell>
                                                <TableCell>{calendar.description}</TableCell>
                                                <TableCell className="hidden sm:table-cell">{calendar.workingDays || "N/A"}</TableCell>
                                                <TableCell className="hidden md:table-cell text-center">{calendar.shiftsPerDay || 1}</TableCell>
                                                <TableCell className="hidden md:table-cell text-center">{calendar.dailyHours || 8}</TableCell>
                                                <TableCell className="hidden lg:table-cell text-center">{calendar.weeklyHours || 40}</TableCell>
                                                <TableCell className="hidden lg:table-cell text-center">
                                                    <span className="text-xs">
                                                        {calendar.saturdayWorking && "Sat "}
                                                        {calendar.sundayWorking && "Sun"}
                                                        {!calendar.saturdayWorking && !calendar.sundayWorking && "—"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${calendar.status === "ACTIVE"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {calendar.status || "ACTIVE"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openDetails(calendar)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(calendar)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(calendar)} className="text-red-600">
                                                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
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
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={closeDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCalendar ? "Edit Factory Calendar" : "Create Factory Calendar"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCalendar
                                ? "Update the factory calendar details"
                                : "Add a new working time calendar for capacity planning"}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                    <TabsTrigger value="details">Working Time</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="calendarId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Calendar ID*</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="CAL001" {...field} disabled={!!editingCalendar} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="calendarCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Calendar Code*</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="STANDARD_8H" {...field} />
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
                                                <FormLabel>Description*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Standard 8-hour Working Day" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="countryCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Country Code</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="USA" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="workingDays"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Working Days</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="MON-FRI" {...field} />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">e.g., MON-FRI, MON-SAT</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="holidayCalendar"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Holiday Calendar</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select holiday calendar" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        {holidayCalendars.map((hc: any) => (
                                                            <SelectItem key={hc.id} value={hc.holidayCalendarId}>
                                                                {hc.calendarCode} - {hc.description}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription className="text-xs">Public holiday calendar reference (optional)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent value="details" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="shiftsPerDay"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Shifts/Day</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" max="10" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="dailyHours"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Daily Hours</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="weeklyHours"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Weekly Hours</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="annualHours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Annual Hours</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.1" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Total working hours per year</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-6">
                                        <FormField
                                            control={form.control}
                                            name="saturdayWorking"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Saturday Working</FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="sundayWorking"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Sunday Working</FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {editingCalendar ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Details Dialog - View Only */}
            <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if (!open) setShowAdminData(false); }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Factory Calendar Details</DialogTitle>
                        <DialogDescription>
                            View complete information for {viewingCalendarDetails?.calendarCode}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingCalendarDetails && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Calendar ID</p>
                                    <p className="text-sm font-semibold">{viewingCalendarDetails.calendarId}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Calendar Code</p>
                                    <p className="text-sm">{viewingCalendarDetails.calendarCode}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Description</p>
                                    <p className="text-sm">{viewingCalendarDetails.description}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Country Code</p>
                                    <p className="text-sm">{viewingCalendarDetails.countryCode || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Working Days</p>
                                    <p className="text-sm">{viewingCalendarDetails.workingDays || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Holiday Calendar</p>
                                    <p className="text-sm">{viewingCalendarDetails.holidayCalendar || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Shifts per Day</p>
                                    <p className="text-sm">{viewingCalendarDetails.shiftsPerDay || 1}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Daily Hours</p>
                                    <p className="text-sm">{viewingCalendarDetails.dailyHours || 8}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Weekly Hours</p>
                                    <p className="text-sm">{viewingCalendarDetails.weeklyHours || 40}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Annual Hours</p>
                                    <p className="text-sm">{viewingCalendarDetails.annualHours || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Saturday Working</p>
                                    <p className="text-sm">{viewingCalendarDetails.saturdayWorking ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Sunday Working</p>
                                    <p className="text-sm">{viewingCalendarDetails.sundayWorking ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingCalendarDetails.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {viewingCalendarDetails.status || 'ACTIVE'}
                                    </span>
                                </div>
                            </div>

                            <Separator />

                            {/* Administrative Data - collapsible */}
                            <div
                                className="cursor-pointer flex justify-between items-center select-none py-1"
                                onClick={() => setShowAdminData(!showAdminData)}
                            >
                                <p className="font-semibold text-sm text-gray-700">Administrative Data</p>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ transform: showAdminData ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            {showAdminData && (
                                <dl className="grid grid-cols-2 gap-3">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Created By</dt>
                                        <dd className="text-sm text-gray-900">{viewingCalendarDetails.createdBy ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                                        <dd className="text-sm text-gray-900">{viewingCalendarDetails.updatedBy ?? viewingCalendarDetails.createdBy ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                        <dd className="text-sm text-gray-900">{viewingCalendarDetails.createdAt ? new Date(viewingCalendarDetails.createdAt).toLocaleString() : '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                                        <dd className="text-sm text-gray-900">{viewingCalendarDetails.updatedAt ? new Date(viewingCalendarDetails.updatedAt).toLocaleString() : '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                                        <dd className="text-sm text-gray-900">{viewingCalendarDetails.tenantId ?? '—'}</dd>
                                    </div>
                                </dl>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsDetailsOpen(false); if (viewingCalendarDetails) handleEdit(viewingCalendarDetails); }}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
