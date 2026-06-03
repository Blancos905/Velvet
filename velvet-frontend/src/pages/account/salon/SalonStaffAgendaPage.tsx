import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useSalonStaffList } from "../../../hooks/useSalonStaffList";
import { SalonAgendaBoard } from "../SalonAgendaBoard";
import "../../../styles/velvet-account-salon-staff.css";
import "../../../styles/velvet-salon-staff-agenda-page.css";

export default function SalonStaffAgendaPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const { isSalonTitolare } = useVelvetAuth();
  const { mergedStaffMembers, staffQuery } = useSalonStaffList();

  const member = useMemo(() => {
    if (!staffId) return undefined;
    return mergedStaffMembers.find((m) => m.rawId === staffId);
  }, [mergedStaffMembers, staffId]);

  if (!isSalonTitolare) {
    return <Navigate to="/account/home" replace />;
  }

  if (!staffId) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (staffQuery.isPending) {
    return (
      <div className="velvet-salon-staff-page velvet-salon-staff-page--agenda-wide velvet-salon-staff-agenda-page">
        <p className="velvet-text-muted">Caricamento…</p>
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <div className="velvet-salon-staff-page velvet-salon-staff-page--agenda-wide velvet-salon-staff-agenda-page">
        <Link to="/account/prenotazioni" className="velvet-link-back">
          ← Agenda
        </Link>
        <p className="velvet-alert velvet-alert--error" role="alert">
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
    <div className="velvet-salon-staff-page velvet-salon-staff-page--agenda-wide velvet-salon-staff-agenda-page">
      <Link to="/account/prenotazioni" className="velvet-link-back">
        ← Agenda
      </Link>
      <header className="velvet-salon-staff-agenda-page__hero">
        <div className="velvet-salon-staff-agenda-page__hero-glow" aria-hidden />
        <div className="velvet-salon-staff-agenda-page__hero-inner">
          <h1 className="velvet-page-title">
            <span className="velvet-salon-staff-agenda-page__title-label">Agenda</span>
            <span className="velvet-salon-staff-agenda-page__title-dot" aria-hidden="true">
              ·
            </span>
            <span className="velvet-salon-staff-agenda-page__title-accent">{displayName}</span>
          </h1>
          <p className="velvet-page-subtitle">Appuntamenti della settimana per questo operatore.</p>
        </div>
      </header>
      <p className="velvet-salon-staff-agenda-page__manage-row">
        <Link to="/account/salone/staff" className="velvet-salon-staff-agenda-page__manage-link">
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
