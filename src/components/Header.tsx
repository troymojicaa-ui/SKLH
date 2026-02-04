import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import skLogo from "@/assets/sk-logo.jpg";
import LoginModal from "@/components/auth/LoginModal";

import { useAuth } from "../hooks/useAuth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface HeaderProps {
  onLogoutClick?: () => void; // if provided, we assume user is logged in (based on your current setup)
}

const Header = ({ onLogoutClick }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // const isLoggedIn = Boolean(onLogoutClick);

  // 1. Get user data and logout function from useAuth
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  const openLogin = () => setLoginOpen(true);
  const closeLogin = () => setLoginOpen(false);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  // Close on ESC
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* HEADER (stays blue) */}
      <nav className="sticky top-0 z-50 bg-[#173A67] border-b border-[#173A67] shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              <img src={skLogo} alt="SK Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-semibold text-white">SK Loyola Heights</span>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center space-x-6 text-white/90">
            <Link
              to="/"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              to="/events"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Events
            </Link>

            {/* 2. AUTH SECTION (Avatar vs Login) */}
            {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <div className="w-9 h-9 rounded-full border-2 border-white/50 overflow-hidden bg-slate-200 hover:border-white transition-all">
                      {user?.profile?.avatar ? (
                        <img src={user?.profile?.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0C4A6E] text-white">
                          <User size={18} />
                        </div>
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    { isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" /> Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => logout()} 
                      className="text-red-600 cursor-pointer focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={openLogin}
                  size="sm"
                  className="h-8 rounded-md bg-white text-[#173A67] hover:bg-white/90"
                >
                  Login
                </Button>
              )}
            {/* </div> */}
          </div>

          {/* MOBILE HAMBURGER */}
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/60" onClick={closeMenu} />
      </div>

      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-[78%] max-w-[340px] md:hidden bg-black text-white transform transition-transform duration-300 ease-out
        ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/30">
                 {user?.profile?.avatar && <img src={user?.profile?.avatar} className="w-full h-full object-cover" />}
              </div>
              <span className="text-xs opacity-70 truncate max-w-[120px]">{user?.email}</span>
            </div>
          ) : (
            <span className="text-sm font-medium opacity-90">Menu</span>
          )}
          <button onClick={closeMenu}><X size={22} /></button>
        </div>

        <div className="px-6 py-8 flex flex-col gap-6 text-lg font-light">
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/about" onClick={closeMenu}>About</Link>
          <Link to="/events" onClick={closeMenu}>Events</Link>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
              <Link to="/dashboard/profile" onClick={closeMenu}>Profile</Link>
              <div className="pt-6">
                <Button
                  onClick={() => { logout(); closeMenu(); }}
                  variant="destructive"
                  className="w-full h-10"
                >
                  Log out
                </Button>
              </div>
            </>
          ) : (
            <div className="pt-6">
              <Button
                onClick={() => { closeMenu(); openLogin(); }}
                className="w-full h-10 bg-white text-black hover:bg-white/90"
              >
                Log In
              </Button>
            </div>
          )}
        </div>
      </aside>

      <LoginModal isOpen={loginOpen} onClose={closeLogin} role="user" />
    </>
  );
};

export default Header;
