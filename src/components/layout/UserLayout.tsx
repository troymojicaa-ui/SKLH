import { useEffect, useRef, useState } from "react";
import {
  Outlet,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  Users,
  Menu,
  CalendarDays,
  Building2,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import circleLogo from "@/assets/circle logo.png";

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/dashboard";
  const isRAI = location.pathname.startsWith("/dashboard/report");

  // Close mobile dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Events", href: "/dashboard/events", icon: CalendarDays },
    { name: "Facilities", href: "/dashboard/facilities", icon: Building2 },
    { name: "Reports", href: "/dashboard/report", icon: ShieldAlert },
    { name: "Profile", href: "/dashboard/profile", icon: UserIcon },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-4 border-b">
        <Users className="w-8 h-8 text-purple-600" />
        <span className="ml-2 text-lg font-semibold">SK Connect</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-900"
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
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-sky-900 px-4 py-3 md:hidden">
        <img
          src={circleLogo}
          alt="SK Logo"
          className="h-8 w-8 rounded-full object-cover"
        />

        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="
                fixed top-[56px] left-0 right-0 z-30
                bg-sky-900 text-white flex flex-col
                divide-y divide-sky-800
              "
            >
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-base hover:bg-sky-800"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/dashboard");
                }}
              >
                <Home className="h-5 w-5" />
                Home
              </button>

              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-base hover:bg-sky-800"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/dashboard/events");
                }}
              >
                <CalendarDays className="h-5 w-5" />
                Events
              </button>

              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-base hover:bg-sky-800"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/dashboard/facilities");
                }}
              >
                <Building2 className="h-5 w-5" />
                Facilities
              </button>

              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-base hover:bg-sky-800"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/dashboard/report");
                }}
              >
                <ShieldAlert className="h-5 w-5" />
                RAI
              </button>

              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-base hover:bg-sky-800"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/dashboard/profile");
                }}
              >
                <UserIcon className="h-5 w-5" />
                Profile
              </button>

              <div className="mt-2 border-t border-sky-800" />

              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-base hover:bg-sky-800"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="pt-14 md:pt-0 md:mx-auto md:w-full md:max-w-md md:p-4">
            {/* Back to Home bar (NOT on home, NOT on RAI) */}
            {!isHome && !isRAI && (
              <div className="sticky top-[56px] md:top-0 z-20 bg-white/95 backdrop-blur border-b">
                <div className="px-4 py-3">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Home
                  </button>
                </div>
              </div>
            )}

            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
