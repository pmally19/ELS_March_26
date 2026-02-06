import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// Icons
import { 
  Search, 
  Plus, 
  UserPlus, 
  FileText, 
  FileUp, 
  Trash2, 
  Edit, 
  Phone, 
  Mail, 
  Building, 
  MapPin,
  User, 
  Users, 
  UserCheck,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// Types and validation schemas
type Customer = {
  id: number;
  code: string;
  name: string;
  type: string;
  industry: string | null;
  segment: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  status: string;
  notes: string | null;
  isActive: boolean;
  salesRepresentative: string | null;
  paymentTerms: string | null;
  creditLimit: number | null;
  currency: string | null;
  companyCodeId: number;
};

type CustomerContact = {
  id: number;
  customerId: number;
  firstName: string;
  lastName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
};

// Validation schemas
const customerFormSchema = z.object({
  code: z.string().min(1, "Customer code is required"),
  name: z.string().min(1, "Customer name is required"),
  type: z.string(),
  industry: z.string().optional(),
  segment: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  email: z.union([z.string().email("Invalid email format").optional(), z.literal("")]),
  phone: z.string().optional(),
  website: z.union([z.string().url("Invalid website URL").optional(), z.literal("")]),
  taxId: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  salesRepresentative: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  currency: z.string().optional(),
  companyCodeId: z.coerce.number().min(1, "Company code is required"),
});

const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email format").optional(), z.literal("")]),
  isPrimary: z.boolean().default(false),
});

// Customer types
const CUSTOMER_TYPES = ["Corporate", "Individual", "Reseller", "Distributor", "Government", "Non-profit"];

// Industry options
const INDUSTRY_OPTIONS = [
  "Manufacturing", "Retail", "Healthcare", "Finance", "Technology", 
  "Education", "Government", "Construction", "Energy", "Transportation",
  "Telecommunications", "Agriculture", "Hospitality", "Entertainment", "Other"
];

// Segment options
const SEGMENT_OPTIONS = [
  "Enterprise", "Mid-Market", "Small Business", "Consumer", 
  "Strategic", "Key Account", "Channel Partner"
];

// Payment terms options
const PAYMENT_TERMS_OPTIONS = [
  "Net 30", "Net 45", "Net 60", "Immediate", "Cash on Delivery", 
  "50% Advance", "Custom"
];

// Status options
const STATUS_OPTIONS = [
  "Active", "Inactive", "Prospect", "Qualified", "Blocked"
];

// Currency options
const CURRENCY_OPTIONS = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CNY", "INR"
];

export default function Customer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("list"); // list, details, contacts
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerDetails, setViewingCustomerDetails] = useState<Customer | null>(null);
  const [activeTabInDialog, setActiveTabInDialog] = useState("basic");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms
  const addForm = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "Corporate",
      industry: "",
      segment: "Mid-Market",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      email: "",
      phone: "",
      website: "",
      taxId: "",
      status: "active",
      notes: "",
      isActive: true,
    },
  });

  // Fetch data
  const { data: customers = [] as Customer[], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/master-data/customer'],
    retry: 1,
  });

  const { data: contacts = [] as CustomerContact[], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['/api/master-data/customer-contact', selectedCustomerId],
    enabled: !!selectedCustomerId,
    retry: 1,
  });

  // Mutations
  const addCustomerMutation = useMutation({
    mutationFn: (data: z.infer<typeof customerFormSchema>) => 
      apiRequest('/api/master-data/customer', 'POST', data),
    onSuccess: async (response) => {
      // Invalidate the cache and force a refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/customer'] });
      await refetch();
      setIsAddDialogOpen(false);
      addForm.reset();
      
      if (response && response.id) {
        setSelectedCustomerId(response.id);
        setViewingCustomerDetails(response as Customer);
        setIsCustomerDetailsOpen(true);
      }
      
      toast({
        title: "Customer Added",
        description: "Customer has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editCustomerMutation = useMutation({
    mutationFn: (data: { id: number; customer: z.infer<typeof customerFormSchema> }) => 
      apiRequest(`/api/master-data/customer/${data.id}`, 'PUT', data.customer),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/customer'] });
      await refetch();
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      toast({
        title: "Customer Updated",
        description: "Customer has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/master-data/customer/${id}`, 'DELETE'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/master-data/customer'] });
      await refetch();
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
      toast({
        title: "Customer Deleted",
        description: "Customer has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (data: z.infer<typeof contactFormSchema>) => 
      apiRequest(`/api/master-data/customer/${selectedCustomerId}/contacts`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/customer-contact', selectedCustomerId] });
      setIsAddContactDialogOpen(false);
      contactForm.reset();
      toast({
        title: "Contact Added",
        description: "Contact has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Contact form
  const contactForm = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      position: "",
      phone: "",
      email: "",
      isPrimary: false,
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "Corporate",
      industry: "",
      segment: "Mid-Market",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      email: "",
      phone: "",
      website: "",
      taxId: "",
      status: "active",
      notes: "",
      isActive: true,
    },
  });

  // Set edit form values when editing customer
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setActiveTabInDialog("basic");
    editForm.reset({
      code: customer.code,
      name: customer.name,
      type: customer.type,
      industry: customer.industry || "",
      segment: customer.segment,
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "",
      postalCode: customer.postalCode || "",
      email: customer.email || "",
      phone: customer.phone || "",
      website: customer.website || "",
      taxId: customer.taxId || "",
      status: customer.status,
      notes: customer.notes || "",
      isActive: customer.isActive,
      salesRepresentative: customer.salesRepresentative || "",
      paymentTerms: customer.paymentTerms || "",
      creditLimit: customer.creditLimit || undefined,
      currency: customer.currency || "",
      companyCodeId: customer.companyCodeId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleViewCustomerDetails = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setViewingCustomerDetails(customer);
    setIsCustomerDetailsOpen(true);
    setSelectedTab("details");
  };

  const handleAddContact = () => {
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Please select a customer first.",
        variant: "destructive",
      });
      return;
    }
    setIsAddContactDialogOpen(true);
  };

  const onSubmitAddCustomer = (data: z.infer<typeof customerFormSchema>) => {
    addCustomerMutation.mutate(data);
  };

  const onSubmitEditCustomer = (data: z.infer<typeof customerFormSchema>) => {
    if (editingCustomer) {
      editCustomerMutation.mutate({ id: editingCustomer.id, customer: data });
    }
  };

  const onSubmitAddContact = (data: z.infer<typeof contactFormSchema>) => {
    addContactMutation.mutate(data);
  };

  // Filter customers by search term
  const filteredCustomers = searchTerm.trim() === ""
    ? customers
    : customers.filter((customer) => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          customer.code.toLowerCase().includes(searchTermLower) ||
          customer.name.toLowerCase().includes(searchTermLower) ||
          (customer.industry && customer.industry.toLowerCase().includes(searchTermLower)) ||
          (customer.city && customer.city.toLowerCase().includes(searchTermLower)) ||
          (customer.country && customer.country.toLowerCase().includes(searchTermLower))
        );
      });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage your customers and their contact information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {}}>
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="flex w-full items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search customers..."
          className="flex-1"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="list" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="list">Customer List</TabsTrigger>
          {isCustomerDetailsOpen && (
            <>
              <TabsTrigger value="details">Customer Details</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Manage your customer database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden md:table-cell">Industry</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="hidden lg:table-cell">Contact</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[150px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            No customers found. {searchTerm ? "Try a different search term." : ""}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.code}</TableCell>
                            <TableCell>
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-normal text-left"
                                onClick={() => handleViewCustomerDetails(customer)}
                              >
                                {customer.name}
                              </Button>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{customer.type}</TableCell>
                            <TableCell className="hidden md:table-cell">{customer.industry || "-"}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {customer.city && customer.country 
                                ? `${customer.city}, ${customer.country}` 
                                : customer.city || customer.country || "-"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {customer.phone || customer.email || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={customer.isActive ? "success" : "secondary"}>
                                {customer.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditCustomer(customer)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteCustomer(customer)}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {viewingCustomerDetails && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{viewingCustomerDetails.name}</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditCustomer(viewingCustomerDetails)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <CardDescription>
                  Customer ID: {viewingCustomerDetails.code}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      <Separator className="my-2" />
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                        <dt className="text-sm font-medium text-muted-foreground">Type:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.type}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Industry:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.industry || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Segment:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.segment}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Tax ID:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.taxId || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Status:</dt>
                        <dd className="text-sm">
                          <Badge variant={viewingCustomerDetails.isActive ? "success" : "secondary"}>
                            {viewingCustomerDetails.status}
                          </Badge>
                        </dd>
                      </dl>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Contact Information</h3>
                      <Separator className="my-2" />
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                        <dt className="text-sm font-medium text-muted-foreground">Phone:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.phone || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Email:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.email || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Website:</dt>
                        <dd className="text-sm">
                          {viewingCustomerDetails.website ? (
                            <a 
                              href={viewingCustomerDetails.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {viewingCustomerDetails.website}
                            </a>
                          ) : "-"}
                        </dd>
                      </dl>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Address</h3>
                      <Separator className="my-2" />
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                        <dt className="text-sm font-medium text-muted-foreground">Address:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.address || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">City:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.city || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">State/Province:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.state || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Country:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.country || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Postal Code:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.postalCode || "-"}</dd>
                      </dl>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Financial Information</h3>
                      <Separator className="my-2" />
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                        <dt className="text-sm font-medium text-muted-foreground">Sales Rep:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.salesRepresentative || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Payment Terms:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.paymentTerms || "-"}</dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Credit Limit:</dt>
                        <dd className="text-sm">
                          {viewingCustomerDetails.creditLimit 
                            ? `${viewingCustomerDetails.currency || 'USD'} ${viewingCustomerDetails.creditLimit.toLocaleString()}` 
                            : "-"}
                        </dd>
                        
                        <dt className="text-sm font-medium text-muted-foreground">Company Code:</dt>
                        <dd className="text-sm">{viewingCustomerDetails.companyCodeId}</dd>
                      </dl>
                    </div>
                    
                    {viewingCustomerDetails.notes && (
                      <div>
                        <h3 className="text-lg font-medium">Notes</h3>
                        <Separator className="my-2" />
                        <p className="text-sm mt-2">{viewingCustomerDetails.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Contact Persons</CardTitle>
                <Button onClick={handleAddContact}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
              <CardDescription>
                {viewingCustomerDetails?.name}'s contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[100px] text-center">Primary</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingContacts ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : contacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          No contacts found for this customer.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contacts.map((contact: CustomerContact) => (
                        <TableRow key={contact.id}>
                          <TableCell>{`${contact.firstName} ${contact.lastName}`}</TableCell>
                          <TableCell>{contact.position || "-"}</TableCell>
                          <TableCell>{contact.phone || "-"}</TableCell>
                          <TableCell>{contact.email || "-"}</TableCell>
                          <TableCell className="text-center">
                            {contact.isPrimary ? (
                              <Badge variant="outline" className="bg-green-50">Primary</Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the customer details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...addForm}>
              <form className="space-y-4">
                <Tabs value={activeTabInDialog} onValueChange={setActiveTabInDialog}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="contact">Contact & Address</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Code*</FormLabel>
                            <FormControl>
                              <Input placeholder="E.g., C1001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name*</FormLabel>
                            <FormControl>
                              <Input placeholder="Full customer name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CUSTOMER_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {INDUSTRY_OPTIONS.map((industry) => (
                                  <SelectItem key={industry} value={industry}>
                                    {industry}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="segment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Segment</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a segment" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SEGMENT_OPTIONS.map((segment) => (
                                  <SelectItem key={segment} value={segment}>
                                    {segment}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID / VAT Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Tax identification number" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={addForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional information about this customer"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Active Status</FormLabel>
                            <FormDescription>
                              Is this customer currently active?
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
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Business phone number" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Business email address" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={addForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="State or province" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="Country" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="ZIP or postal code" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="financial" className="space-y-4">
                    <FormField
                      control={addForm.control}
                      name="companyCodeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code*</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Company code ID" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the ID of the company code this customer belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Terms</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment terms" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PAYMENT_TERMS_OPTIONS.map((term) => (
                                  <SelectItem key={term} value={term}>
                                    {term}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CURRENCY_OPTIONS.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="creditLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credit Limit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Maximum credit amount"
                                {...field}
                                value={field.value === undefined ? "" : field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="salesRepresentative"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sales Representative</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Name of sales representative"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={addForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status.toLowerCase()}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </div>
          
          <DialogFooter className="pt-4">
            <div className="flex w-full justify-between">
              <div>
                {activeTabInDialog !== "basic" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (activeTabInDialog === "contact") setActiveTabInDialog("basic");
                      if (activeTabInDialog === "financial") setActiveTabInDialog("contact");
                    }}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    addForm.reset();
                    setActiveTabInDialog("basic");
                  }}
                >
                  Cancel
                </Button>
                
                {activeTabInDialog !== "financial" ? (
                  <Button 
                    type="button"
                    onClick={() => {
                      if (activeTabInDialog === "basic") setActiveTabInDialog("contact");
                      if (activeTabInDialog === "contact") setActiveTabInDialog("financial");
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => addForm.handleSubmit(onSubmitAddCustomer)()}
                    disabled={addCustomerMutation.isPending}
                  >
                    {addCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...editForm}>
              <form className="space-y-4">
                <Tabs value={activeTabInDialog} onValueChange={setActiveTabInDialog}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="contact">Contact & Address</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Code*</FormLabel>
                            <FormControl>
                              <Input placeholder="E.g., C1001" {...field} disabled />
                            </FormControl>
                            <FormDescription>
                              Customer code cannot be changed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name*</FormLabel>
                            <FormControl>
                              <Input placeholder="Full customer name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CUSTOMER_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {INDUSTRY_OPTIONS.map((industry) => (
                                  <SelectItem key={industry} value={industry}>
                                    {industry}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="segment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Segment</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a segment" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SEGMENT_OPTIONS.map((segment) => (
                                  <SelectItem key={segment} value={segment}>
                                    {segment}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID / VAT Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Tax identification number" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional information about this customer"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Active Status</FormLabel>
                            <FormDescription>
                              Is this customer currently active?
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
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Business phone number" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Business email address" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="State or province" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="Country" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="ZIP or postal code" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="financial" className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="companyCodeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code*</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Company code ID" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the ID of the company code this customer belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Terms</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment terms" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PAYMENT_TERMS_OPTIONS.map((term) => (
                                  <SelectItem key={term} value={term}>
                                    {term}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CURRENCY_OPTIONS.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="creditLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credit Limit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Maximum credit amount"
                                {...field}
                                value={field.value === undefined ? "" : field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="salesRepresentative"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sales Representative</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Name of sales representative"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status.toLowerCase()}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </div>
          
          <DialogFooter className="pt-4">
            <div className="flex w-full justify-between">
              <div>
                {activeTabInDialog !== "basic" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (activeTabInDialog === "contact") setActiveTabInDialog("basic");
                      if (activeTabInDialog === "financial") setActiveTabInDialog("contact");
                    }}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingCustomer(null);
                    setActiveTabInDialog("basic");
                  }}
                >
                  Cancel
                </Button>
                
                {activeTabInDialog !== "financial" ? (
                  <Button 
                    type="button"
                    onClick={() => {
                      if (activeTabInDialog === "basic") setActiveTabInDialog("contact");
                      if (activeTabInDialog === "contact") setActiveTabInDialog("financial");
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => editForm.handleSubmit(onSubmitEditCustomer)()}
                    disabled={editCustomerMutation.isPending}
                  >
                    {editCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete customer "{deletingCustomer?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deletingCustomer) {
                  deleteCustomerMutation.mutate(deletingCustomer.id);
                }
              }}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? "Deleting..." : "Delete Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Contact Person</DialogTitle>
            <DialogDescription>
              Add a new contact person for {viewingCustomerDetails?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(onSubmitAddContact)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={contactForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={contactForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position / Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Job title or position" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={contactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email address" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={contactForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Primary Contact</FormLabel>
                      <FormDescription>
                        Mark this as the primary contact person
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddContactDialogOpen(false);
                    contactForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addContactMutation.isPending}
                >
                  {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}