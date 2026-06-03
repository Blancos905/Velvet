import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthProvider";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { isAdminSession, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="velvet-auth-page">
        <div className="velvet-auth-card">
          <p className="velvet-auth-loading">Verifica sessione…</p>
        </div>
      </main>
    );
  }

  if (!isAdminSession) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <>{children}</>;
}
