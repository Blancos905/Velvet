import { NavLink } from "react-router-dom";
import { accountHubNavBtn } from "./accountHubNavBtn";

const navBtn = accountHubNavBtn;

/** Strumenti salone riservati al piano Premium (sito, brand, statistiche, …). */
export function AccountHubNavPremiumSalonLinks() {
  return (
    <div
      className="velvet-account-hub__nav-scroll velvet-account-hub__nav-scroll--consumer-grid"
      aria-label="Strumenti piano Premium"
    >
      <NavLink to="/account/salone/tuo-salone" className={navBtn()}>
        Crea il tuo sito
      </NavLink>
      <NavLink to="/account/salone/brand" className={navBtn()}>
        Brand e vetrina
      </NavLink>
      <NavLink to="/account/salone/posizione" className={navBtn()}>
        Posizione del salone
      </NavLink>
      <NavLink to="/account/salone/staff" className={navBtn()}>
        Staff
      </NavLink>
      <NavLink to="/account/salone/statistiche" className={navBtn("velvet-account-hub__btn--salon-statistiche")}>
        Statistiche
      </NavLink>
      <NavLink to="/account/salone" end className={navBtn()}>
        Panoramica
      </NavLink>
    </div>
  );
}
