import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Filter, FileUp, FileDown, RefreshCw, Building, DollarSign, Calendar, BarChart2, Loader2, ArrowLeft } from "lucide-react";
import PipelineByStage from "@/components/sales/PipelineByStage";
import OpenOpportunitiesList from "@/components/sales/OpenOpportunitiesList";

// Define the opportunity data schema
const opportunitySchema = z.object({
  name: z.string().min(1, "Opportunity name is required"),
  lead_id: z.string().min(1, "Lead selection is required"),
  stage: z.string().min(1, "Stage is required"),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  probability: z.coerce.number().min(0).max(100, "Probability must be between 0 and 100"),
  close_date: z.string().min(1, "Expected close date is required"),
  description: z.string().optional(),
  next_step: z.string().optional(),
  type: z.string().default("New Business"),
  source: z.string().default("Manual Entry")
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

// Define opportunity stages
const stages = [
  { value: "Prospecting", label: "Prospecting" },
  { value: "Qualification", label: "Qualification" },
  { value: "Needs Analysis", label: "Needs Analysis" },
  { value: "Value Proposition", label: "Value Proposition" },
  { value: "Identify Decision Makers", label: "Identify Decision Makers" },
  { value: "Proposal/Price Quote", label: "Proposal/Price Quote" },
  { value: "Negotiation/Review", label: "Negotiation/Review" },
  { value: "Closed Won", label: "Closed Won" },
  { value: "Closed Lost", label: "Closed Lost" }
];

// Define opportunity types
const opportunityTypes = [
  { value: "New Business", label: "New Business" },
  { value: "Existing Business", label: "Existing Business" },
  { value: "Upgrade", label: "Upgrade" }
];

// Define opportunity sources
const opportunitySources = [
  { value: "Manual Entry", label: "Manual Entry" },
  { value: "Lead Conversion", label: "Lead Conversion" },
  { value: "Website", label: "Website" },
  { value: "Referral", label: "Referral" },
  { value: "Trade Show", label: "Trade Show" },
  { value: "Partner", label: "Partner" },
  { value: "Email Campaign", label: "Email Campaign" }
];

export default function SalesOpportunities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Form for adding new opportunity
  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      name: "",
      lead_id: "",
      stage: "Prospecting",
      amount: 0,
      probability: 10,
      close_date: new Date().toISOString().split('T')[0],
      description: "",
      next_step: "",
      type: "New Business",
      source: "Manual Entry"
    }
  });

  // Note: We're not using these queries anymore, instead using the standalone component

  // Fetch opportunities from the API
  const { 
    data = [], 
    isLoading,
    isError,
    refetch 
  } = useQuery({
    queryKey: ['/api/sales/opportunities', activeTab],
    queryFn: async () => {
      try {
        let url = '/api/sales/opportunities';
        
        // Handle proper filtering based on the tab selection
        if (activeTab !== 'all') {
          // Convert tab values to match database stage values
          let stageFilter = '';
          
          switch(activeTab) {
            case 'prospecting':
              stageFilter = 'Prospecting';
              break;
            case 'qualification':
              stageFilter = 'Qualification';
              break;
            case 'needs_analysis':
              stageFilter = 'Needs Analysis';
              break;
            case 'value_proposition':
              stageFilter = 'Value Proposition';
              break;
            case 'identify_decision_makers':
              stageFilter = 'Identify Decision Makers';
              break;
            case 'proposal_price_quote':
              stageFilter = 'Proposal/Price Quote';
              break;
            case 'negotiation_review':
              stageFilter = 'Negotiation/Review';
              break;
            case 'closed_won':
              stageFilter = 'Closed Won';
              break;
            case 'closed_lost':
              stageFilter = 'Closed Lost';
              break;
            default:
              stageFilter = activeTab.replace(/_/g, ' ');
          }
          
          url += `?filter=${encodeURIComponent(stageFilter)}`;
        }
        
        console.log(`Fetching opportunities from: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch opportunities');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching opportunities:', error);
        return [];
      }
    }
  });

  // Fetch leads for the opportunity form
  const { 
    data: leads = [] 
  } = useQuery({
    queryKey: ['/api/sales/leads-for-opportunities'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/sales/leads-for-opportunities');
        if (!response.ok) {
          throw new Error('Failed to fetch leads');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
      }
    }
  });

  // Add new opportunity mutation
  const createOpportunityMutation = useMutation({
    mutationFn: async (data: OpportunityFormData) => {
      const response = await apiRequest('/api/sales/opportunities', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/opportunities'] });
      toast({
        title: "Success",
        description: "Opportunity created successfully",
        variant: "default"
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create opportunity. Please try again.",
        variant: "destructive"
      });
      console.error('Error creating opportunity:', error);
    }
  });

  // Handle form submission
  const onSubmit = (data: OpportunityFormData) => {
    createOpportunityMutation.mutate(data);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/sales/opportunities/export');
      if (!response.ok) {
        throw new Error('Failed to export opportunities');
      }
      
      const data = await response.json();
      
      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map((item: any) => Object.values(item).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(','));
      
      const csv = [headers, ...rows].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'opportunities.csv');
      a.click();
      
      toast({
        title: "Export Complete",
        description: "Opportunities have been exported successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export opportunities. Please try again.",
        variant: "destructive"
      });
      console.error('Error exporting opportunities:', error);
    }
  };

  // Handle import
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Import Failed",
        description: "Please select a file to import",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        const opportunities = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i]) continue;
          
          const values = lines[i].split(',');
          const opportunity: any = {};
          
          headers.forEach((header, index) => {
            let value = values[index];
            
            // Clean up values
            if (value && value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            
            opportunity[header.trim()] = value;
          });
          
          opportunities.push(opportunity);
        }
        
        // Submit each opportunity
        let successCount = 0;
        let errorCount = 0;
        
        for (const opp of opportunities) {
          try {
            await apiRequest('/api/sales/opportunities', {
              method: 'POST',
              body: JSON.stringify(opp)
            });
            successCount++;
          } catch (error) {
            errorCount++;
            console.error('Error importing opportunity:', error);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/sales/opportunities'] });
        
        setIsImportDialogOpen(false);
        setImportFile(null);
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} opportunities. Failed: ${errorCount}`,
          variant: errorCount > 0 ? "default" : "destructive"
        });
      };
      
      reader.readAsText(importFile);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import opportunities. Please check the file format.",
        variant: "destructive"
      });
      console.error('Error importing opportunities:', error);
    }
  };

  // Filter opportunities based on search term only
  // (stage filtering is handled by the backend API call)
  const filteredOpportunities = data.filter((opportunity: any) => {
    return searchTerm === "" || 
      opportunity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Function to get stage badge
  const getStageBadge = (stage: string) => {
    let color;
    switch (stage?.toLowerCase()) {
      case 'prospecting':
        color = 'bg-blue-100 text-blue-800';
        break;
      case 'qualification':
        color = 'bg-purple-100 text-purple-800';
        break;
      case 'needs analysis':
      case 'needs_analysis':
        color = 'bg-indigo-100 text-indigo-800';
        break;
      case 'value proposition':
      case 'value_proposition':
        color = 'bg-teal-100 text-teal-800';
        break;
      case 'identify decision makers':
      case 'identify_decision_makers':
        color = 'bg-cyan-100 text-cyan-800';
        break;
      case 'proposal/price quote':
      case 'proposal_price_quote':
        color = 'bg-green-100 text-green-800';
        break;
      case 'negotiation/review':
      case 'negotiation_review':
        color = 'bg-amber-100 text-amber-800';
        break;
      case 'closed won':
      case 'closed_won':
        color = 'bg-green-100 text-green-800';
        break;
      case 'closed lost':
      case 'closed_lost':
        color = 'bg-red-100 text-red-800';
        break;
      default:
        color = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <Badge className={`${color} rounded-full px-3 py-1`}>
        {stage?.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sales
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Opportunities</h1>
            <p className="text-gray-600 mt-1">
              Manage and track sales opportunities in your pipeline
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center space-x-2"
              >
                <FileUp className="h-4 w-4" />
                <span>Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Opportunities</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple opportunities at once.
                  The CSV should include headers matching the opportunity fields.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Input
                    id="importFile"
                    type="file"
                    accept=".csv"
                    className="col-span-4"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsImportDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleImport}
                  disabled={!importFile}
                >
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={handleExport}
          >
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Opportunity</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add Opportunity</DialogTitle>
                <DialogDescription>
                  Create a new sales opportunity to track potential business
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid gap-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Opportunity Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter opportunity name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lead_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a lead" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {leads.map((lead: any) => (
                                  <SelectItem key={lead.id} value={lead.id.toString()}>
                                    {lead.company_name} ({lead.contact_name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="stage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stage</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {stages.map((stage) => (
                                  <SelectItem key={stage.value} value={stage.value}>
                                    {stage.label}
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
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="probability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Probability (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                min="0" 
                                max="100" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createOpportunityMutation.isPending}
                    >
                      {createOpportunityMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : "Create Opportunity"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Dashboard Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PipelineByStage />
        <OpenOpportunitiesList />
      </div>
      
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search opportunities..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <Tabs 
          defaultValue="all" 
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-9 mb-6 h-auto">
            <TabsTrigger value="all" className="py-2">
              All
            </TabsTrigger>
            <TabsTrigger value="prospecting" className="py-2">
              Prospecting
            </TabsTrigger>
            <TabsTrigger value="qualification" className="py-2">
              Qualification
            </TabsTrigger>
            <TabsTrigger value="needs_analysis" className="py-2">
              Needs Analysis
            </TabsTrigger>
            <TabsTrigger value="value_proposition" className="py-2">
              Value Proposition
            </TabsTrigger>
            <TabsTrigger value="identify_decision_makers" className="py-2">
              Decision Makers
            </TabsTrigger>
            <TabsTrigger value="proposal_price_quote" className="py-2">
              Proposal
            </TabsTrigger>
            <TabsTrigger value="negotiation_review" className="py-2">
              Negotiation
            </TabsTrigger>
            <TabsTrigger value="closed_won" className="py-2">
              Closed Won
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredOpportunities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No opportunities found</h3>
                    <p className="text-gray-500 mb-4 max-w-md">
                      {activeTab === 'all' 
                        ? "There are no opportunities in your pipeline yet." 
                        : `There are no opportunities in the ${activeTab.replace(/_/g, ' ')} stage.`}
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Create your first opportunity</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-3xl">
                        {/* Form Dialog Content - same as the Add Opportunity dialog */}
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Probability</TableHead>
                        <TableHead className="text-right">Expected Close</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOpportunities.map((opportunity: any) => (
                        <TableRow key={opportunity.id}>
                          <TableCell className="font-medium">
                            <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
                              {opportunity.name}
                            </Link>
                          </TableCell>
                          <TableCell>{opportunity.customer || "No customer"}</TableCell>
                          <TableCell>
                            {getStageBadge(opportunity.stage)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(opportunity.value)}
                          </TableCell>
                          <TableCell className="text-right">
                            {opportunity.probability}%
                          </TableCell>
                          <TableCell className="text-right">
                            {new Date(opportunity.expected_close_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}