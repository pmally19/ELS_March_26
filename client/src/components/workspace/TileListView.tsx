import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, Factory, Package, Package2, Users, BookOpen, BarChart2, DollarSign, CreditCard, ShoppingCart, FileText, ShoppingBag, CheckCircle, Truck, ArrowRightLeft } from 'lucide-react';
import { TileConfig } from '@shared/simplified-tile-catalog';

const iconMap = {
  Building,
  Factory,
  Package,
  Package2,
  Users,
  BookOpen,
  BarChart2,
  DollarSign,
  CreditCard,
  ShoppingCart,
  FileText,
  ShoppingBag,
  CheckCircle,
  Truck,
  ArrowRightLeft
};

interface TileListViewProps {
  tiles: TileConfig[];
  selectedTiles: string[];
  onTileSelect: (tileNumbers: string[]) => void;
  userRole?: string;
  onAddToWorkspace?: (tileNumbers: string[]) => void;
  showWorkspaceActions?: boolean;
}

export function TileListView({
  tiles,
  selectedTiles,
  onTileSelect,
  userRole,
  onAddToWorkspace,
  showWorkspaceActions = false
}: TileListViewProps) {
  const [filterPrefix, setFilterPrefix] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <Package className="h-4 w-4" />;
  };

  const hasAccess = (tile: TileConfig) => {
    if (!userRole) return true;
    return tile.requiredRoles.includes(userRole) || tile.requiredRoles.includes('admin') || tile.requiredRoles.includes('all');
  };

  const filteredTiles = tiles.filter(tile => {
    const tilePrefix = tile.number.match(/^[A-Z]+/)?.[0] || '';
    const matchesPrefix = filterPrefix === 'all' || tilePrefix === filterPrefix;
    const matchesCategory = filterCategory === 'all' || tile.category === filterCategory;
    const matchesSearch = searchTerm === '' || 
      tile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tile.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tile.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPrefix && matchesCategory && matchesSearch;
  });

  const accessibleTiles = filteredTiles.filter(hasAccess);
  const uniquePrefixes = Array.from(new Set(tiles.map(t => t.number.match(/^[A-Z]+/)?.[0] || ''))).filter(Boolean).sort();
  const uniqueCategories = Array.from(new Set(tiles.map(t => t.category))).sort();

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allAccessibleNumbers = accessibleTiles.map(t => t.number);
      onTileSelect(Array.from(new Set([...selectedTiles, ...allAccessibleNumbers])));
    } else {
      const accessibleNumbers = accessibleTiles.map(t => t.number);
      onTileSelect(selectedTiles.filter(num => !accessibleNumbers.includes(num)));
    }
  };

  const handleTileToggle = (tileNumber: string, checked: boolean) => {
    if (checked) {
      onTileSelect([...selectedTiles, tileNumber]);
    } else {
      onTileSelect(selectedTiles.filter(num => num !== tileNumber));
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'master data': return 'bg-blue-100 text-blue-800';
      case 'transactions': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrefixDescription = (prefix: string) => {
    const descriptions = {
      'A': 'Master Data Setup',
      'B': 'Business Partners',
      'C': 'Material Master',
      'S': 'Sales Process',
      'P': 'Procurement Process',
      'F': 'Finance Process',
      'I': 'Inventory Management',
      'SC': 'Custom Sales',
      'PC': 'Custom Procurement'
    };
    return descriptions[prefix as keyof typeof descriptions] || prefix;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tile Selection List</span>
          <Badge variant="outline">
            {selectedTiles.length} selected
          </Badge>
        </CardTitle>
        <CardDescription>
          Select tiles using checkboxes. Tiles are organized by alphabetic prefix and business process sequence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search tiles by number, title, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterPrefix} onValueChange={setFilterPrefix}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by prefix" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prefixes</SelectItem>
              {uniquePrefixes.map(prefix => (
                <SelectItem key={prefix} value={prefix}>
                  {prefix} - {getPrefixDescription(prefix)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        {showWorkspaceActions && (
          <div className="flex gap-2">
            <Button 
              onClick={() => onAddToWorkspace?.(selectedTiles)}
              disabled={selectedTiles.length === 0}
              size="sm"
            >
              Add {selectedTiles.length} tiles to workspace
            </Button>
            <Button 
              variant="outline"
              onClick={() => onTileSelect([])}
              disabled={selectedTiles.length === 0}
              size="sm"
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Tiles Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all accessible tiles"
                  />
                </TableHead>
                <TableHead className="w-16">Icon</TableHead>
                <TableHead className="w-20">Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead className="w-32">Prefix</TableHead>
                <TableHead className="w-24">Sequence</TableHead>
                <TableHead className="w-32">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessibleTiles.map((tile) => (
                <TableRow key={tile.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedTiles.includes(tile.number)}
                      onCheckedChange={(checked) => handleTileToggle(tile.number, checked as boolean)}
                      aria-label={`Select ${tile.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {renderIcon(tile.icon)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold">
                      {tile.number}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {tile.title}
                    {tile.isCustomized && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Custom
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {tile.description}
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(tile.category)}>
                      {tile.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tile.number.match(/^[A-Z]+/)?.[0] || '-'}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {getPrefixDescription(tile.number.match(/^[A-Z]+/)?.[0] || '')}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {tile.processSequence || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {tile.requiredRoles.slice(0, 2).join(', ')}
                      {tile.requiredRoles.length > 2 && ' +more'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* No results message */}
        {accessibleTiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No tiles found matching your filters.</p>
            <p className="text-sm">Try adjusting your search criteria or filters.</p>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{accessibleTiles.length}</div>
            <div className="text-sm text-gray-600">Available Tiles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{selectedTiles.length}</div>
            <div className="text-sm text-gray-600">Selected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {uniquePrefixes.filter(p => accessibleTiles.some(t => t.alphabeticPrefix === p)).length}
            </div>
            <div className="text-sm text-gray-600">Active Prefixes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {accessibleTiles.filter(t => t.isCustomized).length}
            </div>
            <div className="text-sm text-gray-600">Customized</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}