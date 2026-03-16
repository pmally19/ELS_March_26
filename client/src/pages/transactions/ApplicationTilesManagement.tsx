import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Database, FileText, Zap, TrendingUp } from "lucide-react";
import ApplicationTilesStatus from "@/components/transactions/ApplicationTilesStatus";

export default function ApplicationTilesManagement() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const handleBack = () => {
    setLocation("/transactions");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Application Tiles Management</h1>
            <p className="text-muted-foreground">
              Sheet 1 - Application Tile Lists in Trans System Management
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="number-ranges">Number Ranges</TabsTrigger>
          <TabsTrigger value="posting-system">Posting System</TabsTrigger>
          <TabsTrigger value="auto-clearing">Auto Clearing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ApplicationTilesStatus />
        </TabsContent>

        <TabsContent value="number-ranges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Document Number Ranges Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Sales Documents (RV)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">0000024567</div>
                    <p className="text-xs text-muted-foreground">Current number</p>
                    <div className="mt-2 text-xs">
                      <span className="text-green-600">Active</span> • 2.5% used
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Accounting (DR)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">1000156789</div>
                    <p className="text-xs text-muted-foreground">Current number</p>
                    <div className="mt-2 text-xs">
                      <span className="text-green-600">Active</span> • 15.7% used
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Materials (MM)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">5000445670</div>
                    <p className="text-xs text-muted-foreground">Current number</p>
                    <div className="mt-2 text-xs">
                      <span className="text-green-600">Active</span> • 44.6% used
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 flex gap-2">
                <Button>Create Range</Button>
                <Button variant="outline">Extend Range</Button>
                <Button variant="outline">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posting-system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Posting System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Posted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">1,247</div>
                    <p className="text-xs text-muted-foreground">Documents today</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Balance Check</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-600">✓ Balanced</div>
                    <p className="text-xs text-muted-foreground">Debit = Credit</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Parked Docs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">23</div>
                    <p className="text-xs text-muted-foreground">Awaiting approval</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">$4.2M</div>
                    <p className="text-xs text-muted-foreground">Posted today</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex gap-2">
                <Button>Create Posting</Button>
                <Button variant="outline">Batch Post</Button>
                <Button variant="outline">Reverse Document</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auto-clearing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automatic Clearing Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Open Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">1,247</div>
                    <p className="text-xs text-muted-foreground">Available for matching</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-600">71.5%</div>
                    <p className="text-xs text-muted-foreground">Auto-match success</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cleared Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">$4.6M</div>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Manual Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">332</div>
                    <p className="text-xs text-muted-foreground">Items pending</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex gap-2">
                <Button>Start Clearing Run</Button>
                <Button variant="outline">Configure Rules</Button>
                <Button variant="outline">View Exceptions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}