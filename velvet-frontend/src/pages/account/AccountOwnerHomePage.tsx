import { Link, Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { planDisplayName, parseSalonPlanTier } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useMeProfileQuery, resolveVelvetAccountGreetingName } from "../../hooks/useMeProfile";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import "../../styles/velvet-account-page-shell.css";
import "../../styles/velvet-consumer-bookings-page.css";

/**
 * Dashboard titolare (`/account/home`): area personale e accessi rapidi.
 * La gestione vetrina, brand e dati pubblici dello studio resta sotto `/account/salone`.
 */
export default function AccountOwnerHomePage() {
  const { isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  const meProfile = useMeProfileQuery();
  const meSalon = useMeSalonSummaryQuery();
  const effectivePlan = useEffectiveSalonPlanTier();
  const showPremiumSalonNav = effectivePlan === "PREMIUM";

  if (isVelvetSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  if (!isSalonTitolare) {
    return <Navigate to="/" replace />;
  }

  const who = resolveVelvetAccountGreetingName(meProfile.data?.displayName);
  const salonName = meSalon.data?.primaryLocationName?.trim() || "Il tuo studio";
  const planFromApi = parseSalonPlanTier(meSalon.data?.planTier);
  const planLabel = planDisplayName(planFromApi ?? effectivePlan);

  const tile = (to: string, title: string, desc: string) => (
    <Link to={to} className="velvet-surface-card velvet-owner-dash__tile">
      <h2 className="velvet-owner-dash__tile-title">{title}</h2>
      <p className="velvet-owner-dash__tile-desc velvet-text-muted">{desc}</p>
    </Link>
  );

  return (
    <div className="velvet-account-page-shell velvet-owner-dash">
      <header className="velvet-consumer-bookings-dash__header--hero">
        <div className="velvet-consumer-bookings-dash__hero-glow" aria-hidden />
        <div className="velvet-consumer-bookings-dash__title-row">
          <h1 className="velvet-consumer-bookings-dash__headline">
            <span className="velvet-consumer-bookings-dash__headline-pre">La tua </span>
            <span className="velvet-consumer-bookings-dash__headline-accent">area titolare</span>
          </h1>
          <p className="velvet-page-subtitle" style={{ margin: 0, maxWidth: "40rem" }}>
            {who ? (
              <>
                Ciao <strong>{who}</strong>: qui trovi i collegamenti al lavoro quotidiano. La scheda pubblica, il brand e i
                contenuti del salone sono in <strong>Il mio salone</strong> — non è il profilo personale dell&apos;account.
              </>
            ) : (
              <>
                Qui trovi i collegamenti al lavoro quotidiano. La scheda pubblica, il brand e i contenuti del salone sono in{" "}
                <strong>Il mio salone</strong> — non è il profilo personale dell&apos;account.
              </>
            )}
          </p>
          <p className="velvet-text-muted" style={{ margin: "0.5rem 0 0", fontSize: "0.95rem" }}>
            Studio <strong>{salonName}</strong> · piano <strong>{planLabel}</strong>
          </p>
        </div>
      </header>

      <section className="velvet-owner-dash__grid" aria-label="Collegamenti rapidi titolare">
        {tile("/account/salone", "Il mio salone", "Panoramica piano, mappa, recensioni e (con Premium) strumenti avanzati per la vetrina.")}
        {tile("/account/prenotazioni", "Agenda", "Settimana operativa e dettaglio appuntamenti dello studio.")}
        {tile("/account/profilo", "Account e sicurezza", "Email, nome, telefono, password e dati del salone pubblicati in ricerca.")}
        {tile("/account/feedback-velvet", "Recensioni", "Valutazioni ricevute dai clienti dopo le visite.")}
        {showPremiumSalonNav ? tile("/account/salone/strumenti", "Notifiche salone", "Email e messaggi di servizio sulle prenotazioni.") : null}
        {showPremiumSalonNav ? tile("/account/salone/tuo-salone", "Crea il tuo sito", "Testi e contenuti della pagina pubblica del salone.") : null}
        {showPremiumSalonNav ? tile("/account/salone/brand", "Brand e vetrina", "Logo, colori e layout dal catalogo Luxury.") : null}
        {tile("/account/assistenza", "Assistenza", "Richieste di aiuto e contatti con Saloni Luxury.")}
      </section>
    </div>
  );
}
