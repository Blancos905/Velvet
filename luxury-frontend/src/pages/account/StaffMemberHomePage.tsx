import { Link, Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { STAFF_MEMBER_AGENDA_PATH } from "../../lib/staffMemberAgendaPath";
import "../../styles/luxury-account-salon-services.css";
import "../../styles/luxury-staff-member-home.css";

/** Hub operatore (`/account/staff`) — griglia navigazione + riepilogo; agenda in `/account/staff/agenda`. */
export default function StaffMemberHomePage() {
  const { isSalonStaff } = useLuxuryAuth();

  if (!isSalonStaff) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="luxury-staff-home">
      <div className="luxury-salon-services-page luxury-staff-member-page">
        <header className="luxury-staff-member-page__hero">
          <div className="luxury-staff-member-page__hero-glow" aria-hidden />
          <div className="luxury-staff-member-page__hero-inner">
            <p className="luxury-staff-member-page__kicker">Area personale</p>
            <h1 className="luxury-staff-member-page__headline">
              <span className="luxury-staff-member-page__headline-pre">Ciao </span>
              <span className="luxury-staff-member-page__headline-accent">membro dello staff</span>
            </h1>
            <p className="luxury-staff-member-page__lead">
              Prenotazioni, notifiche e chat con i clienti del salone — tutto dalla griglia sopra.
            </p>
          </div>
        </header>

        <section className="luxury-staff-member-page__hub-card" aria-label="Accesso rapido agenda">
          <div className="luxury-staff-member-page__hub-card-glow" aria-hidden />
          <div className="luxury-staff-member-page__hub-card-inner">
            <p className="luxury-staff-member-page__hub-card-kicker">Agenda</p>
            <h2 className="luxury-staff-member-page__hub-card-title">Le tue prenotazioni</h2>
            <p className="luxury-staff-member-page__hub-card-lead">
              Settimana per settimana: appuntamenti assegnati a te, conferme e cambi orario.
            </p>
            <Link to={STAFF_MEMBER_AGENDA_PATH} className="luxury-staff-member-page__hub-card-cta">
              Apri la mia agenda
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
