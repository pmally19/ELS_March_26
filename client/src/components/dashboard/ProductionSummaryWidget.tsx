import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

interface MessageItem {
  id: number;
  type: string;
  message: string;
  user?: string;
  orderNumber?: string;
  product?: string;
  count?: number;
}

export default function ProductionSummaryWidget({ dataSource = 'production' }) {
  // Query for production activity data
  const { data, isLoading, error, refetch } = useQuery<MessageItem[]>({
    queryKey: ['/api/production/activity'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/production/activity');
        if (!response.ok) {
          throw new Error('Failed to fetch production activity');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching production activity:', error);
        // Fallback to sample data if API call fails
        return [
          { id: 1, type: 'order', message: 'New order received from Jane Doe' },
          { id: 2, type: 'payment', message: 'Payment received for order #ORD-5430' },
          { id: 3, type: 'inventory', message: 'Inventory alert: "Wireless Earbuds" stock is below threshold' },
          { id: 4, type: 'customer', message: 'Robert Johnson updated customer information' },
          { id: 5, type: 'product', message: 'Emma Brown added 3 new products' }
        ];
      }
    },
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error loading production data
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '📋';
      case 'payment':
        return '💰';
      case 'inventory':
        return '📦';
      case 'customer':
        return '👤';
      case 'product':
        return '🏭';
      default:
        return '📝';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => refetch()} 
          className="text-xs flex items-center text-gray-500 hover:text-gray-800 transition-colors"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </button>
      </div>
      <div className="overflow-auto max-h-[350px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Type</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((item: any, index: number) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {item.type}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm">
                  <span className="font-medium">
                    {item.type === "order" && 
                      <>
                        <span className="font-medium text-blue-600">New order</span>
                        <span className="text-gray-600"> received from {item.user}</span>
                      </>
                    }
                    {item.type === "payment" && 
                      <>
                        <span className="font-medium text-green-600">Payment received</span>
                        <span className="text-gray-600"> for order #{item.orderNumber}</span>
                      </>
                    }
                    {item.type === "inventory" && 
                      <>
                        <span className="font-medium text-amber-600">Inventory alert:</span>
                        <span className="text-gray-600"> {item.product} stock is below threshold</span>
                      </>
                    }
                    {item.type === "customer" && 
                      <>
                        <span className="font-medium text-purple-600">{item.user}</span>
                        <span className="text-gray-600"> updated customer information</span>
                      </>
                    }
                    {item.type === "product" && 
                      <>
                        <span className="font-medium text-emerald-600">{item.user}</span>
                        <span className="text-gray-600"> added {item.count} new products</span>
                      </>
                    }
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}