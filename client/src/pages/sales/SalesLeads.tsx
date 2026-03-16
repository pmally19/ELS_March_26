import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, FileUp, FileDown, RefreshCw, User, Phone, Mail, CreditCard, Building, ArrowLeft, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import LeadsList from "@/components/sales/LeadsList";

// Define Lead type for proper typing
interface Lead {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  industry: string;
  createdAt: string;
  lastContact: string | null;
  interestLevel: number | null;
}

// Interface for new lead creation
interface NewLead {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  industry: string;
}

// Interface for dropdown options
interface DropdownOption {
  value: string;
  label: string;
}

export default function SalesLeads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState<NewLead>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    source: "Website",
    status: "New",
    industry: "Technology"
  });

  const queryClient = useQueryClient();

  // Mutation for adding a new lead
  const addLeadMutation = useMutation({
    mutationFn: async (newLead: NewLead) => {
      const response = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLead),
      });

      if (!response.ok) {
        throw new Error('Failed to create lead');
      }

      return response.json();
    },
    onSuccess: () => {
      // Reset form fields
      setNewLead({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        source: "Website",
        status: "New",
        industry: "Technology"
      });

      // Close dialog
      setIsAddLeadOpen(false);

      // Invalidate and refetch leads query
      queryClient.invalidateQueries({ queryKey: ['/api/sales/leads'] });

      // Show success toast
      toast({
        title: "Success",
        description: "Lead created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Error",
        description: `Failed to create lead: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const handleAddLead = () => {
    // Simple validation
    if (!newLead.name || !newLead.contact_person || !newLead.email) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }

    // Submit form
    addLeadMutation.mutate(newLead);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewLead(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setNewLead(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get any cached leads from localStorage
  const getCachedLeads = () => {
    try {
      const cached = localStorage.getItem('sales_leads_cache');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Only use cache if it's less than 1 hour old
        if (parsedCache.timestamp && (Date.now() - parsedCache.timestamp < 3600000)) {
          console.log('Using cached leads data:', parsedCache.data.length, 'leads');
          return parsedCache.data;
        }
      }
    } catch (error) {
      console.error('Error reading cached leads:', error);
    }
    return [];
  };

  // Fetch leads from API with backup from localStorage and based on active filter
  const { data: allLeads = getCachedLeads(), isLoading, refetch } = useQuery({
    queryKey: ["/api/sales/leads", activeTab],
    queryFn: async () => {
      // Create URL with proper filter parameters
      let url = '/api/sales/leads';

      // Add status filter if not "all"
      if (activeTab !== "all") {
        url += `?status=${activeTab}`;
        console.log(`Fetching leads with status filter: ${activeTab}`);
      } else {
        console.log(`Fetching all leads (no status filter)`);
      }

      // Make API request to get leads
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error fetching leads: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Received ${data.length} leads from API (filtered by ${activeTab})`);

      // Save the fresh data to localStorage
      try {
        localStorage.setItem('sales_leads_cache', JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        console.log('Cached', data.length, 'leads to localStorage');
      } catch (error) {
        console.error('Error caching leads:', error);
      }

      return data;
    },
    // Update refetching behavior to ensure fresh data with filters
    staleTime: 30000, // Data becomes stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true // Ensure data is available when component mounts
  });

  // Debug output to see if leads are being loaded
  useEffect(() => {
    if (allLeads && allLeads.length > 0) {
      console.log("Total leads loaded:", allLeads.length);
      console.log("Sample lead:", allLeads[0]);

      // Log count by status
      const statusCounts = allLeads.reduce((acc: Record<string, number>, lead: Lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log("Leads by status:", statusCounts);
    }
  }, [allLeads]);

  // When active tab changes, refetch the data with the new filter
  useEffect(() => {
    console.log("Tab changed to:", activeTab);
    refetch();
  }, [activeTab, refetch]);

  // Filter the leads only by search term (server-side filtering is already applied)
  const filteredLeads = allLeads.filter((lead: Lead) => {
    if (!searchTerm) return true; // If no search term, show all leads (that were already filtered by status on the server)

    // Search filtering
    return (
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "New":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">New</Badge>;
      case "Contacted":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Contacted</Badge>;
      case "Qualified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Qualified</Badge>;
      case "Nurturing":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Nurturing</Badge>;
      case "Disqualified":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unqualified</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Convert numeric lead score to interest level string
  const getInterestLevelString = (score: number | null): string => {
    if (score === null) return 'unknown';
    if (score >= 75) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getInterestLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge variant="outline" className="border-green-200 text-green-800">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="border-yellow-200 text-yellow-800">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="border-gray-200 text-gray-600">Low</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-200 text-gray-600">Unknown</Badge>;
    }
  };
// Dropdown options for lead sources
const leadSources: DropdownOption[] = [
  { value: "Website", label: "Website" },
  { value: "Referral", label: "Referral" },
  { value: "Social Media", label: "Social Media" },
  { value: "Event", label: "Event" },
  { value: "Cold Call", label: "Cold Call" },
  { value: "Partner", label: "Partner" }
];

// Dropdown options for industries
const industries: DropdownOption[] = [
  { value: "Technology", label: "Technology" },
  { value: "Finance", label: "Finance" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Retail", label: "Retail" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Other", label: "Other" }
];

// Mutation for converting lead to quote
const convertToQuoteMutation = useMutation({
  mutationFn: async (leadId: number) => {
    const response = await fetch(`/api/sales/leads/${leadId}/convert-to-quote`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to convert lead');
    return response.json();
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Lead converted to quote successfully",
      variant: "default",
    });
    queryClient.invalidateQueries({ queryKey: ['/api/sales/leads'] });
  }
});

  return (
    <div className="p-6">
      {/* Enhanced Header Section */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/sales">
              <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4" />
                Back to Sales
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Lead Management
              </h1>
              <p className="text-gray-500 mt-1">
                Manage and track potential customers in your sales pipeline
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={() => {
                toast({
                  title: "Import Feature",
                  description: "Import functionality will be available soon",
                  variant: "default"
                });
              }}
            >
              <FileUp className="h-4 w-4" />
              <span>Import</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={() => {
                // Export leads functionality
                const csvContent = allLeads.map((lead: Lead) => ({
                  Name: lead.name,
                  Contact: lead.contact_person,
                  Email: lead.email,
                  Phone: lead.phone,
                  Source: lead.source,
                  Status: lead.status,
                  Industry: lead.industry
                }));

                const csvString = [
                  Object.keys(csvContent[0]).join(','),
                  ...csvContent.map((row: any) => Object.values(row).join(','))
                ].join('\n');

                const blob = new Blob([csvString], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'leads.csv';
                a.click();

                toast({
                  title: "Export Complete",
                  description: "Leads exported successfully",
                  variant: "default"
                });
              }}
            >
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
              {/* Dialog without trigger - will be opened programmatically */}
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Create a new sales lead. Fill out the required information and click Save.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Company Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name*</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Enter company name"
                        value={newLead.name}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Contact Person */}
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person*</Label>
                      <Input
                        id="contact_person"
                        name="contact_person"
                        placeholder="Enter contact name"
                        value={newLead.contact_person}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address*</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="email@example.com"
                        value={newLead.email}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="(555) 123-4567"
                        value={newLead.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Source */}
                    <div className="space-y-2">
                      <Label htmlFor="source">Lead Source</Label>
                      <Select
                        value={newLead.source}
                        onValueChange={(value) => handleSelectChange("source", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {leadSources.map((source) => (
                              <SelectItem key={source.value} value={source.value}>
                                {source.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newLead.status}
                        onValueChange={(value) => handleSelectChange("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                            <SelectItem value="Nurturing">Nurturing</SelectItem>
                            <SelectItem value="Disqualified">Unqualified</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Industry */}
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        value={newLead.industry}
                        onValueChange={(value) => handleSelectChange("industry", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {industries.map((industry) => (
                              <SelectItem key={industry.value} value={industry.value}>
                                {industry.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddLeadOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddLead}
                    disabled={addLeadMutation.isPending}
                  >
                    {addLeadMutation.isPending ? "Saving..." : "Save Lead"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search leads..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveTab("all");
                    refetch();
                    toast({
                      title: "Filters Reset",
                      description: "All filters have been cleared",
                      variant: "default"
                    });
                  }}
                >
                  <Filter className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    refetch();
                    toast({
                      title: "Data Refreshed",
                      description: "Lead data has been refreshed",
                      variant: "default"
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="px-4">
              <TabsList className="mb-4 mt-2">
                <TabsTrigger value="all">All Leads</TabsTrigger>
                <TabsTrigger value="New">New</TabsTrigger>
                <TabsTrigger value="Contacted">Contacted</TabsTrigger>
                <TabsTrigger value="Qualified">Qualified</TabsTrigger>
                <TabsTrigger value="Nurturing">Nurturing</TabsTrigger>
                <TabsTrigger value="Disqualified">Unqualified</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab content for all lead status types */}
            {['all', 'New', 'Contacted', 'Qualified', 'Nurturing', 'Disqualified'].map((tabValue) => (
              <TabsContent key={tabValue} value={tabValue} className="mt-0">
                {isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <User className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No leads found</h3>
                    <p className="text-gray-500 max-w-md mb-4">
                      {searchTerm
                        ? `No leads matching "${searchTerm}" were found. Try a different search term.`
                        : tabValue === 'all'
                          ? "There are no leads available in this view. Try a different filter or add a new lead."
                          : `There are no ${tabValue} leads available. Try a different filter or add a new lead.`}
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Lead
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Lead Name</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Contact Info</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Last Contact</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead: Lead) => (
                          <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <Building className="h-5 w-5 text-gray-400 mr-2" />
                                <div>
                                  <div>{lead.name}</div>
                                  <div className="text-sm text-gray-500">{lead.industry || 'Unknown'}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{lead.contact_person}</TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm">
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                  <span className="truncate max-w-[140px]">{lead.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                  <span>{lead.phone || 'N/A'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{lead.source || 'Unknown'}</TableCell>
                            <TableCell>{getStatusBadge(lead.status || '')}</TableCell>
                            <TableCell>{getInterestLevelBadge(getInterestLevelString(lead.interestLevel))}</TableCell>
                            <TableCell>
                              {lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => convertToQuoteMutation.mutate(lead.id)}
                                  disabled={convertToQuoteMutation.isPending}
                                  title="Convert to Quote"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Quote
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <Link href={`/sales/opportunities?leadId=${lead.id}`}>
                                    Convert to Opportunity
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
      );
}