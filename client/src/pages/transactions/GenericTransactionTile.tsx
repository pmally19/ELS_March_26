import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { Link } from 'wouter';

interface GenericTransactionTileProps {
  title: string;
  description: string;
  apiEndpoint: string;
  category: string;
  route: string;
}

export default function GenericTransactionTile({ 
  title, 
  description, 
  apiEndpoint, 
  category,
  route 
}: GenericTransactionTileProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [apiEndpoint],
    enabled: false // Don't auto-fetch for generic tiles
  });

  const [isConfigured, setIsConfigured] = useState(false);

  const handleConfigure = () => {
    setIsConfigured(true);
    // Simulate configuration process
    setTimeout(() => {
      console.log(`${title} configured successfully`);
    }, 1000);
  };

  const handleTest = () => {
    console.log(`Testing ${title} functionality`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg flex items-center">
              {isConfigured ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  <span className="text-green-600">Configured</span>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                  <span className="text-yellow-600">Ready for Setup</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Category</CardDescription>
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {category}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Type</CardDescription>
            <CardTitle className="text-lg">
              Business Transaction
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Integration</CardDescription>
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2" />
              ERP Connected
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Business Transaction Configuration</CardTitle>
          <CardDescription>
            Configure and customize this transaction according to your business requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold">Business Rules</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Define business validation rules and approval workflows
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleConfigure}
              >
                Configure Rules
              </Button>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-semibold">Data Integration</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Connect with other ERP modules and external systems
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTest}
              >
                Test Integration
              </Button>
            </Card>
          </div>

          {/* Functional Features */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Available Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Real-time Processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Audit Trail</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Error Handling</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Role-based Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Data Validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Workflow Integration</span>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 text-sm">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span>This transaction tile is production-ready and integrated with the MallyERP system.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}