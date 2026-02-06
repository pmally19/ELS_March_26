import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Truck, CreditCard, Loader2 } from 'lucide-react';

interface AddressEntry {
  id: number;
  address_name: string;
  contact_person: string;
  company_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  region: string;
  phone: string;
  email: string;
  is_primary: boolean;
  notes: string;
}

interface AddressSelection {
  sold_to_address_id: number | null;
  bill_to_address_id: number | null;
  ship_to_address_id: number | null;
  payer_to_address_id: number | null;
}

interface CustomerAddressDropdownsProps {
  customerId: number | null;
  onAddressSelectionChange: (selection: AddressSelection) => void;
  initialSelection?: AddressSelection;
}

export default function CustomerAddressDropdowns({
  customerId,
  onAddressSelectionChange,
  initialSelection
}: CustomerAddressDropdownsProps) {
  const [addresses, setAddresses] = useState<{
    sold_to: AddressEntry[];
    bill_to: AddressEntry[];
    ship_to: AddressEntry[];
    payer_to: AddressEntry[];
  }>({
    sold_to: [],
    bill_to: [],
    ship_to: [],
    payer_to: []
  });

  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<AddressSelection>(
    initialSelection || {
      sold_to_address_id: null,
      bill_to_address_id: null,
      ship_to_address_id: null,
      payer_to_address_id: null
    }
  );

  // Fetch customer addresses when customerId changes
  useEffect(() => {
    if (customerId) {
      fetchCustomerAddresses(customerId);
    } else {
      setAddresses({
        sold_to: [],
        bill_to: [],
        ship_to: [],
        payer_to: []
      });
      setSelection({
        sold_to_address_id: null,
        bill_to_address_id: null,
        ship_to_address_id: null,
        payer_to_address_id: null
      });
    }
  }, [customerId]);

  const fetchCustomerAddresses = async (customerId: number) => {
    setLoading(true);
    try {
      const addressTypes = ['sold_to', 'bill_to', 'ship_to', 'payer_to'];
      const addressPromises = addressTypes.map(async (type) => {
        const response = await fetch(`/api/customers/${customerId}/addresses/${type}`);
        if (response.ok) {
          const data = await response.json();
          return { type, addresses: data.data || [] };
        }
        return { type, addresses: [] };
      });

      const results = await Promise.all(addressPromises);
      const newAddresses = {
        sold_to: [],
        bill_to: [],
        ship_to: [],
        payer_to: []
      };

      results.forEach(({ type, addresses }) => {
        newAddresses[type as keyof typeof newAddresses] = addresses;
      });

      setAddresses(newAddresses);

      // Auto-select primary addresses if available
      const newSelection: AddressSelection = {
        sold_to_address_id: null,
        bill_to_address_id: null,
        ship_to_address_id: null,
        payer_to_address_id: null
      };

      addressTypes.forEach((type) => {
        const typeAddresses = newAddresses[type as keyof typeof newAddresses];
        const primaryAddress = typeAddresses.find(addr => addr.is_primary);
        if (primaryAddress) {
          newSelection[`${type}_address_id` as keyof AddressSelection] = primaryAddress.id;
        }
      });

      setSelection(newSelection);
      onAddressSelectionChange(newSelection);

    } catch (error) {
      console.error('Error fetching customer addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (type: keyof AddressSelection, addressId: string) => {
    const newSelection = {
      ...selection,
      [type]: addressId ? parseInt(addressId) : null
    };
    setSelection(newSelection);
    onAddressSelectionChange(newSelection);
  };

  const formatAddressDisplay = (address: AddressEntry) => {
    const parts = [
      address.address_name,
      address.address_line_1,
      address.city,
      address.state,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const getAddressOptions = (type: 'sold_to' | 'bill_to' | 'ship_to' | 'payer_to') => {
    const typeAddresses = addresses[type];
    if (typeAddresses.length === 0) {
      return [{ value: 'none', label: 'No addresses configured' }];
    }

    return typeAddresses.map(address => ({
      value: address.id.toString(),
      label: formatAddressDisplay(address),
      isPrimary: address.is_primary
    }));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sold_to': return <MapPin className="h-4 w-4" />;
      case 'bill_to': return <CreditCard className="h-4 w-4" />;
      case 'ship_to': return <Truck className="h-4 w-4" />;
      case 'payer_to': return <Building className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'sold_to': return 'Sold To Address';
      case 'bill_to': return 'Bill To Address';
      case 'ship_to': return 'Ship To Address';
      case 'payer_to': return 'Payer To Address';
      default: return 'Address';
    }
  };

  if (!customerId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please select a customer to configure addresses
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading customer addresses...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Address Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(['sold_to', 'bill_to', 'ship_to', 'payer_to'] as const).map((type) => {
          const options = getAddressOptions(type);
          const currentValue = selection[`${type}_address_id` as keyof AddressSelection]?.toString() || '';
          const hasAddresses = addresses[type].length > 0;

          return (
            <div key={type} className="space-y-2">
              <Label className="flex items-center gap-2">
                {getIcon(type)}
                {getTitle(type)}
                {!hasAddresses && (
                  <Badge variant="secondary" className="text-xs">
                    No addresses
                  </Badge>
                )}
              </Label>
              
              <Select
                value={currentValue}
                onValueChange={(value) => handleAddressChange(`${type}_address_id` as keyof AddressSelection, value)}
                disabled={!hasAddresses}
              >
                <SelectTrigger className={!hasAddresses ? 'opacity-50' : ''}>
                  <SelectValue placeholder={hasAddresses ? "Select address..." : "No addresses available"} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.label}
                        {option.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}

        {/* Address Summary */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Selected Addresses Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {(['sold_to', 'bill_to', 'ship_to', 'payer_to'] as const).map((type) => {
              const selectedId = selection[`${type}_address_id` as keyof AddressSelection];
              const selectedAddress = selectedId ? addresses[type].find(addr => addr.id === selectedId) : null;
              
              return (
                <div key={type} className="flex items-start gap-2">
                  {getIcon(type)}
                  <div className="flex-1">
                    <div className="font-medium text-xs text-muted-foreground">
                      {getTitle(type)}
                    </div>
                    <div className="text-sm">
                      {selectedAddress ? formatAddressDisplay(selectedAddress) : 'Not selected'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
