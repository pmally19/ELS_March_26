import Sidebar from "./Sidebar";
import { ReactNode, useState } from "react";
import { Search, Bell, Settings, User, HelpCircle, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import MobileSidebar from "./MobileSidebar";
import AgentRoleSwitcher from "@/components/AgentRoleSwitcher";
import { JrChatbot } from "@/components/JrChatbot";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const isActiveRoute = (route: string) => {
    if (route === "/" && location === "/") return true;
    if (route !== "/" && location.startsWith(route)) return true;
    return false;
  };

  // Search functionality
  const searchRoutes = [
    { name: 'Dashboard', path: '/' },
    { name: 'Master Data', path: '/master-data' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Sales', path: '/sales' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Purchase', path: '/purchase' },
    { name: 'Production', path: '/production' },
    { name: 'Finance', path: '/finance' },
    { name: 'Financial Reporting', path: '/general-ledger' },
    { name: 'Controlling', path: '/controlling' },
    { name: 'Cost Centers', path: '/controlling' },
    { name: 'Reports', path: '/reports' },
    { name: 'Workspace Manager', path: '/workspace-manager' },
  ];

  const filteredRoutes = searchQuery.trim()
    ? searchRoutes.filter(route =>
      route.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(e.target.value.trim().length > 0);
  };

  const handleSearchSelect = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredRoutes.length > 0) {
      handleSearchSelect(filteredRoutes[0].path);
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  return (
    <div className="salesforce-layout">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-gray-900">
            <MobileSidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Header - Top Blue Bar */}
      <header className="salesforce-header flex items-center justify-between px-4">
        <div className="flex items-center">
          {/* Mobile menu toggle */}
          <button
            className="mr-2 text-white md:hidden"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="text-white text-xl font-bold mr-4 md:mr-10">ELS+ERP</div>
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white opacity-70 z-10" />
            <input
              type="text"
              placeholder="Search pages, modules..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="bg-white/10 text-white placeholder-white/70 border-0 rounded-md pl-10 pr-4 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
            />

            {/* Search Results Dropdown */}
            {showSearchResults && filteredRoutes.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-md shadow-lg border max-h-80 overflow-y-auto z-50">
                {filteredRoutes.map((route, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(route.path)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center space-x-2 text-sm"
                  >
                    <Search className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-900">{route.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {showSearchResults && searchQuery && filteredRoutes.length === 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-md shadow-lg border p-3 z-50">
                <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link href="/help">
            <button className="text-white opacity-80 hover:opacity-100">
              <HelpCircle className="h-5 w-5" />
            </button>
          </Link>
          <button className="hidden md:inline-flex text-white opacity-80 hover:opacity-100">
            <Settings className="h-5 w-5" />
          </button>
          <button className="text-white opacity-80 hover:opacity-100">
            <Bell className="h-5 w-5" />
          </button>
          <AgentRoleSwitcher />
          <button className="flex items-center text-white bg-white/10 rounded-md px-2 py-1 hover:bg-white/20">
            <User className="h-5 w-5" />
            <span className="text-sm ml-1 hidden md:inline">Admin</span>
          </button>
          {/* Mobile menu toggle */}
          <button
            className="text-white ml-2 md:hidden"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Top Navigation - Desktop */}
      <nav className="salesforce-nav hidden md:flex items-center px-4 overflow-x-auto">
        <div className="flex space-x-1">
          <Link href="/">
            <div className={cn("sf-tab", isActiveRoute("/") && "sf-tab-active")}>Dashboard</div>
          </Link>
          <Link href="/master-data">
            <div className={cn("sf-tab", isActiveRoute("/master-data") && "sf-tab-active")}>Master Data</div>
          </Link>
          <Link href="/transactions">
            <div className={cn("sf-tab", isActiveRoute("/transactions") && "sf-tab-active")}>Transactions</div>
          </Link>
          <Link href="/sales">
            <div className={cn("sf-tab", isActiveRoute("/sales") && "sf-tab-active")}>Sales</div>
          </Link>
          <Link href="/inventory">
            <div className={cn("sf-tab", isActiveRoute("/inventory") && "sf-tab-active")}>Inventory</div>
          </Link>
          <Link href="/purchase">
            <div className={cn("sf-tab", isActiveRoute("/purchase") && "sf-tab-active")}>Purchase</div>
          </Link>
          <Link href="/production">
            <div className={cn("sf-tab", isActiveRoute("/production") && "sf-tab-active")}>Production</div>
          </Link>
          <Link href="/finance">
            <div className={cn("sf-tab", isActiveRoute("/finance") && "sf-tab-active")}>Finance</div>
          </Link>
          <Link href="/general-ledger">
            <div className={cn("sf-tab", isActiveRoute("/general-ledger") && "sf-tab-active")}>Financial Reporting</div>
          </Link>
          <Link href="/controlling">
            <div className={cn("sf-tab", isActiveRoute("/controlling") && "sf-tab-active")}>Controlling</div>
          </Link>
          <Link href="/reports">
            <div className={cn("sf-tab", isActiveRoute("/reports") && "sf-tab-active")}>Reports</div>
          </Link>
          <Link href="/workspace-manager">
            <div className={cn("sf-tab", isActiveRoute("/workspace-manager") && "sf-tab-active")}>Workspace Manager</div>
          </Link>
          <Link href="/honest-development-status">
            <div className={cn("sf-tab", isActiveRoute("/honest-development-status") && "sf-tab-active")}>Development Status</div>
          </Link>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <nav className="bg-white border-b shadow-sm md:hidden">
          <div className="flex flex-col">
            <Link href="/">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/") && "bg-blue-50 text-blue-600"
              )}>
                Dashboard
              </div>
            </Link>
            <Link href="/master-data">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/master-data") && "bg-blue-50 text-blue-600"
              )}>
                Master Data
              </div>
            </Link>
            <Link href="/transactions">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/transactions") && "bg-blue-50 text-blue-600"
              )}>
                Transactions
              </div>
            </Link>
            <Link href="/sales">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/sales") && "bg-blue-50 text-blue-600"
              )}>
                Sales
              </div>
            </Link>
            <Link href="/inventory">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/inventory") && "bg-blue-50 text-blue-600"
              )}>
                Inventory
              </div>
            </Link>
            <Link href="/purchase">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/purchase") && "bg-blue-50 text-blue-600"
              )}>
                Purchase
              </div>
            </Link>
            <Link href="/production">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/production") && "bg-blue-50 text-blue-600"
              )}>
                Production
              </div>
            </Link>
            <Link href="/finance">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/finance") && "bg-blue-50 text-blue-600"
              )}>
                Finance
              </div>
            </Link>
            <Link href="/general-ledger">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/general-ledger") && "bg-blue-50 text-blue-600"
              )}>
                Financial Reporting
              </div>
            </Link>
            <Link href="/controlling">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/controlling") && "bg-blue-50 text-blue-600"
              )}>
                Controlling
              </div>
            </Link>
            <Link href="/reports">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/reports") && "bg-blue-50 text-blue-600"
              )}>
                Reports
              </div>
            </Link>
            <Link href="/workspace-manager">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/workspace-manager") && "bg-blue-50 text-blue-600"
              )}>
                Workspace Manager
              </div>
            </Link>
            <Link href="/honest-development-status">
              <div className={cn(
                "px-4 py-2 text-sm font-medium hover:bg-gray-100",
                isActiveRoute("/honest-development-status") && "bg-blue-50 text-blue-600"
              )}>
                Development Status
              </div>
            </Link>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="salesforce-main p-3 md:p-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {children}
      </main>

      {/* Jr Assistant Chat - Fixed Position */}
      <JrChatbot />
    </div>
  );
}
