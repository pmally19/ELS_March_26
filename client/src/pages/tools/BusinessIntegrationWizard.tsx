import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building, 
  Factory, 
  Users, 
  Package, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Plus,
  Trash2,
  Globe,
  Palette,
  Wrench,
  ShoppingCart,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BusinessTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  industry: string;
  complexity: 'Simple' | 'Moderate' | 'Complex';
  features: string[];
  glAccounts: any[];
  sampleData: any;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface CompanyData {
  code: string;
  name: string;
  industry: string;
  country: string;
  currency: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
}

interface PlantData {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
}

interface CustomerVendorData {
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}

interface MaterialData {
  code: string;
  name: string;
  type: string;
  unit: string;
  price: number;
  description: string;
}

const businessTemplates: BusinessTemplate[] = [
  {
    id: 'paint-manufacturing',
    name: 'Paint Manufacturing',
    description: 'Complete setup for paint and coating manufacturers',
    icon: <Palette className="h-8 w-8 text-blue-600" />,
    industry: 'Manufacturing',
    complexity: 'Complex',
    features: ['Raw Materials Management', 'Chemical Inventory', 'Color Formulation', 'Quality Control'],
    glAccounts: [
      { number: '1000', name: 'Cash - Operating Account', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable - Trade', type: 'ASSET' },
      { number: '1200', name: 'Inventory - Raw Materials', type: 'ASSET' },
      { number: '1210', name: 'Inventory - Paint Products', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable - Trade', type: 'LIABILITY' },
      { number: '4000', name: 'Sales Revenue - Paint Products', type: 'REVENUE' },
      { number: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Home Depot', type: 'Commercial' },
        { name: 'Sherwin-Williams', type: 'Commercial' },
        { name: 'ABC Painting Contractors', type: 'Contractor' }
      ],
      vendors: [
        { name: 'TiO2 Suppliers Inc', type: 'Raw Materials' },
        { name: 'Pigment Solutions LLC', type: 'Raw Materials' },
        { name: 'Container Corp', type: 'Packaging' }
      ],
      materials: [
        { name: 'Premium Interior Paint', type: 'FINISHED_GOOD', unit: 'Gallon' },
        { name: 'Titanium Dioxide', type: 'RAW_MATERIAL', unit: 'Pound' },
        { name: 'Paint Can - 1 Gallon', type: 'PACKAGING', unit: 'Each' }
      ]
    }
  },
  {
    id: 'automotive-parts',
    name: 'Automotive Parts',
    description: 'Setup for automotive parts manufacturers and distributors',
    icon: <Wrench className="h-8 w-8 text-green-600" />,
    industry: 'Automotive',
    complexity: 'Complex',
    features: ['Parts Catalog', 'OEM Integration', 'Warranty Tracking', 'Inventory Management'],
    glAccounts: [
      { number: '1000', name: 'Cash - Operating Account', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { number: '1200', name: 'Parts Inventory', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Parts Sales Revenue', type: 'REVENUE' },
      { number: '5000', name: 'Cost of Parts Sold', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'AutoZone', type: 'Retailer' },
        { name: 'Ford Service Centers', type: 'OEM' },
        { name: 'Independent Mechanics', type: 'Service' }
      ],
      vendors: [
        { name: 'OEM Supplier Corp', type: 'Parts' },
        { name: 'Logistics Solutions', type: 'Shipping' }
      ],
      materials: [
        { name: 'Brake Pads - Front', type: 'FINISHED_GOOD', unit: 'Set' },
        { name: 'Oil Filter', type: 'FINISHED_GOOD', unit: 'Each' }
      ]
    }
  },
  {
    id: 'retail-chain',
    name: 'Retail Chain',
    description: 'Multi-location retail business setup',
    icon: <ShoppingCart className="h-8 w-8 text-purple-600" />,
    industry: 'Retail',
    complexity: 'Moderate',
    features: ['Multi-Location', 'POS Integration', 'Inventory Distribution', 'Customer Loyalty'],
    glAccounts: [
      { number: '1000', name: 'Cash - Operating Account', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { number: '1200', name: 'Merchandise Inventory', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Retail Sales Revenue', type: 'REVENUE' },
      { number: '5000', name: 'Cost of Merchandise Sold', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Walk-in Customers', type: 'Consumer' },
        { name: 'Corporate Accounts', type: 'Business' }
      ],
      vendors: [
        { name: 'Wholesale Distributors', type: 'Merchandise' },
        { name: 'Display Solutions', type: 'Fixtures' }
      ],
      materials: [
        { name: 'Consumer Electronics', type: 'FINISHED_GOOD', unit: 'Each' },
        { name: 'Clothing Items', type: 'FINISHED_GOOD', unit: 'Each' }
      ]
    }
  },
  {
    id: 'technology-services',
    name: 'Technology Services',
    description: 'IT services and consulting company setup',
    icon: <Zap className="h-8 w-8 text-orange-600" />,
    industry: 'Technology',
    complexity: 'Simple',
    features: ['Project Management', 'Time Tracking', 'Client Billing', 'Service Delivery'],
    glAccounts: [
      { number: '1000', name: 'Cash - Operating Account', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { number: '1300', name: 'Equipment - IT Hardware', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Consulting Revenue', type: 'REVENUE' },
      { number: '6000', name: 'Operating Expenses', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Enterprise Clients', type: 'Corporate' },
        { name: 'Small Business', type: 'SMB' }
      ],
      vendors: [
        { name: 'Software Vendors', type: 'Technology' },
        { name: 'Hardware Suppliers', type: 'Equipment' }
      ],
      materials: [
        { name: 'Consulting Hours', type: 'SERVICE', unit: 'Hour' },
        { name: 'Software Licenses', type: 'SERVICE', unit: 'License' }
      ]
    }
  },
  {
    id: 'food-restaurant',
    name: 'Restaurant & Food Service',
    description: 'Complete restaurant and food service business setup',
    icon: <Building className="h-8 w-8 text-red-600" />,
    industry: 'Food & Beverage',
    complexity: 'Moderate',
    features: ['Menu Management', 'POS Integration', 'Inventory Control', 'Supplier Management'],
    glAccounts: [
      { number: '1000', name: 'Cash - Register & Bank', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { number: '1200', name: 'Food Inventory', type: 'ASSET' },
      { number: '1210', name: 'Beverage Inventory', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Food Sales Revenue', type: 'REVENUE' },
      { number: '4100', name: 'Beverage Sales Revenue', type: 'REVENUE' },
      { number: '5000', name: 'Cost of Food Sales', type: 'EXPENSE' },
      { number: '6000', name: 'Labor Costs', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Walk-in Diners', type: 'Consumer' },
        { name: 'Catering Clients', type: 'Business' },
        { name: 'Delivery Customers', type: 'Consumer' }
      ],
      vendors: [
        { name: 'Fresh Food Distributors', type: 'Food' },
        { name: 'Beverage Suppliers', type: 'Beverage' },
        { name: 'Kitchen Equipment Co', type: 'Equipment' }
      ],
      materials: [
        { name: 'Chicken Breast', type: 'RAW_MATERIAL', unit: 'Pound' },
        { name: 'Pasta Entree', type: 'FINISHED_GOOD', unit: 'Serving' },
        { name: 'Draft Beer', type: 'FINISHED_GOOD', unit: 'Glass' }
      ]
    }
  },
  {
    id: 'construction',
    name: 'Construction & Contracting',
    description: 'Construction company and general contracting setup',
    icon: <Building className="h-8 w-8 text-yellow-600" />,
    industry: 'Construction',
    complexity: 'Complex',
    features: ['Project Management', 'Job Costing', 'Equipment Tracking', 'Subcontractor Management'],
    glAccounts: [
      { number: '1000', name: 'Cash - Operating Account', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable - Contracts', type: 'ASSET' },
      { number: '1200', name: 'Materials Inventory', type: 'ASSET' },
      { number: '1300', name: 'Equipment - Construction', type: 'ASSET' },
      { number: '1400', name: 'Work in Progress', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Contract Revenue', type: 'REVENUE' },
      { number: '5000', name: 'Direct Job Costs', type: 'EXPENSE' },
      { number: '6000', name: 'Subcontractor Costs', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Residential Clients', type: 'Homeowner' },
        { name: 'Commercial Developers', type: 'Business' },
        { name: 'Government Contracts', type: 'Government' }
      ],
      vendors: [
        { name: 'Building Materials Supply', type: 'Materials' },
        { name: 'Equipment Rental Co', type: 'Equipment' },
        { name: 'Specialized Subcontractors', type: 'Labor' }
      ],
      materials: [
        { name: 'Concrete - Ready Mix', type: 'RAW_MATERIAL', unit: 'Yard' },
        { name: 'Steel Rebar', type: 'RAW_MATERIAL', unit: 'Ton' },
        { name: 'Labor Hours - Skilled', type: 'SERVICE', unit: 'Hour' }
      ]
    }
  },
  {
    id: 'healthcare',
    name: 'Healthcare Services',
    description: 'Healthcare clinic and medical services setup',
    icon: <Building className="h-8 w-8 text-pink-600" />,
    industry: 'Healthcare',
    complexity: 'Complex',
    features: ['Patient Management', 'Insurance Billing', 'Medical Inventory', 'Compliance Tracking'],
    glAccounts: [
      { number: '1000', name: 'Cash - Operating Account', type: 'ASSET' },
      { number: '1100', name: 'Patient Receivables', type: 'ASSET' },
      { number: '1110', name: 'Insurance Receivables', type: 'ASSET' },
      { number: '1200', name: 'Medical Supplies', type: 'ASSET' },
      { number: '1300', name: 'Medical Equipment', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Patient Service Revenue', type: 'REVENUE' },
      { number: '4100', name: 'Insurance Reimbursements', type: 'REVENUE' },
      { number: '6000', name: 'Medical Staff Salaries', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Individual Patients', type: 'Patient' },
        { name: 'Insurance Companies', type: 'Insurance' },
        { name: 'Corporate Health Plans', type: 'Corporate' }
      ],
      vendors: [
        { name: 'Medical Supply Distributors', type: 'Supplies' },
        { name: 'Pharmaceutical Companies', type: 'Pharmacy' },
        { name: 'Medical Equipment Vendors', type: 'Equipment' }
      ],
      materials: [
        { name: 'General Consultation', type: 'SERVICE', unit: 'Visit' },
        { name: 'Lab Test - Blood Work', type: 'SERVICE', unit: 'Test' },
        { name: 'Medical Supplies Kit', type: 'TRADING_GOOD', unit: 'Kit' }
      ]
    }
  },
  {
    id: 'e-commerce',
    name: 'E-commerce & Online Retail',
    description: 'Online retail and e-commerce business setup',
    icon: <ShoppingCart className="h-8 w-8 text-cyan-600" />,
    industry: 'E-commerce',
    complexity: 'Moderate',
    features: ['Online Store Integration', 'Dropshipping Support', 'Digital Marketing', 'Order Fulfillment'],
    glAccounts: [
      { number: '1000', name: 'Cash - Payment Processors', type: 'ASSET' },
      { number: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { number: '1200', name: 'Product Inventory', type: 'ASSET' },
      { number: '1300', name: 'IT Equipment & Software', type: 'ASSET' },
      { number: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { number: '4000', name: 'Online Sales Revenue', type: 'REVENUE' },
      { number: '4100', name: 'Affiliate Commission Revenue', type: 'REVENUE' },
      { number: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
      { number: '6000', name: 'Marketing & Advertising', type: 'EXPENSE' }
    ],
    sampleData: {
      customers: [
        { name: 'Individual Consumers', type: 'Consumer' },
        { name: 'B2B Clients', type: 'Business' },
        { name: 'Wholesale Buyers', type: 'Wholesale' }
      ],
      vendors: [
        { name: 'Product Suppliers', type: 'Supplier' },
        { name: 'Shipping Companies', type: 'Logistics' },
        { name: 'Payment Processors', type: 'Financial' }
      ],
      materials: [
        { name: 'Consumer Electronics', type: 'FINISHED_GOOD', unit: 'Each' },
        { name: 'Shipping Service', type: 'SERVICE', unit: 'Package' },
        { name: 'Digital Products', type: 'SERVICE', unit: 'License' }
      ]
    }
  }
];

export default function BusinessIntegrationWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData>({
    code: '',
    name: '',
    industry: '',
    country: 'US',
    currency: 'USD',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: ''
  });
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [customers, setCustomers] = useState<CustomerVendorData[]>([]);
  const [vendors, setVendors] = useState<CustomerVendorData[]>([]);
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const wizardSteps: WizardStep[] = [
    {
      id: 'template',
      title: 'Choose Template',
      description: 'Select a business template that matches your industry',
      icon: <Building className="h-5 w-5" />,
      completed: selectedTemplate !== null
    },
    {
      id: 'company',
      title: 'Company Information',
      description: 'Enter your company details and organizational structure',
      icon: <Building className="h-5 w-5" />,
      completed: companyData.code !== '' && companyData.name !== ''
    },
    {
      id: 'plants',
      title: 'Plants & Locations',
      description: 'Define your manufacturing plants and business locations',
      icon: <Factory className="h-5 w-5" />,
      completed: plants.length > 0
    },
    {
      id: 'partners',
      title: 'Business Partners',
      description: 'Add customers and vendors for your business operations',
      icon: <Users className="h-5 w-5" />,
      completed: customers.length > 0 && vendors.length > 0
    },
    {
      id: 'materials',
      title: 'Products & Materials',
      description: 'Configure your product catalog and inventory items',
      icon: <Package className="h-5 w-5" />,
      completed: materials.length > 0
    },
    {
      id: 'review',
      title: 'Review & Generate',
      description: 'Review all settings and generate your business integration',
      icon: <CheckCircle className="h-5 w-5" />,
      completed: false
    }
  ];

  const getStepProgress = () => {
    return ((currentStep + 1) / wizardSteps.length) * 100;
  };

  const handleTemplateSelect = (template: BusinessTemplate) => {
    setSelectedTemplate(template);
    setCompanyData(prev => ({
      ...prev,
      industry: template.industry
    }));
    
    // Pre-populate with template data
    if (template.sampleData) {
      setCustomers(template.sampleData.customers.map((c: any, i: number) => ({
        code: `CUST${(i + 1).toString().padStart(3, '0')}`,
        name: c.name,
        type: c.type,
        address: '',
        city: '',
        state: '',
        phone: '',
        email: ''
      })));

      setVendors(template.sampleData.vendors.map((v: any, i: number) => ({
        code: `VEND${(i + 1).toString().padStart(3, '0')}`,
        name: v.name,
        type: v.type,
        address: '',
        city: '',
        state: '',
        phone: '',
        email: ''
      })));

      setMaterials(template.sampleData.materials.map((m: any, i: number) => ({
        code: `MAT${(i + 1).toString().padStart(3, '0')}`,
        name: m.name,
        type: m.type,
        unit: m.unit,
        price: 0,
        description: ''
      })));
    }
  };

  const addPlant = () => {
    const newPlant: PlantData = {
      code: `P${(plants.length + 1).toString().padStart(2, '0')}`,
      name: '',
      address: '',
      city: '',
      state: '',
      type: 'Manufacturing'
    };
    setPlants([...plants, newPlant]);
  };

  const addCustomer = () => {
    const newCustomer: CustomerVendorData = {
      code: `CUST${(customers.length + 1).toString().padStart(3, '0')}`,
      name: '',
      type: 'Commercial',
      address: '',
      city: '',
      state: '',
      phone: '',
      email: ''
    };
    setCustomers([...customers, newCustomer]);
  };

  const addVendor = () => {
    const newVendor: CustomerVendorData = {
      code: `VEND${(vendors.length + 1).toString().padStart(3, '0')}`,
      name: '',
      type: 'Supplier',
      address: '',
      city: '',
      state: '',
      phone: '',
      email: ''
    };
    setVendors([...vendors, newVendor]);
  };

  const addMaterial = () => {
    const newMaterial: MaterialData = {
      code: `MAT${(materials.length + 1).toString().padStart(3, '0')}`,
      name: '',
      type: 'FINISHED_GOOD',
      unit: 'Each',
      price: 0,
      description: ''
    };
    setMaterials([...materials, newMaterial]);
  };

  const generateBusinessIntegration = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const integrationData = {
        template: selectedTemplate,
        company: companyData,
        plants,
        customers,
        vendors,
        materials,
        glAccounts: selectedTemplate?.glAccounts || []
      };

      // Simulate progress updates
      const progressSteps = [
        { step: 20, message: 'Creating company structure...' },
        { step: 40, message: 'Setting up chart of accounts...' },
        { step: 60, message: 'Adding business partners...' },
        { step: 80, message: 'Configuring products and materials...' },
        { step: 100, message: 'Finalizing integration...' }
      ];

      for (const progress of progressSteps) {
        setGenerationProgress(progress.step);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const response = await fetch('/api/business-integration/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrationData)
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Business Integration Complete",
          description: `Successfully created ${companyData.name} with complete ERP setup.`
        });
      } else {
        throw new Error('Integration generation failed');
      }

    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate business integration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Business Template</h2>
        <p className="text-gray-600">Select a template that best matches your industry and business model</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {businessTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all ${
              selectedTemplate?.id === template.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {template.icon}
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.industry}</Badge>
                  </div>
                </div>
                <Badge 
                  variant={template.complexity === 'Simple' ? 'default' : 
                           template.complexity === 'Moderate' ? 'secondary' : 'destructive'}
                >
                  {template.complexity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{template.description}</p>
              <div className="space-y-2">
                <h4 className="font-medium">Key Features:</h4>
                <div className="flex flex-wrap gap-1">
                  {template.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCompanyForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Company Information</h2>
        <p className="text-gray-600">Enter your company details and business information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="companyCode">Company Code *</Label>
            <Input
              id="companyCode"
              value={companyData.code}
              onChange={(e) => setCompanyData({...companyData, code: e.target.value.toUpperCase()})}
              placeholder="e.g., BMPC"
              maxLength={4}
            />
          </div>
          
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={companyData.name}
              onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
              placeholder="Enter company name"
            />
          </div>
          
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={companyData.industry}
              onChange={(e) => setCompanyData({...companyData, industry: e.target.value})}
              placeholder="Industry type"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={companyData.country} onValueChange={(value) => setCompanyData({...companyData, country: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="MX">Mexico</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={companyData.currency} onValueChange={(value) => setCompanyData({...companyData, currency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={companyData.address}
              onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
              placeholder="Street address"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={companyData.city}
                onChange={(e) => setCompanyData({...companyData, city: e.target.value})}
                placeholder="City"
              />
            </div>
            
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={companyData.state}
                onChange={(e) => setCompanyData({...companyData, state: e.target.value})}
                placeholder="State"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              value={companyData.zipCode}
              onChange={(e) => setCompanyData({...companyData, zipCode: e.target.value})}
              placeholder="ZIP Code"
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={companyData.phone}
              onChange={(e) => setCompanyData({...companyData, phone: e.target.value})}
              placeholder="Phone number"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={companyData.email}
              onChange={(e) => setCompanyData({...companyData, email: e.target.value})}
              placeholder="Contact email"
            />
          </div>
          
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={companyData.website}
              onChange={(e) => setCompanyData({...companyData, website: e.target.value})}
              placeholder="Company website"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewAndGenerate = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Review & Generate</h2>
        <p className="text-gray-600">Review your configuration and generate the complete business integration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyData.name}</div>
            <p className="text-sm text-gray-600">{companyData.code}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plants.length}</div>
            <p className="text-sm text-gray-600">Locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length + vendors.length}</div>
            <p className="text-sm text-gray-600">{customers.length} Customers, {vendors.length} Vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials.length}</div>
            <p className="text-sm text-gray-600">Products & Materials</p>
          </CardContent>
        </Card>
      </div>

      {isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle>Generating Business Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={generationProgress} className="mb-4" />
            <p className="text-center text-gray-600">
              {generationProgress < 20 ? 'Creating company structure...' :
               generationProgress < 40 ? 'Setting up chart of accounts...' :
               generationProgress < 60 ? 'Adding business partners...' :
               generationProgress < 80 ? 'Configuring products and materials...' :
               'Finalizing integration...'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={generateBusinessIntegration}
          disabled={isGenerating}
          size="lg"
          className="px-8"
        >
          {isGenerating ? 'Generating...' : 'Generate Business Integration'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Guided Configuration Wizard</h1>
        <p className="text-gray-600">Set up complete business integrations with step-by-step guidance</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {wizardSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  index === currentStep ? 'bg-blue-600 text-white' :
                  step.completed ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? <CheckCircle className="h-5 w-5" /> : step.icon}
                </div>
                {index < wizardSteps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step.completed ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Badge variant="outline">
            Step {currentStep + 1} of {wizardSteps.length}
          </Badge>
        </div>
        <Progress value={getStepProgress()} className="mb-2" />
        <div className="text-center">
          <h3 className="font-medium">{wizardSteps[currentStep].title}</h3>
          <p className="text-sm text-gray-600">{wizardSteps[currentStep].description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 0 && renderTemplateSelection()}
        {currentStep === 1 && renderCompanyForm()}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Plants & Locations</h2>
              <p className="text-gray-600">Define your manufacturing plants and business locations</p>
            </div>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Plant Locations</h3>
              <Button onClick={addPlant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Plant
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plants.map((plant, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Plant Code</Label>
                        <Input
                          value={plant.code}
                          onChange={(e) => {
                            const newPlants = [...plants];
                            newPlants[index].code = e.target.value;
                            setPlants(newPlants);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Plant Name</Label>
                        <Input
                          value={plant.name}
                          onChange={(e) => {
                            const newPlants = [...plants];
                            newPlants[index].name = e.target.value;
                            setPlants(newPlants);
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Address</Label>
                        <Input
                          value={plant.address}
                          onChange={(e) => {
                            const newPlants = [...plants];
                            newPlants[index].address = e.target.value;
                            setPlants(newPlants);
                          }}
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={plant.city}
                          onChange={(e) => {
                            const newPlants = [...plants];
                            newPlants[index].city = e.target.value;
                            setPlants(newPlants);
                          }}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={plant.state}
                          onChange={(e) => {
                            const newPlants = [...plants];
                            newPlants[index].state = e.target.value;
                            setPlants(newPlants);
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Business Partners</h2>
              <p className="text-gray-600">Add customers and vendors for your business operations</p>
            </div>
            <Tabs defaultValue="customers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
                <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="customers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Customer List</h3>
                  <Button onClick={addCustomer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customers.map((customer, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Code</Label>
                            <Input
                              value={customer.code}
                              onChange={(e) => {
                                const newCustomers = [...customers];
                                newCustomers[index].code = e.target.value;
                                setCustomers(newCustomers);
                              }}
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={customer.type}
                              onValueChange={(value) => {
                                const newCustomers = [...customers];
                                newCustomers[index].type = value;
                                setCustomers(newCustomers);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Commercial">Commercial</SelectItem>
                                <SelectItem value="Contractor">Contractor</SelectItem>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Consumer">Consumer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Name</Label>
                            <Input
                              value={customer.name}
                              onChange={(e) => {
                                const newCustomers = [...customers];
                                newCustomers[index].name = e.target.value;
                                setCustomers(newCustomers);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="vendors" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Vendor List</h3>
                  <Button onClick={addVendor}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map((vendor, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Code</Label>
                            <Input
                              value={vendor.code}
                              onChange={(e) => {
                                const newVendors = [...vendors];
                                newVendors[index].code = e.target.value;
                                setVendors(newVendors);
                              }}
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={vendor.type}
                              onValueChange={(value) => {
                                const newVendors = [...vendors];
                                newVendors[index].type = value;
                                setVendors(newVendors);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Supplier">Supplier</SelectItem>
                                <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                                <SelectItem value="Packaging">Packaging</SelectItem>
                                <SelectItem value="Equipment">Equipment</SelectItem>
                                <SelectItem value="Services">Services</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Name</Label>
                            <Input
                              value={vendor.name}
                              onChange={(e) => {
                                const newVendors = [...vendors];
                                newVendors[index].name = e.target.value;
                                setVendors(newVendors);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Products & Materials</h2>
              <p className="text-gray-600">Configure your product catalog and inventory items</p>
            </div>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Material Catalog</h3>
              <Button onClick={addMaterial}>
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Code</Label>
                          <Input
                            value={material.code}
                            onChange={(e) => {
                              const newMaterials = [...materials];
                              newMaterials[index].code = e.target.value;
                              setMaterials(newMaterials);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={material.type}
                            onValueChange={(value) => {
                              const newMaterials = [...materials];
                              newMaterials[index].type = value;
                              setMaterials(newMaterials);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
                              <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                              <SelectItem value="PACKAGING">Packaging</SelectItem>
                              <SelectItem value="SERVICE">Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={material.name}
                          onChange={(e) => {
                            const newMaterials = [...materials];
                            newMaterials[index].name = e.target.value;
                            setMaterials(newMaterials);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Unit</Label>
                          <Select
                            value={material.unit}
                            onValueChange={(value) => {
                              const newMaterials = [...materials];
                              newMaterials[index].unit = value;
                              setMaterials(newMaterials);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Each">Each</SelectItem>
                              <SelectItem value="Gallon">Gallon</SelectItem>
                              <SelectItem value="Pound">Pound</SelectItem>
                              <SelectItem value="Set">Set</SelectItem>
                              <SelectItem value="Hour">Hour</SelectItem>
                              <SelectItem value="License">License</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Price</Label>
                          <Input
                            type="number"
                            value={material.price}
                            onChange={(e) => {
                              const newMaterials = [...materials];
                              newMaterials[index].price = parseFloat(e.target.value) || 0;
                              setMaterials(newMaterials);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {currentStep === 5 && renderReviewAndGenerate()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        {currentStep < wizardSteps.length - 1 ? (
          <Button
            onClick={nextStep}
            disabled={!wizardSteps[currentStep].completed}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={generateBusinessIntegration}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Complete Setup'}
          </Button>
        )}
      </div>
    </div>
  );
}