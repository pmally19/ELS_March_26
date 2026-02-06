import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Package, FileText, Hash, Truck, MapPin, ArrowLeft } from 'lucide-react';

interface CompanyCodeRelationship {
  company_code: string;
  company_name: string;
  plants: number;
  storage_locations: number;
  customers: number;
  vendors: number;
  materials: number;
  document_types: number;
  number_ranges: number;
}

interface MasterDataItem {
  id: number;
  code?: string;
  name?: string;
  company_code_id?: number;
  is_active?: boolean;
}

export default function MasterDataCrossReference() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Fetch company code relationships
  const { data: relationships = [], isLoading: relationshipsLoading } = useQuery({
    queryKey: ['/api/master-data/cross-reference-summary'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/cross-reference-summary');
      if (!response.ok) throw new Error('Failed to fetch relationships');
      return response.json();
    }
  });

  // Fetch detailed data for selected company
  const { data: companyDetails = {}, isLoading: detailsLoading } = useQuery({
    queryKey: ['/api/master-data/company-details', selectedCompany],
    queryFn: async () => {
      if (!selectedCompany) return {};
      const response = await fetch(`/api/master-data/company-details/${selectedCompany}`);
      if (!response.ok) throw new Error('Failed to fetch company details');
      return response.json();
    },
    enabled: !!selectedCompany
  });

  const totalEntities = (relationship: CompanyCodeRelationship) => 
    relationship.plants + relationship.storage_locations + relationship.customers + 
    relationship.vendors + relationship.materials + relationship.document_types + relationship.number_ranges;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → Cross-Reference Analysis
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Master Data Cross-Reference Analysis</h1>
        <p className="text-muted-foreground">
          Shows how many master data records are linked to each company code. "Total Linked Records" means the sum of all plants, customers, vendors, materials, and other master data connected to that company.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relationshipsLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          relationships.map((relationship: CompanyCodeRelationship) => (
            <Card 
              key={relationship.company_code}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedCompany === relationship.company_code ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedCompany(relationship.company_code)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {relationship.company_code}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{relationship.company_name}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Linked Records:</span>
                    <Badge variant="secondary" title="Sum of all master data records linked to this company code">
                      {totalEntities(relationship)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span>{relationship.plants} Plants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span>{relationship.storage_locations} Locations</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span>{relationship.customers} Customers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span>{relationship.vendors} Vendors</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4 text-amber-500" />
                      <span>{relationship.materials} Materials</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>{relationship.document_types} Doc Types</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{relationship.number_ranges} Number Ranges</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Cross-Reference for {selectedCompany}</CardTitle>
            <p className="text-muted-foreground">
              Complete view of all master data entities linked to this company code
            </p>
          </CardHeader>
          <CardContent>
            {detailsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Tabs defaultValue="customers">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                  <TabsTrigger value="plants">Plants</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                
                <TabsContent value="customers" className="space-y-4">
                  <h3 className="text-lg font-semibold">Customer Master Data</h3>
                  <div className="grid gap-2">
                    {companyDetails.customers?.map((customer: MasterDataItem) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{customer.code}</span>
                          <span className="ml-2 text-muted-foreground">{customer.name}</span>
                        </div>
                        <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="vendors" className="space-y-4">
                  <h3 className="text-lg font-semibold">Vendor Master Data</h3>
                  <div className="grid gap-2">
                    {companyDetails.vendors?.map((vendor: MasterDataItem) => (
                      <div key={vendor.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{vendor.code}</span>
                          <span className="ml-2 text-muted-foreground">{vendor.name}</span>
                        </div>
                        <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="plants" className="space-y-4">
                  <h3 className="text-lg font-semibold">Plant Master Data</h3>
                  <div className="grid gap-2">
                    {companyDetails.plants?.map((plant: MasterDataItem) => (
                      <div key={plant.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{plant.code}</span>
                          <span className="ml-2 text-muted-foreground">{plant.name}</span>
                        </div>
                        <Badge variant={plant.is_active ? 'default' : 'secondary'}>
                          {plant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="documents" className="space-y-4">
                  <h3 className="text-lg font-semibold">Document Types & Number Ranges</h3>
                  <div className="grid gap-2">
                    {companyDetails.document_types?.map((doc: MasterDataItem) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{doc.code}</span>
                          <span className="ml-2 text-muted-foreground">{doc.name}</span>
                        </div>
                        <Badge variant={doc.is_active ? 'default' : 'secondary'}>
                          {doc.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}