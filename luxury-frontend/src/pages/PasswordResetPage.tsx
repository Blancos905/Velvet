import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, apiJson } from "../api/client";
import { normalizeNativeDevPageHost } from "../lib/nativeAppDevHost";

type PasswordResetRequestResponse = {
  message: string;
};

function normalizeTokenFromUrl(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formId = useId();

  const tokenParam = searchParams.get("token");
  const tokenFromUrl = useMemo(() => normalizeTokenFromUrl(tokenParam), [tokenParam]);
  const intentConfirm = searchParams.has("token");
  const hasValidTokenFormat = tokenFromUrl.length === 64 && /^[a-f0-9]+$/i.test(tokenFromUrl);
  const mode: "confirm" | "invalid-token" | "request" = intentConfirm
    ? hasValidTokenFormat
      ? "confirm"
      : "invalid-token"
    : "request";

  const [email, setEmail] = useState("");
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [requestErr, setRequestErr] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  const emailParam = searchParams.get("email");
  useEffect(() => {
    normalizeNativeDevPageHost();
  }, []);

  useEffect(() => {
    if (emailParam && emailParam.trim()) {
      setEmail((e) => (e.trim() ? e : emailParam.trim().toLowerCase()));
    }
  }, [emailParam]);

  const requestM = useMutation({
    mutationFn: async () => {
      const body = await apiJson<PasswordResetRequestResponse>("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      return body.message;
    },
    onSuccess: (m) => {
      setRequestErr(null);
      setRequestMsg(m);
    },
    onError: (e: Error) => {
      setRequestMsg(null);
      setRequestErr(e.message);
    },
  });

  const confirmM = useMutation({
    mutationFn: async () => {
      const t = tokenFromUrl.toLowerCase();
      const r = await apiFetch("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: t,
          newPassword,
          confirmPassword,
        }),
      });
      const text = await r.text();
      if (!r.ok) {
        let msg = text.trim() || r.statusText;
        try {
          const j = JSON.parse(text) as { message?: string; detail?: string };
          if (typeof j?.message === "string" && j.message.trim()) msg = j.message.trim();
          else if (typeof j?.detail === "string" && j.detail.trim()) msg = j.detail.trim();
        } catch {
          /* use raw */
        }
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      setConfirmErr(null);
      setConfirmMsg("Password aggiornata. Ora puoi accedere con la nuova password.");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => {
      setConfirmMsg(null);
      setConfirmErr(e.message);
    },
  });

  return (
    <main className="luxury-auth-page">
      <div className="luxury-auth-card">
        <div className="luxury-auth-card-toolbar">
          <button type="button" className="luxury-auth-back" aria-label="Torna indietro" onClick={() => navigate(-1)}>
            <svg className="luxury-auth-back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
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

        {mode === "invalid-token" ? (
          <>
            <h1 className="luxury-auth-title">Link non valido</h1>
            <p className="luxury-auth-lead">
              Il link è incompleto, scaduto o già utilizzato. Richiedi un nuovo invio dall&apos;email di recupero.
            </p>
            <p className="luxury-auth-lead">
              <Link className="luxury-link-inline" to="/reimposta-password">
                Richiedi di nuovo il link
              </Link>{" "}
              ·{" "}
              <Link className="luxury-link-inline" to="/account">
                Torna all&apos;accesso
              </Link>
            </p>
          </>
        ) : mode === "confirm" ? (
          <>
            <h1 className="luxury-auth-title">Nuova password</h1>
            <p className="luxury-auth-lead">Scegli una password sicura (almeno 8 caratteri).</p>
            {confirmErr ? (
              <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
                {confirmErr}
              </p>
            ) : null}
            {confirmMsg ? (
              <p className="luxury-alert luxury-alert--success luxury-auth-alert" role="status">
                {confirmMsg}{" "}
                <Link className="luxury-link-inline" to="/account">
                  Vai all&apos;accesso
                </Link>
              </p>
            ) : null}
            <form
              className="luxury-auth-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmErr(null);
                setConfirmMsg(null);
                if (!hasValidTokenFormat) {
                  setConfirmErr("Link non valido.");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setConfirmErr("Le password non coincidono.");
                  return;
                }
                confirmM.mutate();
              }}
            >
              <div className="luxury-auth-field">
                <label htmlFor={`${formId}-new`} className="luxury-auth-label">
                  Nuova password
                </label>
                <input
                  id={`${formId}-new`}
                  className="luxury-auth-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  disabled={confirmM.isPending || !hasValidTokenFormat}
                />
              </div>
              <div className="luxury-auth-field">
                <label htmlFor={`${formId}-c2`} className="luxury-auth-label">
                  Conferma password
                </label>
                <input
                  id={`${formId}-c2`}
                  className="luxury-auth-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  disabled={confirmM.isPending || !hasValidTokenFormat}
                />
              </div>
              <button type="submit" className="luxury-auth-submit" disabled={confirmM.isPending || !hasValidTokenFormat}>
                {confirmM.isPending ? "Salvataggio…" : "Salva nuova password"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="luxury-auth-title">Recupera password</h1>
            <p className="luxury-auth-lead">
              Inserisci l&apos;email di registrazione: se è associata a un account attivo, riceverai un messaggio con il link
              per reimpostare la password.
            </p>
            {requestErr ? (
              <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
                {requestErr}
              </p>
            ) : null}
            {requestMsg ? (
              <p className="luxury-alert luxury-alert--success luxury-auth-alert" role="status">
                {requestMsg}
              </p>
            ) : null}
            <form
              className="luxury-auth-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setRequestErr(null);
                setRequestMsg(null);
                const u = email.trim().toLowerCase();
                if (!u) {
                  setRequestErr("Inserisci un indirizzo email.");
                  return;
                }
                requestM.mutate();
              }}
            >
              <div className="luxury-auth-field">
                <label htmlFor={`${formId}-email`} className="luxury-auth-label">
                  Email
                </label>
                <input
                  id={`${formId}-email`}
                  className="luxury-auth-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  disabled={requestM.isPending}
                />
              </div>
              <button type="submit" className="luxury-auth-submit" disabled={requestM.isPending}>
                {requestM.isPending ? "Invio…" : "Invia link"}
              </button>
            </form>
            <p className="luxury-auth-lead" style={{ marginTop: "1rem" }}>
              <Link className="luxury-link-inline" to="/account">
                Torna all&apos;accesso
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
