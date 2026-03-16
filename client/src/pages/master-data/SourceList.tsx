import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/apiClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, Anchor } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Types
interface Vendor { id: number; vendor_code?: string; code?: string; name: string; isActive: boolean; }
interface Material { id: number; code?: string; material_code?: string; name?: string; description?: string; material_type?: string; type?: string; }
interface Plant { id: number; code: string; name: string; }

interface SourceListType {
    id: number;
    materialId: number;
    materialCode: string;
    materialName: string;
    plantId: number | null;
    plantCode: string | null;
    vendorId: number;
    vendorCode: string;
    vendorName: string;
    validFrom: string;
    validTo: string;
    isFixed: boolean;
    isBlocked: boolean;
    isActive: boolean;
    notes: string;
}

// Validation schema
const sourceListFormSchema = z.object({
    materialId: z.number().min(1, "Material is required"),
    plantId: z.number().optional().nullable(),
    vendorId: z.number().min(1, "Vendor is required"),
    validFrom: z.string().min(1, "Valid From is required"),
    validTo: z.string().min(1, "Valid To is required"),
    isFixed: z.boolean().default(false),
    isBlocked: z.boolean().default(false),
    notes: z.string().optional(),
});

type SourceListFormData = z.infer<typeof sourceListFormSchema>;

export default function SourceList() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch data
    const { data: sourceLists = [] as SourceListType[], isLoading: isLoadingSL } = useQuery<SourceListType[]>({
        queryKey: ['/api/master-data/source-lists'],
        queryFn: () => apiRequest<SourceListType[]>('/api/master-data/source-lists', 'GET'),
    });

    const { data: materials = [] as Material[] } = useQuery<Material[]>({
        queryKey: ['/api/materials'],
        queryFn: () => apiRequest<Material[]>('/api/materials', 'GET'),
    });

    const { data: vendorsResponse = [] as any[] } = useQuery<any[]>({
        queryKey: ['/api/master-data/vendor'],
        queryFn: () => apiRequest('/api/master-data/vendor', 'GET'),
    });

    // Format vendors to unify code field
    const vendors: Vendor[] = vendorsResponse.map(v => ({
        ...v,
        code: v.vendor_code || v.code || '',
    })).filter(v => v.isActive !== false);

    const { data: plants = [] as Plant[] } = useQuery<Plant[]>({
        queryKey: ['/api/master-data/plant'],
        queryFn: () => apiRequest<Plant[]>('/api/master-data/plant', 'GET'),
    });

    // Filter
    const filteredLists = sourceLists.filter(sl =>
        (sl.materialCode?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (sl.vendorName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (sl.plantCode?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    // Form setup
    const form = useForm<SourceListFormData>({
        resolver: zodResolver(sourceListFormSchema),
        defaultValues: {
            materialId: undefined,
            plantId: undefined,
            vendorId: undefined,
            validFrom: format(new Date(), "yyyy-MM-dd"),
            validTo: "9999-12-31",
            isFixed: false,
            isBlocked: false,
            notes: "",
        },
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: SourceListFormData) => apiRequest('/api/master-data/source-lists', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/source-lists'] });
            toast({ title: "Success", description: "Source list entry created successfully" });
            setIsDialogOpen(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to create source list", variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest(`/api/master-data/source-lists/${id}`, 'DELETE'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/source-lists'] });
            toast({ title: "Success", description: "Source list entry removed" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to delete source list", variant: "destructive" });
        }
    });

    const onSubmit = (data: SourceListFormData) => {
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Anchor className="h-5 w-5 text-blue-600" />
                        Source List Management
                    </h2>
                    <p className="text-gray-500 text-sm">Manage approved and blocked vendors for materials</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Selection
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl px-6">
                        <DialogHeader>
                            <DialogTitle>Add Source List Record</DialogTitle>
                            <DialogDescription>Define sourcing rules for a material.</DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="materialId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Material *</FormLabel>
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Material" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {materials.map((m) => {
                                                            const displayCode = m.material_code || m.code || "N/A";
                                                            const displayName = m.name || m.description || "Unknown Material";
                                                            return (
                                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                                    {displayCode} - {displayName}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="plantId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Plant (Optional)</FormLabel>
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Global (All Plants)" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="0" disabled className="text-muted-foreground hidden">Global (All Plants)</SelectItem>
                                                        {plants.map((p) => (
                                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                                {p.code} - {p.name}
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
                                        name="vendorId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vendor *</FormLabel>
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Vendor" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {vendors.map((v) => (
                                                            <SelectItem key={v.id} value={v.id.toString()}>
                                                                {v.code} - {v.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-4 col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="validFrom"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Valid From *</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="validTo"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Valid To *</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="col-span-2 flex gap-8 items-center mt-2 border p-4 border-gray-100 rounded-md bg-gray-50">
                                        <FormField
                                            control={form.control}
                                            name="isFixed"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <FormLabel className="font-medium cursor-pointer text-green-700">Fixed Vendor (Preferred)</FormLabel>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="isBlocked"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <FormLabel className="font-medium cursor-pointer text-red-600">Blocked Vendor (Don't order)</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Optional info..." {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Saving..." : "Save Selection"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Sourcing Rules</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Material or Vendor..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Plant</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Valid From</TableHead>
                                    <TableHead>Valid To</TableHead>
                                    <TableHead>Fixed</TableHead>
                                    <TableHead>Blocked</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingSL ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                                ) : filteredLists.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No source records found</TableCell></TableRow>
                                ) : (
                                    filteredLists.map((sl) => (
                                        <TableRow key={sl.id}>
                                            <TableCell className="font-medium">
                                                {sl.materialCode} <span className="text-xs text-gray-500 block">{sl.materialName}</span>
                                            </TableCell>
                                            <TableCell>{sl.plantCode || <span className="text-gray-400 italic">Global</span>}</TableCell>
                                            <TableCell>
                                                {sl.vendorCode} <span className="text-xs text-gray-500 block">{sl.vendorName}</span>
                                            </TableCell>
                                            <TableCell>{sl.validFrom}</TableCell>
                                            <TableCell>{sl.validTo === '9999-12-31' ? 'Indefinite' : sl.validTo}</TableCell>
                                            <TableCell>
                                                {sl.isFixed && <Badge className="bg-green-100 text-green-800 border-green-200">Fixed</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                {sl.isBlocked && <Badge className="bg-red-100 text-red-800 border-red-200">Blocked</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to remove this sourcing rule?")) {
                                                            deleteMutation.mutate(sl.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
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
