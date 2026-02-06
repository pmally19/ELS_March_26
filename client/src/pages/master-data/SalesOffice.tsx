import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Building2,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
    Search,
    Filter,
    RefreshCw,
    Eye
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, Download, FileUp } from "lucide-react";
import SalesOfficeExcelImport from "@/components/master-data/SalesOfficeExcelImport";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Type Definition
interface SalesOffice {
    id: number;
    code: string;
    name: string;
    description: string;
    region?: string;
    country?: string;
    is_active: boolean; // Expect snake_case from API as we mapped it in schema but API returns what DB returns? No, Drizzle returns property keys from schema ?? 
    // Actually Drizzle returns objects with keys matching the schema property names (camelCase/mixed) if defined that way?
    // In schema: `code: varchar("sales_office_id")`. Property name is `code`. DB col is `sales_office_id`. Result object will have `code`.
    // In schema: `is_active: ...`. Property name is `is_active`. Result object will have `is_active`.
    createdAt: string;
    updatedAt: string;
}

interface Region {
    id: number;
    code: string;
    name: string;
}

interface Country {
    id: number;
    code: string;
    name: string;
}

// Validation Schema
const salesOfficeSchema = z.object({
    code: z.string().min(1, "Code is required").max(4, "Code must be max 4 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be max 100 characters"),
    description: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    is_active: z.boolean().default(true),
});

type SalesOfficeFormValues = z.infer<typeof salesOfficeSchema>;

export default function SalesOffice() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const permissions = useAgentPermissions();
    const [isOpen, setIsOpen] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewingSalesOffice, setViewingSalesOffice] = useState<SalesOffice | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    const form = useForm<SalesOfficeFormValues>({
        resolver: zodResolver(salesOfficeSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            region: "",
            country: "",
            is_active: true,
        },
    });

    // Fetch Sales Offices
    const { data: salesOffices = [], isLoading } = useQuery<SalesOffice[]>({
        queryKey: ["/api/sales-distribution/sales-offices"],
        queryFn: async () => {
            const res = await apiRequest("/api/sales-distribution/sales-offices");
            return res.json();
        }
    });

    // Fetch Regions
    const { data: regions = [] } = useQuery<Region[]>({
        queryKey: ["/api/master-data/regions"],
        queryFn: async () => {
            const res = await apiRequest("/api/master-data/regions");
            return res.json();
        }
    });

    // Fetch Countries
    const { data: countries = [] } = useQuery<Country[]>({
        queryKey: ["/api/master-data/countries"],
        queryFn: async () => {
            const res = await apiRequest("/api/master-data/countries");
            return res.json();
        }
    });



    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: SalesOfficeFormValues) => {
            const res = await apiRequest("/api/sales-distribution/sales-offices", {
                method: "POST",
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/sales-offices"] });
            toast({ title: "Success", description: "Sales Office created successfully" });
            setIsOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data: SalesOfficeFormValues) => {
            if (!editingId) throw new Error("No ID selected for update");
            const res = await apiRequest(`/api/sales-distribution/sales-offices/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/sales-offices"] });
            toast({ title: "Success", description: "Sales Office updated successfully" });
            setIsOpen(false);
            setEditingId(null);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest(`/api/sales-distribution/sales-offices/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/sales-offices"] });
            toast({ title: "Success", description: "Sales Office deleted successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (data: SalesOfficeFormValues) => {
        if (editingId) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (office: SalesOffice) => {
        setEditingId(office.id);
        form.reset({
            code: office.code,
            name: office.name,
            description: office.description || "",
            region: office.region || "",
            country: office.country || "",
            is_active: office.is_active,
        });
        setIsOpen(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        form.reset({
            code: "",
            name: "",
            description: "",
            region: "",
            country: "",
            is_active: true,
        });
        setIsOpen(true);
    };

    const handleView = (office: SalesOffice) => {
        setViewingSalesOffice(office);
        setIsViewDialogOpen(true);
    };

    const handleExport = () => {
        if (filteredOffices.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no sales offices to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredOffices.map(office => ({
            'Code': office.code,
            'Name': office.name,
            'Description': office.description || '',
            'Region': office.region || '',
            'Country': office.country || '',
            'Status': office.is_active ? 'Active' : 'Inactive'
        }));

        const headers = Object.keys(exportData[0]);
        const csvContent = [
            headers.join(','),
            ...exportData.map(row =>
                headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales-offices-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredOffices.length} sales offices to CSV file.`,
        });
    };

    const filteredOffices = salesOffices.filter(office =>
        office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        office.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Sales Offices</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your sales offices and their configuration
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
                            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                                <FileUp className="mr-2 h-4 w-4" />
                                Import from Excel
                            </Button>
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Sales Office
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-[800px]">
                    <SalesOfficeExcelImport />
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    {viewingSalesOffice && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <DialogTitle>Sales Office Details</DialogTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsViewDialogOpen(false);
                                                handleEdit(viewingSalesOffice);
                                            }}
                                        >
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                                <DialogDescription>
                                    Detailed information for sales office {viewingSalesOffice.code}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="bg-muted/50 p-4 rounded-lg flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">{viewingSalesOffice.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline">{viewingSalesOffice.code}</Badge>
                                            <Badge variant={viewingSalesOffice.is_active ? "default" : "secondary"}>
                                                {viewingSalesOffice.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">General Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-sm text-muted-foreground">Region</span>
                                                <p className="font-medium">
                                                    {viewingSalesOffice.region ?
                                                        `${regions.find(r => r.code === viewingSalesOffice.region)?.name || ''} (${viewingSalesOffice.region})`
                                                        : "-"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-sm text-muted-foreground">Country</span>
                                                <p className="font-medium">
                                                    {viewingSalesOffice.country ?
                                                        `${countries.find(c => c.code === viewingSalesOffice.country)?.name || ''} (${viewingSalesOffice.country})`
                                                        : "-"}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-muted-foreground">Description</span>
                                            <p className="font-medium mt-1">
                                                {viewingSalesOffice.description || "No description provided."}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <DialogFooter>
                                <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Sales Office" : "Create Sales Office"}</DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? "Update the details of existing sales office."
                                : "Add a new sales office to your organization structure."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 1000" {...field} disabled={!!editingId} />
                                            </FormControl>
                                            <FormDescription>
                                                Unique 4-char identifier
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="is_active"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm h-[88px] mt-0">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Active Status</FormLabel>
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Sales Office Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="region"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Region</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Region" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {regions.map((region) => (
                                                        <SelectItem key={region.id} value={region.code}>
                                                            {region.name} ({region.code})
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
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {countries.map((country) => (
                                                        <SelectItem key={country.id} value={country.code}>
                                                            {country.name} ({country.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                                            <Textarea
                                                placeholder="Additional details about this sales office..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingId ? "Update Sales Office" : "Create Sales Office"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Sales Office List</CardTitle>
                    <CardDescription>
                        A list of all sales offices in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by code or name..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/sales-offices"] })}>
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Region/Country</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Loading sales offices...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredOffices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No sales offices found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOffices.map((office) => (
                                        <TableRow key={office.id}>
                                            <TableCell className="font-medium">{office.code}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    {office.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {office.region || office.country ?
                                                    `${office.region || ''} ${office.region && office.country ? '/' : ''} ${office.country || ''}` :
                                                    "-"
                                                }
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{office.description || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant={office.is_active ? "default" : "secondary"}>
                                                    {office.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleView(office)}>
                                                            <Eye className="mr-2 h-4 w-4" /> View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(office)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => deleteMutation.mutate(office.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        </div>
    );
}
