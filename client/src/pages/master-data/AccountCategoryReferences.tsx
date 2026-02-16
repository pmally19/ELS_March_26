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

// Define the Account Category Reference type
type AccountCategoryReference = {
    id: number;
    code: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

// Form Schema
const schema = z.object({
    code: z.string().min(1, "Code is required").max(10, "Code must be at most 10 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

// Account Category Reference Management Page
export default function AccountCategoryReferences() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<AccountCategoryReference | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch data
    const { data: items = [], isLoading, refetch } = useQuery<AccountCategoryReference[]>({
        queryKey: ["/api/master-data/account-category-references"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/account-category-references");
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
            isActive: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingItem) {
            form.reset({
                code: editingItem.code,
                name: editingItem.name,
                description: editingItem.description || "",
                isActive: editingItem.isActive,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                isActive: true,
            });
        }
    }, [editingItem, form]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: z.infer<typeof schema>) => {
            return apiRequest(`/api/master-data/account-category-references`, {
                method: "POST",
                body: JSON.stringify(data)
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Account Category Reference created successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-category-references"] });
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create Account Category Reference",
                variant: "destructive",
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: number; values: z.infer<typeof schema> }) => {
            return apiRequest(`/api/master-data/account-category-references/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.values),
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Account Category Reference updated successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-category-references"] });
            setShowDialog(false);
            setEditingItem(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update Account Category Reference",
                variant: "destructive",
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/account-category-references/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Account Category Reference deleted successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/account-category-references"] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete Account Category Reference",
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
    const handleEdit = (item: AccountCategoryReference) => {
        setEditingItem(item);
        setShowDialog(true);
    };

    // Function to handle deleting
    const handleDelete = (id: number) => {
        if (window.confirm("Are you sure you want to delete this Account Category Reference?")) {
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
            description: "Account category references have been updated successfully.",
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
                        <h1 className="text-2xl font-bold">Account Category References</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage account category references for material valuation
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Account Category Reference
                    </Button>
                </div>
            </div>

            {/* Search Bar with Refresh Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search account category references..."
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
                    <CardTitle>Account Category References</CardTitle>
                    <CardDescription>
                        All registered account category references for material valuation
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
                                                No account category references found. {searchQuery ? "Try a different search." : "Create your first reference."}
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
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.isActive
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {item.isActive ? "Active" : "Inactive"}
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
                            {editingItem ? "Edit Account Category Reference" : "New Account Category Reference"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem ? "Update the account category reference details." : "Create a new account category reference for material valuation."}
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
                                            <Input {...field} placeholder="e.g., 0001" maxLength={10} disabled={!!editingItem} />
                                        </FormControl>
                                        <FormDescription>
                                            Unique reference code (e.g., 0001, 0002)
                                        </FormDescription>
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
                                            <Input {...field} placeholder="e.g., Standard Materials" />
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
                                name="isActive"
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
                                                Make this account category reference available for use
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
