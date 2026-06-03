import { useId, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import {
  clearPostLoginReturnPath,
  consumePostLoginReturnPath,
  normalizePostLoginReturnPath,
} from "../lib/postLoginReturnPath";
import { humanizePostRegistrationAuthError } from "../utils/oidcErrors";
import { hasPendingBooking } from "./PendingBookingResume";
import { VelvetEntrySplashGate } from "./VelvetEntrySplashGate";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const formId = useId();
  const emailFieldId = `${formId}-email`;
  const passFieldId = `${formId}-pass`;
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signInWithPassword } = useVelvetAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <main className="velvet-auth-page">
        <div className="velvet-auth-card">
          <p className="velvet-auth-loading">Accesso in corso…</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <VelvetEntrySplashGate>
        <main className="velvet-auth-page">
        <div className="velvet-auth-card">
          <div className="velvet-auth-card-toolbar">
            <button
              type="button"
              className="velvet-auth-back"
              aria-label="Torna indietro"
              onClick={() => navigate(-1)}
            >
              <svg
                className="velvet-auth-back-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Indietro</span>
            </button>
          </div>
          <h1 className="velvet-auth-title">Accedi</h1>
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
              const u = email.trim().toLowerCase();
              if (!u || !password) {
                setError("Inserisci email e password.");
                return;
              }
              setSubmitting(true);
              void (async () => {
                try {
                  await signInWithPassword(u, password);
                  if (hasPendingBooking()) {
                    clearPostLoginReturnPath();
                  } else {
                    const ret = consumePostLoginReturnPath();
                    if (ret && ret !== "/account") {
                      navigate(normalizePostLoginReturnPath(ret), { replace: true });
                    }
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : humanizePostRegistrationAuthError(err));
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            <div className="velvet-auth-field">
              <label htmlFor={emailFieldId} className="velvet-auth-label">
                Email
              </label>
              <input
                id={emailFieldId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={submitting}
                className="velvet-auth-input"
              />
            </div>
            <div className="velvet-auth-field">
              <label htmlFor={passFieldId} className="velvet-auth-label">
                Password
              </label>
              <div className="velvet-auth-password-wrap">
                <input
                  id={passFieldId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  disabled={submitting}
                  className="velvet-auth-input velvet-auth-input--with-toggle"
                />
                <button
                  type="button"
                  className="velvet-auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={submitting}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="velvet-auth-password-toggle__icon">
                      <path
                        d="M3 3l18 18M10.73 10.73a3 3 0 004.24 4.24M9.88 9.88A10.05 10.05 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-4.13 5.41M6.12 6.12A10.02 10.02 0 003.46 12c.77 3.95 4.26 7 8.54 7 1.05 0 2.05-.18 2.98-.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="velvet-auth-password-toggle__icon">
                      <path
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <p className="velvet-auth-recover">
              <Link className="velvet-auth-recover-link" to="/reimposta-password">
                Password dimenticata?
              </Link>
            </p>
            <button type="submit" className="velvet-auth-submit" disabled={submitting}>
              {submitting ? "Accesso…" : "Accedi"}
            </button>
          </form>
        </div>
      </main>
      </VelvetEntrySplashGate>
    );
  }

  return <>{children}</>;
}
