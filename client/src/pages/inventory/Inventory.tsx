import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import ProductsContent from "@/components/inventory/ProductsContent";
import StockLevelsContent from "@/components/inventory/StockLevelsContent";
import MovementsContent from "@/components/inventory/MovementsContent";
import WarehousesContent from "@/components/inventory/WarehousesContent";
import InventoryTransactionsContent from "@/components/inventory/InventoryTransactionsContent";

export default function Inventory() {
  useEffect(() => {
    document.title = "Inventory Management | MallyERP";
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
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-sm text-muted-foreground">Stock management and product tracking</p>
          </div>
        </div>
      </div>

      {/* Inventory Navigation Tabs */}
      <Card>
        <Tabs defaultValue="products" className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger 
                value="products" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Products
              </TabsTrigger>
              <TabsTrigger 
                value="stock" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Stock Levels
              </TabsTrigger>
              <TabsTrigger 
                value="movements" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Movements
              </TabsTrigger>
              <TabsTrigger 
                value="warehouses" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Warehouses
              </TabsTrigger>
              <TabsTrigger 
                value="inventory-transactions" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Inventory Transactions
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Products Tab Content */}
          <TabsContent value="products" className="p-4">
            <ProductsContent />
          </TabsContent>
          
          {/* Stock Levels Tab Content */}
          <TabsContent value="stock" className="p-4">
            <StockLevelsContent />
          </TabsContent>
          
          {/* Movements Tab Content */}
          <TabsContent value="movements" className="p-4">
            <MovementsContent />
          </TabsContent>
          
          {/* Warehouses Tab Content */}
          <TabsContent value="warehouses" className="p-4">
            <WarehousesContent />
          </TabsContent>
          
          {/* Inventory Transactions Tab Content */}
          <TabsContent value="inventory-transactions" className="p-4">
            <InventoryTransactionsContent />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}