// src/components/routeGuards.tsx
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Loader2 } from "lucide-react";

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

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const loc = useLocation();
  console.log("[RequireAuth] loading:", loading, "session:", !!session, "path:", loc.pathname);
  if (loading) return <InlineLoading label="Checking session…" />;
  if (!session) return <Navigate to="/" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, session, role } = useAuth();
  const loc = useLocation();
  console.log("[RequireAdmin] loading:", loading, "session:", !!session, "role:", role);
  if (loading) return <InlineLoading label="Verifying admin access…" />;
  if (!session) return <Navigate to="/" state={{ from: loc }} replace />;
  if (role !== "admin") return <Navigate to="/admin/gate" replace />;
  return <>{children}</>;
}
