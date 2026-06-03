import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import { useAdminAuth } from "../../auth/AdminAuthProvider";

type VelvetAdminStatus = {
  application: string;
  javaRuntimeVersion: string;
  javaVersionProperty: string;
  superAdminConfigured: boolean;
  clientSuperAdminBootstrapAvailable: boolean;
  setupTokenRegisterAvailable: boolean;
};

export default function AdminLoginPage() {
  const formId = useId();
  const userFieldId = `${formId}-user`;
  const passFieldId = `${formId}-pass`;
  const { isAdminSession, isLoading, signInWithUsernamePassword } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const adminStatusQ = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => apiJson<VelvetAdminStatus>("/api/v1/admin/status"),
    staleTime: 30_000,
  });
  const superAdminFirstInstallHref = adminStatusQ.data?.clientSuperAdminBootstrapAvailable
    ? "/registrati?superadmin=1"
    : adminStatusQ.data?.setupTokenRegisterAvailable
      ? "/admin/register"
      : null;

  if (isLoading) {
    return (
      <main className="velvet-auth-page">
        <div className="velvet-auth-card">
          <p className="velvet-auth-loading">Caricamento…</p>
        </div>
      </main>
    );
  }

  if (isAdminSession) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <main className="velvet-auth-page">
      <div className="velvet-auth-card velvet-admin-login-card">
        <h1 className="velvet-auth-title">Account super admin</h1>
        <p className="velvet-admin-login-hint">Accesso riservato al pannello di gestione.</p>
        {error ? (
          <p className="velvet-alert velvet-alert--error velvet-auth-alert" role="alert">
            {error}
          </p>
        ) : null}
        <form
          className="velvet-auth-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const u = username.trim();
            if (!u || !password) {
              setError("Inserisci utente e password.");
              return;
            }
            setSubmitting(true);
            void (async () => {
              try {
                await signInWithUsernamePassword(u, password);
                navigate(from && from.startsWith("/admin") ? from : "/admin/dashboard", { replace: true });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Accesso non riuscito.");
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        >
          <div className="velvet-auth-field">
            <label htmlFor={userFieldId} className="velvet-auth-label">
              Utente
            </label>
            <input
              id={userFieldId}
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              disabled={submitting}
              className="velvet-auth-input"
            />
          </div>
          <div className="velvet-auth-field">
            <label htmlFor={passFieldId} className="velvet-auth-label">
              Password
            </label>
            <input
              id={passFieldId}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={submitting}
              className="velvet-auth-input"
            />
          </div>
          <button type="submit" className="velvet-auth-submit" disabled={submitting}>
            {submitting ? "Accesso…" : "Entra"}
          </button>
        </form>
        {superAdminFirstInstallHref ? (
          <p className="velvet-admin-muted" style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to={superAdminFirstInstallHref}>Prima installazione? Crea il super admin</Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
