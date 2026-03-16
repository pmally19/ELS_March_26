import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import GenericTransactionTile from '@/pages/transactions/GenericTransactionTile';

interface TransactionTileLoaderProps {
  tileName: string;
  title: string;
  description: string;
  category: string;
  route: string;
}

// Dynamic loader for all transaction tiles
const TransactionTileLoader = ({ tileName, title, description, category, route }: TransactionTileLoaderProps) => {
  // Try to load specific component, fallback to generic
  let Component;
  
  try {
    // Attempt to load specific component
    Component = lazy(() => 
      import(`@/pages/transactions/${tileName}`).catch(() => 
        // Fallback to generic component if specific doesn't exist
        import('@/pages/transactions/GenericTransactionTile').then(module => ({
          default: () => module.default({
            title,
            description,
            apiEndpoint: `/api/complete-transaction-tiles/${tileName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`,
            category,
            route
          })
        }))
      )
    );
  } catch {
    // Final fallback
    Component = () => (
      <GenericTransactionTile
        title={title}
        description={description}
        apiEndpoint={`/api/complete-transaction-tiles/${tileName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`}
        category={category}
        route={route}
      />
    );
  }

  return (
    <Suspense fallback={
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading {title}...</p>
          </div>
        </CardContent>
      </Card>
    }>
      <Component />
    </Suspense>
  );
};

export default TransactionTileLoader;