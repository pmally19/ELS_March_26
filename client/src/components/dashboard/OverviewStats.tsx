import { DollarSign, Package, Inbox, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function OverviewStats() {
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Sales Card */}
      <Card className="hover:shadow-md transition-shadow border border-gray-100">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <h3 className="text-2xl font-semibold text-gray-900">
                {isLoading ? "Loading..." : `$${dashboardStats?.totalSales.toFixed(2)}`}
              </h3>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-green-600 text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
                12.5%
              </span>
              <span className="text-gray-500 text-sm ml-2">vs last month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Orders Card */}
      <Card className="hover:shadow-md transition-shadow border border-gray-100">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <h3 className="text-2xl font-semibold text-gray-900">
                {isLoading ? "Loading..." : dashboardStats?.totalOrders}
              </h3>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-green-600 text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
                7.2%
              </span>
              <span className="text-gray-500 text-sm ml-2">vs last month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Value Card */}
      <Card className="hover:shadow-md transition-shadow border border-gray-100">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
              <Inbox className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Inventory Value</p>
              <h3 className="text-2xl font-semibold text-gray-900">
                {isLoading ? "Loading..." : `$${dashboardStats?.inventoryValue.toFixed(2)}`}
              </h3>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-red-600 text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
                3.1%
              </span>
              <span className="text-gray-500 text-sm ml-2">vs last month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert Card */}
      <Card className="hover:shadow-md transition-shadow border border-gray-100">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <h3 className="text-2xl font-semibold text-gray-900">
                {isLoading ? "Loading..." : dashboardStats?.lowStockItems}
              </h3>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/inventory">
              <a className="text-primary-600 text-sm font-medium hover:text-primary-800">
                View inventory
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
