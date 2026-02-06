import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
    code: z.string().min(1, "Code is required").max(2, "Code must be max 2 characters"),
    name: z.string().min(1, "Name is required").max(50, "Name must be max 50 characters"),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface CustomerAccountAssignmentGroup {
    id: number;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// UI Components
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Download, RefreshCw, MoreHorizontal, Globe } from "lucide-react";

export default function CustomerAccountAssignmentGroups() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CustomerAccountAssignmentGroup | null>(null);
    const [viewingItem, setViewingItem] = useState<CustomerAccountAssignmentGroup | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const { data: items = [], isLoading, refetch, isRefetching } = useQuery<CustomerAccountAssignmentGroup[]>({
        queryKey: ["/api/master-data/customer-account-assignment-groups"],
    });

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            isActive: true,
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const res = await apiRequest(
                "/api/master-data/customer-account-assignment-groups",
                {
                    method: "POST",
                    body: data as unknown as BodyInit,
                }
            );
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-account-assignment-groups"] });
            toast({ title: "Success", description: "Created successfully" });
            setIsDialogOpen(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
            const res = await apiRequest(
                `/api/master-data/customer-account-assignment-groups/${id}`,
                {
                    method: "PUT",
                    body: data as unknown as BodyInit,
                }
            );
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-account-assignment-groups"] });
            toast({ title: "Success", description: "Updated successfully" });
            setIsDialogOpen(false);
            setEditingItem(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest(
                `/api/master-data/customer-account-assignment-groups/${id}`,
                { method: "DELETE" }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/customer-account-assignment-groups"] });
            toast({ title: "Success", description: "Deleted successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: FormData) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (item: CustomerAccountAssignmentGroup) => {
        setEditingItem(item);
        form.reset({
            code: item.code,
            name: item.name,
            description: item.description || "",
            isActive: item.isActive,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this item?")) {
            deleteMutation.mutate(id);
        }
    };

    const filteredItems = items.filter(
        (item) =>
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleRefresh = async () => {
        await refetch();
        toast({
            title: "Refreshed",
            description: "Data refreshed successfully",
        });
    };

    const handleExport = () => {
        if (filteredItems.length === 0) {
            toast({
                title: "No Data",
                description: "Nothing to export",
                variant: "destructive",
            });
            return;
        }
        const csvContent = [
            "Code,Name,Description,Status",
            ...filteredItems.map(item => `"${item.code}","${item.name}","${item.description || ''}","${item.isActive ? 'Active' : 'Inactive'}"`)
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'customer_assignment_groups.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openDetails = (item: CustomerAccountAssignmentGroup) => {
        setViewingItem(item);
        setIsDetailsOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Customer Account Assignment Groups</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage customer revenue account determination groups
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Group
                    </Button>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search groups..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isLoading || isRefetching}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assignment Groups</CardTitle>
                    <CardDescription>
                        List of all customer account assignment groups
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No assignment groups found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => openDetails(item)}
                                        >
                                            <TableCell className="font-medium">{item.code}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell>
                                                {item.isActive ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-none">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openDetails(item)}>
                                                            <Globe className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(item.id)}
                                                            className="text-red-600 focus:text-red-600"
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
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setEditingItem(null);
                    form.reset({
                        code: "",
                        name: "",
                        description: "",
                        isActive: true,
                    });
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit Group" : "Add Group"}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? "Update the details of the assignment group." : "Create a new customer account assignment group."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="01" maxLength={2} disabled={!!editingItem} />
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
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Domestic Revenues" />
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
                                            <Input {...field} placeholder="Optional description" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Active Status</FormLabel>
                                            <FormDescription>
                                                Is this group available for use?
                                            </FormDescription>
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
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    {editingItem ? "Save Changes" : "Save"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Group Details</DialogTitle>
                        <DialogDescription>
                            Detailed view of the assignment group
                        </DialogDescription>
                    </DialogHeader>
                    {viewingItem && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">Code</h4>
                                    <p>{viewingItem.code}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                                    <Badge variant={viewingItem.isActive ? "default" : "secondary"}>
                                        {viewingItem.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">Name</h4>
                                    <p>{viewingItem.name}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
                                    <p>{viewingItem.description || "-"}</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                                <Button onClick={() => {
                                    setIsDetailsOpen(false);
                                    handleEdit(viewingItem);
                                }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
