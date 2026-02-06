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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Download, ArrowLeft, RefreshCw, MoreHorizontal, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Industry Sector type
type IndustrySector = {
    id: number;
    code: string;
    name: string;
    description?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
};

// Form schema
const industrySectorSchema = z.object({
    code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    description: z.string().optional(),
    active: z.boolean().default(true),
});

export default function IndustrySectorPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingSector, setEditingSector] = useState<IndustrySector | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const permissions = useAgentPermissions();

    // Fetch industry sectors
    const [sectors, setSectors] = useState<IndustrySector[]>([]);
    const [filteredSectors, setFilteredSectors] = useState<IndustrySector[]>([]);
    const [sectorsLoading, setSectorsLoading] = useState(true);

    const fetchData = async () => {
        try {
            setSectorsLoading(true);
            const response = await fetch("/api/master-data/industry-sector");
            if (!response.ok) throw new Error("Failed to fetch industry sectors");
            const data = await response.json();
            setSectors(data);
            setFilteredSectors(data);
            setSectorsLoading(false);
        } catch (error) {
            console.error("Error fetching industry sectors:", error);
            setSectorsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter sectors
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredSectors(sectors);
        } else {
            setFilteredSectors(
                sectors.filter(
                    (sector) =>
                        sector.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        sector.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, sectors]);

    // Form setup
    const form = useForm<z.infer<typeof industrySectorSchema>>({
        resolver: zodResolver(industrySectorSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            active: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingSector) {
            form.reset({
                code: editingSector.code,
                name: editingSector.name,
                description: editingSector.description || "",
                active: editingSector.active,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                active: true,
            });
        }
    }, [editingSector, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: z.infer<typeof industrySectorSchema>) => {
            return apiRequest("/api/master-data/industry-sector", {
                method: "POST",
                body: JSON.stringify(data),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Industry sector created successfully" });
            fetchData();
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create industry sector",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: number; sector: z.infer<typeof industrySectorSchema> }) => {
            return apiRequest(`/api/master-data/industry-sector/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.sector),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Industry sector updated successfully" });
            fetchData();
            setShowDialog(false);
            setEditingSector(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update industry sector",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/industry-sector/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Industry sector deleted successfully" });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete industry sector",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: z.infer<typeof industrySectorSchema>) => {
        const updatedValues = {
            ...values,
            code: values.code.toUpperCase(),
        };

        if (editingSector) {
            updateMutation.mutate({ id: editingSector.id, sector: updatedValues });
        } else {
            createMutation.mutate(updatedValues);
        }
    };

    const handleEdit = (sector: IndustrySector) => {
        setEditingSector(sector);
        setShowDialog(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this industry sector?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleDeactivate = (id: number) => {
        if (window.confirm("Are you sure you want to deactivate this industry sector?")) {
            fetch(`/api/master-data/industry-sector/${id}/deactivate`, {
                method: 'PUT',
            })
                .then(response => response.json())
                .then(() => {
                    toast({ title: "Success", description: "Industry sector deactivated successfully" });
                    fetchData();
                })
                .catch(error => {
                    toast({
                        title: "Error",
                        description: error.message || "Failed to deactivate industry sector",
                        variant: "destructive",
                    });
                });
        }
    };

    const handleExport = () => {
        if (filteredSectors.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no industry sectors to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredSectors.map(sector => ({
            'Code': sector.code,
            'Name': sector.name,
            'Description': sector.description || '',
            'Status': sector.active ? 'Active' : 'Inactive'
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
        link.setAttribute('download', `industry-sectors-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredSectors.length} industry sectors to CSV file.`,
        });
    };

    const handleRefresh = async () => {
        toast({ title: "Refreshing Data", description: "Loading latest industry sectors..." });
        await fetchData();
        toast({ title: "Data Refreshed", description: "Industry sectors have been updated successfully." });
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
                        <h1 className="text-2xl font-bold">Industry Sectors</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage industry classifications for material master
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {permissions.hasDataModificationRights ? (
                        <>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                Export to CSV
                            </Button>
                            <Button onClick={() => setShowDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Industry Sector
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search industry sectors..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={sectorsLoading}
                    title="Refresh data"
                >
                    <RefreshCw className={`h-4 w-4 ${sectorsLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Industry Sectors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Industry Sectors</CardTitle>
                    <CardDescription>
                        All registered industry classifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Description</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sectorsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredSectors.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No industry sectors found. {searchQuery ? "Try a different search." : "Create your first industry sector."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSectors.map((sector) => (
                                            <TableRow key={sector.id}>
                                                <TableCell className="font-medium">{sector.code}</TableCell>
                                                <TableCell>{sector.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{sector.description || "—"}</TableCell>
                                                <TableCell className="text-center">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sector.active
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {sector.active ? "Active" : "Inactive"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(sector)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeactivate(sector.id)}>
                                                                <PowerOff className="mr-2 h-4 w-4" />
                                                                Deactivate
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() => handleDelete(sector.id)}
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

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={(open) => {
                setShowDialog(open);
                if (!open) {
                    setEditingSector(null);
                    form.reset();
                }
            }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSector ? "Edit Industry Sector" : "Create Industry Sector"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSector ? "Update the industry sector details" : "Add a new industry sector to your organization"}
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
                                            <FormLabel>Code *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="AUTO" maxLength={10} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Automotive" />
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
                                            <Textarea {...field} placeholder="Brief description of industry sector" rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="active"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer">Active</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowDialog(false);
                                        setEditingSector(null);
                                        form.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingSector ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
