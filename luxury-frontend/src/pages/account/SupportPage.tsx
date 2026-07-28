import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiJson } from "../../api/client";
import type { SupportInfo } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS, ClientAccountContentCard } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../components/account/InfoPrivacyAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-feedback-client.css";
import "../../styles/luxury-client-account-page.css";
import "../../styles/luxury-support-client.css";
import "../../styles/luxury-support-salon.css";
import "../../styles/luxury-support-staff.css";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-support-page.css";

function sanitizeMailtoHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return `mailto:${encodeURIComponent(value)}`;
}

function sanitizeTelHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const normalized = value.replace(/[^\d+]/g, "");
  if (!normalized || (normalized.match(/\+/g)?.length ?? 0) > 1) return null;
  if (normalized.includes("+") && !normalized.startsWith("+")) return null;
  return `tel:${normalized}`;
}

type SupportPageTheme = "client" | "salon-side" | "staff-side";

function resolveSupportPageTheme(salonSide: boolean, staffOnly: boolean): SupportPageTheme {
  if (!salonSide) return "client";
  if (staffOnly) return "staff-side";
  return "salon-side";
}

function SupportPageShell({ children, theme }: { children: ReactNode; theme: SupportPageTheme }) {
  return (
    <div
      className={`luxury-support-page luxury-support-page--${theme} luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-account-page-shell luxury-account-page-shell--support ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">{children}</div>
    </div>
  );
}

export default function SupportPage() {
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const salonSide = isSalonTitolare || isSalonStaff;
  const staffOnly = isSalonStaff && !isSalonTitolare;
  const supportTheme = resolveSupportPageTheme(salonSide, staffOnly);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["me", "support"],
    queryFn: () => apiJson<SupportInfo>("/api/v1/me/support", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const sendSupportM = useMutation({
    mutationFn: () =>
      apiJson<{ message: string }>("/api/v1/me/support/requests", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          subject: subject.trim() || null,
          message: message.trim(),
        }),
      }),
    onSuccess: (res) => {
      setSendMsg(res.message);
      setSubject("");
      setMessage("");
    },
    onError: (err: Error) => setSendMsg(err.message),
  });

  const hero = (subtitle?: string | null) => (
    <ClientAccountHeroHeader
      headlinePre="Area "
      headlineAccent="assistenza"
      badgePrimary={salonSide ? (staffOnly ? "Area operatore" : "Area salone") : "Area cliente"}
      badgeSecondary="Supporto Luxury"
      kickerLabel="Contatti e richieste"
      kickerChip={salonSide ? (staffOnly ? "Agenda Luxury" : "Piano salone") : "Team Saloni Luxury"}
      subtitle={
        subtitle?.trim() ? (
          subtitle
        ) : salonSide ? (
          <>
            Per problemi tecnici, operativi o commerciali del <strong>salone</strong> contatta il team Saloni Luxury o invia
            una <em>richiesta</em> dal modulo.
          </>
        ) : (
          <>
            Per problemi tecnici, operativi o commerciali contatta il <strong>team Saloni Luxury</strong> o invia una{" "}
            <em>richiesta</em> dal modulo.
          </>
        )
      }
      metaItems={[
        { icon: CLIENT_ACCOUNT_ICONS.support, label: "Supporto diretto" },
        { icon: INFO_PRIVACY_HERO_ICONS.clock, label: "Risposta il prima possibile" },
      ]}
    />
  );

  if (q.isLoading) {
    return (
      <SupportPageShell theme={supportTheme}>
        {hero("Caricamento informazioni di contatto…")}
        <ClientAccountContentCard
          ariaLabel="Assistenza"
          title="Caricamento"
          leadIcon={CLIENT_ACCOUNT_ICONS.support}
          leadCopy="Stiamo recuperando i contatti di assistenza…"
        >
          <p className="luxury-text-muted">Attendi qualche istante.</p>
        </ClientAccountContentCard>
      </SupportPageShell>
    );
  }
  if (q.error) {
    return (
      <SupportPageShell theme={supportTheme}>
        {hero("Non siamo riusciti a leggere i contatti dal server.")}
        <ClientAccountContentCard
          ariaLabel="Assistenza"
          title="Errore caricamento"
          leadIcon={CLIENT_ACCOUNT_ICONS.support}
          leadCopy="Riprova tra poco o scrivi direttamente al team se il problema persiste."
        >
          <p className="luxury-alert luxury-alert--error" role="alert">
            {q.error instanceof Error ? q.error.message : "Errore"}
          </p>
        </ClientAccountContentCard>
      </SupportPageShell>
    );
  }

  const s = q.data;
  if (!s) return null;
  const phoneLabel = s.supportPhone?.trim() ?? "";
  const telHref = sanitizeTelHref(phoneLabel);
  const waDigits = phoneLabel.replace(/\D/g, "");
  const waHref = waDigits.length > 0 ? `https://wa.me/${waDigits}` : null;
  const mailHref = sanitizeMailtoHref(s.supportEmail);

  return (
    <SupportPageShell theme={supportTheme}>
      {hero(s.message)}

      <ClientAccountContentCard
        ariaLabel="Contatti assistenza Saloni Luxury"
        title="Contatta il team"
        leadIcon={CLIENT_ACCOUNT_ICONS.support}
        leadCopy="Per qualsiasi problema tecnico, operativo o commerciale scrivici o invia una richiesta dal modulo."
      >
        <div className="luxury-support-contacts" aria-label="Contatti diretti Saloni Luxury">
          {mailHref ? (
            <a className="luxury-support-contact" href={mailHref}>
              <span className="luxury-support-contact__label">Email</span>
              <strong>{s.supportEmail}</strong>
            </a>
          ) : (
            <div className="luxury-support-contact luxury-support-contact--muted">
              <span className="luxury-support-contact__label">Email</span>
              <strong>Non disponibile</strong>
            </div>
          )}
          {telHref && phoneLabel ? (
            <div className="luxury-support-contact">
              <span className="luxury-support-contact__label">Telefono</span>
              <div className="luxury-support-contact__value-row">
                {waHref ? (
                  <a
                    className="luxury-support-contact__whatsapp"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Apri WhatsApp"
                    title="WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </a>
                ) : null}
                <a className="luxury-support-contact__tel" href={telHref}>
                  <strong>{phoneLabel}</strong>
                </a>
              </div>
            </div>
          ) : (
            <div className="luxury-support-contact luxury-support-contact--muted">
              <span className="luxury-support-contact__label">Telefono</span>
              <strong>Non disponibile</strong>
            </div>
          )}
        </div>
        <p className="luxury-support-note">Ti risponderemo il prima possibile.</p>
        <form
          className="luxury-support-request-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSendMsg(null);
            if (message.trim().length < 10) {
              setSendMsg("Scrivi almeno 10 caratteri per descrivere il problema.");
              return;
            }
            sendSupportM.mutate();
          }}
        >
          <label className="luxury-form-label">
            Oggetto (facoltativo)
            <input
              className="luxury-soft-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="Es. Problema prenotazione"
            />
          </label>
          <label className="luxury-form-label">
            Messaggio
            <textarea
              className="luxury-soft-field luxury-support-request-form__textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              minLength={10}
              maxLength={2000}
              required
              placeholder="Descrivi il problema (almeno 10 caratteri)…"
            />
          </label>
          <button type="submit" className="luxury-btn luxury-btn--primary" disabled={sendSupportM.isPending}>
            {sendSupportM.isPending ? "Invio…" : "Invia richiesta assistenza"}
          </button>
          {sendMsg ? (
            <p
              className={`luxury-alert ${
                /\b(inviata|registrata|riceve)\b/i.test(sendMsg) ? "luxury-alert--success" : "luxury-alert--error"
              }`}
              role="status"
            >
              {sendMsg}
            </p>
          ) : null}
        </form>
      </ClientAccountContentCard>
    </SupportPageShell>
  );
}
