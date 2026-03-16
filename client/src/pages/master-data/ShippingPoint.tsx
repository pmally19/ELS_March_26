import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Download, RefreshCw, MoreHorizontal, Eye, Factory, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as XLSX from 'xlsx';

const shippingPointSchema = z.object({
    code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    plantCode: z.string().min(1, "Plant Code is required"),
    factoryCalendar: z.string().optional(),
});

type ShippingPoint = {
    id: number;
    code: string;
    name: string;
    plantCode: string;
    factoryCalendar?: string | null;
    createdAt: string;
    updatedAt: string;
};

export default function ShippingPoint() {
    const [showDialog, setShowDialog] = useState(false);
    const [editingShippingPoint, setEditingShippingPoint] = useState<ShippingPoint | null>(null);
    const [viewingShippingPoint, setViewingShippingPoint] = useState<ShippingPoint | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof shippingPointSchema>>({
        resolver: zodResolver(shippingPointSchema),
        defaultValues: {
            code: "",
            name: "",
            plantCode: "",
            factoryCalendar: "",
        },
    });

    // Fetch shipping points
    const { data: shippingPoints = [], isLoading, refetch } = useQuery<ShippingPoint[]>({
        queryKey: ['/api/master-data/shipping-point'],
        retry: 1,
    });

    // Fetch plants for dropdown
    const { data: plants = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/plant'],
        retry: 1,
    });

    // Fetch factory calendars for dropdown
    const { data: factoryCalendars = [] } = useQuery<any[]>({
        queryKey: ['/api/factory-calendars'],
        queryFn: async () => {
            const response = await fetch('/api/factory-calendars', {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch factory calendars');
            return response.json();
        },
        retry: 1,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: z.infer<typeof shippingPointSchema>) => {
            return await apiRequest('/api/master-data/shipping-point', { method: 'POST', body: JSON.stringify(data) });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Shipping point created successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/shipping-point'] });
            closeDialog();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to create shipping point", variant: "destructive" });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof shippingPointSchema> }) => {
            return await apiRequest(`/api/master-data/shipping-point/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Shipping point updated successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/shipping-point'] });
            closeDialog();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to update shipping point", variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiRequest(`/api/master-data/shipping-point/${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Shipping point deleted successfully" });
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/shipping-point'] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to delete shipping point", variant: "destructive" });
        },
    });

    const handleRefresh = () => {
        refetch();
        toast({ title: "Refreshed", description: "Data has been refreshed" });
    };

    const onSubmit = (data: z.infer<typeof shippingPointSchema>) => {
        if (editingShippingPoint) {
            updateMutation.mutate({ id: editingShippingPoint.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const closeDialog = () => {
        setShowDialog(false);
        setEditingShippingPoint(null);
        form.reset({
            code: "",
            name: "",
            plantCode: "",
            factoryCalendar: "",
        });
    };

    const handleEdit = (sp: ShippingPoint) => {
        setEditingShippingPoint(sp);
        form.reset({
            code: sp.code,
            name: sp.name,
            plantCode: sp.plantCode,
            factoryCalendar: sp.factoryCalendar || "",
        });
        setShowDialog(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this shipping point?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExport = () => {
        const exportData = filteredShippingPoints.map(sp => ({
            Code: sp.code,
            Name: sp.name,
            'Plant Code': sp.plantCode,
            'Factory Calendar': sp.factoryCalendar || '-',
            'Created At': new Date(sp.createdAt).toLocaleDateString(),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Shipping Points');
        XLSX.writeFile(wb, `shipping-points-${new Date().toISOString().split('T')[0]}.xlsx`);

        toast({ title: "Exported", description: "Shipping points exported to Excel successfully" });
    };

    // Filter shipping points based on search query
    const filteredShippingPoints = shippingPoints.filter(sp => {
        const query = searchQuery.toLowerCase();
        return (
            sp.code.toLowerCase().includes(query) ||
            sp.name.toLowerCase().includes(query) ||
            sp.plantCode.toLowerCase().includes(query) ||
            (sp.factoryCalendar && sp.factoryCalendar.toLowerCase().includes(query))
        );
    });

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shipping Points</h1>
                    <p className="text-muted-foreground mt-1">Manage shipping points for plant logistics</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={filteredShippingPoints.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Shipping Point
                    </Button>
                </div>
            </div>

            {/* Search and Stats Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Shipping Points List</CardTitle>
                            <CardDescription>
                                {filteredShippingPoints.length} shipping point{filteredShippingPoints.length !== 1 ? 's' : ''} found
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search shipping points..."
                                    className="pl-8 w-[300px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Plant Code</TableHead>
                                    <TableHead>Factory Calendar</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <div className="flex items-center justify-center">
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Loading...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredShippingPoints.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? "No shipping points match your search" : "No shipping points found. Create one to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredShippingPoints.map((sp) => (
                                        <TableRow key={sp.id}>
                                            <TableCell className="font-medium">
                                                <Badge variant="outline">{sp.code}</Badge>
                                            </TableCell>
                                            <TableCell>{sp.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Factory className="h-3 w-3 text-muted-foreground" />
                                                    {sp.plantCode}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {sp.factoryCalendar ? (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        {sp.factoryCalendar}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setViewingShippingPoint(sp)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(sp)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(sp.id)}
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
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingShippingPoint ? "Edit" : "Create"} Shipping Point</DialogTitle>
                        <DialogDescription>
                            {editingShippingPoint ? "Update" : "Add"} shipping point information
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="code" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code*</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!!editingShippingPoint} placeholder="e.g., SP001" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name*</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., Main Warehouse Shipping" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="plantCode" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plant*</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select plant" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {plants.map((plant: any) => (
                                                <SelectItem key={plant.code} value={plant.code}>
                                                    {plant.code} - {plant.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Select the plant this shipping point belongs to</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="factoryCalendar" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Factory Calendar</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select factory calendar (optional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {factoryCalendars.length === 0 ? (
                                                <SelectItem value="no-calendars" disabled>No factory calendars available</SelectItem>
                                            ) : (
                                                factoryCalendars.map((calendar: any) => (
                                                    <SelectItem
                                                        key={calendar.factory_calendar_id || calendar.id}
                                                        value={calendar.factory_calendar_id || calendar.calendar_code || calendar.id}
                                                    >
                                                        {calendar.calendar_code} - {calendar.description}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Factory calendar for working days and holidays</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingShippingPoint ? "Update" : "Create")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={!!viewingShippingPoint} onOpenChange={() => setViewingShippingPoint(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Shipping Point Details</DialogTitle>
                        <DialogDescription>View shipping point information</DialogDescription>
                    </DialogHeader>
                    {viewingShippingPoint && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500">Code</Label>
                                    <p className="font-semibold">{viewingShippingPoint.code}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">Name</Label>
                                    <p>{viewingShippingPoint.name}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500">Plant Code</Label>
                                    <p className="flex items-center gap-1">
                                        <Factory className="h-3 w-3 text-muted-foreground" />
                                        {viewingShippingPoint.plantCode}
                                    </p>
                                </div>
                                {viewingShippingPoint.factoryCalendar && (
                                    <div>
                                        <Label className="text-gray-500">Factory Calendar</Label>
                                        <p className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {viewingShippingPoint.factoryCalendar}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 border-t">
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div>
                                        <Label className="text-gray-500">Created</Label>
                                        <p>{new Date(viewingShippingPoint.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-gray-500">Last Updated</Label>
                                        <p>{new Date(viewingShippingPoint.updatedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
