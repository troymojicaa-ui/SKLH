// src/components/layout/AdminLayout.tsx
import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  LogOut,
  Home,
  BarChart3,
  Users,
  FileText,
  Info,
  Calendar,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

const ADMIN_BLUE = "#173A67";

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🔒 Avoid redirect loop on logout
  const loggingOutRef = useRef(false);

  // Guard: wait for loading; if no session and we're not in the middle of logout,
  // send to /admin (which shows modal)
  useEffect(() => {
    if (loading || loggingOutRef.current) return;
    if (!session) {
      navigate(`/admin?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [loading, session, navigate, location.pathname]);

  // Redirect to homepage after logout (and suppress guard during the transition)
  const handleLogout = async () => {
    try {
      loggingOutRef.current = true;
      setMenuOpen(false);
      await signOut();
      navigate("/", { replace: true });
    } finally {
      // small delay to ensure route change settles before re-enabling guard
      setTimeout(() => {
        loggingOutRef.current = false;
      }, 0);
    }
  };

  const navigation = [
    { name: "Dashboard", href: ".", icon: Home, end: true },
    { name: "Reports", href: "reports", icon: BarChart3 },
    { name: "Youth Database", href: "youth-database", icon: Users },
    { name: "Projects", href: "projects", icon: FileText },
    { name: "Calendar", href: "calendar", icon: Calendar },
    { name: "Facilities", href: "facilities", icon: Building2 },
    { name: "About Us", href: "about", icon: Info },
  ];

  const NavItem = ({
    to,
    end,
    children,
  }: {
    to: string;
    end?: boolean;
    children: React.ReactNode;
  }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-white/10 text-white"
            : "text-white/80 hover:text-white hover:bg-white/10",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );

  // While auth is resolving and before we know if there's a session, show a tiny bar
  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50">
        <header
          className="sticky top-0 z-50 w-full border-b border-black/10"
          style={{ backgroundColor: ADMIN_BLUE }}
        >
          <div className="h-12 w-full px-3 md:px-5 flex items-center">
            <div className="text-white text-sm">Checking session…</div>
          </div>
        </header>
        <main className="px-4 py-4 md:px-6">
          <div className="text-sm text-gray-600">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-gray-300 border-t-transparent mr-2" />
            Loading…
          </div>
        </main>
      </div>
    );
  }

  // If no session, the effect above will navigate; render nothing briefly.
  if (!session) return null;

  return (
    <div className="min-h-dvh bg-gray-50">
      <header
        className="sticky top-0 z-50 w-full border-b border-black/10"
        style={{ backgroundColor: ADMIN_BLUE }}
      >
        <div className="h-12 w-full px-3 md:px-5 flex items-center">
          <div className="md:hidden mr-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="h-12 flex items-center px-4 border-b">
                  <span className="text-base font-semibold">SK Command</span>
                </div>
                <nav className="p-2">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={Boolean((item as any).end)}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                          isActive
                            ? "bg-sky-100 text-sky-900"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                        ].join(" ")
                      }
                      onClick={() => setMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}

                  <div className="border-t mt-2 pt-2">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="mx-2 w-[calc(100%-1rem)] justify-start"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <NavItem key={item.name} to={item.href} end={Boolean((item as any).end)}>
                {item.name}
              </NavItem>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-[13px] font-medium text-rose-300 hover:text-white transition-colors"
              aria-label="Logout"
            >
              Logout
            </button>
            <div className="text-white font-semibold text-sm select-none hidden sm:block">
              SK Command
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 md:px-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
