import { useNavigate, Navigate, Link } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { useSalonStaffList } from "../../hooks/useSalonStaffList";
import { staffFallbackAvatar } from "../../lib/salonStaffAvatar";
import { SalonAgendaBoard } from "./SalonAgendaBoard";
import "../../styles/luxury-account-salon-staff.css";
import "../../styles/luxury-salon-staff-pick-page.css";

/**
 * Titolare → Agenda:
 * - Con almeno un operatore in elenco (API o fallback locale): «Chi sei?» poi agenda filtrata per `operatorId`.
 * - Senza operatori: salta «Chi sei?» e mostra l’agenda completa dello studio (stesso dataset di GET /me/salon/agenda).
 */
export default function PrenotazioniStaffPickPage() {
  const { isSalonTitolare } = useVelvetAuth();
  const navigate = useNavigate();
  const { mergedStaffMembers, staffQuery, backendStaffAvailable } = useSalonStaffList();

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (staffQuery.isPending) {
    return (
      <div className="luxury-salon-staff-page">
        <p className="luxury-text-muted">Caricamento…</p>
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <div className="luxury-salon-staff-page">
        <Link to="/account/salone" className="luxury-link-back">
          ← Il mio salone
        </Link>
        <h1 className="luxury-page-title">Agenda</h1>
        <p className="luxury-alert luxury-alert--error" role="alert">
          Non siamo riusciti a leggere lo staff del salone. Riprova più tardi.
        </p>
      </div>
    );
  }

  if (mergedStaffMembers.length === 0) {
    return (
      <div className="luxury-salon-staff-page luxury-salon-staff-page--agenda-wide">
        <Link to="/account/salone" className="luxury-link-back">
          ← Il mio salone
        </Link>
        <h1 className="luxury-page-title">Agenda</h1>
        <p className="luxury-page-subtitle">
          Non risultano operatori registrati: mostriamo tutte le prenotazioni dello studio. Quando aggiungi lo staff, qui potrai
          indicare «chi sei» per vedere solo i tuoi appuntamenti.
        </p>
        <p className="luxury-text-muted" style={{ marginBottom: "1rem" }}>
          <Link to="/account/salone/staff" className="luxury-link-inline">
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
    );
  }

  return (
    <div className="luxury-salon-staff-page luxury-salon-staff-pick-page">
      <Link to="/account/salone" className="luxury-link-back">
        ← Il mio salone
      </Link>
      <header className="luxury-salon-staff-pick-page__hero">
        <div className="luxury-salon-staff-pick-page__hero-glow" aria-hidden />
        <div className="luxury-salon-staff-pick-page__hero-inner">
          <h1 className="luxury-salon-staff-pick-page__headline">
            <span className="luxury-salon-staff-pick-page__headline-pre">Chi </span>
            <span className="luxury-salon-staff-pick-page__headline-accent">sei?</span>
          </h1>
          <p className="luxury-page-subtitle">
            Seleziona il tuo profilo per aprire la tua agenda settimanale. Gestisci elenco staff dal link qui sotto.
          </p>
        </div>
      </header>
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
  );
}
