// src/App.tsx
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";

import { useIsMobile } from "./hooks/use-mobile";
import LoginModal from "./components/auth/LoginModal";

// Layouts
import AdminLayout from "./components/layout/AdminLayout";
import UserLayout from "./components/layout/UserLayout";

// Public pages
import Index from "./pages/Index";
import AboutUs from "./pages/AboutUs";
import Mission from "./pages/Mission";
import PublicProjects from "./pages/PublicProjects";
import PublicProjectDetail from "./pages/PublicProjectDetail";
import PublicEvents from "./pages/PublicEvents";
import MobileHome from "./pages/MobileHome"; // 👈 mobile homepage

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import YouthDatabase from "./pages/admin/YouthDatabase";
import Projects from "./pages/admin/Projects";
import EditAboutUs from "./pages/admin/EditAboutUs";
import CalendarPage from "./pages/admin/Calendar";
import Reports from "./pages/admin/Reports";
import AdminAddresses from "@/pages/admin/AdminAddresses";
import AdminFacilities from "@/pages/admin/Facilities"; // if present

// User pages
import UserDashboard from "./pages/user/UserDashboard";
import UserProjects from "./pages/user/Projects";
import UserRAI from "./pages/user/RAI";
import UserProfile from "./pages/user/Profile";
import ReportCreate from "./pages/user/ReportCreate";
import Events from "./pages/user/Events";
import Facilities from "./pages/user/Facilities";

// 🔐 Inline auth helpers (no extra files/imports to break)
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function RootRouterGate() {
  const isMobile = useIsMobile();
  // Mobile now lands on a lightweight mobile homepage instead of the Connect login
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

/** If a magic-link sends you to /?code=..., hop to /auth/callback with the same query */
function CodeProxy() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && window.location.pathname !== "/auth/callback") {
      // preserve all existing query params (code, dest, etc.)
      window.location.replace(`/auth/callback${window.location.search}`);
    }
  }, []);
  return null;
}

/** Helper: wait a tick for Supabase to persist the session */
async function waitForSession(timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

/** AuthCallback (inline) */
function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const desc = params.get("error_description");
      const urlDest = params.get("dest"); // "admin" | "connect"

      if (desc) {
        setError(desc);
        return;
      }

      // If there's no code but we already have a session, route in.
      if (!code) {
        const { data: sessionRes } = await supabase.auth.getSession();
        if (sessionRes?.session) {
          await routeToPortal(urlDest as any);
          return;
        }
        setError("Missing auth code in URL.");
        return;
      }

      // Normal flow: exchange the magic-link code for a session
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) {
        setError(exErr.message);
        return;
      }

      // Ensure the session is ready (prevents guards from bouncing you to "/")
      const session = await waitForSession();
      if (!session) {
        setError("Signed in, but session was not ready. Please try the link again.");
        return;
      }

      await routeToPortal(urlDest as any);
    })();
  }, []);

  async function routeToPortal(prefDest: "admin" | "connect" | null) {
    // Prefer explicit dest from URL/localStorage; fallback to profile role.
    let dest: "admin" | "connect" =
      prefDest ||
      (localStorage.getItem("post_login_dest") as any) ||
      "connect";

    if (!prefDest) {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        const role = (prof?.role ?? "member").toString().toLowerCase();
        dest = role === "admin" ? "admin" : "connect";
      }
    }

    // Final redirect (matches your routes)
    const path = dest === "admin" ? "/admin/app" : "/dashboard";

    // Clear temp and force a hard navigation so any guards re-evaluate with session present
    localStorage.removeItem("post_login_dest");
    window.location.href = `${path}?t=${Date.now()}`;
  }

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
      {/* Global catcher for code on the wrong route */}
      <CodeProxy />

      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRouterGate />} />

        {/* Public */}
        <Route path="/about" element={<AboutUs />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/projects" element={<PublicProjects />} />
        <Route path="/projects/:id" element={<PublicProjectDetail />} />
        <Route path="/events" element={<PublicEvents />} />

        {/* 🔐 Auth callback for magic links */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Admin login */}
        <Route path="/admin" element={<AdminLoginRoute />} />

        {/* Admin app (auth-gated + role-gated). Child paths are RELATIVE */}
        <Route path="/admin/app" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="youth-database" element={<YouthDatabase />} />
          <Route path="projects" element={<Projects />} />
          <Route path="about" element={<EditAboutUs />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="addresses" element={<AdminAddresses />} />
          <Route path="facilities" element={<AdminFacilities />} />
        </Route>

        {/* User dashboard (auth-gated). Child paths are RELATIVE */}
        <Route path="/dashboard" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="projects" element={<UserProjects />} />
          <Route path="report" element={<UserRAI />} />
          <Route path="report/new" element={<ReportCreate />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="facilities" element={<Facilities />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Index />} />
      </Routes>
    </QueryClientProvider>
  );
}
