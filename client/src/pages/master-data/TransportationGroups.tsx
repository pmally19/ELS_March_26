
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Types
type TransportationGroup = {
    id: number;
    code: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

// Form schema (ERP: code=4 chars, description=20 chars)
const formSchema = z.object({
    code: z.string()
        .min(1, "Code is required")
        .max(4, "Code must be maximum 4 characters")
        .regex(/^[A-Z0-9]+$/, "Code must be alphanumeric uppercase"),
    description: z.string()
        .min(1, "Description is required")
        .max(20, "Description must be maximum 20 characters"),
    isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function TransportationGroups() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TransportationGroup | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: "",
            description: "",
            isActive: true,
        },
    });

    // Fetch all transportation groups
    const { data: transportationGroups = [], isLoading } = useQuery<TransportationGroup[]>({
        queryKey: ["/api/master-data/transportation-groups"],
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await apiRequest("/api/master-data/transportation-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-groups"] });
            toast({ title: "Success", description: "Transportation Group created" });
            setIsDialogOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
            const response = await apiRequest(`/api/master-data/transportation-groups/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to update");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-groups"] });
            toast({ title: "Success", description: "Transportation Group updated" });
            setIsDialogOpen(false);
            setEditingItem(null);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/transportation-groups/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/transportation-groups"] });
            toast({ title: "Success", description: "Transportation Group deleted" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (data: FormData) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (item: TransportationGroup) => {
        setEditingItem(item);
        form.reset({
            code: item.code,
            description: item.description,
            isActive: item.isActive,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this transportation group?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
        form.reset();
    };

    // Filter transportation groups
    const filteredGroups = transportationGroups.filter((group) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            group.code?.toLowerCase().includes(search) ||
            group.description?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => window.location.href = '/master-data'}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Truck className="h-6 w-6" />
                                    Transportation Groups
                                </CardTitle>
                                <CardDescription>
                                    Define transportation groups for material logistics (ERP)
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            New Group
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by code or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredGroups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            No transportation groups found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredGroups.map((group) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">{group.code}</TableCell>
                                            <TableCell>{group.description}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={group.isActive ? "default" : "secondary"}>
                                                    {group.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(group)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(group.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? "Edit Transportation Group" : "Create Transportation Group"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? "Update transportation group details"
                                : "Add a new transportation group (ERP)"}
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
                                            <Input
                                                {...field}
                                                maxLength={4}
                                                placeholder="0001"
                                                disabled={!!editingItem}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
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
                                        <FormLabel>Description *</FormLabel>
                                        <FormControl>
                                            <Input {...field} maxLength={20} placeholder="On Pallets" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Active
                                            </FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                This group is active and available for use
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={handleDialogClose}>
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
