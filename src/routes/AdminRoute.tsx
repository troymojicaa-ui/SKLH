import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function AdminRoute() {
  const { session, role, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;
  if (role !== "admin") return <Navigate to="/connect/app" replace />;

  return <Outlet />;
}