import { Link, useNavigate } from "react-router-dom";
import { NationsCupTrophyIcon } from "../components/NationsCupTrophyIcon";
import { useLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { useLuxuryT } from "../i18n/useLuxuryLocale";
import "../styles/luxury-search-page.css";
import "../styles/nations-cup-page.css";

export default function NationsCupPage() {
  const navigate = useNavigate();
  const isNativeApp = useLuxuryNativeAppShell();
  const t = useLuxuryT();

  return (
    <main
      className={
        "luxury-page-main luxury-search-page luxury-nations-cup-page luxury-nations-cup-page--coming-soon" +
        (isNativeApp ? " luxury-nations-cup-page--native" : "")
      }
    >
      <div className="luxury-search-back-row">
        <button
          type="button"
          className="luxury-search-back"
          aria-label={t("home.nationsCup.backHomeAria")}
          onClick={() => navigate("/")}
        >
          <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("home.nationsCup.backHome")}
        </button>
      </div>

      <header className="luxury-search-hero luxury-nations-cup-hero">
        <div className="luxury-search-hero__glow luxury-nations-cup-hero__glow" aria-hidden />
        <div className="luxury-nations-cup-hero__shine" aria-hidden />
        <div className="luxury-nations-cup-hero__cup-wrap" aria-hidden>
          <NationsCupTrophyIcon className="luxury-nations-cup-hero__cup" />
        </div>
        <p className="luxury-nations-cup-eyebrow">{t("home.nationsCup.eyebrow")}</p>
        <h1 className="luxury-page-title luxury-nations-cup-hero__title">
          <span className="luxury-search-hero__title-text">{t("home.nationsCup.title")}</span>
        </h1>

        <p className="luxury-nations-cup-lead">
          {t("home.nationsCup.leadPart1")}
          <strong>{t("home.nationsCup.leadSalons")}</strong>
          {t("home.nationsCup.leadPart2")}
          <strong>{t("home.nationsCup.leadOperators")}</strong>
          {t("home.nationsCup.leadPart3")}
        </p>
        <span className="luxury-nations-cup-status">
          <span className="luxury-nations-cup-status__dot" aria-hidden />
          {t("home.nationsCup.badge")}
        </span>
      </header>

      <div className="luxury-nations-cup-foot">
        <Link to="/" className="luxury-nations-cup-back-link">
          <svg className="luxury-nations-cup-back-link__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M16 16l4.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="luxury-nations-cup-back-link__text">{t("home.nationsCup.backSearch")}</span>
          <svg className="luxury-nations-cup-back-link__arrow" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h12M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </main>
  );
}
