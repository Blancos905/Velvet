import { Link, Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { SalonAgendaBoard } from "./SalonAgendaBoard";
import "../../styles/velvet-account-salon-services.css";
import "../../styles/velvet-staff-member-home.css";

export default function StaffMemberHomePage() {
  const { isSalonStaff } = useVelvetAuth();

  if (!isSalonStaff) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="velvet-staff-home">
      <div className="velvet-salon-services-page velvet-staff-member-page">
        <header className="velvet-staff-member-page__hero">
          <div className="velvet-staff-member-page__hero-glow" aria-hidden />
          <div className="velvet-staff-member-page__hero-inner">
            <p className="velvet-staff-member-page__kicker">Area personale</p>
            <h1 className="velvet-staff-member-page__headline">
              <span className="velvet-staff-member-page__headline-pre">Ciao </span>
              <span className="velvet-staff-member-page__headline-accent">membro dello staff</span>
            </h1>
            <p className="velvet-staff-member-page__lead">
              Qui trovi solo la tua agenda: le prenotazioni assegnate a te, settimana per settimana.
            </p>
          </div>
        </header>

        <section className="velvet-staff-member-page__agenda" aria-labelledby="staff-agenda-heading">
          <div className="velvet-staff-member-page__agenda-head">
            <h2 id="staff-agenda-heading" className="velvet-staff-member-page__agenda-title">
              La tua agenda
            </h2>
            <div className="velvet-staff-member-page__agenda-toolbar">
              <Link
                to="/account/chat"
                className="velvet-staff-member-page__chat-link"
                title="Messaggi con i clienti della sede (con piano Premium dello studio)."
              >
                Chat clienti
              </Link>
              <span className="velvet-staff-member-page__pill">Sincronizzata con il salone</span>
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
