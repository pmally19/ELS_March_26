import {
  X, Home, Database, ShoppingCart, Package2, Factory, DollarSign, BarChart2,
  Users, Settings, Truck, RefreshCw, Upload, Brain, Wrench, Shield, ArrowRightLeft,
  HelpCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface MobileSidebarProps {
  onClose: () => void;
}

export default function MobileSidebar({ onClose }: MobileSidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  return (
    <div className="flex flex-col h-full bg-[#16325c] text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <div className="text-xl font-bold">ELS+ERP</div>
        <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-md">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
        <nav className="space-y-1">
          <Link href="/" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${location === "/" ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </div>
          </Link>

          <Link href="/custom-dashboard" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/custom-dashboard") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <RefreshCw className="h-5 w-5 mr-3" />
              Custom Dashboard
            </div>
          </Link>

          <Link href="/master-data" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/master-data") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Database className="h-5 w-5 mr-3" />
              Master Data
            </div>
          </Link>

          <Link href="/sales" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/sales") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <ShoppingCart className="h-5 w-5 mr-3" />
              Sales
            </div>
          </Link>

          <Link href="/inventory" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/inventory") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Package2 className="h-5 w-5 mr-3" />
              Inventory
            </div>
          </Link>

          <Link href="/purchase" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/purchase") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Truck className="h-5 w-5 mr-3" />
              Purchase
            </div>
          </Link>

          <Link href="/production" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/production") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Factory className="h-5 w-5 mr-3" />
              Production
            </div>
          </Link>

          <Link href="/hr" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/hr") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Users className="h-5 w-5 mr-3" />
              HR
            </div>
          </Link>

          <Link href="/finance" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/finance") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <DollarSign className="h-5 w-5 mr-3" />
              Finance
            </div>
          </Link>

          <Link href="/controlling" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/controlling") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <BarChart2 className="h-5 w-5 mr-3" />
              Controlling
            </div>
          </Link>

          <Link href="/reports" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/reports") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <BarChart2 className="h-5 w-5 mr-3" />
              Reports
            </div>
          </Link>

          <Link href="/upload" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/upload") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Upload className="h-5 w-5 mr-3" />
              Upload
            </div>
          </Link>

          <Link href="/ai-agents" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/ai-agents") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Brain className="h-5 w-5 mr-3" />
              AI Agents
            </div>
          </Link>

          <Link href="/tools" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/tools") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Wrench className="h-5 w-5 mr-3" />
              Tools
            </div>
          </Link>

          <Link href="/admin/users" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/admin") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Shield className="h-5 w-5 mr-3" />
              Admin
            </div>
          </Link>

          <Link href="/transport" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/transport") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <ArrowRightLeft className="h-5 w-5 mr-3" />
              Co-Op Objects
            </div>
          </Link>

          <Link href="/settings" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/settings") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </div>
          </Link>

          <Link href="/help" onClick={onClose}>
            <div className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors ${isActive("/help") ? "bg-white/20" : "hover:bg-white/10"
              }`}>
              <HelpCircle className="h-5 w-5 mr-3" />
              Help
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
}