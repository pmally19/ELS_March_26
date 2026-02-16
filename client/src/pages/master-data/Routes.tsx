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
import { Plus, Search, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Types
type Route = {
    id: number;
    routeCode: string;
    description: string;
    isActive: boolean;
};

// Form schema
const formSchema = z.object({
    routeCode: z.string()
        .min(1, "Route Code is required")
        .max(6, "Route Code must be maximum 6 characters")
        .regex(/^[A-Z0-9]+$/, "Route Code must be alphanumeric uppercase"),
    description: z.string()
        .min(1, "Description is required")
        .max(40, "Description must be maximum 40 characters"),
    isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function Routes() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Route | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            routeCode: "",
            description: "",
            isActive: true,
        },
    });

    // Fetch all routes
    const { data: routes = [], isLoading } = useQuery<Route[]>({
        queryKey: ["/api/master-data/routes"],
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await apiRequest("/api/master-data/routes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/routes"] });
            toast({ title: "Success", description: "Route created successfully" });
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
            const response = await apiRequest(`/api/master-data/routes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to update");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/routes"] });
            toast({ title: "Success", description: "Route updated successfully" });
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
            const response = await apiRequest(`/api/master-data/routes/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/routes"] });
            toast({ title: "Success", description: "Route deleted successfully" });
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

    const handleEdit = (item: Route) => {
        setEditingItem(item);
        form.reset({
            routeCode: item.routeCode,
            description: item.description,
            isActive: item.isActive,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this route?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
        form.reset();
    };

    // Filter routes
    const filteredRoutes = routes.filter((route) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            route.routeCode?.toLowerCase().includes(search) ||
            route.description?.toLowerCase().includes(search)
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
                                <CardTitle>Routes</CardTitle>
                                <CardDescription>
                                    Define standard shipping routes and durations
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            New Route
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
                                    <TableHead className="w-[150px]">Route Code</TableHead>
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
                                ) : filteredRoutes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            No routes found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRoutes.map((route) => (
                                        <TableRow key={route.id}>
                                            <TableCell className="font-medium">{route.routeCode}</TableCell>
                                            <TableCell>{route.description}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={route.isActive ? "default" : "secondary"}>
                                                    {route.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(route)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(route.id)}
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
                            {editingItem ? "Edit Route" : "Create New Route"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? "Update route details"
                                : "Add a new route definition"}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="routeCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Route Code *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                maxLength={6}
                                                placeholder="R00001"
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
                                            <Input {...field} maxLength={40} placeholder="Standard Route" />
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
                                                This route is active and available for use
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
