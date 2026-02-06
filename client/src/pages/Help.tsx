import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Globe, BookOpen, MessageCircle, ArrowLeft, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "pt", name: "Português", flag: "🇧🇷" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "ar", name: "العربية", flag: "🇸🇦" }
  ];

  const businessProcesses = {
    "en": {
      "Order-to-Cash": {
        description: "Complete sales process from lead to payment",
        steps: ["Lead Generation", "Quote Creation", "Order Processing", "Delivery", "Invoicing", "Payment"],
        aiExamples: [
          "How many sales orders today?",
          "Show me customer payment status",
          "Create new sales order",
          "Open Order-to-Cash process"
        ]
      },
      "Procure-to-Pay": {
        description: "Complete procurement process from requisition to payment",
        steps: ["Purchase Requisition", "Purchase Order", "Goods Receipt", "Invoice Processing", "Payment"],
        aiExamples: [
          "Show purchase orders this month",
          "Create purchase requisition",
          "Check vendor payment status",
          "Open procurement module"
        ]
      },
      "Inventory Management": {
        description: "Complete inventory and warehouse operations",
        steps: ["Stock Receipt", "Material Movement", "Stock Transfer", "Inventory Valuation"],
        aiExamples: [
          "Show current inventory levels",
          "Process goods receipt",
          "Transfer stock between locations",
          "Open inventory dashboard"
        ]
      }
    },
    "es": {
      "Proceso Pedido-Cobro": {
        description: "Proceso completo de ventas desde el prospecto hasta el pago",
        steps: ["Generación de Prospectos", "Creación de Cotizaciones", "Procesamiento de Pedidos", "Entrega", "Facturación", "Pago"],
        aiExamples: [
          "¿Cuántas órdenes de venta hoy?",
          "Muéstrame el estado de pago del cliente",
          "Crear nueva orden de venta",
          "Abrir proceso Pedido-Cobro"
        ]
      },
      "Proceso Compra-Pago": {
        description: "Proceso completo de adquisición desde requisición hasta pago",
        steps: ["Requisición de Compra", "Orden de Compra", "Recepción de Mercancía", "Procesamiento de Facturas", "Pago"],
        aiExamples: [
          "Mostrar órdenes de compra este mes",
          "Crear requisición de compra",
          "Verificar estado de pago proveedor",
          "Abrir módulo de compras"
        ]
      }
    },
    "fr": {
      "Processus Commande-Encaissement": {
        description: "Processus complet de vente du prospect au paiement",
        steps: ["Génération de Prospects", "Création de Devis", "Traitement des Commandes", "Livraison", "Facturation", "Paiement"],
        aiExamples: [
          "Combien de commandes aujourd'hui?",
          "Montrez-moi le statut de paiement client",
          "Créer nouvelle commande",
          "Ouvrir processus Commande-Encaissement"
        ]
      }
    },
    "de": {
      "Auftrag-zu-Zahlung-Prozess": {
        description: "Kompletter Verkaufsprozess vom Lead bis zur Zahlung",
        steps: ["Lead-Generierung", "Angebotserstellung", "Auftragsbearbeitung", "Lieferung", "Rechnungsstellung", "Zahlung"],
        aiExamples: [
          "Wie viele Aufträge heute?",
          "Zeige mir Kundenzahlungsstatus",
          "Neuen Auftrag erstellen",
          "Auftrag-zu-Zahlung öffnen"
        ]
      }
    },
    "zh": {
      "订单到收款流程": {
        description: "从销售线索到付款的完整销售流程",
        steps: ["线索生成", "报价创建", "订单处理", "交付", "开票", "付款"],
        aiExamples: [
          "今天有多少销售订单？",
          "显示客户付款状态",
          "创建新销售订单",
          "打开订单到收款流程"
        ]
      }
    },
    "ja": {
      "受注から回収プロセス": {
        description: "リードから支払いまでの完全な販売プロセス",
        steps: ["リード生成", "見積作成", "注文処理", "配送", "請求", "支払い"],
        aiExamples: [
          "今日の売上注文数は？",
          "顧客支払い状況を表示",
          "新しい売上注文を作成",
          "受注から回収プロセスを開く"
        ]
      }
    }
  };

  const currentProcesses = (businessProcesses as any)[selectedLanguage.toLowerCase()] || (businessProcesses as any)["en"];

  const aiTerminology = {
    "en": {
      title: "AI Assistant Commands",
      description: "Natural language commands for Jr. Assistant",
      categories: {
        "Data Queries": [
          "How many customers?",
          "Show sales this month",
          "What's our revenue?",
          "List top products"
        ],
        "Navigation": [
          "Open sales page",
          "Go to finance",
          "Show inventory",
          "Open credit management"
        ],
        "Operations": [
          "Create sales order",
          "Process payment",
          "Generate invoice",
          "Update customer"
        ]
      }
    },
    "es": {
      title: "Comandos del Asistente IA",
      description: "Comandos en lenguaje natural para Jr. Assistant",
      categories: {
        "Consultas de Datos": [
          "¿Cuántos clientes?",
          "Mostrar ventas este mes",
          "¿Cuáles son nuestros ingresos?",
          "Listar productos principales"
        ],
        "Navegación": [
          "Abrir página de ventas",
          "Ir a finanzas",
          "Mostrar inventario",
          "Abrir gestión de crédito"
        ],
        "Operaciones": [
          "Crear orden de venta",
          "Procesar pago",
          "Generar factura",
          "Actualizar cliente"
        ]
      }
    }
  };

  const currentTerminology = (aiTerminology as any)[selectedLanguage.toLowerCase()] || (aiTerminology as any)["en"];

  const filteredProcesses = Object.entries(currentProcesses).filter(([name, process]: [string, any]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold mb-2">MallyERP Help Center</h1>
          <p className="text-muted-foreground">Comprehensive documentation and AI training guide</p>
        </div>
      </div>

      {/* Language Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Selection
          </CardTitle>
          <CardDescription>
            Choose your preferred language for documentation and AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={selectedLanguage === lang.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLanguage(lang.name)}
                className="flex items-center gap-2"
              >
                <span>{lang.flag}</span>
                {lang.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="processes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="processes">Business Processes</TabsTrigger>
          <TabsTrigger value="ai-commands">AI Commands</TabsTrigger>
          <TabsTrigger value="terminology">Terminology</TabsTrigger>
          <TabsTrigger value="training">AI Training</TabsTrigger>
        </TabsList>

        <TabsContent value="processes" className="space-y-6">
          <div className="grid gap-6">
            {filteredProcesses.map(([processName, process]: [string, any]) => (
              <Card key={processName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {processName}
                    <Badge variant="secondary">
                      {process.steps?.length || 0} Steps
                    </Badge>
                  </CardTitle>
                  <CardDescription>{process.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Process Steps:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(process.steps || []).map((step: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      AI Assistant Examples:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(process.aiExamples || []).map((example: string, index: number) => (
                        <Badge key={index} variant="outline" className="justify-start">
                          "{example}"
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-commands" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentTerminology.title}</CardTitle>
              <CardDescription>{currentTerminology.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(currentTerminology.categories || {}).map(([category, commands]: [string, any]) => (
                <div key={category}>
                  <h4 className="font-semibold mb-3">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(commands || []).map((command: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        <code className="text-sm">"{command}"</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminology" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MallyERP Business Terminology</CardTitle>
              <CardDescription>
                Business-friendly terms used throughout MallyERP (Modern ERP terminology)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    ✅ MallyERP Business Terms (Use These)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>• Sales Order</div>
                    <div>• Invoice Receipt</div>
                    <div>• Inventory Receipt</div>
                    <div>• Financial Posting</div>
                    <div>• Three-Way Matching</div>
                    <div>• Order-to-Cash</div>
                    <div>• Procure-to-Pay</div>
                    <div>• Customer Management</div>
                    <div>• Supplier Management</div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    ❌ Technical Terms (Avoid These)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>• MIGO/MIRO</div>
                    <div>• MM/FI/SD/PP</div>
                    <div>• T-Codes</div>
                    <div>• TAX_9, 101, 201</div>
                    <div>• SA, KR, F2</div>
                    <div>• Technical Codes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Training Intelligence</CardTitle>
              <CardDescription>
                How Jr. Assistant provides multilingual, intelligent business assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Language Intelligence
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    AI automatically detects your language and responds appropriately
                  </p>
                  <div className="space-y-2 text-sm">
                    <div><strong>English:</strong> "How many customers?" → "We have 29 active customers"</div>
                    <div><strong>Spanish:</strong> "¿Cuántos clientes?" → "Tenemos 29 clientes activos"</div>
                    <div><strong>Chinese:</strong> "有多少客户?" → "我们有29个活跃客户"</div>
                    <div><strong>Japanese:</strong> "顧客数は?" → "29名のアクティブ顧客がいます"</div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Real-Time Business Intelligence</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    AI queries actual database for authentic business insights
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>• Customer Data: 29 active customers</div>
                    <div>• Financial Data: $482,917 outstanding receivables</div>
                    <div>• Inventory Data: Real stock levels and movements</div>
                    <div>• Process Data: Actual order status and workflows</div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Navigation Intelligence</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    AI understands navigation requests across all languages
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>• "Open sales" / "Abrir ventas" / "打开销售" → /sales</div>
                    <div>• "Credit management" / "Gestión crédito" → /finance/credit-management</div>
                    <div>• "Show inventory" / "Mostrar inventario" → /inventory</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>
            Additional resources and support options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Ask Jr. Assistant
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              View Documentation
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Language Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;