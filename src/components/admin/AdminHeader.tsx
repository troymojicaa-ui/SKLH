import { NavLink } from "react-router-dom";

const AdminHeader = () => {
  const navItems = [
    { name: "Youth Database", path: "/admin/youth" },
    { name: "Projects", path: "/admin/projects" },
    { name: "About Us", path: "/admin/about" },
    { name: "See What's Happening", path: "/admin/news" },
    { name: "Calendar", path: "/admin/calendar" },
    { name: "History / Past Projects", path: "/admin/history" },
    { name: "Map", path: "/admin/map" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-6 overflow-x-auto py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600 pb-2"
                    : "text-gray-600 hover:text-gray-900"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default AdminHeader;
