// src/components/Header.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import skLogo from "@/assets/sk-logo.jpg";
import LoginModal from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthProvider";

interface HeaderProps {
  onLogoutClick?: () => void; // optional override
}

const Header = ({ onLogoutClick }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  const { loading, session, role, signOut } = useAuth();

  const openLogin = () => setLoginOpen(true);
  const closeLogin = () => setLoginOpen(false);

  const goHomeAuthed = () => {
    navigate(role === "admin" ? "/admin/app" : "/dashboard");
  };

  const handlePrimaryAuthClick = () => {
    if (session) {
      goHomeAuthed();
    } else {
      openLogin();
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    if (onLogoutClick) {
      onLogoutClick();
      return;
    }
    await signOut(); // AuthProvider will clear session and hard-redirect to "/"
  };

  // When the mobile menu is open, add a body class (to disable map pointer events via CSS)
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("body--menu-open");
    } else {
      document.body.classList.remove("body--menu-open");
    }
    return () => document.body.classList.remove("body--menu-open");
  }, [menuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-[60] bg-[#173A67] border-b border-[#173A67] shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              <img src={skLogo} alt="SK Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-semibold text-white">SK Loyola Heights</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
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
            <Link
              to="/dashboard"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Dashboard
            </Link>

            {loading ? (
              <span className="text-sm text-white/70">Checking session…</span>
            ) : !session ? (
              <Button
                onClick={handlePrimaryAuthClick}
                size="sm"
                className="h-8 rounded-md bg-white text-[#173A67] hover:bg-white/90"
              >
                Login
              </Button>
            ) : role === "admin" ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/app"
                  className="px-3 h-8 grid place-items-center rounded-md bg-white text-[#173A67] hover:bg-white/90 text-sm font-medium"
                >
                  Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/90 hover:text-white text-sm underline underline-offset-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="px-3 h-8 grid place-items-center rounded-md bg-white text-[#173A67] hover:bg-white/90 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/90 hover:text-white text-sm underline underline-offset-2"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer + backdrop (fixed so it floats above map) */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[70]"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed right-0 top-0 h-dvh w-4/5 max-w-sm bg-[#173A67] border-l border-white/10 z-[75] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-white">Menu</span>
              <button
                className="p-2 rounded hover:bg-white/10 text-white"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex flex-col gap-3">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                to="/about"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                to="/events"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                Events
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                Dashboard
              </Link>

              {loading ? (
                <div className="w-full h-8 grid place-items-center text-white/80 text-sm">
                  Checking session…
                </div>
              ) : !session ? (
                <Button
                  onClick={() => {
                    setMenuOpen(false);
                    handlePrimaryAuthClick();
                  }}
                  className="w-full h-8 rounded-md bg-white text-[#173A67] hover:bg-white/90"
                >
                  Login
                </Button>
              ) : role === "admin" ? (
                <>
                  <Link
                    to="/admin/app"
                    onClick={() => setMenuOpen(false)}
                    className="w-full h-8 grid place-items-center rounded-md bg-white text-[#173A67] hover:bg-white/90 text-sm font-medium"
                  >
                    Admin
                  </Link>
                  <Button
                    onClick={handleLogout}
                    size="sm"
                    variant="destructive"
                    className="w-full h-8 rounded-md"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="w-full h-8 grid place-items-center rounded-md bg-white text-[#173A67] hover:bg-white/90 text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Button
                    onClick={handleLogout}
                    size="sm"
                    variant="destructive"
                    className="w-full h-8 rounded-md"
                  >
                    Logout
                  </Button>
                </>
              )}
            </nav>
          </div>
        </>
      )}

      <LoginModal isOpen={loginOpen} onClose={closeLogin} role="user" />
    </>
  );
};

export default Header;
