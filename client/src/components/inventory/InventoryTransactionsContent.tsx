import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  ArrowRightLeft, 
  ClipboardCheck, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText,
  RefreshCw,
  Settings,
  Activity,
  BarChart3
} from 'lucide-react';

// Import existing transaction components
import MaterialDocument from '@/pages/transactions/MaterialDocument';
import StockTransfer from '@/pages/transactions/StockTransfer';
import PhysicalInventory from '@/pages/transactions/PhysicalInventory';
import InventoryValuation from '@/pages/transactions/InventoryValuation';

export default function InventoryTransactionsContent() {
  const [activeTransaction, setActiveTransaction] = useState<string | null>(null);

  // Inventory Transaction Tiles
  const inventoryTransactions = [
    {
      id: 'material-document',
      title: 'Material Document',
      description: 'Goods movements and material document processing',
      icon: Package,
      color: 'bg-blue-500',
      component: MaterialDocument
    },
    {
      id: 'stock-transfer',
      title: 'Stock Transfer',
      description: 'Transfer stock between locations and plants',
      icon: ArrowRightLeft,
      color: 'bg-green-500',
      component: StockTransfer
    },
    {
      id: 'physical-inventory',
      title: 'Physical Inventory',
      description: 'Cycle counts and inventory reconciliation',
      icon: ClipboardCheck,
      color: 'bg-orange-500',
      component: PhysicalInventory
    },
    {
      id: 'inventory-valuation',
      title: 'Inventory Valuation',
      description: 'Stock value assessment and costing methods',
      icon: DollarSign,
      color: 'bg-purple-500',
      component: InventoryValuation
    }
  ];

  const handleTransactionClick = (transactionId: string) => {
    setActiveTransaction(transactionId);
  };

  const handleBack = () => {
    setActiveTransaction(null);
  };

  // If a transaction is selected, render its component
  if (activeTransaction) {
    const transaction = inventoryTransactions.find(t => t.id === activeTransaction);
    if (transaction) {
      const TransactionComponent = transaction.component;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              ← Back to Inventory Transactions
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              {transaction.title}
            </Badge>
          </div>
          <TransactionComponent />
        </div>
      );
    }
  }

  // Main Inventory Transactions overview
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Transactions</h2>
          <p className="text-muted-foreground">
            Comprehensive inventory transaction management and processing
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-blue-50">
          Inventory Management
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Material Documents</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Transfers</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Physical Counts</p>
                <p className="text-2xl font-bold">23</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valuations</p>
                <p className="text-2xl font-bold">$2.4M</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Transaction Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inventoryTransactions.map((transaction) => {
          const IconComponent = transaction.icon;
          return (
            <Card 
              key={transaction.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleTransactionClick(transaction.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${transaction.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{transaction.title}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {transaction.description}
                </CardDescription>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Integration Notes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Inventory Transaction Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Comprehensive Workflow</h4>
              <ul className="space-y-1">
                <li>• Standard transaction types for inventory management</li>
                <li>• Proper movement types and document structure</li>
                <li>• Complete inventory management compliance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Unified Experience</h4>
              <ul className="space-y-1">
                <li>• Access all transactions within Inventory module</li>
                <li>• No need to switch between different modules</li>
                <li>• Consistent inventory management workflow</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

