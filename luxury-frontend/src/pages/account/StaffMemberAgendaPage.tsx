import { Link, Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { SalonAgendaBoard } from "./SalonAgendaBoard";
import "../../styles/luxury-account-salon-services.css";
import "../../styles/luxury-staff-member-home.css";
import "../../styles/luxury-salon-staff-agenda-page.css";
import "../../styles/luxury-salon-agenda-salon.css";

/** Agenda operatore (`/account/staff/agenda`) — in app nativa si apre in overlay sopra l'hub. */
export default function StaffMemberAgendaPage() {
  const { isSalonStaff } = useLuxuryAuth();

  if (!isSalonStaff) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="luxury-staff-home luxury-staff-agenda-page">
      <div className="luxury-salon-services-page luxury-staff-member-page luxury-staff-agenda-page__inner">
        <section className="luxury-staff-member-page__agenda" aria-labelledby="staff-agenda-heading">
          <div className="luxury-staff-member-page__agenda-head">
            <h2 id="staff-agenda-heading" className="luxury-staff-member-page__agenda-title">
              La tua agenda
            </h2>
            <div className="luxury-staff-member-page__agenda-toolbar">
              <Link
                to="/account/chat"
                className="luxury-staff-member-page__chat-link"
                title="Messaggi con i clienti della sede (con piano Premium dello studio)."
              >
                Chat clienti
              </Link>
              <span className="luxury-staff-member-page__pill">Sincronizzata con il salone</span>
            </div>
          </div>
          <SalonAgendaBoard
            staffMode
            size="large"
            weekKicker="Settimana in corso"
            weekSub="Orari e clienti come risultano in salone."
          />
        </section>
      </div>
    </div>
  );
}
