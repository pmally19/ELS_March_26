import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Search, ArrowLeft, Target, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const accessSequenceSchema = z.object({
  sequence_code: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, "Only uppercase letters and numbers"),
  sequence_name: z.string().min(3).max(100),
  condition_type_code: z.string().min(2).max(10),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

const sequenceStepSchema = z.object({
  table_number: z.string().min(1).max(10),
  step_number: z.number().min(1).max(999),
  field_combination: z.string().min(1),
  description: z.string().optional(),
  is_exclusive: z.boolean().default(false)
});

type AccessSequence = z.infer<typeof accessSequenceSchema> & {
  id?: number;
  company_code_id?: number;
  steps?: any[];
};

type SequenceStep = z.infer<typeof sequenceStepSchema> & {
  id?: number;
  access_sequence_id?: number;
};

export default function AccessSequences() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<AccessSequence | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<string>("");
  const [showStepDialog, setShowStepDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AccessSequence>({
    resolver: zodResolver(accessSequenceSchema),
    defaultValues: {
      sequence_code: "",
      sequence_name: "",
      condition_type_code: "",
      description: "",
      is_active: true
    }
  });

  // Fetch access sequences
  const { data: sequences, isLoading } = useQuery({
    queryKey: ['/api/access-sequences'],
  });

  // Fetch condition types for assignment
  const { data: conditionTypes } = useQuery({
    queryKey: ['/api/condition-types', 'DOM01'],
  });

  // Create/Update sequence mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (data: AccessSequence) => {
      if (editingSequence?.id) {
        return apiRequest(`/api/access-sequences/${editingSequence.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest('/api/access-sequences', {
          method: 'POST',
          body: JSON.stringify({...data, company_code: 'DOM01'}),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access-sequences'] });
      setIsDialogOpen(false);
      setEditingSequence(null);
      form.reset();
      toast({
        title: "Success",
        description: `Access sequence ${editingSequence ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save access sequence",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AccessSequence) => {
    createUpdateMutation.mutate(data);
  };

  const handleEdit = (sequence: AccessSequence) => {
    setEditingSequence(sequence);
    form.reset(sequence);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingSequence(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // MallyERP standard access sequences
  const standardSequences = [
    {
      code: "STDCUST",
      name: "Customer Pricing",
      condition: "CDIS01",
      description: "Customer group discount determination",
      steps: [
        { step: 1, table: "001", fields: "Customer + Material", description: "Customer-specific material price", exclusive: true },
        { step: 2, table: "002", fields: "Customer Group + Material Group", description: "Customer group + material group", exclusive: false },
        { step: 3, table: "003", fields: "Customer Group", description: "General customer group discount", exclusive: false }
      ]
    },
    {
      code: "STDVOL",
      name: "Volume Pricing", 
      condition: "CDIS02",
      description: "Volume discount determination",
      steps: [
        { step: 1, table: "010", fields: "Customer + Material + Quantity", description: "Customer-specific volume pricing", exclusive: true },
        { step: 2, table: "011", fields: "Material + Quantity", description: "General volume pricing", exclusive: false },
        { step: 3, table: "012", fields: "Material Group + Quantity", description: "Material group volume discount", exclusive: false }
      ]
    },
    {
      code: "STDTAX",
      name: "Tax Determination",
      condition: "TAX01", 
      description: "Sales tax calculation sequence",
      steps: [
        { step: 1, table: "020", fields: "Customer + Material + Tax Classification", description: "Specific tax override", exclusive: true },
        { step: 2, table: "021", fields: "Customer Country + Material Tax Category", description: "Country-specific tax rate", exclusive: false },
        { step: 3, table: "022", fields: "Tax Jurisdiction", description: "Standard tax rate", exclusive: false }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/sales/pricing-procedures">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Procedures
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Access Sequences</h1>
            <p className="text-muted-foreground">Define where the system searches for condition values</p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Sequence
        </Button>
      </div>

      {/* Concept Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Access Sequence Concept
          </CardTitle>
          <CardDescription>
            Access sequences control the search strategy for finding condition values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Step 1: Specific</span>
                </div>
                <p className="text-sm text-muted-foreground">Customer ABC + Material XYZ = $10 discount</p>
                <Badge variant="default" className="mt-2">Highest Priority</Badge>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Step 2: Group</span>
                </div>
                <p className="text-sm text-muted-foreground">Customer Group A + Material Group 1 = $5 discount</p>
                <Badge variant="outline" className="mt-2">Medium Priority</Badge>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">Step 3: General</span>
                </div>
                <p className="text-sm text-muted-foreground">All customers = $2 discount</p>
                <Badge variant="secondary" className="mt-2">Fallback</Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Standard Access Sequences */}
      <Card>
        <CardHeader>
          <CardTitle>MallyERP Standard Access Sequences</CardTitle>
          <CardDescription>
            Pre-configured access sequences for common pricing scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {standardSequences.map((sequence) => (
              <Card key={sequence.code} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="font-mono text-blue-600">{sequence.code}</span>
                        <span>→</span>
                        <span className="font-mono text-green-600">{sequence.condition}</span>
                      </CardTitle>
                      <p className="text-sm font-medium">{sequence.name}</p>
                      <p className="text-xs text-muted-foreground">{sequence.description}</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sequence.steps.map((step) => (
                      <div key={step.step} className="flex items-center justify-between text-sm p-3 border rounded bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">{step.step}</span>
                          <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">Table {step.table}</span>
                          <span className="font-medium">{step.fields}</span>
                          <span className="text-muted-foreground">→ {step.description}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={step.exclusive ? "default" : "secondary"} className="text-xs">
                            {step.exclusive ? "Exclusive" : "Conditional"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Access Sequences */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Access Sequences</CardTitle>
          <CardDescription>
            Company-specific access sequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading access sequences...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sequence Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!sequences || sequences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No custom access sequences configured. Create your first sequence above.
                    </TableCell>
                  </TableRow>
                ) : (
                  sequences?.map((sequence: AccessSequence) => (
                    <TableRow key={sequence.id}>
                      <TableCell className="font-mono">{sequence.sequence_code}</TableCell>
                      <TableCell className="font-medium">{sequence.sequence_name}</TableCell>
                      <TableCell className="font-mono">{sequence.condition_type_code}</TableCell>
                      <TableCell>{sequence.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sequence.steps?.length || 0} steps</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sequence.is_active ? "default" : "secondary"}>
                          {sequence.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(sequence)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedSequence(sequence.sequence_code)}>
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingSequence ? 'Edit Access Sequence' : 'Create Access Sequence'}
            </DialogTitle>
            <DialogDescription>
              Configure how the system searches for condition values
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="sequence_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence Code</FormLabel>
                    <FormControl>
                      <Input placeholder="CUSTSPEC01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sequence_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer Specific Pricing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="condition_type_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conditionTypes?.map((type: any) => (
                          <SelectItem key={type.condition_code} value={type.condition_code}>
                            {type.condition_code} - {type.condition_name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Custom pricing sequence for special customers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUpdateMutation.isPending}>
                  {createUpdateMutation.isPending ? 'Saving...' : 'Save Sequence'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}