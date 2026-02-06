import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { ArrowLeft, Eye, Calendar, TestTube, Camera, ZoomIn, X, Trash2, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';

interface TestDetail {
  test_number: string;
  test_name: string;
  screenshot: string;
  timestamp: string;
  status: string;
  description: string;
  domain: string;
}

interface ConnectionData {
  connection_id: string;
  created_at: string;
  test_count: number;
  tests: TestDetail[];
}

interface ConnectionsResponse {
  success: boolean;
  connections: ConnectionData[];
}

interface ConnectionDetailResponse {
  success: boolean;
  connection: ConnectionData;
}

export default function ProjectTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { data: connections, isLoading } = useQuery({
    queryKey: ['/api/projecttest/connections'],
  });

  const captureFormScreenshots = useMutation({
    mutationFn: () => apiRequest('/api/projecttest/capture-form-screenshots', {
      method: 'POST'
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Screenshots Captured",
        description: `Successfully captured ${data.results?.length || 0} form screenshots`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projecttest/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Capture Failed",
        description: error.message || "Failed to capture form screenshots",
        variant: "destructive",
      });
    }
  });

  const clearAllResults = useMutation({
    mutationFn: () => apiRequest('/api/projecttest/clear-all', {
      method: 'DELETE'
    }),
    onSuccess: () => {
      toast({
        title: "Results Cleared",
        description: "All test results and screenshots have been cleared",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projecttest/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear results",
        variant: "destructive",
      });
    }
  });

  const runCompleteE2EFlow = useMutation({
    mutationFn: () => apiRequest('/api/projecttest/run-complete-e2e-flow', {
      method: 'POST'
    }),
    onSuccess: (data: any) => {
      toast({
        title: "E2E Flow Started",
        description: "Complete business flow test initiated from Company Code to AR/AP",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projecttest/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "E2E Flow Failed",
        description: error.message || "Failed to start complete business flow",
        variant: "destructive",
      });
    }
  });

  const deleteConnection = useMutation({
    mutationFn: (connectionId: string) => apiRequest(`/api/projecttest/connections/${connectionId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      toast({
        title: "Connection Deleted",
        description: "Screenshot connection has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projecttest/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete connection",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/test-results">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Test Results
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">ProjectTest Screenshots</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const connectionsData = connections?.success ? connections.connections : [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/test-results">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Test Results
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">ProjectTest Screenshots</h1>
          <Badge variant="secondary">
            {connectionsData.length} Connection{connectionsData.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => runCompleteE2EFlow.mutate()}
            disabled={runCompleteE2EFlow.isPending}
            variant="default"
            size="sm"
          >
            <TestTube className="mr-2 h-4 w-4" />
            {runCompleteE2EFlow.isPending ? 'Running...' : 'Complete E2E Flow'}
          </Button>
          <Button 
            onClick={() => captureFormScreenshots.mutate()}
            disabled={captureFormScreenshots.isPending}
            variant="outline"
            size="sm"
          >
            <Camera className="mr-2 h-4 w-4" />
            {captureFormScreenshots.isPending ? 'Capturing...' : 'Capture Screenshots'}
          </Button>
          <Button 
            onClick={() => clearAllResults.mutate()}
            disabled={clearAllResults.isPending}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {clearAllResults.isPending ? 'Clearing...' : 'Clear All'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {connectionsData.map((connection: ConnectionData) => (
          <ConnectionCard key={connection.connection_id} connection={connection} />
        ))}
      </div>
    </div>
  );
}

function ConnectionCard({ connection }: { connection: ConnectionData }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: connectionDetails } = useQuery({
    queryKey: [`/api/projecttest/connections/${connection.connection_id}`],
    enabled: !!connection.connection_id,
  });

  const deleteConnection = useMutation({
    mutationFn: () => apiRequest(`/api/projecttest/connections/${connection.connection_id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      toast({
        title: "Connection Deleted",
        description: "Screenshot connection has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projecttest/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete connection",
        variant: "destructive",
      });
    }
  });

  const details = connectionDetails?.success ? connectionDetails.connection : connection;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Connection {connection.connection_id}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(connection.created_at).toLocaleString()}
              </span>
              <Badge variant="outline">
                {connection.test_count} test{connection.test_count !== 1 ? 's' : ''}
              </Badge>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteConnection.mutate()}
            disabled={deleteConnection.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="screenshots" className="w-full">
          <TabsList>
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
            <TabsTrigger value="details">Test Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="screenshots" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {details.tests?.map((test: TestDetail) => (
                <ScreenshotCard key={test.test_number} test={test} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-3">
              {details.tests?.map((test: TestDetail) => (
                <TestDetailCard key={test.test_number} test={test} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ScreenshotCard({ test }: { test: TestDetail }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <Card className="overflow-hidden cursor-pointer" onClick={() => setSelectedImage(test.screenshot)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{test.test_number}</CardTitle>
          <CardDescription className="text-xs line-clamp-2">
            {test.test_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video bg-gray-100 relative overflow-hidden">
            <img
              src={test.screenshot}
              alt={`Screenshot for ${test.test_number}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgOTBMMTQwIDExMEgxODBMMTYwIDkwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <Badge 
                variant={test.status === 'completed' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {test.status}
              </Badge>
              <span className="text-xs text-gray-500">
                {new Date(test.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Screen Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>{test.test_number} - {test.test_name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            <img
              src={selectedImage || ''}
              alt={`Full view of ${test.test_number}`}
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
              <span>Domain: {test.domain}</span>
              <span>Status: {test.status}</span>
              <span>Time: {new Date(test.timestamp).toLocaleString()}</span>
            </div>
            {test.description && (
              <p className="mt-2 text-sm text-gray-700">{test.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TestDetailCard({ test }: { test: TestDetail }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium">{test.test_number}</h4>
            <p className="text-sm text-gray-600 mt-1">{test.test_name}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{test.domain}</Badge>
            <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
              {test.status}
            </Badge>
          </div>
        </div>
        {test.description && (
          <p className="text-sm text-gray-700 mt-2">{test.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>Screenshot: {test.screenshot ? 'Available' : 'Not available'}</span>
          <span>{new Date(test.timestamp).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}