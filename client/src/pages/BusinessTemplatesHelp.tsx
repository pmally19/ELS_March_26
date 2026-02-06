import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Settings, CheckCircle, AlertCircle, Info, Users, Building, ShoppingCart, Wrench, Zap, HelpCircle, Plus } from "lucide-react";
import { Link } from "wouter";

export default function BusinessTemplatesHelp() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/tools">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tools
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span>Business Templates Help</span>
            </h1>
            <p className="text-gray-600">Complete implementation guide for MallyERP business templates</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Business Templates System Overview</CardTitle>
              <CardDescription>
                Understanding MallyERP's automated business configuration system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">What Are Business Templates?</h3>
                <p className="text-blue-700 text-sm">
                  Business Templates are pre-configured sets of condition types, pricing procedures, and business logic 
                  designed for specific industries. They automatically create the foundation for your ERP pricing framework 
                  based on industry best practices.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Benefits
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>• Instant setup of industry-specific pricing</li>
                    <li>• Pre-configured condition types with MallyERP codes</li>
                    <li>• Best practice business logic implementation</li>
                    <li>• Reduced setup time from weeks to minutes</li>
                    <li>• Standardized naming conventions</li>
                  </ul>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Settings className="h-4 w-4 text-blue-600 mr-2" />
                    Key Components
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Condition Types:</strong> STD1, CDIS01-04, TAX01-04, etc.</li>
                    <li>• <strong>Pricing Procedures:</strong> MALLSTD01 standard procedure</li>
                    <li>• <strong>Access Sequences:</strong> STDCUST, STDVOL, STDTAX</li>
                    <li>• <strong>Business Logic:</strong> Industry-specific calculations</li>
                    <li>• <strong>Integration:</strong> End-to-end order processing</li>
                  </ul>
                </Card>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Important Notes
                </h3>
                <ul className="text-amber-700 text-sm space-y-1">
                  <li>• Templates must be applied to a specific company code</li>
                  <li>• Each template creates multiple condition types automatically</li>
                  <li>• Templates can be customized after application</li>
                  <li>• Existing condition types with same codes will cause conflicts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Business Templates</CardTitle>
                <CardDescription>
                  Detailed breakdown of each template and their condition types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  
                  {/* Restaurant Template */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Building className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-lg">Restaurant/Food Service Template</h3>
                      <Badge variant="secondary">5 Condition Types</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Designed for restaurants, cafes, food trucks, and catering businesses
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Condition Types Created:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <strong>STD1:</strong> Base Menu Price (Fixed)</li>
                          <li>• <strong>CDIS01:</strong> Menu Add-ons (Fixed)</li>
                          <li>• <strong>FEE01:</strong> Delivery Fee ($5.00)</li>
                          <li>• <strong>TAX01:</strong> Sales Tax (8.5%)</li>
                          <li>• <strong>COST01:</strong> Food Cost (30%)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Use Cases:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Restaurant POS systems</li>
                          <li>• Online food ordering</li>
                          <li>• Catering price quotes</li>
                          <li>• Menu pricing analysis</li>
                          <li>• Food cost management</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Retail Template */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-lg">Retail/E-commerce Template</h3>
                      <Badge variant="secondary">7 Condition Types</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Perfect for online stores, retail chains, and product-based businesses
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Condition Types Created:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <strong>STD1:</strong> Product Price (Fixed)</li>
                          <li>• <strong>FEE01:</strong> Shipping Fee (Variable)</li>
                          <li>• <strong>CDIS01:</strong> Customer Discount (5%)</li>
                          <li>• <strong>CDIS02:</strong> Volume Discount (10%)</li>
                          <li>• <strong>CDIS03:</strong> Seasonal Discount (15%)</li>
                          <li>• <strong>TAX01:</strong> Sales Tax (8.25%)</li>
                          <li>• <strong>COST01:</strong> Cost of Goods (60%)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Use Cases:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• E-commerce platforms</li>
                          <li>• Retail store pricing</li>
                          <li>• Wholesale operations</li>
                          <li>• Customer loyalty programs</li>
                          <li>• Seasonal promotions</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Manufacturing Template */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Wrench className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-lg">Manufacturing Template</h3>
                      <Badge variant="secondary">5 Condition Types</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Comprehensive costing for manufacturing, assembly, and production businesses
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Condition Types Created:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <strong>COST01:</strong> Material Cost (Variable)</li>
                          <li>• <strong>COST02:</strong> Labor Cost (Variable)</li>
                          <li>• <strong>COST03:</strong> Overhead (25%)</li>
                          <li>• <strong>FEE01:</strong> Freight Charges (Variable)</li>
                          <li>• <strong>CDIS04:</strong> Profit Margin (20%)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Use Cases:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Product cost calculation</li>
                          <li>• Quote generation</li>
                          <li>• Job costing</li>
                          <li>• Overhead allocation</li>
                          <li>• Profit margin analysis</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Additional Templates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Building className="h-4 w-4 text-pink-600" />
                        <h4 className="font-medium">Healthcare Services</h4>
                        <Badge variant="outline">5 Types</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Medical services, insurance, facilities</p>
                      <ul className="text-xs space-y-1">
                        <li>• Service fees and co-pays</li>
                        <li>• Medical supplies costing</li>
                        <li>• Insurance processing</li>
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-cyan-600" />
                        <h4 className="font-medium">Professional Services</h4>
                        <Badge variant="outline">5 Types</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Consulting, legal, accounting services</p>
                      <ul className="text-xs space-y-1">
                        <li>• Hourly and project rates</li>
                        <li>• Expense reimbursements</li>
                        <li>• Client discounts</li>
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Building className="h-4 w-4 text-yellow-600" />
                        <h4 className="font-medium">Construction</h4>
                        <Badge variant="outline">5 Types</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">General contracting, construction projects</p>
                      <ul className="text-xs space-y-1">
                        <li>• Labor and material costs</li>
                        <li>• Equipment rental</li>
                        <li>• Permits and fees</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Implementation Tab */}
        <TabsContent value="implementation">
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Implementation Guide</CardTitle>
              <CardDescription>
                Complete walkthrough for applying and configuring business templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Step 1 */}
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Prerequisites Setup</h3>
                  <div className="bg-gray-50 p-4 rounded-lg mb-3">
                    <h4 className="font-medium mb-2">Before You Begin:</h4>
                    <ul className="text-sm space-y-1">
                      <li>✓ Company code must be created in Master Data</li>
                      <li>✓ User must have condition type creation permissions</li>
                      <li>✓ Access to Condition Types Management page</li>
                      <li>✓ Understanding of your business pricing model</li>
                    </ul>
                  </div>
                  <div className="text-sm">
                    <strong>Navigation:</strong> Sales → Configuration → Condition Types → Templates tab
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 2 */}
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Select Company Code</h3>
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-3">
                    <p className="text-amber-800 text-sm">
                      <strong>Important:</strong> You must select a company code before applying any template. 
                      All condition types will be created for the selected company.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Steps:</h4>
                    <ol className="text-sm space-y-1">
                      <li>1. Look for the "Company" dropdown at the top of the page</li>
                      <li>2. Select your target company code (e.g., "1000 - MallyERP Global")</li>
                      <li>3. Wait for the page to refresh with company-specific data</li>
                      <li>4. Verify no conflicting condition types exist</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 3 */}
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Choose Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Template Selection Criteria:</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Match your primary business model</li>
                        <li>• Consider your pricing complexity</li>
                        <li>• Review condition types included</li>
                        <li>• Check industry best practices</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">Template Preview:</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Hover over templates for details</li>
                        <li>• Review condition codes and percentages</li>
                        <li>• Check default values alignment</li>
                        <li>• Understand calculation methods</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 4 */}
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Apply Template</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-3">
                    <h4 className="font-medium text-green-800 mb-2">Application Process:</h4>
                    <ol className="text-green-700 text-sm space-y-1">
                      <li>1. Click the "Apply Template" button on your chosen template</li>
                      <li>2. System validates company selection and permissions</li>
                      <li>3. Template condition types are created automatically</li>
                      <li>4. Success notification shows number of types created</li>
                      <li>5. Page refreshes with new condition types visible</li>
                    </ol>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-2">Possible Issues:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• Duplicate condition codes will cause errors</li>
                      <li>• Missing company selection prevents application</li>
                      <li>• Insufficient permissions block creation</li>
                      <li>• Network issues may cause partial application</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 5 */}
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Verification & Testing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Verify Creation:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Check "Condition Types" tab for new entries</li>
                        <li>• Confirm all expected codes are present</li>
                        <li>• Verify default values and categories</li>
                        <li>• Test calculation types (percentage/fixed)</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Integration Testing:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Navigate to Pricing Procedures</li>
                        <li>• Create test procedure with new conditions</li>
                        <li>• Test in Order-to-Cash process</li>
                        <li>• Validate calculation results</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization">
          <Card>
            <CardHeader>
              <CardTitle>Template Customization Guide</CardTitle>
              <CardDescription>
                How to modify and extend templates for your specific business needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Customization Philosophy</h3>
                <p className="text-blue-700 text-sm">
                  Templates provide a starting foundation. After application, you can modify condition types, 
                  add custom fields, adjust calculations, and create industry-specific variations to match 
                  your exact business requirements.
                </p>
              </div>

              {/* Modification Types */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 text-blue-600">Basic Modifications</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Change default values</li>
                    <li>• Modify descriptions</li>
                    <li>• Adjust sequence numbers</li>
                    <li>• Update calculation types</li>
                    <li>• Set mandatory flags</li>
                  </ul>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-2 text-green-600">Advanced Changes</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Create custom condition codes</li>
                    <li>• Add business-specific categories</li>
                    <li>• Implement complex calculations</li>
                    <li>• Configure access sequences</li>
                    <li>• Set up conditional logic</li>
                  </ul>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-2 text-purple-600">Integration Setup</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Link to pricing procedures</li>
                    <li>• Configure access sequences</li>
                    <li>• Set up customer hierarchies</li>
                    <li>• Enable product categories</li>
                    <li>• Create custom workflows</li>
                  </ul>
                </Card>
              </div>

              {/* Detailed Customization Steps */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Step-by-Step Customization Process</h3>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    1. Modify Existing Condition Types
                  </h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="mb-2"><strong>Steps:</strong></p>
                    <ol className="space-y-1">
                      <li>a) Go to Condition Types tab after template application</li>
                      <li>b) Click the edit (pencil) icon on any condition type</li>
                      <li>c) Modify fields like default values, descriptions, or calculation types</li>
                      <li>d) Save changes and test in a pricing procedure</li>
                    </ol>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    2. Add Custom Condition Types
                  </h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="mb-2"><strong>Custom Codes:</strong> Use format like CUST01, SPEC01, etc.</p>
                    <p className="mb-2"><strong>Naming Convention:</strong></p>
                    <ul className="space-y-1">
                      <li>• CUST## - Custom business-specific conditions</li>
                      <li>• SPEC## - Special calculations or fees</li>
                      <li>• REG## - Regulatory or compliance-related</li>
                      <li>• LOC## - Location-specific conditions</li>
                    </ul>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    3. Best Practices for Customization
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-green-600 mb-2">Do:</h5>
                      <ul className="text-sm space-y-1">
                        <li>✓ Keep logical sequence numbers</li>
                        <li>✓ Use descriptive condition names</li>
                        <li>✓ Test changes in development first</li>
                        <li>✓ Document custom modifications</li>
                        <li>✓ Follow MallyERP naming standards</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-red-600 mb-2">Don't:</h5>
                      <ul className="text-sm space-y-1">
                        <li>✗ Duplicate existing condition codes</li>
                        <li>✗ Use system-reserved prefixes</li>
                        <li>✗ Skip testing in procedures</li>
                        <li>✗ Ignore access sequence setup</li>
                        <li>✗ Modify core calculation logic</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Guide</CardTitle>
              <CardDescription>
                Common issues and solutions for business template implementation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Common Issues */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-red-600">Common Issues</h3>
                  
                  <div className="border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Template Application Fails</h4>
                    <p className="text-sm mb-2"><strong>Error:</strong> "Company code is required" or "Template not found"</p>
                    <div className="bg-red-50 p-3 rounded text-sm">
                      <p className="mb-1"><strong>Solutions:</strong></p>
                      <ul className="space-y-1">
                        <li>• Ensure company is selected in dropdown</li>
                        <li>• Refresh page and try again</li>
                        <li>• Check user permissions for condition type creation</li>
                        <li>• Verify company code exists in Master Data</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 mb-2">Duplicate Condition Codes</h4>
                    <p className="text-sm mb-2"><strong>Error:</strong> "Condition code already exists"</p>
                    <div className="bg-amber-50 p-3 rounded text-sm">
                      <p className="mb-1"><strong>Solutions:</strong></p>
                      <ul className="space-y-1">
                        <li>• Check existing condition types before applying</li>
                        <li>• Delete conflicting codes if safe to do so</li>
                        <li>• Modify template codes before application</li>
                        <li>• Use different company code for testing</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Template Not Visible</h4>
                    <p className="text-sm mb-2"><strong>Issue:</strong> Templates tab empty or template missing</p>
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <p className="mb-1"><strong>Solutions:</strong></p>
                      <ul className="space-y-1">
                        <li>• Clear browser cache and reload</li>
                        <li>• Check network connectivity</li>
                        <li>• Verify user has template access permissions</li>
                        <li>• Try different browser or incognito mode</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Solutions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-green-600">Quick Solutions</h3>
                  
                  <div className="border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Verification Checklist</h4>
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <p className="mb-2"><strong>Before Template Application:</strong></p>
                      <ul className="space-y-1">
                        <li>☐ Company code selected</li>
                        <li>☐ User has creation permissions</li>
                        <li>☐ No conflicting condition codes</li>
                        <li>☐ Template matches business model</li>
                        <li>☐ Network connection stable</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-2">Recovery Procedures</h4>
                    <div className="bg-purple-50 p-3 rounded text-sm">
                      <p className="mb-2"><strong>If Template Application Partially Fails:</strong></p>
                      <ol className="space-y-1">
                        <li>1. Note which condition types were created</li>
                        <li>2. Delete partially created types if necessary</li>
                        <li>3. Clear any duplicate codes</li>
                        <li>4. Re-apply template completely</li>
                        <li>5. Verify all types created successfully</li>
                      </ol>
                    </div>
                  </div>

                  <div className="border border-cyan-200 rounded-lg p-4">
                    <h4 className="font-medium text-cyan-800 mb-2">Performance Issues</h4>
                    <div className="bg-cyan-50 p-3 rounded text-sm">
                      <p className="mb-2"><strong>If Application is Slow:</strong></p>
                      <ul className="space-y-1">
                        <li>• Large templates may take 10-30 seconds</li>
                        <li>• Don't click Apply button multiple times</li>
                        <li>• Wait for success/error notification</li>
                        <li>• Check server logs if timeout occurs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-gray-100 p-4 rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Still Need Help?
                </h3>
                <p className="text-sm mb-3">
                  If you continue to experience issues with business templates, our support team can help:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Documentation:</strong> Check MallyERP user manual section 4.2 - Business Templates
                  </div>
                  <div>
                    <strong>Support Portal:</strong> Submit ticket with error details and screenshots
                  </div>
                  <div>
                    <strong>Training:</strong> Schedule template customization training session
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle>Real-World Implementation Examples</CardTitle>
              <CardDescription>
                Practical examples showing how different businesses use templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Example 1 - Restaurant */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Building className="h-5 w-5 text-red-600 mr-2" />
                  Example 1: Maria's Italian Restaurant
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Business Scenario:</h4>
                    <p className="text-sm mb-3">
                      Family-owned restaurant with dine-in, takeout, and delivery services. 
                      Needs to track food costs, add delivery fees, and calculate taxes properly.
                    </p>
                    <h4 className="font-medium mb-2">Template Applied:</h4>
                    <p className="text-sm">Restaurant/Food Service Template</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Customizations Made:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Changed delivery fee from $5 to $3.50</li>
                      <li>• Added CUST01 for "Happy Hour Discount" (20%)</li>
                      <li>• Modified food cost percentage to 28%</li>
                      <li>• Added SPEC01 for "Weekend Surcharge" (10%)</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded mt-3">
                  <p className="text-sm text-green-800">
                    <strong>Result:</strong> Restaurant can now properly price menu items with delivery, 
                    track profitability, and offer time-based promotions through the POS system.
                  </p>
                </div>
              </div>

              {/* Example 2 - E-commerce */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <ShoppingCart className="h-5 w-5 text-green-600 mr-2" />
                  Example 2: TechGear Online Store
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Business Scenario:</h4>
                    <p className="text-sm mb-3">
                      E-commerce platform selling electronics with complex shipping rules, 
                      loyalty discounts, and seasonal promotions. Integrated with accounting system.
                    </p>
                    <h4 className="font-medium mb-2">Template Applied:</h4>
                    <p className="text-sm">Retail/E-commerce Template</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Customizations Made:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Modified shipping fee to be weight-based</li>
                      <li>• Changed volume discount tiers (5%, 10%, 15%)</li>
                      <li>• Added CUST01 for "Loyalty Member Discount"</li>
                      <li>• Created REG01 for "Electronics Recycling Fee"</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded mt-3">
                  <p className="text-sm text-blue-800">
                    <strong>Result:</strong> Automated pricing with complex discount hierarchies, 
                    proper tax calculation across states, and integrated cost tracking for profitability analysis.
                  </p>
                </div>
              </div>

              {/* Example 3 - Manufacturing */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Wrench className="h-5 w-5 text-purple-600 mr-2" />
                  Example 3: Precision Metal Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Business Scenario:</h4>
                    <p className="text-sm mb-3">
                      Custom metal fabrication shop with complex job costing requirements. 
                      Needs to track material costs, labor hours, and machinery overhead.
                    </p>
                    <h4 className="font-medium mb-2">Template Applied:</h4>
                    <p className="text-sm">Manufacturing Template</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Customizations Made:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Split labor into COST02 (Welding) and COST04 (Machining)</li>
                      <li>• Added COST05 for "Quality Inspection" costs</li>
                      <li>• Modified overhead allocation to 30%</li>
                      <li>• Created SPEC01 for "Rush Job Surcharge" (25%)</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded mt-3">
                  <p className="text-sm text-purple-800">
                    <strong>Result:</strong> Accurate job costing with real-time material and labor tracking, 
                    automated quote generation, and proper overhead allocation for competitive yet profitable pricing.
                  </p>
                </div>
              </div>

              {/* Best Practices Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-semibold mb-3">Key Success Factors from Examples</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">Planning:</h4>
                    <ul className="space-y-1">
                      <li>• Analyze current pricing model first</li>
                      <li>• Map business processes to condition types</li>
                      <li>• Identify customization needs early</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Implementation:</h4>
                    <ul className="space-y-1">
                      <li>• Start with closest matching template</li>
                      <li>• Test with small product subset first</li>
                      <li>• Gradually add customizations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-600 mb-2">Optimization:</h4>
                    <ul className="space-y-1">
                      <li>• Monitor calculation performance</li>
                      <li>• Regular review of discount effectiveness</li>
                      <li>• Update percentages based on cost analysis</li>
                    </ul>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}