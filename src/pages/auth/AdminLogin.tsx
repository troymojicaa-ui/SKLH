// src/pages/auth/AdminLogin.tsx
import { useEffect, useMemo, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";


export default function AdminLogin() {
  const { session, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const nextPath = useMemo(() => params.get("next") || "/admin/app", [params]);

  useEffect(() => {
    if (loading) return;
    if (session) {
      navigate(nextPath, { replace: true });
    } else {
      setModalOpen(true);
    }
  }, [loading, session, nextPath, navigate]);

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">Admin Access</h1>
        {loading ? (
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-gray-300 border-t-transparent" />
            Preparing admin…
          </p>
        ) : session ? (
          <p className="text-sm text-gray-600">Redirecting…</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-6">
              Log in to continue to the Admin Dashboard.
            </p>
            <LoginModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              role="admin"
              nextPath={nextPath}
            />
          </>
        )}
      </div>
    </div>
  );
}
