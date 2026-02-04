import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from "@/context/AuthProvider";

import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  // const { session, loading } = useAuth();

  // Pull what we need from our custom hook
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}