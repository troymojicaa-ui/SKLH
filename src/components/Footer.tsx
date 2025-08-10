import { Link } from "react-router-dom";
import skLogo from "@/assets/sk-logo.jpg";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img src={skLogo} alt="SK Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold">SK Loyola Heights</span>
            </div>
            <p className="text-gray-400">
              Empowering youth through innovation and community engagement.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/mission" className="hover:text-white transition-colors">Our Mission</Link></li>
              <li><a href="#projects" className="hover:text-white transition-colors">Projects</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Email: info@skpulseconnect.ph</li>
              <li>Phone: (02) 123-4567</li>
              <li>Address: Barangay Hall, Sample City</li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 SK Loyola Heights. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
