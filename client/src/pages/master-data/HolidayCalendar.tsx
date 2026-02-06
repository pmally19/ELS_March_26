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
import { Plus, Search, Edit, Download, ArrowLeft, RefreshCw, MoreHorizontal, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define Holiday Calendar type
type HolidayCalendar = {
    id: string;
    holidayCalendarId: string;
    calendarCode: string;
    description: string;
    countryCode?: string;
    region?: string;
    validFrom?: string;
    validTo?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
};

// Public Holiday type
type PublicHoliday = {
    id: number;
    holidayCalendarId: string;
    holidayDate: string;
    holidayName: string;
    holidayType?: string;
    isWorkingDay?: boolean;
    description?: string;
    createdAt?: string;
};

// Public Holiday Form Schema
const publicHolidaySchema = z.object({
    holidayDate: z.string().min(1, "Holiday date is required"),
    holidayName: z.string().min(1, "Holiday name is required").max(100, "Name must be at most 100 characters"),
    holidayType: z.string().max(50).optional(),
    isWorkingDay: z.boolean().default(false),
    description: z.string().optional(),
});

// Holiday Calendar Form Schema
const holidayCalendarSchema = z.object({
    holidayCalendarId: z.string().min(1, "Holiday calendar ID is required").max(10, "ID must be at most 10 characters"),
    calendarCode: z.string().min(1, "Calendar code is required").max(50, "Code must be at most 50 characters"),
    description: z.string().min(1, "Description is required").max(200, "Description must be at most 200 characters"),
    countryId: z.string().optional(),
    regionId: z.string().optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export default function HolidayCalendar() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<HolidayCalendar | null>(null);
    const [activeTab, setActiveTab] = useState("basic");
    const [viewingCalendarDetails, setViewingCalendarDetails] = useState<HolidayCalendar | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Public holidays management state
    const [managingHolidaysFor, setManagingHolidaysFor] = useState<HolidayCalendar | null>(null);
    const [isHolidaysDialogOpen, setIsHolidaysDialogOpen] = useState(false);
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [holidaysLoading, setHolidaysLoading] = useState(false);
    const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const permissions = useAgentPermissions();

    // Fetch countries for dropdown
    const { data: countries = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/countries'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/countries', {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch countries');
            return response.json();
        },
    });

    // Fetch regions for dropdown
    const { data: regions = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/regions'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/regions', {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch regions');
            return response.json();
        },
    });

    // Fetch holiday calendars
    const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
    const [filteredCalendars, setFilteredCalendars] = useState<HolidayCalendar[]>([]);
    const [calendarsLoading, setCalendarsLoading] = useState(true);
    const [calendarsError, setCalendarsError] = useState<Error | null>(null);

    // Fetch data function
    const fetchData = async () => {
        try {
            setCalendarsLoading(true);
            const response = await fetch("/api/holiday-calendars", {
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
            console.error("Error fetching holiday calendars:", error);
            setCalendarsError(error instanceof Error ? error : new Error('Failed to fetch holiday calendars'));
            setCalendarsLoading(false);
        }
    };

    // Refresh function
    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest holiday calendars...",
        });
        await fetchData();
        toast({
            title: "Data Refreshed",
            description: "Holiday calendars have been updated successfully.",
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
                        calendar.holidayCalendarId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        calendar.calendarCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        calendar.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        calendar.countryCode?.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, calendars]);

    // Form setup
    const form = useForm<z.infer<typeof holidayCalendarSchema>>({
        resolver: zodResolver(holidayCalendarSchema),
        defaultValues: {
            holidayCalendarId: "",
            calendarCode: "",
            description: "",
            countryId: "",
            regionId: "",
            validFrom: "",
            validTo: "",
            status: "ACTIVE",
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingCalendar) {
            form.reset({
                holidayCalendarId: editingCalendar.holidayCalendarId,
                calendarCode: editingCalendar.calendarCode,
                description: editingCalendar.description,
                countryId: editingCalendar.countryCode || "",
                regionId: editingCalendar.region || "",
                validFrom: editingCalendar.validFrom || "",
                validTo: editingCalendar.validTo || "",
                status: (editingCalendar.status as any) || "ACTIVE",
            });
        } else {
            form.reset();
        }
    }, [editingCalendar, form]);

    // Public Holiday form setup
    const holidayForm = useForm<z.infer<typeof publicHolidaySchema>>({
        resolver: zodResolver(publicHolidaySchema),
        defaultValues: {
            holidayDate: "",
            holidayName: "",
            holidayType: "PUBLIC",
            isWorkingDay: false,
            description: "",
        },
    });

    // Fetch holidays for a calendar
    const fetchHolidays = async (calendarId: string) => {
        try {
            setHolidaysLoading(true);
            const response = await fetch(`/api/holiday-calendars/${calendarId}/holidays`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch holidays');
            const data = await response.json();
            setHolidays(data);
            setHolidaysLoading(false);
        } catch (error) {
            console.error('Error fetching holidays:', error);
            setHolidaysLoading(false);
            toast({
                title: "Error",
                description: "Failed to fetch holidays",
                variant: "destructive",
            });
        }
    };

    // Create holiday mutation
    const createHolidayMutation = useMutation({
        mutationFn: (data: { calendarId: string; holiday: z.infer<typeof publicHolidaySchema> }) => {
            return apiRequest(`/api/holiday-calendars/${data.calendarId}/holidays`, {
                method: "POST",
                body: JSON.stringify(data.holiday)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Holiday created successfully",
            });
            if (managingHolidaysFor) {
                fetchHolidays(managingHolidaysFor.id);
            }
            setShowAddHolidayForm(false);
            holidayForm.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create holiday",
                variant: "destructive",
            });
        },
    });

    // Delete holiday mutation
    const deleteHolidayMutation = useMutation({
        mutationFn: (holidayId: number) => {
            return apiRequest(`/api/public-holidays/${holidayId}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Holiday deleted successfully",
            });
            if (managingHolidaysFor) {
                fetchHolidays(managingHolidaysFor.id);
            }
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete holiday",
                variant: "destructive",
            });
        },
    });

    // Handle manage holidays
    const handleManageHolidays = (calendar: HolidayCalendar) => {
        setManagingHolidaysFor(calendar);
        setIsHolidaysDialogOpen(true);
        fetchHolidays(calendar.id);
    };

    // Submit holiday
    const onSubmitHoliday = (values: z.infer<typeof publicHolidaySchema>) => {
        if (!managingHolidaysFor) return;
        createHolidayMutation.mutate({
            calendarId: managingHolidaysFor.id,
            holiday: values
        });
    };

    // Delete holiday
    const handleDeleteHoliday = (holidayId: number) => {
        if (confirm("Are you sure you want to delete this holiday?")) {
            deleteHolidayMutation.mutate(holidayId);
        }
    };

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (calendar: z.infer<typeof holidayCalendarSchema>) => {
            return apiRequest(`/api/holiday-calendars`, {
                method: "POST",
                body: JSON.stringify(calendar)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Holiday calendar created successfully",
            });
            fetchData();
            setShowDialog(false);
            setActiveTab("basic");
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create holiday calendar",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: string; calendar: z.infer<typeof holidayCalendarSchema> }) => {
            return apiRequest(`/api/holiday-calendars/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.calendar),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Holiday calendar updated successfully",
            });
            fetchData();
            setShowDialog(false);
            setEditingCalendar(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update holiday calendar",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => {
            return apiRequest(`/api/holiday-calendars/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Holiday calendar deleted successfully",
            });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete holiday calendar",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof holidayCalendarSchema>) => {
        const updatedValues: any = {
            ...values,
            holidayCalendarId: values.holidayCalendarId.toUpperCase(),
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
    const handleEdit = (calendar: HolidayCalendar) => {
        setEditingCalendar(calendar);
        form.reset({
            holidayCalendarId: calendar.holidayCalendarId,
            calendarCode: calendar.calendarCode,
            description: calendar.description,
            countryId: calendar.countryCode || "",
            regionId: calendar.region || "",
            validFrom: calendar.validFrom || "",
            validTo: calendar.validTo || "",
            status: (calendar.status as any) || "ACTIVE",
        });
        setShowDialog(true);
    };

    // Handle export
    const handleExport = () => {
        if (filteredCalendars.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no holiday calendars to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredCalendars.map(calendar => ({
            'Holiday Calendar ID': calendar.holidayCalendarId,
            'Calendar Code': calendar.calendarCode,
            'Description': calendar.description,
            'Country Code': calendar.countryCode || '',
            'Region': calendar.region || '',
            'Valid From': calendar.validFrom || '',
            'Valid To': calendar.validTo || '',
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
        link.setAttribute('download', `holiday-calendars-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredCalendars.length} holiday calendars to CSV file.`,
        });
    };

    // Open details dialog
    const openDetails = (calendar: HolidayCalendar) => {
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
                        <h1 className="text-2xl font-bold">Holiday Calendars</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage public holiday calendars for workforce planning
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
                                New Holiday Calendar
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
                        placeholder="Search holiday calendars..."
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
                    title="Refresh holiday calendars data"
                >
                    <RefreshCw className={`h-4 w-4 ${calendarsLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Holiday Calendars Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Holiday Calendars</CardTitle>
                    <CardDescription>
                        All public holiday calendars for capacity and workforce planning
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
                                        <TableHead className="hidden sm:table-cell">Country</TableHead>
                                        <TableHead className="hidden md:table-cell">Region</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calendarsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredCalendars.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                No holiday calendars found. {searchQuery ? "Try a different search." : "Create your first holiday calendar."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCalendars.map((calendar) => (
                                            <TableRow
                                                key={calendar.id}
                                                className="cursor-pointer hover:bg-gray-50"
                                                onClick={() => openDetails(calendar)}
                                            >
                                                <TableCell className="font-medium">{calendar.holidayCalendarId}</TableCell>
                                                <TableCell>{calendar.calendarCode}</TableCell>
                                                <TableCell>{calendar.description}</TableCell>
                                                <TableCell className="hidden sm:table-cell">{calendar.countryCode || "—"}</TableCell>
                                                <TableCell className="hidden md:table-cell">{calendar.region || "—"}</TableCell>
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
                                                            <DropdownMenuItem onClick={() => handleEdit(calendar)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleManageHolidays(calendar)}>
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                Manage Holidays
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    if (confirm(`Are you sure you want to delete "${calendar.calendarCode}"? This will set its status to INACTIVE.`)) {
                                                                        deleteMutation.mutate(calendar.id);
                                                                    }
                                                                }}
                                                                className="text-red-600"
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
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={closeDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCalendar ? "Edit Holiday Calendar" : "Create Holiday Calendar"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCalendar
                                ? "Update the holiday calendar details"
                                : "Add a new public holiday calendar"}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-1">
                                    <TabsTrigger value="basic">Calendar Details</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="holidayCalendarId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Holiday Calendar ID*</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="US_PUBLIC" {...field} disabled={!!editingCalendar} />
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
                                                        <Input placeholder="US_PUBLIC" {...field} />
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
                                                    <Input placeholder="United States Federal Holidays" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="countryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Country</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select country" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="">None</SelectItem>
                                                            {countries.map((country: any) => (
                                                                <SelectItem key={country.id} value={country.id.toString()}>
                                                                    {country.name} ({country.code})
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
                                            name="regionId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Region</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select region" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="">None</SelectItem>
                                                            {regions.map((region: any) => (
                                                                <SelectItem key={region.id} value={region.id.toString()}>
                                                                    {region.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="validFrom"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Valid From</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="validTo"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Valid To</FormLabel>
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
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Holiday Calendar Details</DialogTitle>
                        <DialogDescription>
                            View complete information for {viewingCalendarDetails?.calendarCode}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingCalendarDetails && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Holiday Calendar ID</p>
                                    <p className="text-sm">{viewingCalendarDetails.holidayCalendarId}</p>
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
                                    <p className="text-sm">{viewingCalendarDetails.countryCode || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Region</p>
                                    <p className="text-sm">{viewingCalendarDetails.region || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Valid From</p>
                                    <p className="text-sm">{viewingCalendarDetails.validFrom || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Valid To</p>
                                    <p className="text-sm">{viewingCalendarDetails.validTo || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${viewingCalendarDetails.status === "ACTIVE"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {viewingCalendarDetails.status || "ACTIVE"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Public Holidays Management Dialog */}
            <Dialog open={isHolidaysDialogOpen} onOpenChange={setIsHolidaysDialogOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Public Holidays</DialogTitle>
                        <DialogDescription>
                            {managingHolidaysFor?.calendarCode} - {managingHolidaysFor?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Add Holiday Button */}
                        {!showAddHolidayForm && (
                            <Button onClick={() => setShowAddHolidayForm(true)} size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Holiday
                            </Button>
                        )}

                        {/* Add Holiday Form */}
                        {showAddHolidayForm && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Add New Holiday</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Form {...holidayForm}>
                                        <form onSubmit={holidayForm.handleSubmit(onSubmitHoliday)} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={holidayForm.control}
                                                    name="holidayDate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Holiday Date*</FormLabel>
                                                            <FormControl>
                                                                <Input type="date" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={holidayForm.control}
                                                    name="holidayName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Holiday Name*</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="New Year's Day" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={holidayForm.control}
                                                    name="holidayType"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Holiday Type</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="PUBLIC" {...field} />
                                                            </FormControl>
                                                            <FormDescription className="text-xs">e.g., PUBLIC, REGIONAL, COMPANY</FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={holidayForm.control}
                                                    name="isWorkingDay"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                            <div className="space-y-0.5">
                                                                <FormLabel>Is Working Day?</FormLabel>
                                                                <FormDescription className="text-xs">
                                                                    Check if employees work on this day
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.value}
                                                                    onChange={field.onChange}
                                                                    className="h-4 w-4"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={holidayForm.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Description</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Optional description" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="flex gap-2">
                                                <Button type="submit" disabled={createHolidayMutation.isPending}>
                                                    {createHolidayMutation.isPending ? "Creating..." : "Create Holiday"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowAddHolidayForm(false);
                                                        holidayForm.reset();
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Holidays Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Holiday Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-center">Working Day</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {holidaysLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Loading holidays...
                                            </TableCell>
                                        </TableRow>
                                    ) : holidays.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No holidays defined. Click "Add Holiday" to create one.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        holidays.map((holiday) => (
                                            <TableRow key={holiday.id}>
                                                <TableCell className="font-medium">
                                                    {new Date(holiday.holidayDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>{holiday.holidayName}</TableCell>
                                                <TableCell>{holiday.holidayType || "PUBLIC"}</TableCell>
                                                <TableCell className="text-center">
                                                    {holiday.isWorkingDay ? "Yes" : "No"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteHoliday(holiday.id)}
                                                        disabled={deleteHolidayMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsHolidaysDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
