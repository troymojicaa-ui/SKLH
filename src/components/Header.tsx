import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import skLogo from "@/assets/sk-logo.jpg";

interface HeaderProps {
  onLoginClick?: (role: "admin" | "user") => void;
}

const Header = ({ onLoginClick }: HeaderProps) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo + Title */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-4 border-gradient-to-r from-blue-600 to-purple-600">
              <img src={skLogo} alt="SK Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold text-gray-900">SK Loyola Heights</span>
          </Link>

          {/* Menu Items */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/about"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              About
            </Link>
            <Link
              to="/projects"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Projects
            </Link>
            {onLoginClick && (
              <Button onClick={() => onLoginClick("user")} variant="outline">
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;

