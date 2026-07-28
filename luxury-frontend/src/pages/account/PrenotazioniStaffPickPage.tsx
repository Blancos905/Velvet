import { useNavigate, Navigate, Link } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../components/account/InfoPrivacyAccountHeroHeader";
import { useSalonStaffList } from "../../hooks/useSalonStaffList";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { staffFallbackAvatar } from "../../lib/salonStaffAvatar";
import { SalonAgendaBoard } from "./SalonAgendaBoard";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-account-salon-staff.css";
import "../../styles/luxury-salon-staff-agenda-page.css";
import "../../styles/luxury-salon-agenda-salon.css";
import "../../styles/luxury-salon-staff-pick-page.css";
import "../../styles/luxury-salon-staff-pick-salon.css";

const PICK_SHELL_CLASS = `luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-staff-pick-page luxury-salon-staff-pick-page--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;
const AGENDA_SHELL_CLASS = `luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-staff-agenda-page luxury-salon-staff-agenda-page--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;

/**
 * Titolare → Agenda:
 * - Con almeno un operatore in elenco (API o fallback locale): «Chi sei?» poi agenda filtrata per `operatorId`.
 * - Senza operatori: salta «Chi sei?» e mostra l’agenda completa dello studio (stesso dataset di GET /me/salon/agenda).
 */
export default function PrenotazioniStaffPickPage() {
  const { isSalonTitolare } = useLuxuryAuth();
  const navigate = useNavigate();
  const { mergedStaffMembers, staffQuery, backendStaffAvailable } = useSalonStaffList();

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (staffQuery.isPending) {
    return (
      <div className={PICK_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <p className="luxury-text-muted">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <div className={PICK_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <p className="luxury-alert luxury-alert--error" role="alert">
            Non siamo riusciti a leggere lo staff del salone. Riprova più tardi.
          </p>
        </div>
      </div>
    );
  }

  if (mergedStaffMembers.length === 0) {
    return (
      <div className={AGENDA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <ClientAccountHeroHeader
            headlinePre="Agenda "
            headlineAccent="studio"
            badgePrimary="Area salone"
            badgeSecondary="Tutti gli operatori"
            kickerLabel="Prenotazioni"
            kickerChip="Vista studio"
            subtitle={
              <>
                Non risultano operatori registrati: mostriamo <strong>tutte le prenotazioni</strong> dello studio. Quando
                aggiungi lo staff, qui potrai indicare «chi sei» per vedere solo i tuoi appuntamenti.
              </>
            }
            metaItems={[{ icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Tutte le sedi dello studio" }]}
          />
          <p className="luxury-salon-staff-agenda-page__manage-row">
            <Link to="/account/salone/staff" className="luxury-salon-staff-agenda-page__manage-link">
              Gestisci elenco staff
            </Link>
          </p>
          {!backendStaffAvailable ? (
            <p className="luxury-alert luxury-alert--error" role="status">
              Endpoint staff non disponibile sul backend attivo: l&apos;elenco operatori potrebbe essere incompleto.
            </p>
          ) : null}
          <SalonAgendaBoard
            size="large"
            weekKicker="Studio"
            weekSub="Tutte le prenotazioni delle sedi dello studio (nessun filtro operatore)."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={PICK_SHELL_CLASS}>
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientAccountHeroHeader
          headlinePre="Chi "
          headlineAccent="sei?"
          badgePrimary="Area salone"
          badgeSecondary="Agenda"
          kickerLabel="Prenotazioni"
          kickerChip="Scegli operatore"
          subtitle={
            <>
              Seleziona il tuo profilo per aprire la tua <strong>agenda settimanale</strong>. Gestisci elenco staff dal
              link qui sotto.
            </>
          }
          metaItems={[
            { icon: INFO_PRIVACY_HERO_ICONS.user, label: `${mergedStaffMembers.length} operatori in elenco` },
            { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Agenda settimanale" },
          ]}
        />
        {!backendStaffAvailable ? (
          <p className="luxury-alert luxury-alert--error" role="status">
            Endpoint staff non disponibile sul backend attivo: l&apos;elenco può essere incompleto.
          </p>
        ) : null}

        <p className="luxury-salon-staff-pick-page__manage-row">
          <Link to="/account/salone/staff" className="luxury-salon-staff-pick-page__manage-link">
            Gestisci elenco staff
          </Link>
        </p>

        <div className="luxury-salon-staff-list">
          <Link
            to="/account/prenotazioni/studio/agenda"
            className="luxury-surface-card luxury-surface-card--plan-standard luxury-salon-staff-item luxury-salon-staff-pick-item luxury-salon-staff-pick-card luxury-salon-staff-pick-card--studio"
          >
            <div className="luxury-salon-staff-item__body" style={{ textAlign: "left" }}>
              <strong className="luxury-salon-staff-item__name">Agenda completa studio</strong>
              <span className="luxury-text-muted luxury-salon-staff-item__role">
                Tutti gli operatori — accetta o rifiuta le richieste cliente
              </span>
              <span className="luxury-salon-staff-item__chip">Apri agenda collettiva</span>
            </div>
          </Link>
          {mergedStaffMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              className="luxury-surface-card luxury-surface-card--plan-standard luxury-salon-staff-item luxury-salon-staff-pick-item luxury-salon-staff-pick-card"
              onClick={() => navigate(`/account/prenotazioni/staff/${encodeURIComponent(member.rawId)}/agenda`)}
            >
              <img
                src={member.photoDataUrl && member.photoDataUrl.trim() ? member.photoDataUrl : staffFallbackAvatar(member.firstName, member.lastName)}
                alt=""
                className="luxury-salon-staff-item__avatar"
              />
              <div className="luxury-salon-staff-item__body" style={{ textAlign: "left" }}>
                <strong className="luxury-salon-staff-item__name">
                  {member.firstName} {member.lastName}
                </strong>
                <span className="luxury-text-muted luxury-salon-staff-item__role">Ruolo: {member.role}</span>
                <span className="luxury-salon-staff-item__chip">Apri agenda</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
