import { useId, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiJson } from "../../api/client";
import { useAdminAuth } from "../../auth/AdminAuthProvider";

type RegisterAvailable = { available: boolean };

export default function AdminRegisterSuperAdminPage() {
  const formId = useId();
  const tokenId = `${formId}-token`;
  const emailId = `${formId}-email`;
  const passId = `${formId}-pass`;
  const pass2Id = `${formId}-pass2`;
  const { isAdminSession, isLoading: authLoading } = useAdminAuth();
  const [setupToken, setSetupToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availQ = useQuery({
    queryKey: ["admin", "register-available"],
    queryFn: () => apiJson<RegisterAvailable>("/api/v1/admin/auth/register-available"),
  });

  if (authLoading) {
    return (
      <main className="luxury-auth-page">
        <div className="luxury-auth-card">
          <p className="luxury-auth-loading">Caricamento…</p>
        </div>
      </main>
    );
  }

  if (isAdminSession) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <main className="luxury-auth-page">
      <div className="luxury-auth-card luxury-admin-login-card">
        <h1 className="luxury-auth-title">Crea super admin</h1>
        <p className="luxury-admin-login-hint">
          Prima installazione: servono il token di setup sul server (<code>LUXURY_SUPER_ADMIN_SETUP_TOKEN</code>) e nessun
          super admin già definito in variabili d’ambiente o in database.
        </p>
        {availQ.isLoading ? <p className="luxury-auth-loading">Verifica disponibilità…</p> : null}
        {availQ.isError ? (
          <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
            {availQ.error instanceof Error ? availQ.error.message : "Errore di rete."}
          </p>
        ) : null}
        {availQ.data && !availQ.data.available ? (
          <p className="luxury-admin-muted" role="status">
            La registrazione guidata non è attiva. Configura solo il token di setup senza username/password super admin in
            env, oppure accedi se hai già le credenziali.
          </p>
        ) : null}
        {error ? (
          <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
            {error}
          </p>
        ) : null}
        <form
          className="luxury-auth-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const t = setupToken.trim();
            const em = email.trim().toLowerCase();
            if (!t || !em || !password) {
              setError("Compila tutti i campi.");
              return;
            }
            if (password.length < 8) {
              setError("La password deve avere almeno 8 caratteri.");
              return;
            }
            if (password !== password2) {
              setError("Le password non coincidono.");
              return;
            }
            setSubmitting(true);
            void (async () => {
              try {
                const r = await apiFetch("/api/v1/admin/auth/register", {
                  method: "POST",
                  body: JSON.stringify({ setupToken: t, username: em, password }),
                });
                const text = await r.text();
                if (!r.ok) {
                  let msg = text || r.statusText;
                  try {
                    const j = JSON.parse(text) as { message?: string };
                    if (typeof j?.message === "string" && j.message.trim()) msg = j.message.trim();
                  } catch {
                    /* ignore */
                  }
                  throw new Error(msg);
                }
                window.location.assign("/account");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Registrazione non riuscita.");
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        >
          <div className="luxury-auth-field">
            <label htmlFor={tokenId} className="luxury-auth-label">
              Token di setup
            </label>
            <input
              id={tokenId}
              name="setupToken"
              type="password"
              autoComplete="off"
              value={setupToken}
              onChange={(ev) => setSetupToken(ev.target.value)}
              disabled={submitting || availQ.data?.available === false}
              className="luxury-auth-input"
            />
          </div>
          <div className="luxury-auth-field">
            <label htmlFor={emailId} className="luxury-auth-label">
              Email (login)
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={submitting || availQ.data?.available === false}
              className="luxury-auth-input"
            />
          </div>
          <div className="luxury-auth-field">
            <label htmlFor={passId} className="luxury-auth-label">
              Password
            </label>
            <input
              id={passId}
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={submitting || availQ.data?.available === false}
              className="luxury-auth-input"
            />
          </div>
          <div className="luxury-auth-field">
            <label htmlFor={pass2Id} className="luxury-auth-label">
              Ripeti password
            </label>
            <input
              id={pass2Id}
              name="password2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(ev) => setPassword2(ev.target.value)}
              disabled={submitting || availQ.data?.available === false}
              className="luxury-auth-input"
            />
          </div>
          <button
            type="submit"
            className="luxury-auth-submit"
            disabled={submitting || availQ.data?.available === false}
          >
            {submitting ? "Creazione…" : "Crea super admin"}
          </button>
        </form>
        <p className="luxury-admin-muted" style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link to="/account">Ho già un account — accedi</Link>
        </p>
      </div>
    </main>
  );
}
