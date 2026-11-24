import { Link, Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import { STAFF_MEMBER_AGENDA_PATH } from "../../lib/staffMemberAgendaPath";
import "../../styles/luxury-account-salon-services.css";
import "../../styles/luxury-staff-member-home.css";

/** Hub operatore (`/account/staff`) — griglia navigazione + riepilogo; agenda in `/account/staff/agenda`. */
export default function StaffMemberHomePage() {
  const { isSalonStaff } = useLuxuryAuth();
  const t = useLuxuryT();

  if (!isSalonStaff) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="luxury-staff-home">
      <div className="luxury-salon-services-page luxury-staff-member-page">
        <header className="luxury-staff-member-page__hero">
          <div className="luxury-staff-member-page__hero-glow" aria-hidden />
          <div className="luxury-staff-member-page__hero-inner">
            <p className="luxury-staff-member-page__kicker">{t("account.staff.kicker")}</p>
            <h1 className="luxury-staff-member-page__headline">
              <span className="luxury-staff-member-page__headline-pre">{t("account.greeting.hi")} </span>
              <span className="luxury-staff-member-page__headline-accent">{t("account.staff.headlineAccent")}</span>
            </h1>
            <p className="luxury-staff-member-page__lead">{t("account.staff.lead")}</p>
          </div>
        </header>

        <section className="luxury-staff-member-page__hub-card" aria-label={t("account.staff.quickNavAria")}>
          <div className="luxury-staff-member-page__hub-card-glow" aria-hidden />
          <div className="luxury-staff-member-page__hub-card-inner">
            <p className="luxury-staff-member-page__hub-card-kicker">{t("account.staff.agendaKicker")}</p>
            <h2 className="luxury-staff-member-page__hub-card-title">{t("account.staff.agendaTitle")}</h2>
            <p className="luxury-staff-member-page__hub-card-lead">{t("account.staff.agendaLead")}</p>
            <Link to={STAFF_MEMBER_AGENDA_PATH} className="luxury-staff-member-page__hub-card-cta">
              {t("account.staff.agendaCta")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
