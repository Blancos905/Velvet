import { AccountHubNavLink } from "./AccountHubNavLink";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import { accountHubNavBtn } from "./accountHubNavBtn";

const navBtn = accountHubNavBtn;

/** Strumenti salone riservati al piano Premium (sito, brand, statistiche, …). */
export function AccountHubNavPremiumSalonLinks() {
  const t = useLuxuryT();

  return (
    <div
      className="luxury-account-hub__nav-scroll luxury-account-hub__nav-scroll--consumer-grid"
      aria-label={t("account.nav.premiumTools")}
    >
      <AccountHubNavLink to="/salone/tuo-salone" className={navBtn()}>
        {t("account.nav.createSite")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/salone/brand" className={navBtn()}>
        {t("account.nav.brand")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/salone/anteprima" className={navBtn()}>
        {t("account.nav.showcasePreview")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/salone/posizione" className={navBtn()}>
        {t("account.nav.salonLocation")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/salone/staff" className={navBtn()}>
        {t("account.nav.staff")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/salone/statistiche" className={navBtn("luxury-account-hub__btn--salon-statistiche")}>
        {t("account.nav.statistics")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/salone/panoramica" className={navBtn()}>
        {t("account.nav.overview")}
      </AccountHubNavLink>
    </div>
  );
}
