import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreateMovementDialog from "./CreateMovementDialog";

interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  movement_type: string;
  reference: string;
  movement_date: string;
  user_name: string;
  // Additional fields from API
  unit_of_measure?: string;
  from_location?: string | null;
  to_location?: string | null;
  plant_id?: number | null;
  delivery_order_id?: number | null;
  purchase_order_id?: number | null;
  production_order_id?: number | null;
  sales_order_id?: number | null;
  status?: string;
  notes?: string | null;
}

export default function MovementsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: movements, isLoading, isError } = useQuery<StockMovement[]>({
    queryKey: ['/api/inventory/movements'],
  });

  const filteredMovements = movements?.filter(movement => {
    const matchesSearch = movement.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.movement_type?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by movement type - match exact codes or show all
    const matchesType = typeFilter === "all" ||
      movement.movement_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get unique movement types for filter dropdown
  const movementTypes = Array.from(new Set(movements?.map(m => m.movement_type).filter(Boolean) || []));

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Movements</h2>
          <p className="text-sm text-muted-foreground">
            Track inventory changes and stock movements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Movement
          </Button>
        </div>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Movement History</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search movements..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {movementTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export to CSV
                  const headers = ['Date', 'SKU', 'Product', 'Movement Type', 'Quantity', 'Unit', 'Plant', 'From', 'To', 'Status', 'Reference', 'Source Docs', 'User', 'Notes'];
                  const rows = (filteredMovements || []).map(m => [
                    formatDate(m.movement_date),
                    m.sku,
                    m.product_name,
                    m.movement_type,
                    m.quantity,
                    m.unit_of_measure || '',
                    m.plant_id || '',
                    m.from_location || '',
                    m.to_location || '',
                    m.status || '',
                    m.reference || '',
                    [
                      m.delivery_order_id ? `DO-${m.delivery_order_id}` : '',
                      m.purchase_order_id ? `PO-${m.purchase_order_id}` : '',
                      m.sales_order_id ? `SO-${m.sales_order_id}` : '',
                      m.production_order_id ? `PR-${m.production_order_id}` : ''
                    ].filter(Boolean).join('; '),
                    m.user_name,
                    m.notes || ''
                  ]);

                  const csvContent = [headers, ...rows]
                    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                    .join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `inventory_movements_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading movement data...</div>
          ) : isError ? (
            <div className="text-center py-4 text-red-500">Error loading movement data. Please try again.</div>
          ) : filteredMovements && filteredMovements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Source Doc</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {formatDate(movement.movement_date)}
                    </TableCell>
                    <TableCell>{movement.sku}</TableCell>
                    <TableCell>{movement.product_name}</TableCell>
                    <TableCell className="text-sm">
                      {movement.movement_type || '-'}
                    </TableCell>
                    <TableCell className="text-right">{movement.quantity}</TableCell>
                    <TableCell>{movement.unit_of_measure || '-'}</TableCell>
                    <TableCell>{movement.plant_id || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.from_location || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.to_location || '-'}
                    </TableCell>
                    <TableCell>
                      {movement.status ? (
                        <Badge variant="outline" className="text-xs">
                          {movement.status}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{movement.reference || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {movement.delivery_order_id && (
                          <Badge variant="secondary" className="text-xs">
                            DO-{movement.delivery_order_id}
                          </Badge>
                        )}
                        {movement.purchase_order_id && (
                          <Badge variant="secondary" className="text-xs">
                            PO-{movement.purchase_order_id}
                          </Badge>
                        )}
                        {movement.sales_order_id && (
                          <Badge variant="secondary" className="text-xs">
                            SO-{movement.sales_order_id}
                          </Badge>
                        )}
                        {movement.production_order_id && (
                          <Badge variant="secondary" className="text-xs">
                            PR-{movement.production_order_id}
                          </Badge>
                        )}
                        {!movement.delivery_order_id && !movement.purchase_order_id &&
                          !movement.sales_order_id && !movement.production_order_id && '-'}
                      </div>
                    </TableCell>
                    <TableCell>{movement.user_name}</TableCell>
                    <TableCell className="text-center">
                      {movement.notes ? (
                        <span title={movement.notes} className="cursor-help">
                          📝
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4">
              {searchTerm ? 'No movements match your search.' : 'No movement data available.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <CreateMovementDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}