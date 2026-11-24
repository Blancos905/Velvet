import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { apiJson } from "../api/client";
import { PREMIUM_SALON_POST_LOGIN_PATH } from "../lib/salonRegistrationPostLogin";
import { LuxuryEmailResentBox } from "./LuxuryEmailLinkConfirmSuccessBox";
import "../styles/luxury-email-confirm-box.css";

type EmailVerificationResendResponse = {
  message: string;
};

export type LuxuryRegistrationEmailConfirmBoxProps = {
  email: string;
  /** Es. «cliente» o «titolare salone» */
  accountLabel?: string;
  /** Messaggio extra (es. avviso super admin) */
  extraNote?: string | null;
  loginReturnPath?: string;
  /** Dopo correzione email e reinvio riuscito (es. aggiorna stato pagina). */
  onEmailCorrected?: (correctedEmail: string) => void;
  /** Es. torna alla griglia piani su `/piani` dopo la registrazione. */
  onBackToPlans?: () => void;
};

export function LuxuryRegistrationEmailConfirmBox({
  email,
  accountLabel = "cliente",
  extraNote = null,
  loginReturnPath = "/account",
  onEmailCorrected,
  onBackToPlans,
}: LuxuryRegistrationEmailConfirmBoxProps) {
  const formId = useId();
  const [editingEmail, setEditingEmail] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [displayEmail, setDisplayEmail] = useState(email);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);

  useEffect(() => {
    setDraftEmail(email);
    setDisplayEmail(email);
  }, [email]);

  const resendM = useMutation({
    mutationFn: async (targetEmail: string) => {
      const body = await apiJson<EmailVerificationResendResponse>("/api/v1/auth/email-verification/resend", {
        method: "POST",
        body: JSON.stringify({ email: targetEmail.trim().toLowerCase() }),
      });
      return { message: body.message, email: targetEmail.trim().toLowerCase() };
    },
    onSuccess: ({ message, email: sentTo }) => {
      setResendErr(null);
      setResendMsg(message);
      setDisplayEmail(sentTo);
      setDraftEmail(sentTo);
      setEditingEmail(false);
      if (sentTo !== email.trim().toLowerCase()) {
        onEmailCorrected?.(sentTo);
      }
    },
    onError: (e: Error) => {
      setResendMsg(null);
      setResendErr(e.message);
    },
  });

  const submitResend = () => {
    setResendErr(null);
    setResendMsg(null);
    const target = draftEmail.trim().toLowerCase();
    if (!target || !target.includes("@")) {
      setResendErr("Inserisci un indirizzo email valido.");
      return;
    }
    resendM.mutate(target);
  };

  return (
    <section className="luxury-email-confirm-box" aria-live="polite">
      <div className="luxury-email-confirm-box__glow" aria-hidden />
      <div className="luxury-email-confirm-box__icon-wrap" aria-hidden>
        <svg className="luxury-email-confirm-box__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M5 7l7 5.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <p className="luxury-email-confirm-box__kicker">Ultimo passo</p>
      <h2 className="luxury-email-confirm-box__title">Controlla la tua email</h2>
      <p className="luxury-email-confirm-box__lead">
        Ti abbiamo mandato un link per attivare l&apos;account {accountLabel}.
      </p>

      <div className="luxury-email-confirm-box__email-row">
        <span className="luxury-email-confirm-box__email-label">Inviato a</span>
        {editingEmail ? (
          <input
            id={`${formId}-email`}
            className="luxury-email-confirm-box__email-input"
            type="email"
            autoComplete="email"
            value={draftEmail}
            onChange={(ev) => setDraftEmail(ev.target.value)}
            disabled={resendM.isPending}
            aria-label="Correggi indirizzo email"
          />
        ) : (
          <strong className="luxury-email-confirm-box__email">{displayEmail}</strong>
        )}
        {!editingEmail ? (
          <button
            type="button"
            className="luxury-email-confirm-box__email-edit-link"
            onClick={() => {
              setEditingEmail(true);
              setResendErr(null);
              setResendMsg(null);
            }}
          >
            Hai sbagliato l&apos;email?
          </button>
        ) : (
          <button
            type="button"
            className="luxury-email-confirm-box__email-edit-link"
            onClick={() => {
              setEditingEmail(false);
              setDraftEmail(displayEmail);
              setResendErr(null);
            }}
            disabled={resendM.isPending}
          >
            Annulla modifica
          </button>
        )}
      </div>

      {editingEmail ? (
        <p className="luxury-email-confirm-box__email-edit-hint">
          Correggi l&apos;indirizzo e reinvia: se ti sei registrato con un typo (es.{" "}
          <span className="luxury-email-confirm-box__email-typo">gamil.com</span>), aggiorniamo la registrazione e
          inviamo il link alla casella giusta.
        </p>
      ) : null}

      {resendErr ? (
        <p className="luxury-alert luxury-alert--error luxury-email-confirm-box__alert" role="alert">
          {resendErr}
        </p>
      ) : null}
      {resendMsg ? <LuxuryEmailResentBox /> : null}

      <ol className="luxury-email-confirm-box__steps">
        <li>Apri il messaggio nella casella di posta</li>
        <li>Clicca <strong>Conferma email</strong></li>
        <li>
          {loginReturnPath === PREMIUM_SALON_POST_LOGIN_PATH
            ? "Dopo la conferma potrai procedere al pagamento (prova gratuita, nessun addebito oggi)."
            : "Dopo la conferma completeremo la registrazione."}
        </li>
      </ol>

      {extraNote ? (
        <p className="luxury-email-confirm-box__extra" role="status">
          {extraNote}
        </p>
      ) : null}

      <p className="luxury-email-confirm-box__hint">Non la trovi? Controlla spam e promozioni.</p>

      <div className="luxury-email-confirm-box__actions">
        <button
          type="button"
          className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--primary"
          disabled={resendM.isPending}
          onClick={submitResend}
        >
          {resendM.isPending
            ? "Invio…"
            : editingEmail
              ? "Reinvia al nuovo indirizzo"
              : "Reinvia email"}
        </button>
        {onBackToPlans ? (
          <button
            type="button"
            className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--back"
            disabled={resendM.isPending}
            onClick={onBackToPlans}
          >
            Torna indietro
          </button>
        ) : null}
      </div>
    </section>
  );
}
