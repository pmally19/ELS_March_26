import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/apiClient";

interface Vendor {
  id: number;
  code?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  status?: string;
  rating?: string;
}

export default function VendorsContent() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch vendors from API
  const { data: vendors = [], isLoading, isError } = useQuery<Vendor[]>({
    queryKey: ['/api/master-data/vendor'],
    queryFn: () => apiRequest<Vendor[]>('/api/master-data/vendor', 'GET'),
  });

  const filteredVendors = vendors.filter((vendor) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (vendor.code || '').toLowerCase().includes(searchLower) ||
      vendor.name.toLowerCase().includes(searchLower) ||
      (vendor.email || '').toLowerCase().includes(searchLower) ||
      (vendor.phone || '').toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (vendor: Vendor) => {
    const status = vendor.status || (vendor.isActive ? 'Active' : 'Inactive');
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRatingBadge = (evaluationScore?: number) => {
    if (!evaluationScore) {
      return <Badge className="bg-gray-500 text-white">Standard</Badge>;
    }
    if (evaluationScore >= 90) {
      return <Badge className="bg-blue-500 text-white">Preferred</Badge>;
    } else if (evaluationScore >= 70) {
      return <Badge className="bg-gray-500 text-white">Standard</Badge>;
    } else {
      return <Badge className="bg-yellow-500 text-white">Probation</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search vendors..." 
            className="pl-8 rounded-md border border-input bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('Filter vendors clicked');
              // Add filter functionality
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('Export vendors clicked');
              // Add export functionality
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              console.log('New vendor clicked');
              // Add new vendor functionality - could navigate to /master-data/vendor
              window.location.href = '/master-data/vendor';
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Vendor
          </Button>
        </div>
      </div>
      
      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading vendors...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">
              Error loading vendors. Please try again.
            </div>
          ) : filteredVendors.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.code || `V${vendor.id.toString().padStart(4, '0')}`}</TableCell>
                      <TableCell>{vendor.name}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{vendor.email || "—"}</TableCell>
                      <TableCell>{vendor.phone || "—"}</TableCell>
                      <TableCell>{getStatusBadge(vendor)}</TableCell>
                      <TableCell>{getRatingBadge(vendor.evaluationScore)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm ? 'No vendors match your search.' : 'No vendors found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}