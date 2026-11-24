import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SupportInfo } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import {
  INFO_PRIVACY_HERO_ICONS,
  InfoPrivacyAccountHeroHeader,
} from "../../components/account/InfoPrivacyAccountHeroHeader";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { LEGAL_PLATFORM_ADMIN_ACCESS_PARAGRAPH } from "../../content/legalSharedCopy";
import { useMeStaffSalonQuery } from "../../hooks/useMeStaffSalon";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { PrivacyPolicyConsumerLayeredContent } from "../legal/PrivacyPolicyConsumerLayeredContent";
import { SalonPremiumOwnerInfoPrivacyContent } from "./SalonPremiumOwnerInfoPrivacyContent";
import { StaffOperatorInfoPrivacyContent } from "./StaffOperatorInfoPrivacyContent";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-info-privacy-premium.css";
import "../../styles/luxury-info-privacy-consumer.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-info-privacy-salon.css";
import "../../styles/luxury-info-privacy-staff.css";
import "../../styles/luxury-legal-public.css";

const CLIENT_INFO_PRIVACY_HERO = {
  badgePrimary: "Area cliente",
  badgeSecondary: "GDPR art. 13",
  kickerLabel: "Informativa clienti",
  kickerChip: "Saloni Luxury",
  subtitle: (
    <>
      Informazioni per <strong>clienti</strong> che prenotano e usano <em>Saloni Luxury</em>: trasparenza su dati account,
      prenotazioni, notifiche e diritti GDPR.
    </>
  ),
  metaItems: [
    { icon: INFO_PRIVACY_HERO_ICONS.shield, label: "Saloni Luxury = titolare piattaforma" },
    { icon: INFO_PRIVACY_HERO_ICONS.calendar, label: "Prenotazioni e profilo B2C" },
  ],
} as const;

const PREMIUM_OWNER_INFO_PRIVACY_HERO = {
  badgePrimary: "Area salone",
  badgeSecondary: "GDPR art. 13",
  kickerLabel: "Informativa titolare",
  kickerChip: "Piano Premium",
  subtitle: (
    <>
      Informativa per <strong>titolari con piano Premium</strong>: trasparenza sul trattamento dati in{" "}
      <em>Saloni Luxury</em> — clienti, staff, fatturazione e vetrina.
    </>
  ),
  metaItems: [
    { icon: INFO_PRIVACY_HERO_ICONS.shield, label: "Titolare salone = data controller" },
    { icon: INFO_PRIVACY_HERO_ICONS.user, label: "Clienti, staff e fatturazione" },
  ],
} as const;

const STAFF_INFO_PRIVACY_HERO = {
  badgePrimary: "Area salone",
  badgeSecondary: "GDPR art. 13",
  kickerLabel: "Informativa staff",
  kickerChip: "Agenda Luxury",
  subtitle: (
    <>
      Informativa per <strong>operatori e collaboratori</strong> registrati dal salone nell&apos;
      <em>agenda Luxury</em>: trasparenza su dati operativi, diritti e ruoli nel trattamento.
    </>
  ),
  metaItems: [
    { icon: INFO_PRIVACY_HERO_ICONS.shield, label: "Salone titolare = data controller" },
    { icon: INFO_PRIVACY_HERO_ICONS.clock, label: "Art. 88 contesto lavorativo" },
  ],
} as const;

function DefaultAccountInfoPrivacyContent() {
  const [view, setView] = useState<"account" | "gdpr">("account");
  const baseId = useId();
  const accountTabId = `${baseId}-tab-account`;
  const gdprTabId = `${baseId}-tab-gdpr`;
  const accountPanelId = `${baseId}-panel-account`;
  const gdprPanelId = `${baseId}-panel-gdpr`;

  return (
    <article className="luxury-info-privacy-consumer-card luxury-surface-card" aria-label="Informativa privacy account">
      <div className="luxury-info-privacy-consumer-card__glow" aria-hidden />
      <header className="luxury-info-privacy-consumer-card__head">
        <h2 className="luxury-info-privacy-consumer-card__headline">Trattamento dati e documenti</h2>
        <div
          className="luxury-info-privacy-consumer-card__toggle"
          role="tablist"
          aria-label="Vista informativa privacy"
        >
          <button
            type="button"
            role="tab"
            id={accountTabId}
            aria-selected={view === "account"}
            aria-controls={accountPanelId}
            className={
              "luxury-info-privacy-consumer-card__toggle-btn" +
              (view === "account" ? " luxury-info-privacy-consumer-card__toggle-btn--active" : "")
            }
            onClick={() => setView("account")}
          >
            Area account
          </button>
          <button
            type="button"
            role="tab"
            id={gdprTabId}
            aria-selected={view === "gdpr"}
            aria-controls={gdprPanelId}
            className={
              "luxury-info-privacy-consumer-card__toggle-btn" +
              (view === "gdpr" ? " luxury-info-privacy-consumer-card__toggle-btn--active" : "")
            }
            onClick={() => setView("gdpr")}
          >
            GDPR
          </button>
        </div>
      </header>
      <div
        className={
          "luxury-info-privacy-consumer-card__inner" +
          (view === "gdpr" ? " luxury-info-privacy-consumer-card__inner--gdpr" : "")
        }
      >
        {view === "account" ? (
          <div
            id={accountPanelId}
            role="tabpanel"
            aria-labelledby={accountTabId}
            className="luxury-info-privacy__body"
          >
      <section className="luxury-info-privacy__section">
        <h2 className="luxury-section-title luxury-info-privacy__section-title">Documenti ufficiali</h2>
        <p className="luxury-text-muted luxury-info-privacy__text">
          Il testo legalmente vincolante è pubblicato sul sito:{" "}
          <button
            type="button"
            className="luxury-link-inline luxury-info-privacy-consumer-card__inline-action"
            onClick={() => setView("gdpr")}
          >
            Informativa privacy clienti (B2C)
          </button>
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
          <button
            type="button"
            className="luxury-link-inline luxury-info-privacy-consumer-card__inline-action"
            onClick={() => setView("gdpr")}
          >
            informativa privacy clienti
          </button>
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
        ) : (
          <div
            id={gdprPanelId}
            role="tabpanel"
            aria-labelledby={gdprTabId}
            className="luxury-info-privacy-consumer-card__legal"
          >
            <PrivacyPolicyConsumerLayeredContent embedded />
            <p className="luxury-info-privacy-consumer-card__legal-hint">
              Tocca una sezione per espanderla. Altri documenti:{" "}
              <Link to="/termini" className="luxury-link-inline">
                Termini
              </Link>
              ,{" "}
              <Link to="/privacy/cookie" className="luxury-link-inline">
                Cookie
              </Link>
              ,{" "}
              <Link to="/privacy/scelte" className="luxury-link-inline">
                Scelte privacy
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export default function AccountInfoPrivacyPage() {
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const meSalon = useMeSalonSummaryQuery();
  const staffSalon = useMeStaffSalonQuery();
  const supportQ = useQuery({
    queryKey: ["me", "support", "info-privacy"],
    queryFn: () => apiJson<SupportInfo>("/api/v1/me/support", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const premiumOwner = isSalonTitolare && !isSalonStaff;
  const staffOperator = isSalonStaff && !isSalonTitolare;
  const consumerClient = !premiumOwner && !staffOperator;
  const salonSideShell = premiumOwner
    ? ` luxury-info-privacy-hero-page luxury-info-privacy-salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`
    : staffOperator
      ? ` luxury-info-privacy-hero-page luxury-info-privacy-staff-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`
      : "";

  return (
    <div
      className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44${
        premiumOwner
          ? ` luxury-account-page-shell--info-privacy-premium luxury-info-privacy-premium-page${salonSideShell}`
          : staffOperator
              ? ` luxury-account-page-shell--narrow luxury-info-privacy-staff-page${salonSideShell}`
              : consumerClient
                ? " luxury-account-page-shell--narrow luxury-info-privacy-consumer-page luxury-info-privacy-hero-page"
                : " luxury-account-page-shell--narrow"
      }`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        {premiumOwner ? (
          <InfoPrivacyAccountHeroHeader {...PREMIUM_OWNER_INFO_PRIVACY_HERO} />
        ) : staffOperator ? (
          <InfoPrivacyAccountHeroHeader {...STAFF_INFO_PRIVACY_HERO} />
        ) : consumerClient ? (
          <InfoPrivacyAccountHeroHeader {...CLIENT_INFO_PRIVACY_HERO} />
        ) : (
          <header className="luxury-consumer-bookings-dash__header--hero">
            <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
            <div className="luxury-consumer-bookings-dash__title-row">
              <h1 className="luxury-consumer-bookings-dash__headline">
                <span className="luxury-consumer-bookings-dash__headline-pre">Info e </span>
                <span className="luxury-consumer-bookings-dash__headline-accent">privacy</span>
              </h1>
              <p className="luxury-info-privacy-page__subtitle">
                Informazioni sul trattamento dei dati e su come usiamo Saloni Luxury.
              </p>
            </div>
          </header>
        )}

        {premiumOwner ? (
          <SalonPremiumOwnerInfoPrivacyContent
            supportEmail={supportQ.data?.supportEmail}
            salonName={meSalon.data?.primaryLocationName}
          />
        ) : staffOperator ? (
          <StaffOperatorInfoPrivacyContent
            supportEmail={supportQ.data?.supportEmail}
            salonName={staffSalon.data?.salonDisplayName}
          />
        ) : (
          <DefaultAccountInfoPrivacyContent />
        )}
      </div>
    </div>
  );
}
