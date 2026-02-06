import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Truck, CreditCard, Check, Edit } from 'lucide-react';

interface CustomerAddress {
  id: number;
  name: string;
  // Main address (sold-to)
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  
  // Billing address
  use_separate_billing_address: boolean;
  billing_address_line_1: string;
  billing_address_line_2: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
  billing_contact_person: string;
  billing_phone: string;
  billing_email: string;
  
  // Shipping address
  use_separate_shipping_address: boolean;
  shipping_address_line_1: string;
  shipping_address_line_2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_postal_code: string;
  shipping_contact_person: string;
  shipping_phone: string;
  shipping_email: string;
  
  // Address preferences
  default_address_setup: string;
  address_notes: string;
}

interface AddressSelection {
  soldToAddress: {
    type: 'main' | 'billing' | 'shipping';
    address: any;
  };
  billToAddress: {
    type: 'main' | 'billing' | 'shipping';
    address: any;
  };
  shipToAddress: {
    type: 'main' | 'billing' | 'shipping';
    address: any;
  };
}

interface AddressSelectorProps {
  customer: CustomerAddress;
  onAddressSelection: (selection: AddressSelection) => void;
  initialSelection?: AddressSelection;
}

export default function AddressSelector({ 
  customer, 
  onAddressSelection, 
  initialSelection 
}: AddressSelectorProps) {
  const [selection, setSelection] = useState<AddressSelection>(
    initialSelection || {
      soldToAddress: { type: 'main', address: null },
      billToAddress: { type: 'main', address: null },
      shipToAddress: { type: 'main', address: null }
    }
  );

  // Get address data based on type
  const getAddressData = (type: 'main' | 'billing' | 'shipping') => {
    if (type === 'main') {
      return {
        address_line_1: customer.address,
        address_line_2: '',
        city: customer.city,
        state: customer.state,
        country: customer.country,
        postal_code: customer.postal_code,
        contact_person: customer.name,
        phone: customer.phone,
        email: customer.email
      };
    } else if (type === 'billing') {
      return {
        address_line_1: customer.billing_address_line_1,
        address_line_2: customer.billing_address_line_2,
        city: customer.billing_city,
        state: customer.billing_state,
        country: customer.billing_country,
        postal_code: customer.billing_postal_code,
        contact_person: customer.billing_contact_person,
        phone: customer.billing_phone,
        email: customer.billing_email
      };
    } else {
      return {
        address_line_1: customer.shipping_address_line_1,
        address_line_2: customer.shipping_address_line_2,
        city: customer.shipping_city,
        state: customer.shipping_state,
        country: customer.shipping_country,
        postal_code: customer.shipping_postal_code,
        contact_person: customer.shipping_contact_person,
        phone: customer.shipping_phone,
        email: customer.shipping_email
      };
    }
  };

  // Get available address options for each type
  const getAvailableOptions = (addressType: 'soldTo' | 'billTo' | 'shipTo') => {
    const options = [
      { value: 'main', label: 'Main Address', available: true }
    ];

    if (customer.use_separate_billing_address) {
      options.push({ 
        value: 'billing', 
        label: 'Billing Address', 
        available: true 
      });
    }

    if (customer.use_separate_shipping_address) {
      options.push({ 
        value: 'shipping', 
        label: 'Shipping Address', 
        available: true 
      });
    }

    return options;
  };

  const handleAddressChange = (addressType: keyof AddressSelection, type: 'main' | 'billing' | 'shipping') => {
    const newSelection = {
      ...selection,
      [addressType]: {
        type,
        address: getAddressData(type)
      }
    };
    
    setSelection(newSelection);
    onAddressSelection(newSelection);
  };

  const renderAddressCard = (
    title: string,
    icon: React.ReactNode,
    addressType: keyof AddressSelection,
    badge?: string
  ) => {
    const currentSelection = selection[addressType];
    const addressData = getAddressData(currentSelection.type);
    const availableOptions = getAvailableOptions(addressType as 'soldTo' | 'billTo' | 'shipTo');

    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Address</Label>
            <RadioGroup
              value={currentSelection.type}
              onValueChange={(value) => handleAddressChange(addressType, value as 'main' | 'billing' | 'shipping')}
            >
              {availableOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${addressType}-${option.value}`} />
                  <Label htmlFor={`${addressType}-${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="space-y-2">
              <div className="font-medium text-sm text-muted-foreground">
                Selected Address Details:
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-medium">{addressData.contact_person}</div>
                <div>{addressData.address_line_1}</div>
                {addressData.address_line_2 && <div>{addressData.address_line_2}</div>}
                <div>{addressData.city}, {addressData.state} {addressData.postal_code}</div>
                <div>{addressData.country}</div>
                {addressData.phone && <div className="text-muted-foreground">Phone: {addressData.phone}</div>}
                {addressData.email && <div className="text-muted-foreground">Email: {addressData.email}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Select Addresses for Order</h3>
        <p className="text-sm text-muted-foreground">
          Choose the appropriate addresses for this order from {customer.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderAddressCard(
          "Sold To Address",
          <MapPin className="h-4 w-4" />,
          "soldToAddress",
          "Required"
        )}
        
        {renderAddressCard(
          "Bill To Address",
          <CreditCard className="h-4 w-4" />,
          "billToAddress"
        )}
        
        {renderAddressCard(
          "Ship To Address",
          <Truck className="h-4 w-4" />,
          "shipToAddress"
        )}
      </div>

      {/* Address Setup Information */}
      {customer.default_address_setup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Customer Address Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Setup Type:</span> {customer.default_address_setup}
              </div>
              {customer.address_notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span> {customer.address_notes}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newSelection = {
              soldToAddress: { type: 'main' as const, address: getAddressData('main') },
              billToAddress: { type: 'main' as const, address: getAddressData('main') },
              shipToAddress: { type: 'main' as const, address: getAddressData('main') }
            };
            setSelection(newSelection);
            onAddressSelection(newSelection);
          }}
        >
          Use Main Address for All
        </Button>
        
        {customer.use_separate_billing_address && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newSelection = {
                ...selection,
                billToAddress: { type: 'billing' as const, address: getAddressData('billing') }
              };
              setSelection(newSelection);
              onAddressSelection(newSelection);
            }}
          >
            Use Billing Address
          </Button>
        )}
        
        {customer.use_separate_shipping_address && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newSelection = {
                ...selection,
                shipToAddress: { type: 'shipping' as const, address: getAddressData('shipping') }
              };
              setSelection(newSelection);
              onAddressSelection(newSelection);
            }}
          >
            Use Shipping Address
          </Button>
        )}
      </div>
    </div>
  );
}
