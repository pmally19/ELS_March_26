import { Link, useLocation } from "wouter";
import {
  Home,
  UserCircle,
  LayoutDashboard,
  ShoppingCart,
  Package2,
  DollarSign,
  BarChart2,
  Settings,
  Truck,
  Factory,
  Users,
  CreditCard,
  Wallet,
  BookOpen,
  LineChart,
  Database,
  RefreshCw,
  FileText,
  Wrench,
  Brain,
  Upload,
  Shield,
  ArrowRightLeft
} from "lucide-react";

type SidebarIconProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
};

const SidebarIcon = ({ href, icon, label, isActive = false, badge }: SidebarIconProps) => {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center py-3 cursor-pointer relative">
        <div
          className={`w-10 h-10 rounded-md flex items-center justify-center ${isActive
            ? 'bg-white/10'
            : 'text-white/80 hover:bg-white/5'
            }`}
        >
          {icon}
          {badge && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {badge}
            </span>
          )}
        </div>
        <span className="mt-1 text-xs text-white/80 font-medium">{label}</span>
      </div>
    </Link>
  );
};

export default function Sidebar() {
  const [location] = useLocation();

  // Helper function to check if a path is active
  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  return (
    <aside
      className="salesforce-sidebar"
      aria-label="Sidebar"
    >
      {/* Single scrollable container for everything */}
      <div className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-2">
        {/* Logo/Home Icon */}
        <div className="mb-4 p-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-md bg-white/10 text-white">
            <Home className="h-5 w-5" />
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-2 w-full">
          {/* Main Dashboard */}
          <SidebarIcon
            href="/"
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Home"
            isActive={location === "/"}
          />

          {/* Customizable Dashboard */}
          <SidebarIcon
            href="/custom-dashboard"
            icon={<RefreshCw className="h-5 w-5" />}
            label="Custom"
            isActive={location === "/custom-dashboard"}
          />

          {/* Master Data Module */}
          <SidebarIcon
            href="/master-data"
            icon={<Database className="h-5 w-5" />}
            label="Master Data"
            isActive={isActive("/master-data")}
          />

          {/* Sales Module */}
          <SidebarIcon
            href="/sales"
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Sales"
            isActive={isActive("/sales")}
          />

          {/* Inventory Module */}
          <SidebarIcon
            href="/inventory"
            icon={<Package2 className="h-5 w-5" />}
            label="Inventory"
            isActive={isActive("/inventory")}
          />

          {/* Purchase Module */}
          <SidebarIcon
            href="/purchase"
            icon={<Truck className="h-5 w-5" />}
            label="Purchase"
            isActive={isActive("/purchase")}
          />

          {/* Production Module */}
          <SidebarIcon
            href="/production"
            icon={<Factory className="h-5 w-5" />}
            label="Production"
            isActive={isActive("/production")}
          />

          {/* HR Module */}
          <SidebarIcon
            href="/hr"
            icon={<Users className="h-5 w-5" />}
            label="HR"
            isActive={isActive("/hr")}
          />

          {/* Finance Module */}
          <SidebarIcon
            href="/finance"
            icon={<DollarSign className="h-5 w-5" />}
            label="Finance"
            isActive={isActive("/finance")}
          />

          {/* Controlling Module */}
          <SidebarIcon
            href="/controlling"
            icon={<BarChart2 className="h-5 w-5" />}
            label="Controlling"
            isActive={isActive("/controlling")}
          />

          {/* Reports */}
          <SidebarIcon
            href="/reports"
            icon={<BarChart2 className="h-5 w-5" />}
            label="Reports"
            isActive={isActive("/reports")}
          />

          {/* Upload */}
          <SidebarIcon
            href="/upload"
            icon={<Upload className="h-5 w-5" />}
            label="Upload"
            isActive={isActive("/upload")}
          />

          {/* AI Agents */}
          <SidebarIcon
            href="/ai-agents"
            icon={<Brain className="h-5 w-5" />}
            label="AI Agents"
            isActive={isActive("/ai-agents")}
          />

          {/* Tools */}
          <SidebarIcon
            href="/tools"
            icon={<Wrench className="h-5 w-5" />}
            label="Tools"
            isActive={isActive("/tools")}
          />

          {/* Admin Section */}
          <SidebarIcon
            href="/admin/users"
            icon={<Shield className="h-5 w-5" />}
            label="Admin"
            isActive={isActive("/admin")}
          />

          {/* CI/CD Objects */}
          <SidebarIcon
            href="/transport"
            icon={<ArrowRightLeft className="h-5 w-5" />}
            label="Co-Op Objects"
            isActive={isActive("/transport")}
          />

          {/* Settings */}
          <SidebarIcon
            href="/settings"
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            isActive={isActive("/settings")}
          />
        </div>
      </div>
    </aside>
  );
}
