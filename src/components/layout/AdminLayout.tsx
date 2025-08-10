import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  Shield,
  Home,
} from "lucide-react";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Sidebar navigation
  const navigation = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Youth Database", href: "/admin/youth-database", icon: Users },
    { name: "Projects", href: "/admin/projects", icon: FileText },
    { name: "About Us", href: "/admin/about", icon: Users },
    { name: "Calendar", href: "/admin/calendar", icon: Calendar },
    // ✅ New merged page
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
    // ❌ Removed:
    // { name: "See What's Happening", href: "/admin/news", icon: Calendar },
    // { name: "Map", href: "/admin/map", icon: BarChart3 },
  ];

  const handleLogout = () => {
    window.location.href = "/";
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-4 border-b">
        <Shield className="w-8 h-8 text-blue-600" />
        <span className="ml-2 text-lg font-semibold">SK Command</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-40 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
