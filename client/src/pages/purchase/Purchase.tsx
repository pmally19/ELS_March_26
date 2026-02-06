import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import OrdersContent from "@/components/purchase/OrdersContent";
import RequisitionsContent from "@/components/purchase/RequisitionsContent";
import VendorsContent from "@/components/purchase/VendorsContent";
import ReceiptsContent from "@/components/purchase/ReceiptsContent";
import POInvoicesContent from "@/components/purchase/POInvoicesContent";


export default function Purchase() {
  // Initialize default tab - check URL params or default to "orders"
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('tab') || 'orders';
    }
    return 'orders';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    document.title = "Purchase Management | MallyERP";

    // Check if we have a PO ID in URL parameters (e.g., ?tab=payments&poId=123)
    // The tab is already handled by getInitialTab() in useState initialization
    const urlParams = new URLSearchParams(window.location.search);
    const poId = urlParams.get('poId');

    if (poId) {
      // Store PO ID in sessionStorage for VendorPayments component to use
      sessionStorage.setItem('selectedPOId', poId);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase</h1>
            <p className="text-sm text-muted-foreground">Purchase orders, requisitions and vendor management</p>
          </div>
        </div>
      </div>

      {/* Purchase Navigation Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger
                value="orders"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="requisitions"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Requisitions
              </TabsTrigger>
              <TabsTrigger
                value="vendors"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Vendors
              </TabsTrigger>
              <TabsTrigger
                value="receipts"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Receipts
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Invoices
              </TabsTrigger>

            </TabsList>
          </div>

          {/* Orders Tab Content */}
          <TabsContent value="orders" className="p-4">
            <OrdersContent />
          </TabsContent>

          {/* Requisitions Tab Content */}
          <TabsContent value="requisitions" className="p-4">
            <RequisitionsContent />
          </TabsContent>

          {/* Vendors Tab Content */}
          <TabsContent value="vendors" className="p-4">
            <VendorsContent />
          </TabsContent>

          {/* Receipts Tab Content */}
          <TabsContent value="receipts" className="p-4">
            <ReceiptsContent />
          </TabsContent>

          {/* Invoices Tab Content */}
          <TabsContent value="invoices" className="p-4">
            <POInvoicesContent />
          </TabsContent>


        </Tabs>
      </Card>
    </div>
  );
}