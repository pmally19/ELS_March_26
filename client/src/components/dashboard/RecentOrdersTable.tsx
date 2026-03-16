import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { MoreHorizontal } from "lucide-react";

export default function RecentOrdersTable() {
  const { data: recentOrders, isLoading } = useQuery({
    queryKey: ['/api/orders/recent'],
  });

  return (
    <Card className="border border-gray-100 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Orders</CardTitle>
        <Link href="/orders">
          <a className="text-sm font-medium text-primary-600 hover:text-primary-800">View all</a>
        </Link>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-4 text-center">Loading recent orders...</td>
              </tr>
            ) : recentOrders && recentOrders.length > 0 ? (
              recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.orderNumber}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        {order.customer.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                        <p className="text-sm text-gray-500">{order.customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : ''}
                      ${order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' : ''}
                      ${order.status === 'Canceled' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900">${order.amount.toFixed(2)}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button type="button" className="text-primary-600 hover:text-primary-900 mr-3">View</button>
                    <button type="button" className="text-gray-500 hover:text-gray-700">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-4 text-center text-gray-500">No recent orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
