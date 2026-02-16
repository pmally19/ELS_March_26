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
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";

// Define the Valuation Grouping Code type
type ValuationGroupingCode = {
    id: number;
    code: string;
    name: string;
    description?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
};

// Form Schema
const schema = z.object({
    code: z.string().min(1, "Code is required").max(10, "Code must be at most 10 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    description: z.string().optional(),
    active: z.boolean().default(true),
});

// Valuation Grouping Code Management Page
export default function ValuationGroupingCodes() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<ValuationGroupingCode | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch data
    const { data: items = [], isLoading, refetch } = useQuery<ValuationGroupingCode[]>({
        queryKey: ["/api/master-data/valuation-grouping-codes"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/valuation-grouping-codes");
            return await response.json();
        },
    });

    // Filter items based on search query
    const filteredItems = items.filter(
        (item) =>
            item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form setup
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            active: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingItem) {
            form.reset({
                code: editingItem.code,
                name: editingItem.name,
                description: editingItem.description || "",
                active: editingItem.active,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                active: true,
            });
        }
    }, [editingItem, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: z.infer<typeof schema>) => {
            return apiRequest(`/api/master-data/valuation-grouping-codes`, {
                method: "POST",
                body: JSON.stringify(data)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Valuation Grouping Code created successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/valuation-grouping-codes"] });
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create Valuation Grouping Code",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: number; values: z.infer<typeof schema> }) => {
            return apiRequest(`/api/master-data/valuation-grouping-codes/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.values),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Valuation Grouping Code updated successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/valuation-grouping-codes"] });
            setShowDialog(false);
            setEditingItem(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update Valuation Grouping Code",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/valuation-grouping-codes/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Valuation Grouping Code deleted successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/valuation-grouping-codes"] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete Valuation Grouping Code",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof schema>) => {
        const updatedValues = {
            ...values,
            code: values.code.toUpperCase(),
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, values: updatedValues });
        } else {
            createMutation.mutate(updatedValues);
        }
    };

    // Function to handle editing
    const handleEdit = (item: ValuationGroupingCode) => {
        setEditingItem(item);
        setShowDialog(true);
    };

    // Function to handle deleting
    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this Valuation Grouping Code?")) {
            deleteMutation.mutate(id);
        }
    };

    // Function to close the dialog
    const closeDialog = () => {
        setShowDialog(false);
        setEditingItem(null);
        form.reset();
    };

    // Function to handle refresh
    const handleRefresh = async () => {
        await refetch();
        toast({
            title: "Data Refreshed",
            description: "Valuation grouping codes have been updated successfully.",
        });
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
                        <h1 className="text-2xl font-bold">Valuation Grouping Codes</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage valuation grouping codes for material valuation
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Valuation Grouping Code
                    </Button>
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search valuation grouping codes..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    title="Refresh data"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Valuation Grouping Codes</CardTitle>
                    <CardDescription>
                        All registered valuation grouping codes
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
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No valuation grouping codes found. {searchQuery ? "Try a different search." : "Create your first code."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <TableRow key={item.id} className="cursor-pointer hover:bg-gray-50">
                                                <TableCell className="font-medium">{item.code}</TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{item.description || '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.active
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {item.active ? "Active" : "Inactive"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="More actions">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(item.id)}
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? "Edit Valuation Grouping Code" : "New Valuation Grouping Code"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem ? "Update the valuation grouping code details." : "Create a new valuation grouping code for material valuation."}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., VG01" maxLength={10} />
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
                                            <Input {...field} placeholder="e.g., Standard Valuation" />
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
                                            <Textarea {...field} placeholder="Optional description" rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active</FormLabel>
                                            <FormDescription>
                                                Make this valuation grouping code available for use
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingItem ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
