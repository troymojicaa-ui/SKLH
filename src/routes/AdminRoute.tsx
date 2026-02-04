import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from "@/context/AuthProvider";

import { useAuth } from "../hooks/useAuth";

export default function AdminRoute() {
  // const { session, role, loading } = useAuth();

  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}