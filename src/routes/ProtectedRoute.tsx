import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or a spinner
  return session ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

