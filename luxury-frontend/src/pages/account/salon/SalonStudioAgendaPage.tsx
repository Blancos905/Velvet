import { Link, Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../../components/account/InfoPrivacyAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import { SalonAgendaBoard } from "../SalonAgendaBoard";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-account-salon-staff.css";
import "../../../styles/luxury-salon-staff-agenda-page.css";
import "../../../styles/luxury-salon-agenda-salon.css";

/** Agenda completa dello studio per il titolare (tutti gli operatori, accetta/rifiuta da dettaglio). */
export default function SalonStudioAgendaPage() {
  const { isSalonTitolare } = useLuxuryAuth();

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  return (
    <div
      className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-staff-agenda-page luxury-salon-staff-agenda-page--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <Link to="/account/prenotazioni" className="luxury-link-back">
          ← Agenda
        </Link>
        <ClientAccountHeroHeader
          headlinePre="Agenda "
          headlineAccent="studio"
          badgePrimary="Area salone"
          badgeSecondary="Tutti gli operatori"
          kickerLabel="Prenotazioni"
          kickerChip="Vista studio"
          subtitle={
            <>
              Tutte le prenotazioni di tutti gli operatori. Puoi <strong>accettare o rifiutare</strong> le richieste in
              attesa al posto di ciascun professionista.
            </>
          }
          metaItems={[
            { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Tutte le sedi dello studio" },
            { icon: INFO_PRIVACY_HERO_ICONS.user, label: "Tutti gli operatori" },
          ]}
        />

        <SalonAgendaBoard
          size="large"
          weekKicker="Studio"
          weekSub="Tutte le prenotazioni delle sedi dello studio — tocca «Apri» per confermare o rifiutare."
        />
      </div>
    </div>
  );
}
