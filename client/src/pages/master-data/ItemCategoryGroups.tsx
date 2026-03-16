import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Edit, Trash2, RefreshCw, MoreHorizontal, Download, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";

// Define Item Category Group type
type ItemCategoryGroup = {
    id: number;
    group_code: string;
    group_name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

// Validation schema
const itemCategoryGroupSchema = z.object({
    group_code: z.string().min(1, "Code is required").max(4, "Code must be 4 characters or less"),
    group_name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});

type ItemCategoryGroupFormData = z.infer<typeof itemCategoryGroupSchema>;

export default function ItemCategoryGroups() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<ItemCategoryGroup | null>(null);

    // Fetch all item category groups
    const { data: groups = [], isLoading, refetch } = useQuery<ItemCategoryGroup[]>({
        queryKey: ["/api/master-data/item-category-groups"],
        queryFn: async () => {
            const response = await apiRequest("/api/master-data/item-category-groups");
            return response.json();
        },
    });

    // Create form
    const createForm = useForm<ItemCategoryGroupFormData>({
        resolver: zodResolver(itemCategoryGroupSchema),
        defaultValues: {
            group_code: "",
            group_name: "",
            description: "",
            is_active: true,
        },
    });

    // Edit form
    const editForm = useForm<ItemCategoryGroupFormData>({
        resolver: zodResolver(itemCategoryGroupSchema),
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: ItemCategoryGroupFormData) =>
            fetch("/api/master-data/item-category-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to create");
                return res.json();
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Item category group created successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/item-category-groups"] });
            setIsCreateDialogOpen(false);
            createForm.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: ItemCategoryGroupFormData & { id: number }) =>
            fetch(`/api/master-data/item-category-groups/${data.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to update");
                return res.json();
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Item category group updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/item-category-groups"] });
            setIsEditDialogOpen(false);
            setSelectedGroup(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            fetch(`/api/master-data/item-category-groups/${id}`, {
                method: "DELETE",
            }).then((res) => {
                if (!res.ok) throw new Error("Failed to delete");
                return res.json();
            }),
        onSuccess: () => {
            toast({ title: "Success", description: "Item category group deleted successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/item-category-groups"] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Filtered groups
    const filteredGroups = groups.filter((group) => {
        const query = searchQuery.toLowerCase();
        return (
            group.group_code.toLowerCase().includes(query) ||
            group.group_name.toLowerCase().includes(query) ||
            (group.description && group.description.toLowerCase().includes(query))
        );
    });

    // Handlers
    const handleCreate = () => {
        createForm.reset();
        setIsCreateDialogOpen(true);
    };

    const handleEdit = (group: ItemCategoryGroup) => {
        setSelectedGroup(group);
        editForm.reset({
            group_code: group.group_code,
            group_name: group.group_name,
            description: group.description || "",
            is_active: group.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const handleView = (group: ItemCategoryGroup) => {
        setSelectedGroup(group);
        setIsViewDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this item category group?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExportCSV = () => {
        const headers = ["Code", "Name", "Description", "Active", "Created At"];
        const rows = filteredGroups.map((g) => [
            g.group_code,
            g.group_name,
            g.description || "",
            g.is_active ? "Yes" : "No",
            new Date(g.created_at).toLocaleDateString(),
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `item-category-groups-${new Date().toISOString()}.csv`;
        a.click();
    };

    const onCreateSubmit = (data: ItemCategoryGroupFormData) => {
        createMutation.mutate(data);
    };

    const onEditSubmit = (data: ItemCategoryGroupFormData) => {
        if (selectedGroup) {
            updateMutation.mutate({ ...data, id: selectedGroup.id });
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/master-data")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Item Category Groups</h1>
                        <p className="text-muted-foreground">Manage item category groups for sales document processing</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Group
                    </Button>
                </div>
            </div>

            {/* Search and Actions */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by code, name, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetch()}>
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Item Category Groups ({filteredGroups.length})</CardTitle>
                    <CardDescription>Classify materials for sales document item category determination</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredGroups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No item category groups found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredGroups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-mono font-medium">{group.group_code}</TableCell>
                                        <TableCell>{group.group_name}</TableCell>
                                        <TableCell className="max-w-md truncate">{group.description || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={group.is_active ? "default" : "secondary"}>
                                                {group.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleView(group)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(group)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(group.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
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
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Item Category Group</DialogTitle>
                        <DialogDescription>Add a new item category group for sales processing</DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={createForm.control}
                                    name="group_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Group Code *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., NORM" maxLength={4} className="uppercase"
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="group_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Group Name *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., Standard Item" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={createForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Describe this item category group..." rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div>
                                            <FormLabel>Active Status</FormLabel>
                                            <FormControl className="ml-4">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Item Category Group</DialogTitle>
                        <DialogDescription>Update item category group information</DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name="group_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Group Code *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., NORM" maxLength={4} className="uppercase"
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="group_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Group Name *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., Standard Item" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Describe this item category group..." rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div>
                                            <FormLabel>Active Status</FormLabel>
                                            <FormControl className="ml-4">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Updating..." : "Update"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Item Category Group Details</DialogTitle>
                    </DialogHeader>
                    {selectedGroup && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Group Code</label>
                                    <p className="text-lg font-mono font-semibold">{selectedGroup.group_code}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Group Name</label>
                                    <p className="text-lg">{selectedGroup.group_name}</p>
                                </div>
                            </div>
                            {selectedGroup.description && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <p className="text-sm">{selectedGroup.description}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">
                                    <Badge variant={selectedGroup.is_active ? "default" : "secondary"}>
                                        {selectedGroup.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                                    <p className="text-sm">{new Date(selectedGroup.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                                    <p className="text-sm">{new Date(selectedGroup.updated_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
