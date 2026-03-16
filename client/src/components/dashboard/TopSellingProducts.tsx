import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Laptop, Headphones, Watch, Home } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  category?: string;
  unitsSold: number;
}

export default function TopSellingProducts() {
  const { data: topProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/materials/top-selling'],
  });

  const getProductIcon = (category: string) => {
    // Handle null or undefined category
    if (!category) {
      return <Laptop className="h-6 w-6 text-gray-500" />;
    }

    switch (category.toLowerCase()) {
      case 'electronics':
        return <Laptop className="h-6 w-6 text-gray-500" />;
      case 'audio':
        return <Headphones className="h-6 w-6 text-gray-500" />;
      case 'wearables':
        return <Watch className="h-6 w-6 text-gray-500" />;
      case 'smart home':
        return <Home className="h-6 w-6 text-gray-500" />;
      default:
        return <Laptop className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <Card className="border border-gray-100 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-900">Top Selling Products</CardTitle>
        <Link href="/products" className="text-sm font-medium text-primary-600 hover:text-primary-800">
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-4 text-center">
              <p>Loading top products...</p>
            </div>
          ) : topProducts.length > 0 ? (
            topProducts.map((product) => (
              <div key={product.id} className="flex items-center">
                <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center">
                  {getProductIcon(product.category || '')}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                    <span className="text-sm font-medium text-gray-900">
                      ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">{product.category || 'Uncategorized'}</p>
                    <p className="text-xs text-gray-500">{product.unitsSold || 0} units sold</p>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full"
                      style={{
                        width: topProducts[0] && topProducts[0].unitsSold
                          ? `${(product.unitsSold / topProducts[0].unitsSold) * 100}%`
                          : '0%'
                      }}>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-gray-500">No product data available.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
