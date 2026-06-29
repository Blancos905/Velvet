import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthProvider";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { isAdminSession, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="luxury-auth-page">
        <div className="luxury-auth-card">
          <p className="luxury-auth-loading">Verifica sessione…</p>
        </div>
      </main>
    );
  }

  if (!isAdminSession) {
    const returnPath = `${location.pathname}${location.search}`;
    setPostLoginReturnPath(returnPath.startsWith("/admin") ? returnPath : "/admin/dashboard");
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}
