import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import type { ReviewIntent } from "../api/types";
import { LegalSiteFootnote } from "../components/LegalSiteFootnote";
import { StarRatingInput } from "../components/StarRatingInput";

export default function ReviewPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [intent, setIntent] = useState<ReviewIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setErr("Link non valido: manca token.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await apiJson<ReviewIntent>(
          `/api/v1/public/reviews/intent?token=${encodeURIComponent(token)}`,
        );
        if (!cancelled) {
          setIntent(data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Errore");
          setIntent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !intent || intent.alreadySubmitted) return;
    setBusy(true);
    setErr(null);
    try {
      await apiJson("/api/v1/public/reviews", {
        method: "POST",
        body: JSON.stringify({
          token,
          rating,
          staffRating,
          comment: comment.trim() || null,
        }),
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invio fallito");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="luxury-page-main">
        <p className="luxury-text-muted">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="luxury-page-main">
      <h1 className="luxury-page-title">La tua recensione</h1>
      <p className="luxury-page-subtitle">Dopo la visita — come è andata con il salone e l&apos;operatore?</p>

      {err && (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {err}
        </p>
      )}

      {intent && (
        <>
          <section className="luxury-surface-card">
            <p style={{ margin: 0, fontWeight: 600, color: "#fffbeb" }}>{intent.salonName}</p>
            <p className="luxury-text-muted" style={{ margin: "0.35rem 0 0" }}>
              {intent.serviceName}
            </p>
            <p className="luxury-text-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>
              {new Date(intent.appointmentStart).toLocaleString(undefined, {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </section>

          {intent.alreadySubmitted ? (
            <p style={{ marginTop: "1.25rem", color: "rgba(255, 251, 235, 0.75)" }}>
              Hai già lasciato una recensione per questa visita.
            </p>
          ) : done ? (
            <p className="luxury-alert luxury-alert--success" style={{ marginTop: "1.25rem" }} role="status">
              Grazie, recensione inviata.
            </p>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} style={{ marginTop: "1.5rem" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <StarRatingInput
                  id="public-review-salon"
                  label="Voto (1–5) — salone / struttura"
                  value={rating}
                  onChange={setRating}
                  disabled={busy}
                />
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <StarRatingInput
                  id="public-review-staff"
                  label="Voto (1–5) — operatore / professionista"
                  value={staffRating}
                  onChange={setStaffRating}
                  disabled={busy}
                />
              </div>
              <label className="luxury-form-label" style={{ marginTop: "0.85rem" }}>
                Commento (opzionale)
                <textarea className="luxury-soft-field" value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              <button type="submit" className="luxury-btn luxury-btn--primary" disabled={busy} style={{ marginTop: "1rem" }}>
                {busy ? "Invio…" : "Invia recensione"}
              </button>
            </form>
          )}
        </>
      )}

      <LegalSiteFootnote />
      <p style={{ marginTop: "2rem" }}>
        <Link to="/" className="luxury-link-back" style={{ marginBottom: 0 }}>
          ← Torna alla home
        </Link>
      </p>
    </main>
  );
}
