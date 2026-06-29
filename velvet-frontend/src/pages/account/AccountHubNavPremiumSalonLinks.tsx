import { AccountHubNavLink } from "./AccountHubNavLink";
import { accountHubNavBtn } from "./accountHubNavBtn";

const navBtn = accountHubNavBtn;

/** Strumenti salone riservati al piano Premium (sito, brand, statistiche, …). */
export function AccountHubNavPremiumSalonLinks() {
  return (
    <div
      className="luxury-account-hub__nav-scroll luxury-account-hub__nav-scroll--consumer-grid"
      aria-label="Strumenti piano Premium"
    >
      <AccountHubNavLink to="/account/salone/tuo-salone" className={navBtn()}>
        Crea il tuo sito
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/salone/brand" className={navBtn()}>
        Brand e vetrina
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/salone/posizione" className={navBtn()}>
        Posizione del salone
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/salone/staff" className={navBtn()}>
        Staff
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/salone/statistiche" className={navBtn("luxury-account-hub__btn--salon-statistiche")}>
        Statistiche
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/salone" end className={navBtn()}>
        Panoramica
      </AccountHubNavLink>
    </div>
  );
}
