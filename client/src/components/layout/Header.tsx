import { Menu, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-20 bg-white border-b border-gray-200 px-6 py-3 h-16 flex items-center justify-between">
      <div className="flex items-center">
        <button
          type="button"
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 lg:hidden mr-4"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-gray-700"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
