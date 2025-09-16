// src/components/Header.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import skLogo from "@/assets/sk-logo.jpg";
import LoginModal from "@/components/auth/LoginModal";

interface HeaderProps {
  onLogoutClick?: () => void;
}

const Header = ({ onLogoutClick }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false); // local Connect login modal

  const openLogin = () => setLoginOpen(true);
  const closeLogin = () => setLoginOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#173A67] border-b border-[#173A67] shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + Title */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              <img src={skLogo} alt="SK Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-semibold text-white">SK Loyola Heights</span>
          </Link>

          {/* Desktop Menu */}
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
              to="/projects"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Projects
            </Link>
            <Link
              to="/events"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Events
            </Link>

            {/* CTA — opens Connect login modal */}
            <Button
              onClick={openLogin}
              size="sm"
              className="h-8 rounded-md bg-white text-[#173A67] hover:bg-white/90"
            >
              Login
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-[#173A67] border-t border-white/10">
            <div className="flex flex-col px-4 py-3 space-y-3">
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
                to="/projects"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                Projects
              </Link>
              <Link
                to="/events"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white/90 hover:text-white transition-colors"
              >
                Events
              </Link>

              {/* Mobile CTA — also opens Connect login modal */}
              <Button
                onClick={() => {
                  setMenuOpen(false);
                  openLogin();
                }}
                className="w-full h-8 rounded-md bg-white text-[#173A67] hover:bg:white/90"
              >
                Login
              </Button>
            </div>

            {onLogoutClick && (
              <div className="border-t border-white/10 px-4 py-3">
                <Button
                  onClick={() => {
                    onLogoutClick();
                    setMenuOpen(false);
                  }}
                  size="sm"
                  variant="destructive"
                  className="w-full h-8 rounded-md"
                >
                  Log out
                </Button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Connect Login Modal (user role) */}
      <LoginModal isOpen={loginOpen} onClose={closeLogin} role="user" />
    </>
  );
};

export default Header;
