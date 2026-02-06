import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import JobsContent from "@/components/production/JobsContent";
import WorkCentersContent from "@/components/production/WorkCentersContent";
import BomsContent from "@/components/production/BomsContent";
import OrdersContent from "@/components/production/OrdersContent";
import ProductionPlanningContent from "@/components/production/ProductionPlanningContent";

export default function Production() {
  useEffect(() => {
    document.title = "Production Management | MallyERP";
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
            <h1 className="text-2xl font-bold">Production</h1>
            <p className="text-sm text-muted-foreground">Production orders, jobs, and materials planning</p>
          </div>
        </div>
      </div>

      {/* Production Navigation Tabs */}
      <Card>
        <Tabs defaultValue="orders" className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger 
                value="orders" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger 
                value="jobs" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Jobs
              </TabsTrigger>
              <TabsTrigger 
                value="workcenters" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Work Centers
              </TabsTrigger>
              <TabsTrigger 
                value="boms" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Bill of Materials
              </TabsTrigger>
              <TabsTrigger 
                value="planning" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Production Planning
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Orders Tab Content */}
          <TabsContent value="orders" className="p-4">
            <OrdersContent />
          </TabsContent>
          
          {/* Jobs Tab Content */}
          <TabsContent value="jobs" className="p-4">
            <JobsContent />
          </TabsContent>
          
          {/* Work Centers Tab Content */}
          <TabsContent value="workcenters" className="p-4">
            <WorkCentersContent />
          </TabsContent>
          
          {/* BOMs Tab Content */}
          <TabsContent value="boms" className="p-4">
            <BomsContent />
          </TabsContent>
          
          {/* Production Planning Tab Content */}
          <TabsContent value="planning" className="p-4">
            <ProductionPlanningContent />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

