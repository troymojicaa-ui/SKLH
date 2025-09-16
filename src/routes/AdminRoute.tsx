
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

export default function AdminRoute() {
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const loc = useLocation();

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn("[AdminRoute] profiles lookup error:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.role === "admin");
        }
      });
  }, [session]);

  if (loading || isAdmin === null) return null; // or a spinner
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace state={{ from: loc }} />;
}
