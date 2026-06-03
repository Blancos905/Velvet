import { useNavigate, Navigate, Link } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { useSalonStaffList } from "../../hooks/useSalonStaffList";
import { staffFallbackAvatar } from "../../lib/salonStaffAvatar";
import { SalonAgendaBoard } from "./SalonAgendaBoard";
import "../../styles/velvet-account-salon-staff.css";
import "../../styles/velvet-salon-staff-pick-page.css";

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
    return <Navigate to="/account/home" replace />;
  }

  if (staffQuery.isPending) {
    return (
      <div className="velvet-salon-staff-page">
        <p className="velvet-text-muted">Caricamento…</p>
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <div className="velvet-salon-staff-page">
        <Link to="/account/salone" className="velvet-link-back">
          ← Il mio salone
        </Link>
        <h1 className="velvet-page-title">Agenda</h1>
        <p className="velvet-alert velvet-alert--error" role="alert">
          Non siamo riusciti a leggere lo staff del salone. Riprova più tardi.
        </p>
      </div>
    );
  }

  if (mergedStaffMembers.length === 0) {
    return (
      <div className="velvet-salon-staff-page velvet-salon-staff-page--agenda-wide">
        <Link to="/account/salone" className="velvet-link-back">
          ← Il mio salone
        </Link>
        <h1 className="velvet-page-title">Agenda</h1>
        <p className="velvet-page-subtitle">
          Non risultano operatori registrati: mostriamo tutte le prenotazioni dello studio. Quando aggiungi lo staff, qui potrai
          indicare «chi sei» per vedere solo i tuoi appuntamenti.
        </p>
        <p className="velvet-text-muted" style={{ marginBottom: "1rem" }}>
          <Link to="/account/salone/staff" className="velvet-link-inline">
            Gestisci elenco staff
          </Link>
        </p>
        {!backendStaffAvailable ? (
          <p className="velvet-alert velvet-alert--error" role="status">
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
    <div className="velvet-salon-staff-page velvet-salon-staff-pick-page">
      <Link to="/account/salone" className="velvet-link-back">
        ← Il mio salone
      </Link>
      <header className="velvet-salon-staff-pick-page__hero">
        <div className="velvet-salon-staff-pick-page__hero-glow" aria-hidden />
        <div className="velvet-salon-staff-pick-page__hero-inner">
          <h1 className="velvet-salon-staff-pick-page__headline">
            <span className="velvet-salon-staff-pick-page__headline-pre">Chi </span>
            <span className="velvet-salon-staff-pick-page__headline-accent">sei?</span>
          </h1>
          <p className="velvet-page-subtitle">
            Seleziona il tuo profilo per aprire la tua agenda settimanale. Gestisci elenco staff dal link qui sotto.
          </p>
        </div>
      </header>
      {!backendStaffAvailable ? (
        <p className="velvet-alert velvet-alert--error" role="status">
          Endpoint staff non disponibile sul backend attivo: l&apos;elenco può essere incompleto.
        </p>
      ) : null}

      <p className="velvet-salon-staff-pick-page__manage-row">
        <Link to="/account/salone/staff" className="velvet-salon-staff-pick-page__manage-link">
          Gestisci elenco staff
        </Link>
      </p>

      <div className="velvet-salon-staff-list">
        {mergedStaffMembers.map((member) => (
          <button
            key={member.id}
            type="button"
            className="velvet-surface-card velvet-surface-card--plan-standard velvet-salon-staff-item velvet-salon-staff-pick-item velvet-salon-staff-pick-card"
            onClick={() => navigate(`/account/prenotazioni/staff/${encodeURIComponent(member.rawId)}/agenda`)}
          >
            <img
              src={member.photoDataUrl && member.photoDataUrl.trim() ? member.photoDataUrl : staffFallbackAvatar(member.firstName, member.lastName)}
              alt=""
              className="velvet-salon-staff-item__avatar"
            />
            <div className="velvet-salon-staff-item__body" style={{ textAlign: "left" }}>
              <strong className="velvet-salon-staff-item__name">
                {member.firstName} {member.lastName}
              </strong>
              <span className="velvet-text-muted velvet-salon-staff-item__role">Ruolo: {member.role}</span>
              <span className="velvet-salon-staff-item__chip">Apri agenda</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
