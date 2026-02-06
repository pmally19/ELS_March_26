import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Filter, Search, Mail, Phone, Building } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Helper function to get status badge styling
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'New':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">New</Badge>;
    case 'Contacted':
      return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Contacted</Badge>;
    case 'Qualified':
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Qualified</Badge>;
    case 'Nurturing':
      return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200">Nurturing</Badge>;
    case 'Disqualified':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Disqualified</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const LeadsList: React.FC = () => {
  // State for leads data
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for new lead form
  const [newLead, setNewLead] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    status: 'New',
    industry: '',
    source: 'Manual Entry'
  });

  // Function to fetch leads data
  const fetchLeads = async (filter = 'all') => {
    setIsLoading(true);
    try {
      let url = '/api/sales/leads';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      const data = await response.json();
      setLeads(data);
      setActiveFilter(filter);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on initial load
  useEffect(() => {
    fetchLeads();
  }, []);

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All Leads' },
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Nurturing', label: 'Nurturing' },
    { value: 'Disqualified', label: 'Disqualified' }
  ];

  // Submit handler for new lead form
  const handleAddLead = async () => {
    try {
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
      
      // Reset form and close dialog
      setNewLead({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        status: 'New',
        industry: '',
        source: 'Manual Entry'
      });
      setIsAddLeadOpen(false);
      
      // Refresh leads data
      fetchLeads(activeFilter);
      
      // Show success toast
      toast({
        title: 'Lead Created',
        description: 'New lead has been successfully created.',
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to create lead. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Filter leads based on search term
  const filteredLeads = leads.filter(lead => {
    const searchString = searchTerm.toLowerCase();
    return (
      (lead.name?.toLowerCase().includes(searchString) || 
       lead.company_name?.toLowerCase().includes(searchString)) ||
      (lead.contact_person?.toLowerCase().includes(searchString) || 
       lead.contact_name?.toLowerCase().includes(searchString)) ||
      lead.email?.toLowerCase().includes(searchString) ||
      lead.source?.toLowerCase().includes(searchString) ||
      lead.industry?.toLowerCase().includes(searchString)
    );
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Leads</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-[180px]"
            />
          </div>
          
          <select 
            className="text-sm border rounded px-2 py-1"
            value={activeFilter}
            onChange={(e) => fetchLeads(e.target.value)}
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchLeads(activeFilter)} 
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
          
          <Button size="sm" onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-gray-500 mb-2">
              {searchTerm ? `No leads matching "${searchTerm}" found.` : "No leads available"}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchLeads(activeFilter)}
              className="mt-2"
            >
              Refresh Data
            </Button>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        {lead.company_name || lead.name}
                      </div>
                    </TableCell>
                    <TableCell>{lead.contact_name || lead.contact_person}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1 text-gray-400" />
                        {lead.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        {lead.phone || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Add Lead Dialog */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the details for the new lead. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company-name" className="text-right">
                Company
              </Label>
              <Input
                id="company-name"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact-person" className="text-right">
                Contact Person
              </Label>
              <Input
                id="contact-person"
                value={newLead.contact_person}
                onChange={(e) => setNewLead({ ...newLead, contact_person: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="industry" className="text-right">
                Industry
              </Label>
              <Input
                id="industry"
                value={newLead.industry}
                onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={newLead.status} 
                onValueChange={(value) => setNewLead({ ...newLead, status: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Nurturing">Nurturing</SelectItem>
                  <SelectItem value="Disqualified">Disqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source" className="text-right">
                Source
              </Label>
              <Select 
                value={newLead.source} 
                onValueChange={(value) => setNewLead({ ...newLead, source: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Social Media">Social Media</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Cold Call">Cold Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLeadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLead}>
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LeadsList;