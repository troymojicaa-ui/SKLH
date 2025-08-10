import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./components/layout/AdminLayout";
import UserLayout from "./components/layout/UserLayout";

// Public pages
import Index from "./pages/Index";
import About from "./pages/AboutUs";
import Mission from "./pages/Mission";
import PublicProjects from "./pages/PublicProjects";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import YouthDatabase from "./pages/admin/YouthDatabase";
import Projects from "./pages/admin/Projects";
import EditAboutUs from "./pages/admin/EditAboutUs";
import CalendarPage from "./pages/admin/Calendar";
import Reports from "./pages/admin/Reports";

// User pages
import UserDashboard from "./pages/user/UserDashboard";
import UserProjects from "./pages/user/Projects";
// If you've renamed RAI to Report, update this import accordingly.
// For now we'll keep using the existing RAI component as the "Reports" page.
import UserRAI from "./pages/user/RAI";
import UserProfile from "./pages/user/Profile";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/projects" element={<PublicProjects />} />

          {/* Admin routes inside AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="youth-database" element={<YouthDatabase />} />
            <Route path="projects" element={<Projects />} />
            <Route path="about" element={<EditAboutUs />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="reports" element={<Reports />} /> {/* fixed relative path */}
          </Route>

          {/* User dashboard (SK Connect) */}
          <Route path="/dashboard" element={<UserLayout />}>
            <Route index element={<UserDashboard />} />
            <Route path="projects" element={<UserProjects />} />
            <Route path="report" element={<UserRAI />} /> {/* shown as "Reports" in menu */}
            <Route path="profile" element={<UserProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
