import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Hash } from "lucide-react";
import { useLocation } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
const numberRangeSchema = z.object({
  range_number: z.string().min(1, "Range number is required").max(10, "Range number must be 10 characters or less"),
  company_code_id: z.number().min(1, "Company code is required"),
  document_type: z.string().min(1, "Document type is required").max(10, "Document type must be 10 characters or less"),
  from_number: z.string().min(1, "From number is required").max(20, "From number must be 20 characters or less"),
  to_number: z.string().min(1, "To number is required").max(20, "To number must be 20 characters or less"),
  current_number: z.string().max(20, "Current number must be 20 characters or less"),
  external_numbering: z.boolean().default(false),
  number_length: z.number().min(1).max(20).default(10),
  prefix: z.string().max(10, "Prefix must be 10 characters or less").optional(),
  suffix: z.string().max(10, "Suffix must be 10 characters or less").optional(),
  fiscal_year: z.string().max(4, "Fiscal year must be 4 characters or less").optional(),
  fiscal_year_dependent: z.boolean().default(false),
  interval_warning: z.number().min(0).max(100).default(10),
  description: z.string().optional(),
  active: z.boolean().default(true)
});

type DocumentNumberRange = z.infer<typeof numberRangeSchema> & { id: number };

export default function DocumentNumberRanges() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<DocumentNumberRange | null>(null);
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const { data: numberRanges = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/document-number-ranges"],
  });

  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/company-codes"],
  });

  const form = useForm<z.infer<typeof numberRangeSchema>>({
    resolver: zodResolver(numberRangeSchema),
    defaultValues: {
      range_number: "",
      company_code_id: 0,
      document_type: "",
      from_number: "",
      to_number: "",
      current_number: "",
      external_numbering: false,
      number_length: 10,
      prefix: "",
      suffix: "",
      fiscal_year: "",
      fiscal_year_dependent: false,
      interval_warning: 10,
      description: "",
      active: true
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof numberRangeSchema>) =>
      apiRequest("/api/document-number-ranges", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-number-ranges"] });
      setOpen(false);
      setEditingRange(null);
      form.reset();
      toast({ title: "Success", description: "Document number range created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create document number range", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof numberRangeSchema>) =>
      apiRequest(`/api/document-number-ranges/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-number-ranges"] });
      setOpen(false);
      setEditingRange(null);
      form.reset();
      toast({ title: "Success", description: "Document number range updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update document number range", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/document-number-ranges/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-number-ranges"] });
      toast({ title: "Success", description: "Document number range deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to delete document number range", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof numberRangeSchema>) => {
    if (editingRange) {
      updateMutation.mutate({ id: editingRange.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (range: DocumentNumberRange) => {
    setEditingRange(range);
    form.reset(range);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingRange(null);
    form.reset();
    setOpen(true);
  };

  const documentTypes = [
    { value: "SA", label: "General Ledger" },
    { value: "DZ", label: "Payment Document" },
    { value: "KZ", label: "Vendor Payment" },
    { value: "DG", label: "Customer Payment" },
    { value: "AB", label: "Asset Document" },
    { value: "RV", label: "Invoice Document" },
    { value: "DR", label: "Customer Invoice" },
    { value: "KR", label: "Vendor Invoice" },
    { value: "RE", label: "Invoice Receipt" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/master-data")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Number Ranges</h1>
            <p className="text-muted-foreground">Configure automatic document numbering sequences</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Number Range
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRange ? "Edit Document Number Range" : "Create Document Number Range"}
                </DialogTitle>
                <DialogDescription>
                  Configure automatic numbering for document types
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="range_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Range Number</FormLabel>
                          <FormControl>
                            <Input placeholder="01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company_code_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companyCodes.map((companyCode: any) => (
                                <SelectItem key={companyCode.id} value={companyCode.id.toString()}>
                                  {companyCode.code} - {companyCode.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="document_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.value} - {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="from_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Number</FormLabel>
                          <FormControl>
                            <Input placeholder="0000000001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="to_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Number</FormLabel>
                          <FormControl>
                            <Input placeholder="9999999999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="current_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Number</FormLabel>
                          <FormControl>
                            <Input placeholder="0000000001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prefix (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="DOC" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="suffix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suffix (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="2024" {...field} />
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
                          <Input placeholder="Document number range description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRange ? "Update" : "Create"} Number Range
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hash className="h-5 w-5" />
            <span>Document Number Ranges</span>
          </CardTitle>
          <CardDescription>
            Manage automatic document numbering sequences for different document types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading document number ranges...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Range No.</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>From Number</TableHead>
                  <TableHead>To Number</TableHead>
                  <TableHead>Current Number</TableHead>
                  <TableHead>External</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numberRanges.map((range: DocumentNumberRange) => (
                  <TableRow key={range.id}>
                    <TableCell className="font-medium">{range.range_number}</TableCell>
                    <TableCell>{range.company_code_id}</TableCell>
                    <TableCell>{range.document_type}</TableCell>
                    <TableCell>{range.from_number}</TableCell>
                    <TableCell>{range.to_number}</TableCell>
                    <TableCell>{range.current_number}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        range.external_numbering ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {range.external_numbering ? 'External' : 'Internal'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        range.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {range.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(range)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(range.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}