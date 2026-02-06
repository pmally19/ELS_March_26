import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, ArrowLeft, Building2, Factory, Warehouse, TrendingUp, Briefcase, Package, Users, Receipt, CreditCard, Truck, Globe, FileText, BarChart3, Shield, Tags, Boxes, Clock, Settings, Database, Hash, Calculator, Grid3x3, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import UnifiedMasterDataTile from "@/components/master-data/UnifiedMasterDataTile";

interface MasterDataCategory {
  id: string;
  name: string;
  count: number;
  tiles: string[];
}

// Icon mapping for each tile
const tileIcons: Record<string, any> = {
  'company-code': Building2,
  'plant': Factory,
  'storage-location': Warehouse,
  'sales-organization': TrendingUp,
  'account-groups': Briefcase,
  'reconciliation-accounts': FileText,
  'valuation-classes': Tags,
  'material-types': Package,
  'tax-codes': Receipt,
  'payment-terms': CreditCard,
  'incoterms': Globe,
  'price-lists': BarChart3,
  'discount-groups': Tags,
  'credit-limit-groups': Shield,
  'business-areas': Building2,
  'shipping-conditions': Truck,
  'shipping-point': Truck,
  'transportation-zones': Globe,
  'route-schedules': Clock,
  'warehouse-types': Warehouse,
  'movement-types': Boxes,
  'movement-transaction-types': Tags,
  'reason-codes': FileText,
  'quality-grades': Shield,
  'batch-classes': Package,
  'serial-number-profiles': Hash,
  'depreciation-areas': BarChart3,
  'document-types': FileText,
  'number-ranges': Hash,
  'sales-document-categories': FileText,
  'material-plant': Factory,
  'distribution-channels': TrendingUp,
  'sd-document-types': FileText,
  'mrp-controllers': Settings,
  'routing': Settings,
  'account-types': Briefcase,
  'accounting-principles': FileText,
  'tolerance-groups': Shield,
  'management-control-areas': Building2,
  'ledgers': Database,
  'item-categories': Tags,
  'condition-categories': Tags,
  'calculation-methods': Calculator,
  'item-category-groups': Grid3x3,
  'fiscal-calendar': Calendar,
};

// Category color mapping
const categoryColors: Record<string, { bg: string; text: string; badge: string }> = {
  'financial': { bg: 'from-blue-50 to-blue-100', text: 'text-blue-700', badge: 'bg-blue-500' },
  'materials': { bg: 'from-purple-50 to-purple-100', text: 'text-purple-700', badge: 'bg-purple-500' },
  'vendors': { bg: 'from-pink-50 to-pink-100', text: 'text-pink-700', badge: 'bg-pink-500' },
  'sales': { bg: 'from-green-50 to-green-100', text: 'text-green-700', badge: 'bg-green-500' },
  'logistics': { bg: 'from-orange-50 to-orange-100', text: 'text-orange-700', badge: 'bg-orange-500' },
  'organizational': { bg: 'from-indigo-50 to-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-500' },
  'inventory': { bg: 'from-teal-50 to-teal-100', text: 'text-teal-700', badge: 'bg-teal-500' },
  'operations': { bg: 'from-amber-50 to-amber-100', text: 'text-amber-700', badge: 'bg-amber-500' },
  'quality': { bg: 'from-cyan-50 to-cyan-100', text: 'text-cyan-700', badge: 'bg-cyan-500' },
  'tracking': { bg: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-500' },
  'system': { bg: 'from-gray-50 to-gray-100', text: 'text-gray-700', badge: 'bg-gray-500' },
};

// Better descriptions for tiles
const tileDescriptions: Record<string, string> = {
  'company-code': 'Manage legal entities and organizational units',
  'plant': 'Configure production and distribution sites',
  'storage-location': 'Define warehouse and storage facilities',
  'sales-organization': 'Set up sales structures and hierarchies',
  'account-groups': 'Organize chart of accounts classifications',
  'material-types': 'Define material categories and types',
  'tax-codes': 'Configure tax rates and jurisdictions',
  'payment-terms': 'Set payment conditions and discounts',
  'credit-limit-groups': 'Manage customer credit policies',
  'warehouse-types': 'Define storage types and characteristics',
  'movement-types': 'Configure inventory movement types (101, 102, 201)',
  'movement-transaction-types': 'Configure transaction type categories for movements',
  'item-categories': 'Define sales & distribution item categories',
  'condition-categories': 'Manage pricing condition categories',
  'calculation-methods': 'Define methods and formulas for pricing',
  'item-category-groups': 'Classify materials for sales item determination',
  'fiscal-calendar': 'Manage fiscal calendars and posting periods',
};

const masterDataCategories: MasterDataCategory[] = [
  {
    id: 'financial',
    name: 'Financial',
    count: 9,
    tiles: ['fiscal-calendar', 'account-groups', 'reconciliation-accounts', 'valuation-classes', 'payment-terms', 'tax-codes', 'business-areas', 'account-types', 'ledgers', 'accounting-principles', 'tolerance-groups', 'management-control-areas', 'document-splitting']
  },
  {
    id: 'materials',
    name: 'Materials',
    count: 4,
    tiles: ['material-types', 'material-plant', 'mrp-controllers', 'item-categories']
  },
  {
    id: 'vendors',
    name: 'Vendors',
    count: 1,
    tiles: []
  },
  {
    id: 'sales',
    name: 'Sales',
    count: 6,
    tiles: ['price-lists', 'discount-groups', 'credit-limit-groups', 'distribution-channels', 'sd-document-types', 'sales-document-categories', 'item-categories', 'condition-categories', 'calculation-methods', 'item-category-groups']
  },
  {
    id: 'logistics',
    name: 'Logistics',
    count: 5,
    tiles: ['incoterms', 'shipping-conditions', 'shipping-point', 'transportation-zones', 'route-schedules']
  },
  {
    id: 'organizational',
    name: 'Organizational',
    count: 4,
    tiles: ['company-code', 'plant', 'storage-location', 'sales-organization']
  },
  {
    id: 'inventory',
    name: 'Inventory',
    count: 3,
    tiles: ['warehouse-types', 'movement-types', 'movement-transaction-types']
  },
  {
    id: 'operations',
    name: 'Operations',
    count: 2,
    tiles: ['reason-codes', 'routing']
  },
  {
    id: 'quality',
    name: 'Quality',
    count: 2,
    tiles: ['quality-grades', 'batch-classes']
  },
  {
    id: 'tracking',
    name: 'Tracking',
    count: 1,
    tiles: ['serial-number-profiles']
  },
  {
    id: 'system',
    name: 'System',
    count: 2,
    tiles: ['document-types', 'number-ranges']
  }
];

const tileConfigurations = {
  'account-groups': {
    title: 'Account Groups',
    apiEndpoint: '/api/master-data/account-groups',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'accountType', label: 'Account Type', type: 'select', options: ['CUSTOMER', 'VENDOR', 'GL'] },
      { key: 'numberRangeFrom', label: 'Number Range From', type: 'text' },
      { key: 'numberRangeTo', label: 'Number Range To', type: 'text' }
    ]
  },
  'reconciliation-accounts': {
    title: 'Reconciliation Accounts',
    apiEndpoint: '/api/master-data/reconciliation-accounts',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'glAccount', label: 'GL Account', type: 'text', required: true },
      { key: 'reconciliationType', label: 'Reconciliation Type', type: 'select', options: ['AUTOMATIC', 'MANUAL', 'PERIODIC'] }
    ]
  },
  'valuation-classes': {
    title: 'Valuation Classes',
    apiEndpoint: '/api/master-data/valuation-classes',
    fields: [
      { key: 'class_code', label: 'Valuation Class', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'allowed_material_types', label: 'Allowed Material Types', type: 'multiselect' }
    ]
  },
  'material-types': {
    title: 'Material Types',
    apiEndpoint: '/api/master-data/material-types',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'typeCategory', label: 'Type Category', type: 'select', options: ['RAW', 'FINISHED', 'SEMI_FINISHED', 'SERVICES'] },
      { key: 'inventoryManaged', label: 'Inventory Managed', type: 'checkbox' },
      { key: 'procurementType', label: 'Procurement Type', type: 'select', options: ['In-house production', 'External procurement', 'Both'] }
    ]
  },
  'tax-codes': {
    title: 'Tax Codes',
    apiEndpoint: '/api/master-data/tax-codes',
    fields: [
      { key: 'taxCode', label: 'Tax Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'taxRate', label: 'Tax Rate (%)', type: 'number', required: true },
      { key: 'taxType', label: 'Tax Type', type: 'select', options: ['INPUT', 'OUTPUT', 'WITHHOLDING'] },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
      { key: 'effectiveFrom', label: 'Effective From', type: 'date' }
    ]
  },
  'payment-terms': {
    title: 'Payment Terms',
    apiEndpoint: '/api/master-data/payment-terms',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'paymentDays', label: 'Payment Days', type: 'number', required: true },
      { key: 'discountDays', label: 'Discount Days', type: 'number' },
      { key: 'discountPercent', label: 'Discount %', type: 'number' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD'] }
    ]
  },
  'incoterms': {
    title: 'Incoterms',
    apiEndpoint: '/api/master-data/incoterms',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'riskTransferPoint', label: 'Risk Transfer Point', type: 'text' },
      { key: 'costResponsibility', label: 'Cost Responsibility', type: 'text' },
      { key: 'applicableTransport', label: 'Applicable Transport', type: 'select', options: ['SEA', 'LAND', 'AIR', 'MULTIMODAL'] }
    ]
  },
  'price-lists': {
    title: 'Price Lists',
    apiEndpoint: '/api/master-data/price-lists',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'currency', label: 'Currency', type: 'text', required: true },
      { key: 'validFrom', label: 'Valid From', type: 'date', required: true },
      { key: 'validTo', label: 'Valid To', type: 'date' },
      { key: 'priceType', label: 'Price Type', type: 'select', options: ['STANDARD', 'PROMOTIONAL', 'VOLUME', 'CONTRACT'] }
    ]
  },
  'discount-groups': {
    title: 'Discount Groups',
    apiEndpoint: '/api/master-data/discount-groups',
    route: '/master-data/discount-groups',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'discountPercent', label: 'Discount %', type: 'number', required: true },
      { key: 'discountType', label: 'Discount Type', type: 'select', options: ['PERCENTAGE', 'FIXED_AMOUNT'], required: true },
      { key: 'minimumOrderValue', label: 'Minimum Order Value', type: 'number' },
      { key: 'customerCategory', label: 'Customer Category', type: 'text' }
    ]
  },
  'credit-limit-groups': {
    title: 'Credit Limit Groups',
    apiEndpoint: '/api/master-data/credit-limit-groups',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'creditLimit', label: 'Credit Limit', type: 'number', required: true },
      { key: 'currency', label: 'Currency', type: 'text', required: true },
      { key: 'riskCategory', label: 'Risk Category', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'], required: true },
      { key: 'paymentTermsCode', label: 'Payment Terms Code', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'business-areas': {
    title: 'Business Areas',
    apiEndpoint: '/api/master-data/business-areas',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'company_code_id', label: 'Company Code', type: 'select', options: [] },
      { key: 'parent_business_area_code', label: 'Parent Business Area Code', type: 'text' },
      { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]
  },
  'shipping-conditions': {
    title: 'Shipping Conditions',
    apiEndpoint: '/api/sales-distribution/shipping-conditions',
    fields: [
      { key: 'conditionCode', label: 'Condition Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'loadingGroup', label: 'Loading Group', type: 'text' },
      { key: 'plantCode', label: 'Plant (Delivering)', type: 'text' },
      { key: 'proposedShippingPoint', label: 'Proposed Shipping Point', type: 'text' },
      { key: 'manualShippingPointAllowed', label: 'Manual Shipping Point Allowed', type: 'checkbox' },
      { key: 'countryOfDeparture', label: 'Country of Departure', type: 'text' },
      { key: 'departureZone', label: 'Departure Zone', type: 'text' },
      { key: 'transportationGroup', label: 'Transportation Group', type: 'text' },
      { key: 'countryOfDestination', label: 'Country of Destination', type: 'text' },
      { key: 'receivingZone', label: 'Receiving Zone', type: 'text' },
      { key: 'weightGroup', label: 'Weight Group', type: 'text' },
      { key: 'proposedRoute', label: 'Proposed Route', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'shipping-point': {
    title: 'Shipping Point',
    apiEndpoint: '/api/master-data/shipping-point',
    route: '/master-data/shipping-point',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'plantCode', label: 'Plant Code', type: 'text', required: true },
      { key: 'factoryCalendar', label: 'Factory Calendar', type: 'text' }
    ]
  },
  'transportation-zones': {
    title: 'Transportation Zones',
    apiEndpoint: '/api/master-data/transportation-zones',
    fields: [
      { key: 'code', label: 'Zone Code', type: 'text', required: true },
      { key: 'name', label: 'Zone Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'postalCodeRange', label: 'Postal Code Range', type: 'text' },
      { key: 'shippingCostMultiplier', label: 'Shipping Cost Multiplier', type: 'number' }
    ]
  },
  'route-schedules': {
    title: 'Route Schedules',
    apiEndpoint: '/api/master-data/route-schedules',
    fields: [
      { key: 'code', label: 'Route Code', type: 'text', required: true },
      { key: 'name', label: 'Route Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'routeType', label: 'Route Type', type: 'select', options: ['DAILY', 'WEEKLY', 'MONTHLY'], required: true },
      { key: 'departureTime', label: 'Departure Time (HH:MM)', type: 'text' },
      { key: 'arrivalTime', label: 'Arrival Time (HH:MM)', type: 'text' },
      { key: 'frequency', label: 'Frequency', type: 'text' },
      { key: 'transportationZoneId', label: 'Transportation Zone ID', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'warehouse-types': {
    title: 'Warehouse Types',
    apiEndpoint: '/api/master-data/warehouse-types',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'storageType', label: 'Storage Type', type: 'select', options: ['AMBIENT', 'REFRIGERATED', 'FROZEN', 'HAZMAT'], required: true },
      { key: 'temperatureRange', label: 'Temperature Range', type: 'text' },
      { key: 'specialRequirements', label: 'Special Requirements', type: 'text' },
      { key: 'handlingEquipment', label: 'Handling Equipment', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'movement-types': {
    title: 'Movement Types',
    apiEndpoint: '/api/master-data/movement-types',
    route: '/master-data/movement-types',
    fields: [
      { key: 'code', label: 'Movement Code', type: 'text', required: true },
      { key: 'name', label: 'Movement Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'movementCategory', label: 'Movement Category', type: 'select', options: ['GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER', 'ADJUSTMENT'] },
      { key: 'stockImpact', label: 'Stock Impact', type: 'select', options: ['INCREASE', 'DECREASE', 'NEUTRAL'] },
      { key: 'requiresApproval', label: 'Requires Approval', type: 'checkbox' }
    ]
  },
  'movement-transaction-types': {
    title: 'Movement Transaction Types',
    apiEndpoint: null as any,
    route: '/master-data/movement-transaction-types',
    fields: null
  },
  'reason-codes': {
    title: 'Reason Codes',
    apiEndpoint: '/api/master-data/reason-codes',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'reasonCategory', label: 'Reason Category', type: 'select', options: ['QUALITY_ISSUE', 'DAMAGE', 'OBSOLETE', 'CORRECTION', 'OTHER'] },
      { key: 'requiresDocumentation', label: 'Requires Documentation', type: 'checkbox' },
      { key: 'financialImpact', label: 'Financial Impact', type: 'select', options: ['NONE', 'COST_CENTER', 'PROFIT_LOSS'] }
    ]
  },
  'quality-grades': {
    title: 'Quality Grades',
    apiEndpoint: '/api/master-data/quality-grades',
    fields: [
      { key: 'code', label: 'Grade Code', type: 'text', required: true },
      { key: 'name', label: 'Grade Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'qualityLevel', label: 'Quality Level', type: 'select', options: ['A', 'B', 'C', 'REJECT'] },
      { key: 'tolerancePercentage', label: 'Tolerance %', type: 'number' },
      { key: 'inspectionRequired', label: 'Inspection Required', type: 'checkbox' }
    ]
  },
  'batch-classes': {
    title: 'Batch Classes',
    apiEndpoint: '/api/master-data/batch-classes',
    route: '/master-data/batch-classes',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'batchNumberFormat', label: 'Batch Number Format', type: 'text' },
      { key: 'shelfLifeDays', label: 'Shelf Life (days)', type: 'number' },
      { key: 'expirationRequired', label: 'Expiration Required', type: 'checkbox' },
      { key: 'lotTrackingRequired', label: 'Lot Tracking Required', type: 'checkbox' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'serial-number-profiles': {
    title: 'Serial Number Profiles',
    apiEndpoint: '/api/master-data/serial-number-profiles',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'serialNumberFormat', label: 'Serial Number Format', type: 'text' },
      { key: 'serialNumberLength', label: 'Serial Number Length', type: 'number' },
      { key: 'trackingLevel', label: 'Tracking Level', type: 'select', options: ['UNIT', 'BATCH', 'LOT'], required: true },
      { key: 'warrantyTracking', label: 'Warranty Tracking', type: 'checkbox' }
    ]
  },
  'depreciation-areas': {
    title: 'Depreciation Areas',
    apiEndpoint: '/api/master-data/depreciation-areas',
    route: '/master-data/depreciation-areas',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'company_code_id', label: 'Company Code', type: 'select', options: [] },
      { key: 'calculation_method', label: 'Calculation Method', type: 'select', options: ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION', 'SUM_OF_YEARS'] },
      { key: 'useful_life_years', label: 'Useful Life (Years)', type: 'number' },
      { key: 'depreciation_rate', label: 'Depreciation Rate (%)', type: 'number' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]
  },
  'document-types': {
    title: 'Document Types',
    apiEndpoint: '/api/master-data/document-types',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'documentCategory', label: 'Document Category', type: 'select', options: [], dynamicOptions: '/api/master-data/document-categories' },
      { key: 'numberRangeId', label: 'Number Range ID', type: 'number' },
      { key: 'requiresApproval', label: 'Requires Approval', type: 'checkbox' },
      { key: 'approvalWorkflow', label: 'Approval Workflow', type: 'text' }
    ]
  },
  'number-ranges': {
    title: 'Number Ranges',
    apiEndpoint: '/api/master-data/number-ranges',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'objectType', label: 'Object Type', type: 'select', options: ['SALES_ORDER', 'INVOICE', 'PURCHASE_ORDER', 'MATERIAL'] },
      { key: 'numberFrom', label: 'Number From', type: 'text', required: true },
      { key: 'numberTo', label: 'Number To', type: 'text', required: true },
      { key: 'currentNumber', label: 'Current Number', type: 'text', required: true },
      { key: 'increment', label: 'Increment', type: 'number' },
      { key: 'prefix', label: 'Prefix', type: 'text' },
      { key: 'suffix', label: 'Suffix', type: 'text' }
    ]
  },
  'sales-document-categories': {
    title: 'Sales Document Categories',
    apiEndpoint: '/api/master-data/sales-document-categories',
    route: '/master-data/sales-document-categories',
    fields: [
      { key: 'categoryCode', label: 'Category Code', type: 'text', required: true },
      { key: 'categoryName', label: 'Category Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'deliveryRelevant', label: 'Delivery Relevant', type: 'checkbox' },
      { key: 'billingRelevant', label: 'Billing Relevant', type: 'checkbox' },
      { key: 'pricingRequired', label: 'Pricing Required', type: 'checkbox' }
    ]
  },
  'material-plant': {
    title: 'Material-Plant Relationships',
    apiEndpoint: null as any, // This is a full page, not a unified tile
    route: '/master-data/material?tab=material-plants',
    fields: []
  },
  'distribution-channels': {
    title: 'Distribution Channels',
    apiEndpoint: '/api/master-data/distribution-channels',
    route: '/master-data/distribution-channels',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'channelType', label: 'Channel Type', type: 'select', options: ['Direct', 'Retail', 'Wholesale', 'Online', 'Export'] },
      { key: 'salesOrganizationCode', label: 'Sales Organization', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'sd-document-types': {
    title: 'Sales Document Types',
    apiEndpoint: '/api/master-data/sd-document-types',
    route: '/master-data/sd-document-types',
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['ORDER', 'DELIVERY', 'BILLING'], required: true },
      { key: 'numberRange', label: 'Number Range', type: 'text' },
      { key: 'defaultShippingCondition', label: 'Default Shipping Condition', type: 'text' },
      { key: 'isActive', label: 'Active', type: 'checkbox' }
    ]
  },
  'mrp-controllers': {
    title: 'MRP Controllers',
    apiEndpoint: '/api/master-data/mrp-controllers', // API endpoint exists
    route: '/master-data/mrp-controllers', // Full page route
    fields: [
      { key: 'controller_code', label: 'Controller Code', type: 'text', required: true },
      { key: 'controller_name', label: 'Controller Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]
  },
  'routing': {
    title: 'Routing',
    apiEndpoint: null as any, // This is a full page, not a unified tile
    route: '/master-data/routing',
    fields: []
  },
  'account-types': {
    title: 'Account Types',
    apiEndpoint: null as any,
    route: '/master-data/account-types',
    fields: null // Full page component
  },
  'accounting-principles': {
    title: 'Accounting Principles',
    apiEndpoint: null as any,
    route: '/master-data/accounting-principles',
    fields: null // Full page component
  },
  'tolerance-groups': {
    title: 'Tolerance Groups',
    apiEndpoint: null as any,
    route: '/master-data/tolerance-groups',
    fields: null // Full page component
  },
  'management-control-areas': {
    title: 'Management Control Areas',
    apiEndpoint: null as any,
    route: '/master-data/management-control-areas',
    fields: null // Full page component
  },
  'ledgers': {
    title: 'Ledgers',
    apiEndpoint: null as any,
    route: '/master-data/ledgers',
    fields: null // Full page component
  },
  'item-categories': {
    title: 'Item Categories',
    apiEndpoint: null as any,
    route: '/master-data/item-categories',
    fields: null
  },
  'condition-categories': {
    title: 'Condition Categories',
    apiEndpoint: null as any,
    route: '/master-data/condition-categories',
    fields: null
  },
  'calculation-methods': {
    title: 'Calculation Types',
    apiEndpoint: null as any,
    route: '/master-data/calculation-methods',
    fields: null
  },
  'item-category-groups': {
    title: 'Item Category Groups',
    apiEndpoint: null as any,
    route: '/master-data/item-category-groups',
    fields: null
  },
  'fiscal-calendar': {
    title: 'Fiscal Calendar',
    apiEndpoint: null as any,
    route: '/master-data/fiscal-calendar',
    fields: null
  }
};

export default function MasterData() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allTiles, setAllTiles] = useState<string[]>([]);
  const [filteredTiles, setFilteredTiles] = useState<string[]>([]);

  // Initialize tiles on component mount
  useEffect(() => {
    const tiles = Object.keys(tileConfigurations);
    setAllTiles(tiles);
    setFilteredTiles(tiles);

    // Debug: Verify Account Types tile is loaded
    if (tiles.includes('account-types')) {
      console.log('✅ Account Types tile is loaded');
      const accountTypesTileConfig = tileConfigurations['account-types'];
      console.log('Account Types Tile Config:', {
        title: accountTypesTileConfig?.title,
        route: (accountTypesTileConfig as any)?.route,
        hasApiEndpoint: !!accountTypesTileConfig?.apiEndpoint,
        fieldsCount: accountTypesTileConfig?.fields?.length || 0
      });
      // Verify it's in Financial category
      const financialCategory = masterDataCategories.find(cat => cat.id === 'financial');
      if (financialCategory?.tiles.includes('account-types')) {
        console.log('✅ Account Types is in Financial category');
      } else {
        console.error('❌ Account Types NOT in Financial category!');
        console.log('Financial category tiles:', financialCategory?.tiles);
      }
    } else {
      console.error('❌ Account Types tile NOT found in configuration');
      console.log('Available tiles:', tiles);
      console.log('Total tiles:', tiles.length);
    }

    // Debug: Verify MRP Controllers tile is loaded
    if (tiles.includes('mrp-controllers')) {
      console.log('✅ MRP Controllers tile is loaded');
      const mrpTileConfig = tileConfigurations['mrp-controllers'];
      console.log('MRP Tile Config:', {
        title: mrpTileConfig?.title,
        route: (mrpTileConfig as any)?.route,
        hasApiEndpoint: !!mrpTileConfig?.apiEndpoint,
        fieldsCount: mrpTileConfig?.fields?.length || 0
      });
      // Verify it's in Materials category
      const materialsCategory = masterDataCategories.find(cat => cat.id === 'materials');
      if (materialsCategory?.tiles.includes('mrp-controllers')) {
        console.log('✅ MRP Controllers is in Materials category');
      } else {
        console.error('❌ MRP Controllers NOT in Materials category!');
        console.log('Materials category tiles:', materialsCategory?.tiles);
      }
    } else {
      console.error('❌ MRP Controllers tile NOT found in configuration');
      console.log('Available tiles:', tiles.slice(0, 10), '... (showing first 10)');
      console.log('Total tiles:', tiles.length);
    }

    // Debug: Verify Ledgers tile is loaded
    if (tiles.includes('ledgers')) {
      console.log('✅ Ledgers tile is loaded');
      const ledgersTileConfig = tileConfigurations['ledgers'];
      console.log('Ledgers Tile Config:', {
        title: ledgersTileConfig?.title,
        route: (ledgersTileConfig as any)?.route,
        hasApiEndpoint: !!ledgersTileConfig?.apiEndpoint,
        fieldsCount: ledgersTileConfig?.fields?.length || 0
      });
      // Verify it's in Financial category
      const financialCategory = masterDataCategories.find(cat => cat.id === 'financial');
      if (financialCategory?.tiles.includes('ledgers')) {
        console.log('✅ Ledgers is in Financial category');
        console.log('Financial category tiles:', financialCategory?.tiles);
      } else {
        console.error('❌ Ledgers NOT in Financial category!');
        console.log('Financial category tiles:', financialCategory?.tiles);
      }
    } else {
      console.error('❌ Ledgers tile NOT found in configuration');
      console.log('Available tiles:', tiles);
    }
  }, []);

  // Filter tiles based on search query and category
  useEffect(() => {
    // When searching, search across ALL tiles regardless of category
    if (searchQuery.trim() !== "") {
      const allTiles = Object.keys(tileConfigurations);
      const searchLower = searchQuery.toLowerCase().trim();

      // Split search into words for better matching
      const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);

      const filtered = allTiles.filter((tileKey) => {
        const tileConfig = tileConfigurations[tileKey as keyof typeof tileConfigurations];
        if (!tileConfig) return false;

        const category = masterDataCategories.find(cat => cat.tiles.includes(tileKey));
        const titleLower = tileConfig.title.toLowerCase();
        const keyLower = tileKey.toLowerCase();

        // Normalize search: convert spaces to dashes for key matching
        const searchNormalized = searchLower.replace(/\s+/g, '-');
        const searchNormalizedSpaces = searchLower.replace(/-/g, ' ');

        // Exact match on full search string (with both space and dash variations)
        const matchesTitle = titleLower.includes(searchLower) || titleLower.includes(searchNormalized) || titleLower.includes(searchNormalizedSpaces);
        const matchesKey = keyLower.includes(searchLower) || keyLower.includes(searchNormalized) || keyLower.includes(searchNormalizedSpaces);
        const matchesCategory = category && category.name.toLowerCase().includes(searchLower);

        // For multi-word searches, require ALL words to match
        let allWordsMatch = false;
        if (searchWords.length > 1) {
          // Check if ALL words appear in title
          const allWordsInTitle = searchWords.every(word => titleLower.includes(word));
          // Check if ALL words appear in key (with dash conversion)
          const allWordsInKey = searchWords.every(word =>
            keyLower.includes(word) ||
            keyLower.includes(word.replace(/\s+/g, '-')) ||
            keyLower.includes(word.replace(/-/g, ''))
          );
          allWordsMatch = allWordsInTitle || allWordsInKey;

        }

        // Single word matching - handle concatenated words like "salescategories"
        const titleWithoutSpaces = titleLower.replace(/\s+/g, '');
        const keyWithoutDashes = keyLower.replace(/-/g, '');
        const searchWithoutSpaces = searchWords[0]?.replace(/\s+/g, '') || '';

        // Handle plural/singular matching (e.g., "ledger" matches "ledgers")
        const searchWord = searchWords[0] || '';
        const searchWordPlural = searchWord + 's';
        const searchWordSingular = searchWord.endsWith('s') ? searchWord.slice(0, -1) : searchWord;

        const singleWordMatch = searchWords.length === 1 && (
          titleLower.includes(searchWords[0]) ||
          keyLower.includes(searchWords[0]) ||
          keyLower.includes(searchWords[0].replace(/\s+/g, '-')) ||
          keyLower.includes(searchWords[0].replace(/-/g, '')) ||
          titleWithoutSpaces.includes(searchWithoutSpaces) ||
          keyWithoutDashes.includes(searchWithoutSpaces) ||
          searchWithoutSpaces.includes(titleWithoutSpaces) ||
          searchWithoutSpaces.includes(keyWithoutDashes) ||
          // Plural/singular matching
          (searchWord.length > 0 && keyLower.includes(searchWordPlural)) ||
          (searchWord.length > 0 && keyLower.includes(searchWordSingular)) ||
          (searchWord.length > 0 && titleLower.includes(searchWordPlural)) ||
          (searchWord.length > 0 && titleLower.includes(searchWordSingular)) ||
          (searchWord.length > 0 && keyLower === searchWordPlural) ||
          (searchWord.length > 0 && keyLower === searchWordSingular) ||
          (searchWord.length > 0 && keyLower.startsWith(searchWord)) ||
          (searchWord.length > 0 && titleLower.startsWith(searchWord))
        );

        // Also check if search matches any part of the title (only for single word)
        const titleWords = titleLower.split(' ');
        const matchesTitleWord = searchWords.length === 1 && titleWords.some(word => word.includes(searchWords[0]) || searchWords[0].includes(word));

        const willMatch = matchesTitle || matchesCategory || matchesKey || allWordsMatch || singleWordMatch || matchesTitleWord;

        return willMatch;
      });

      console.log('🔍 Final filtered tiles for search:', {
        searchQuery,
        filteredCount: filtered.length,
        firstFew: filtered.slice(0, 5)
      });

      setFilteredTiles(filtered);
    } else {
      // No search - filter by selected category
      const tilesToFilter = selectedCategory === 'all'
        ? Object.keys(tileConfigurations)
        : masterDataCategories.find(cat => cat.id === selectedCategory)?.tiles || [];

      console.log('🔍 No search - category filter:', {
        selectedCategory,
        tilesCount: tilesToFilter.length
      });

      setFilteredTiles(tilesToFilter);
    }
  }, [searchQuery, selectedCategory]);

  const getVisibleTiles = () => {
    const visible = filteredTiles;

    // Debug: Log visible tiles count and check for MRP Controllers
    if (visible.length > 0) {
      const hasMrp = visible.includes('mrp-controllers');
      if (!hasMrp && (selectedCategory === 'all' || selectedCategory === 'materials')) {
        console.warn('⚠️ MRP Controllers not in visible tiles:', {
          visibleCount: visible.length,
          selectedCategory,
          searchQuery,
          allTilesHasMrp: allTiles.includes('mrp-controllers'),
          filteredTilesHasMrp: filteredTiles.includes('mrp-controllers')
        });
      }
    }

    return visible;
  };

  const handleRefresh = () => {
    // Reset search and refresh tiles
    setSearchQuery("");
    const tiles = Object.keys(tileConfigurations);
    setAllTiles(tiles);
    setFilteredTiles(tiles);
  };

  if (selectedTile) {
    const tileConfig = tileConfigurations[selectedTile as keyof typeof tileConfigurations];

    // If tile has a route, navigate to it instead of showing unified tile
    if ((tileConfig as any).route) {
      setLocation((tileConfig as any).route);
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => setSelectedTile(null)}
              className="mb-4"
            >
              ← Back to Master Data
            </Button>
            <h1 className="text-3xl font-bold">{tileConfig.title}</h1>
            <p className="text-muted-foreground">Manage {tileConfig.title.toLowerCase()} configuration</p>
          </div>
        </div>

        <UnifiedMasterDataTile
          tileId={selectedTile}
        />
      </div>
    );
  }

  return (
    // External Scroll Container - Full viewport height with page-fit
    <div className="h-screen overflow-y-auto overflow-x-hidden dual-scroll-external">
      {/* Fixed Header Section */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Master Data Management</h1>
            <p className="text-muted-foreground">Configure and manage all master data entities</p>
          </div>
        </div>

        {/* Search Bar with Refresh Button */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search master data tiles..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Refresh master data tiles"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-muted-foreground mt-2">
            Showing results for "{searchQuery}" • {filteredTiles.length} items found
          </div>
        )}
      </div>

      {/* Internal Scroll Container - Page-adjusted content area */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden p-6 space-y-6 dual-scroll-internal">
        {/* Category Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Master Data Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="flex items-center gap-2"
              >
                All
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(tileConfigurations).length}
                </Badge>
              </Button>
              {masterDataCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.name}
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Master Data Tiles Grid - Internal scrollable content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[600px]">
          {(() => {
            const visibleTiles = getVisibleTiles();
            console.log('🎨 Rendering tiles:', {
              visibleCount: visibleTiles.length,
              visibleTiles: visibleTiles.slice(0, 10),
              searchQuery: searchQuery || '(empty)',
              selectedCategory
            });
            return visibleTiles.map((tileKey) => {
              const tileConfig = tileConfigurations[tileKey as keyof typeof tileConfigurations];
              const category = masterDataCategories.find(cat => cat.tiles.includes(tileKey));

              // Safety check: skip rendering if tileConfig is missing
              if (!tileConfig) {
                console.warn(`Tile configuration missing for: ${tileKey}`);
                return null;
              }

              // Debug: Log Account Types tile when rendering
              if (tileKey === 'account-types') {
                console.log('🎨 Rendering Account Types tile:', {
                  tileKey,
                  title: tileConfig.title,
                  hasRoute: !!(tileConfig as any).route,
                  category: category?.name,
                  fieldsCount: tileConfig.fields?.length
                });
              }

              // Debug: Log MRP Controllers tile when rendering
              if (tileKey === 'mrp-controllers') {
                console.log('🎨 Rendering MRP Controllers tile:', {
                  tileKey,
                  title: tileConfig.title,
                  hasRoute: !!(tileConfig as any).route,
                  category: category?.name
                });
              }

              // Debug: Log Ledgers tile when rendering
              if (tileKey === 'ledgers') {
                console.log('🎨 Rendering Ledgers tile:', {
                  tileKey,
                  title: tileConfig.title,
                  hasRoute: !!(tileConfig as any).route,
                  category: category?.name,
                  fieldsCount: tileConfig.fields?.length || 0
                });
              }


              const IconComponent = tileIcons[tileKey] || Settings;
              const categoryColor = category ? categoryColors[category.id] : categoryColors['system'];
              const description = tileDescriptions[tileKey] || ((tileConfig as any).route
                ? `Access ${tileConfig.title.toLowerCase()} page`
                : `Configure ${tileConfig.title.toLowerCase()} settings and data`);

              return (
                <Card
                  key={tileKey}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-fit relative overflow-hidden border-2 hover:border-opacity-50"
                  onClick={() => {
                    if ((tileConfig as any).route) {
                      setLocation((tileConfig as any).route);
                    } else {
                      setSelectedTile(tileKey);
                    }
                  }}
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${categoryColor?.bg || 'from-gray-50 to-gray-100'} opacity-40 group-hover:opacity-60 transition-opacity`} />

                  {/* Content */}
                  <div className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        {/* Icon circle */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${categoryColor?.badge || 'bg-gray-500'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>

                        {/* Title and category */}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold group-hover:text-opacity-90 transition-colors">
                            {tileConfig.title}
                          </CardTitle>
                          {category && (
                            <Badge variant="outline" className="text-xs mt-1 border-current">
                              {category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <CardDescription className="text-xs leading-relaxed min-h-[2.5rem]">
                        {description}
                      </CardDescription>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <Badge variant="secondary" className="text-xs font-medium">
                          {(tileConfig as any).route ? '📄 Full Page' : `📋 ${tileConfig.fields?.length || 0} fields`}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                          {(tileConfig as any).route ? 'Open' : 'Manage'}
                          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            });
          })()}
        </div>

        {selectedCategory !== 'all' && (
          <div className="text-center text-muted-foreground text-sm mt-8 pb-8">
            Showing {getVisibleTiles().length} tiles in {masterDataCategories.find(cat => cat.id === selectedCategory)?.name} category
          </div>
        )}
      </div>
    </div>
  );
}