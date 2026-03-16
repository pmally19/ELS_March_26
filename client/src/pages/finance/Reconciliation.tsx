import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, TrendingUp, FileText, DollarSign, Users, Package } from 'lucide-react';
import { useLocation } from 'wouter';
import ARReconciliation from '@/components/finance/ARReconciliation';
import APReconciliation from '@/components/finance/APReconciliation';
import InventoryReconciliation from '@/components/finance/InventoryReconciliation';

export default function Reconciliation() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('ar-reconciliation');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/finance')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Reconciliation</h1>
            <p className="text-sm text-muted-foreground">
              Reconcile subledgers with General Ledger accounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Reconciliation Navigation Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger 
                value="ar-reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                AR Reconciliation
              </TabsTrigger>
              <TabsTrigger 
                value="ap-reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                <FileText className="h-4 w-4 mr-2" />
                AP Reconciliation
              </TabsTrigger>
              <TabsTrigger 
                value="inventory-reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                <Package className="h-4 w-4 mr-2" />
                Inventory Reconciliation
              </TabsTrigger>
              <TabsTrigger 
                value="bank-reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Bank Reconciliation
              </TabsTrigger>
              <TabsTrigger 
                value="intercompany-reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                <Users className="h-4 w-4 mr-2" />
                Intercompany Reconciliation
              </TabsTrigger>
              <TabsTrigger 
                value="general-reconciliation" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                <FileText className="h-4 w-4 mr-2" />
                General Reconciliation
              </TabsTrigger>
            </TabsList>
          </div>

          {/* AR Reconciliation Tab */}
          <TabsContent value="ar-reconciliation" className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Accounts Receivable Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare AR subledger totals with GL AR account balance. 
                  Verify that all customer invoices and payments are properly recorded in both systems.
                </p>
              </div>
              <ARReconciliation />
            </div>
          </TabsContent>

          {/* AP Reconciliation Tab */}
          <TabsContent value="ap-reconciliation" className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Accounts Payable Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare AP subledger totals with GL AP account balance. 
                  Verify that all vendor invoices and payments are properly recorded in both systems.
                </p>
              </div>
              <APReconciliation />
            </div>
          </TabsContent>

          {/* Inventory Reconciliation Tab */}
          <TabsContent value="inventory-reconciliation" className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Inventory Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare inventory subledger totals with GL inventory account balance. 
                  Verify that all inventory movements and valuations are properly recorded.
                </p>
              </div>
              <InventoryReconciliation />
            </div>
          </TabsContent>

          {/* Bank Reconciliation Tab */}
          <TabsContent value="bank-reconciliation" className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Bank Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare bank statement with GL bank account balance. 
                  Match bank transactions with GL entries and identify outstanding items.
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Reconciliation</CardTitle>
                  <CardDescription>
                    Reconcile bank statements with GL bank account balances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium mb-2">Bank Reconciliation Coming Soon</p>
                    <p className="text-sm">Bank reconciliation functionality will be available here.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Intercompany Reconciliation Tab */}
          <TabsContent value="intercompany-reconciliation" className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Intercompany Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Reconcile intercompany transactions between different company codes. 
                  Ensure that intercompany receivables and payables match across companies.
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Intercompany Transaction Reconciliation</CardTitle>
                  <CardDescription>
                    Reconcile intercompany transactions between company codes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium mb-2">Intercompany Reconciliation Coming Soon</p>
                    <p className="text-sm">Intercompany reconciliation functionality will be available here.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* General Reconciliation Tab */}
          <TabsContent value="general-reconciliation" className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">General Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Reconcile any GL account with its corresponding subledger or external source. 
                  Use this for custom reconciliation scenarios.
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>General Account Reconciliation</CardTitle>
                  <CardDescription>
                    Reconcile any GL account with external data sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium mb-2">General Reconciliation Coming Soon</p>
                    <p className="text-sm">General reconciliation functionality will be available here.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

