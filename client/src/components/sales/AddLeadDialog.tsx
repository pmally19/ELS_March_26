import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface AddLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddLeadDialog = ({ isOpen, onOpenChange }: AddLeadDialogProps) => {
  // State for new lead form
  const [newLead, setNewLead] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    status: 'New',
    industry: '',
    source: 'Website'
  });

  // Handle creating a new lead
  const handleAddLead = async () => {
    try {
      // Validate required fields
      if (!newLead.name || !newLead.contact_person || !newLead.email) {
        toast({
          title: "Missing Fields",
          description: "Please fill out all required fields",
          variant: "destructive",
        });
        return;
      }
      
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
        source: 'Website'
      });
      onOpenChange(false);
      
      // Show success toast
      toast({
        title: "Lead Created",
        description: "New lead has been successfully created.",
      });
      
      // Refresh any lead data by invalidating the query cache
      window.location.reload();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewLead(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setNewLead(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              Company*
            </Label>
            <Input
              id="company-name"
              name="name"
              value={newLead.name}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact-person" className="text-right">
              Contact Person*
            </Label>
            <Input
              id="contact-person"
              name="contact_person"
              value={newLead.contact_person}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email*
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={newLead.email}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={newLead.phone}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="industry" className="text-right">
              Industry
            </Label>
            <Input
              id="industry"
              name="industry"
              value={newLead.industry}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select 
              value={newLead.status} 
              onValueChange={(value) => handleSelectChange("status", value)}
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
              onValueChange={(value) => handleSelectChange("source", value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Social Media">Social Media</SelectItem>
                <SelectItem value="Event">Event</SelectItem>
                <SelectItem value="Cold Call">Cold Call</SelectItem>
                <SelectItem value="Partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddLead}>
            Add Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;