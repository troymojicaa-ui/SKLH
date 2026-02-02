import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import skLogo from "@/assets/sk-logo.jpg";
import LoginModal from "@/components/auth/LoginModal";

interface HeaderProps {
  onLogoutClick?: () => void; // if provided, we assume user is logged in (based on your current setup)
}

const Header = ({ onLogoutClick }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const isLoggedIn = Boolean(onLogoutClick);

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

            {/* Only show Dashboard when logged in */}
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            )}

            <Button
              onClick={openLogin}
              size="sm"
              className="h-8 rounded-md bg-white text-[#173A67] hover:bg-white/90"
            >
              Login
            </Button>
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

      {/* MOBILE DRAWER (black) */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={closeMenu}
        />
      </div>

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-[78%] max-w-[340px] md:hidden bg-black text-white transform transition-transform duration-300 ease-out
        ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        {/* Drawer header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
          <span className="text-sm font-medium tracking-wide opacity-90">Menu</span>
          <button
            className="text-white"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Links */}
        <div className="px-6 py-8 flex flex-col gap-6 text-lg">
          <Link to="/" onClick={closeMenu} className="hover:opacity-80 transition-opacity">
            Home
          </Link>
          <Link to="/about" onClick={closeMenu} className="hover:opacity-80 transition-opacity">
            About
          </Link>
          <Link to="/events" onClick={closeMenu} className="hover:opacity-80 transition-opacity">
            Events
          </Link>

          {/* Only show Dashboard when logged in */}
          {isLoggedIn && (
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="hover:opacity-80 transition-opacity"
            >
              Dashboard
            </Link>
          )}

          <div className="pt-6">
            <Button
              onClick={() => {
                closeMenu();
                openLogin();
              }}
              className="w-full h-10 rounded-md bg-white text-black hover:bg-white/90"
            >
              Log In
            </Button>
          </div>

          {isLoggedIn && (
            <div className="pt-2">
              <Button
                onClick={() => {
                  onLogoutClick?.();
                  closeMenu();
                }}
                variant="destructive"
                className="w-full h-10 rounded-md"
              >
                Log out
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
