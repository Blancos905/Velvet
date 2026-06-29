import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SupportInfo } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { useVelvetEmbeddedPanel } from "../../hooks/useVelvetEmbeddedPanel";
import { LEGAL_PLATFORM_ADMIN_ACCESS_PARAGRAPH } from "../../content/legalSharedCopy";
import { SalonPremiumOwnerInfoPrivacyContent } from "./SalonPremiumOwnerInfoPrivacyContent";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-info-privacy-premium.css";

function StaffAccountInfoPrivacyContent() {
  return (
    <div className="luxury-info-privacy__body">
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">Informativa per operatori</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          Come membro dello staff, il <strong>salone che ti ha registrato</strong> è titolare del trattamento dei tuoi dati
          operativi (turni, agenda, foto in vetrina). Saloni Luxury fornisce solo la piattaforma tecnica. Testo completo:{" "}
          <Link to="/privacy/staff" className="luxury-link-inline">
            Informativa privacy staff
          </Link>
          .
        </p>
      </section>
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">I tuoi diritti</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          Per accesso, rettifica o cancellazione del profilo operatore contatta il <strong>titolare del tuo salone</strong>. Per
          segnalazioni tecniche o sicurezza sulla piattaforma usa{" "}
          <a href="mailto:privacy@saloniluxury.it" className="luxury-link-inline">
            privacy@saloniluxury.it
          </a>
          . Altri documenti:{" "}
          <Link to="/termini" className="luxury-link-inline">
            Termini
          </Link>
          ,{" "}
          <Link to="/privacy/cookie" className="luxury-link-inline">
            Cookie
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function DefaultAccountInfoPrivacyContent() {
  return (
    <div className="luxury-info-privacy__body">
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">Documenti ufficiali</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          Il testo legalmente vincolante è pubblicato sul sito:{" "}
          <Link to="/privacy/clienti" className="luxury-link-inline">
            Informativa privacy clienti (B2C)
          </Link>
          ,{" "}
          <Link to="/termini" className="luxury-link-inline">
            Termini di servizio
          </Link>
          ,{" "}
          <Link to="/privacy/cookie" className="luxury-link-inline">
            Cookie
          </Link>{" "}
          e{" "}
          <Link to="/privacy/scelte" className="luxury-link-inline">
            Scelte privacy
          </Link>
          . In app mobile viene mostrato lo stesso pannello web.
        </p>
      </section>
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">Dati account e utilizzo del servizio</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          I dati che inserisci nel profilo, nelle prenotazioni e nelle comunicazioni con i saloni servono a erogare il servizio
          (gestione appuntamenti, notifiche, chat dove attiva). Il trattamento avviene in modo lecito e pertinente rispetto alle
          finalità della piattaforma, nel rispetto del Regolamento (UE) 2016/679 (GDPR). {LEGAL_PLATFORM_ADMIN_ACCESS_PARAGRAPH} Dettagli
          nell&apos;
          <Link to="/privacy/clienti" className="luxury-link-inline">
            informativa privacy clienti
          </Link>
          .
        </p>
      </section>
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">I tuoi diritti</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          Puoi aggiornare molte informazioni da{" "}
          <Link to="/account/profilo" className="luxury-link-inline">
            Profilo
          </Link>
          . Per richieste su accesso, rettifica o cancellazione dei dati, contatta il supporto dalla pagina{" "}
          <Link to="/account/assistenza" className="luxury-link-inline">
            Assistenza
          </Link>
          . Hai diritto a proporre reclamo al{" "}
          <a className="luxury-link-inline" href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
            Garante per la protezione dei dati personali
          </a>
          .
        </p>
      </section>
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">Aggiornamenti</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          Eventuali condizioni legali complete o informative dettagliate possono essere pubblicate sul sito pubblico o comunicate
          per email. Questa pagina riassume l&apos;approccio in area account; per il testo legalmente vincolante fanno stato i
          documenti ufficiali del servizio.
        </p>
      </section>
    </div>
  );
}

export default function AccountInfoPrivacyPage() {
  const { accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const embedded = useVelvetEmbeddedPanel();
  const salonTier = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  const supportQ = useQuery({
    queryKey: ["me", "support", "info-privacy"],
    queryFn: () => apiJson<SupportInfo>("/api/v1/me/support", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const premiumOwner = isSalonTitolare && salonTier === "PREMIUM" && !isSalonStaff;
  const staffOperator = isSalonStaff && !isSalonTitolare;

  return (
    <div
      className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44${
        premiumOwner
          ? " luxury-account-page-shell--info-privacy-premium luxury-info-privacy-premium-page"
          : " luxury-account-page-shell--narrow"
      }`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <header
          className={
            premiumOwner
              ? "luxury-info-privacy-premium-page__header"
              : "luxury-consumer-bookings-dash__header--hero"
          }
        >
          {premiumOwner ? (
            <>
              <div className="luxury-info-privacy-premium-page__aurora" aria-hidden />
              <div className="luxury-info-privacy-premium-page__shine" aria-hidden />
            </>
          ) : (
            <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
          )}
          <div className="luxury-consumer-bookings-dash__title-row">
            <h1 className="luxury-consumer-bookings-dash__headline">
              <span className="luxury-consumer-bookings-dash__headline-pre">Info e </span>
              <span className="luxury-consumer-bookings-dash__headline-accent">privacy</span>
            </h1>
            <p
              className={
                premiumOwner ? "luxury-info-privacy-premium-page__subtitle" : "luxury-page-subtitle"
              }
              style={{ margin: 0 }}
            >
              {premiumOwner
                ? "Informativa per titolari con piano Premium: trasparenza sul trattamento dati in Saloni Luxury."
                : staffOperator
                  ? "Informativa per operatori e collaboratori registrati dal salone nell'agenda Luxury."
                  : "Informazioni sul trattamento dei dati e su come usiamo Saloni Luxury."}
            </p>
          </div>
        </header>

        {!isSalonTitolare && !embedded ? (
          <Link to="/account/prenotazioni" className="luxury-link-back">
            ← Area account
          </Link>
        ) : null}

        {premiumOwner ? (
          <SalonPremiumOwnerInfoPrivacyContent
            supportEmail={supportQ.data?.supportEmail}
            salonName={meSalon.data?.primaryLocationName}
          />
        ) : staffOperator ? (
          <StaffAccountInfoPrivacyContent />
        ) : (
          <DefaultAccountInfoPrivacyContent />
        )}
      </div>
    </div>
  );
}
