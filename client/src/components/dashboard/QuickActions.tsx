import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { PlusSquare, Plus, BarChart3, ChevronRight } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Link href="/orders/new">
        <a>
          <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <PlusSquare className="h-6 w-6" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900">Create New Order</h3>
              <p className="text-sm text-gray-500">Add new customer orders</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Card>
        </a>
      </Link>
      
      <Link href="/products/new">
        <a>
          <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus className="h-6 w-6" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
              <p className="text-sm text-gray-500">Expand your inventory</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Card>
        </a>
      </Link>
      
      <Link href="/reports/generate">
        <a>
          <Card className="p-5 border border-gray-100 flex items-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900">Generate Report</h3>
              <p className="text-sm text-gray-500">View financial insights</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Card>
        </a>
      </Link>
    </div>
  );
}
