import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";

import { useIsMobile } from "./hooks/use-mobile";
import LoginModal from "./components/auth/LoginModal";

import AdminLayout from "./components/layout/AdminLayout";
import UserLayout from "./components/layout/UserLayout";

import Index from "./pages/Index";
import AboutUs from "./pages/AboutUs";
import Mission from "./pages/Mission";
import PublicProjects from "./pages/PublicProjects";
import PublicProjectDetail from "./pages/PublicProjectDetail";
import PublicEvents from "./pages/PublicEvents";
import MobileHome from "./pages/MobileHome";

import AdminDashboard from "./pages/admin/AdminDashboard";
import YouthDatabase from "./pages/admin/YouthDatabase";
import Projects from "./pages/admin/Projects";
import EditAboutUs from "./pages/admin/EditAboutUs";
import CalendarPage from "./pages/admin/Calendar";
import Reports from "./pages/admin/Reports";
import AdminFacilities from "@/pages/admin/Facilities";
import AdminGate from "./pages/admin/AdminGate";

import UserDashboard from "./pages/user/UserDashboard";
import UserProjects from "./pages/user/Projects";
import UserRAI from "./pages/user/RAI";
import UserProfile from "./pages/user/Profile";
import ReportCreate from "./pages/user/ReportCreate";
import ReportSuccess from "./pages/user/ReportSuccess";
import ReportDetail from "./pages/user/ReportDetail";
import Events from "./pages/user/Events";
import Facilities from "./pages/user/Facilities";

import ResetPassword from "./pages/auth/ResetPassword";

import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthProvider";

const queryClient = new QueryClient();

function RootRouterGate() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <Index />;
}

function AdminLoginRoute() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="min-h-[100dvh] bg-neutral-50" />
      <LoginModal isOpen={open} onClose={() => setOpen(false)} role="admin" />
    </>
  );
}

function InlineLoading({ label }: { label: string }) {
  return (
    <div className="min-h-[40vh] w-full grid place-items-center">
      <div className="flex items-center text-slate-700">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function AdminEntry() {
  const { loading, session, role } = useAuth();
  if (loading) return <InlineLoading label="Preparing admin…" />;
  if (!session) return <AdminLoginRoute />;
  if (role === "admin") return <Navigate to="/admin/app" replace />;
  return <AdminGate />;
}

function CodeProxy() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && window.location.pathname !== "/auth/callback") {
      window.location.replace(`/auth/callback${window.location.search}`);
    }
  }, []);
  return null;
}

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const dest = (params.get("dest") as "admin" | "connect" | null) ?? null;

        const goDashboard = (d: "admin" | "connect" | null) => {
          const path = d === "admin" ? "/admin/app" : "/dashboard";
          window.history.replaceState(null, "", url.pathname + url.search);
          window.location.replace(`${path}?t=${Date.now()}`);
        };

        const goReset = (d: "admin" | "connect" | null) => {
          const q = d ? `?dest=${d}` : "";
          window.history.replaceState(null, "", url.pathname + url.search);
          window.location.replace(`/reset-password${q}`);
        };

        const hash = new URLSearchParams(url.hash.slice(1));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const linkType = (hash.get("type") || "").toLowerCase();

        const { data: sess0 } = await supabase.auth.getSession();
        if (sess0?.session) {
          if (linkType === "recovery") return goReset(dest);
          return goDashboard(dest);
        }

        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (setErr) throw setErr;
          window.history.replaceState(null, "", url.pathname + url.search);
          if (linkType === "recovery") return goReset(dest);
          return goDashboard(dest);
        }

        const code = params.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
          return goDashboard(dest);
        }

        const { data: sess1 } = await supabase.auth.getSession();
        if (sess1?.session) {
          if (linkType === "recovery") return goReset(dest);
          return goDashboard(dest);
        }

        throw new Error("No auth tokens or code found.");
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Sign-in failed. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto mt-24 max-w-md p-6 text-center">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p className="flex items-center justify-center text-gray-700">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finishing sign-in…
        </p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CodeProxy />
      <Routes>
        <Route path="/" element={<RootRouterGate />} />

        <Route path="/about" element={<AboutUs />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/projects" element={<PublicProjects />} />
        <Route path="/projects/:id" element={<PublicProjectDetail />} />
        <Route path="/events" element={<PublicEvents />} />

        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/admin" element={<AdminEntry />} />

        <Route path="/admin/app" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="youth-database" element={<YouthDatabase />} />
          <Route path="projects" element={<Projects />} />
          <Route path="about" element={<EditAboutUs />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="facilities" element={<AdminFacilities />} />
        </Route>

        <Route path="/dashboard" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="projects" element={<UserProjects />} />
          <Route path="report" element={<UserRAI />} />
          <Route path="report/new" element={<ReportCreate />} />
          <Route path="report/success" element={<ReportSuccess />} />
          <Route path="report/:id" element={<ReportDetail />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="facilities" element={<Facilities />} />
        </Route>

        <Route path="*" element={<Index />} />
      </Routes>
    </QueryClientProvider>
  );
}
