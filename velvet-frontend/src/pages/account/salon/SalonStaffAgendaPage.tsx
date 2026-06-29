import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useSalonStaffList } from "../../../hooks/useSalonStaffList";
import { SalonAgendaBoard } from "../SalonAgendaBoard";
import "../../../styles/luxury-account-salon-staff.css";
import "../../../styles/luxury-salon-staff-agenda-page.css";

export default function SalonStaffAgendaPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const { isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const { mergedStaffMembers, staffQuery } = useSalonStaffList();

  const member = useMemo(() => {
    if (!staffId) return undefined;
    return mergedStaffMembers.find((m) => m.rawId === staffId);
  }, [mergedStaffMembers, staffId]);

  if (!isSalonTitolare) {
    return <Navigate to={isSalonStaff ? "/account/staff" : "/account/salone"} replace />;
  }

  if (!staffId) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (staffQuery.isPending) {
    return (
      <div className="luxury-salon-staff-page luxury-salon-staff-page--agenda-wide luxury-salon-staff-agenda-page">
        <p className="luxury-text-muted">Caricamento…</p>
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <div className="luxury-salon-staff-page luxury-salon-staff-page--agenda-wide luxury-salon-staff-agenda-page">
        <Link to="/account/prenotazioni" className="luxury-link-back">
          ← Agenda
        </Link>
        <p className="luxury-alert luxury-alert--error" role="alert">
          Non siamo riusciti a verificare lo staff del salone.
        </p>
      </div>
    );
  }

  if (!member) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  const displayName = member ? `${member.firstName} ${member.lastName}`.trim() : "Staff";

  return (
    <div className="luxury-salon-staff-page luxury-salon-staff-page--agenda-wide luxury-salon-staff-agenda-page">
      <Link to="/account/prenotazioni" className="luxury-link-back">
        ← Agenda
      </Link>
      <header className="luxury-salon-staff-agenda-page__hero">
        <div className="luxury-salon-staff-agenda-page__hero-glow" aria-hidden />
        <div className="luxury-salon-staff-agenda-page__hero-inner">
          <h1 className="luxury-page-title">
            <span className="luxury-salon-staff-agenda-page__title-label">Agenda</span>
            <span className="luxury-salon-staff-agenda-page__title-dot" aria-hidden="true">
              ·
            </span>
            <span className="luxury-salon-staff-agenda-page__title-accent">{displayName}</span>
          </h1>
          <p className="luxury-page-subtitle">Appuntamenti della settimana per questo operatore.</p>
        </div>
      </header>
      <p className="luxury-salon-staff-agenda-page__manage-row">
        <Link to="/account/salone/staff" className="luxury-salon-staff-agenda-page__manage-link">
          Gestione staff
        </Link>
      </p>

      <SalonAgendaBoard
        operatorId={staffId}
        operatorLabel={displayName}
        size="large"
        weekKicker="La tua settimana"
        weekSub="Solo gli appuntamenti assegnati a questo membro dello staff."
      />
    </div>
  );
}
