import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { parseSalonPlanTier } from "../../data/salonPlans";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import "../../styles/velvet-account-page-shell.css";

const POLL_MS = 2000;
const TIMEOUT_MS = 90_000;

/** Attende l'upgrade Premium confermato dal webhook Stripe (`planTier` da DB). */
export default function AccountBillingSuccessPage() {
  const navigate = useNavigate();
  const { isSalonTitolare } = useVelvetAuth();
  const meSalon = useMeSalonSummaryQuery();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isSalonTitolare) {
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      void meSalon.refetch();
      if (Date.now() - started >= TIMEOUT_MS) {
        setTimedOut(true);
        window.clearInterval(timer);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isSalonTitolare, meSalon]);

  useEffect(() => {
    const tier = parseSalonPlanTier(meSalon.data?.planTier);
    if (tier === "PREMIUM") {
      navigate("/account/salone", { replace: true });
    }
  }, [meSalon.data?.planTier, navigate]);

  if (!isSalonTitolare) {
    return (
      <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
        <p>Accesso riservato ai titolari salone.</p>
        <Link to="/account">Torna all&apos;account</Link>
      </div>
    );
  }

  return (
    <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
      <header className="velvet-account-page-shell__hero">
        <div className="velvet-account-page-shell__hero-inner">
          <h1 className="velvet-account-page-shell__hero-title">Attivazione Premium</h1>
          <p className="velvet-account-page-shell__hero-sub">
            {timedOut
              ? "L'attivazione può richiedere qualche minuto. Se Premium non compare entro breve, controlla l'email da Stripe o riprova dal profilo."
              : "Pagamento ricevuto: stiamo confermando l'abbonamento. Non chiudere questa pagina…"}
          </p>
        </div>
      </header>
      {!timedOut ? <p aria-live="polite">Sincronizzazione in corso…</p> : null}
      <p style={{ marginTop: "1rem" }}>
        <Link to="/account/profilo">Vai al profilo</Link>
        {" · "}
        <Link to="/account/salone">Panoramica salone</Link>
      </p>
    </div>
  );
}
