import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../../components/account/InfoPrivacyAccountHeroHeader";
import { useSalonStaffList } from "../../../hooks/useSalonStaffList";
import { STAFF_MEMBER_AGENDA_PATH } from "../../../lib/staffMemberAgendaPath";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import { SalonAgendaBoard } from "../SalonAgendaBoard";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-account-salon-staff.css";
import "../../../styles/luxury-salon-staff-agenda-page.css";
import "../../../styles/luxury-salon-agenda-salon.css";

const AGENDA_SHELL_CLASS = `luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-staff-agenda-page luxury-salon-staff-agenda-page--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;

export default function SalonStaffAgendaPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const { isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const { mergedStaffMembers, staffQuery } = useSalonStaffList();

  const member = useMemo(() => {
    if (!staffId) return undefined;
    return mergedStaffMembers.find((m) => m.rawId === staffId);
  }, [mergedStaffMembers, staffId]);

  if (!isSalonTitolare) {
    return <Navigate to={isSalonStaff ? STAFF_MEMBER_AGENDA_PATH : "/salone"} replace />;
  }

  if (!staffId) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (staffQuery.isPending) {
    return (
      <div className={AGENDA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <p className="luxury-text-muted">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <div className={AGENDA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <Link to="/account/prenotazioni" className="luxury-link-back">
            ← Agenda
          </Link>
          <p className="luxury-alert luxury-alert--error" role="alert">
            Non siamo riusciti a verificare lo staff del salone.
          </p>
        </div>
      </div>
    );
  }

  if (!member) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  const displayName = member ? `${member.firstName} ${member.lastName}`.trim() : "Staff";

  return (
    <div className={AGENDA_SHELL_CLASS}>
      <div className="luxury-consumer-bookings-dash__shell">
        <Link to="/account/prenotazioni" className="luxury-link-back">
          ← Agenda
        </Link>
        <ClientAccountHeroHeader
          headlinePre="Agenda "
          headlineAccent={displayName}
          badgePrimary="Area salone"
          badgeSecondary="Operatore"
          kickerLabel="Prenotazioni"
          kickerChip="Vista operatore"
          subtitle={
            <>
              Appuntamenti della <strong>settimana</strong> per questo operatore.
            </>
          }
          metaItems={[
            { icon: INFO_PRIVACY_HERO_ICONS.user, label: displayName },
            { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Settimana corrente" },
          ]}
        />
        <p className="luxury-salon-staff-agenda-page__manage-row">
          <Link to="/salone/staff" className="luxury-salon-staff-agenda-page__manage-link">
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
    </div>
  );
}
