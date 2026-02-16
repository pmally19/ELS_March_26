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
type ShippingConditionKey = {
    id: number;
    keyCode: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

// Form schema (ERP Standard: key=3 chars, description=20 chars)
const formSchema = z.object({
    key_code: z.string()
        .min(1, "Key code is required")
        .max(3, "Key code must be maximum 3 characters")
        .regex(/^[A-Z0-9]+$/, "Key code must be alphanumeric uppercase"),
    description: z.string()
        .min(1, "Description is required")
        .max(20, "Description must be maximum 20 characters"),
    is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function ShippingConditionKeys() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShippingConditionKey | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            key_code: "",
            description: "",
            is_active: true,
        },
    });

    // Fetch all shipping condition keys
    const { data: conditionKeys = [], isLoading } = useQuery<ShippingConditionKey[]>({
        queryKey: ["/api/master-data/shipping-condition-keys"],
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await apiRequest("/api/master-data/shipping-condition-keys", {
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
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/shipping-condition-keys"] });
            toast({ title: "Success", description: "Shipping Condition Key created" });
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
            const response = await apiRequest(`/api/master-data/shipping-condition-keys/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to update");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/shipping-condition-keys"] });
            toast({ title: "Success", description: "Shipping Condition Key updated" });
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
            const response = await apiRequest(`/api/master-data/shipping-condition-keys/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/shipping-condition-keys"] });
            toast({ title: "Success", description: "Shipping Condition Key deleted" });
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

    const handleEdit = (item: ShippingConditionKey) => {
        setEditingItem(item);
        form.reset({
            key_code: item.keyCode,
            description: item.description,
            is_active: item.isActive,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this shipping condition key?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
        form.reset();
    };

    // Filter shipping condition keys
    const filteredKeys = conditionKeys.filter((key) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            key.keyCode?.toLowerCase().includes(search) ||
            key.description?.toLowerCase().includes(search)
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
                                <CardTitle>Shipping Condition Keys </CardTitle>
                                <CardDescription>
                                    Define shipping condition key codes (ERP Standard: Key=3 chars, Description=20 chars)
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            New Shipping Condition Key
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
                                ) : filteredKeys.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            No shipping condition keys found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredKeys.map((key) => (
                                        <TableRow key={key.id}>
                                            <TableCell className="font-medium">{key.keyCode}</TableCell>
                                            <TableCell>{key.description}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={key.isActive ? "default" : "secondary"}>
                                                    {key.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(key)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(key.id)}
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
                            {editingItem ? "Edit Shipping Condition Key" : "Create Shipping Condition Key"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? "Update shipping condition key details"
                                : "Add a new shipping condition key (Key: 3 chars, Description: 20 chars)"}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="key_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Key Code *</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                maxLength={3}
                                                placeholder="EXP"
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
                                            <Input {...field} maxLength={20} placeholder="Express Shipping" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
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
                                                This shipping condition key is active and available for use
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
