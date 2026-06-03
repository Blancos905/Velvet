import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import { LegalSiteFootnote } from "../components/LegalSiteFootnote";

type AppointmentSummary = {
  id: string;
  locationName: string;
  locationSlug: string;
  serviceName: string;
  start: string;
  end: string;
  status: string;
};

type ManageView = {
  appointment: AppointmentSummary;
  canCancel: boolean;
  canReschedule: boolean;
  blockedReason: string | null;
  policySummary: string;
};

function localDayBounds(): { from: string; to: string } {
  const d = new Date();
  const from = d.toISOString().slice(0, 10);
  const end = new Date(d);
  end.setDate(end.getDate() + 14);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}

export default function ManageBookingPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ManageView | null>(null);

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setErr("Link non valido: manca il parametro token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const json = await apiJson<ManageView>(
        `/api/v1/public/appointments/manage?token=${encodeURIComponent(token)}`,
      );
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore di rete");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSlots = async () => {
    if (!token) return;
    const { from, to } = localDayBounds();
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const list = await apiJson<string[]>(
        `/api/v1/public/appointments/reschedule/slots?token=${encodeURIComponent(token)}&from=${from}&to=${to}`,
      );
      setSlots(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Slot non disponibili");
    } finally {
      setSlotsLoading(false);
    }
  };

  const onCancel = async () => {
    if (!token || !data?.canCancel) return;
    if (!window.confirm("Annullare questa prenotazione?")) return;
    setBusy(true);
    setErr(null);
    try {
      await apiJson("/api/v1/public/appointments/cancel", {
        method: "POST",
        body: JSON.stringify({ token, reason: null }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annullamento fallito");
    } finally {
      setBusy(false);
    }
  };

  const onReschedule = async () => {
    if (!token || !selectedSlot) return;
    setBusy(true);
    setErr(null);
    try {
      await apiJson("/api/v1/public/appointments/reschedule", {
        method: "POST",
        body: JSON.stringify({ token, newStart: selectedSlot }),
      });
      setSlots([]);
      setSelectedSlot(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Riprogrammazione fallita");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="velvet-page-main">
        <p className="velvet-text-muted">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="velvet-page-main">
      <h1 className="velvet-page-title">Gestisci prenotazione</h1>
      <p className="velvet-page-subtitle">Link ricevuto via email o SMS — nessun login necessario.</p>

      {err && (
        <p className="velvet-alert velvet-alert--error" role="alert">
          {err}
        </p>
      )}

      {data && (
        <>
          <section className="velvet-surface-card">
            <p style={{ margin: 0, fontWeight: 600, color: "#fffbeb" }}>{data.appointment.serviceName}</p>
            <p className="velvet-text-muted" style={{ margin: "0.35rem 0 0" }}>
              {data.appointment.locationName}
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem", color: "rgba(255, 251, 235, 0.85)" }}>
              {new Date(data.appointment.start).toLocaleString(undefined, {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
            <p className="velvet-text-muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
              {data.policySummary}
            </p>
          </section>

          {data.blockedReason && (
            <p className="velvet-text-muted" style={{ marginTop: "1rem" }}>
              {data.blockedReason}
            </p>
          )}

          <div className="velvet-btn-row">
            <button
              type="button"
              className="velvet-btn velvet-btn--secondary"
              onClick={() => void onCancel()}
              disabled={!data.canCancel || busy}
            >
              Disdici prenotazione
            </button>

            {!slots.length && data.canReschedule && (
              <button
                type="button"
                className="velvet-btn velvet-btn--primary"
                onClick={() => void loadSlots()}
                disabled={busy || slotsLoading}
              >
                {slotsLoading ? "Carico orari…" : "Cambia orario"}
              </button>
            )}

            {!!slots.length && (
              <div style={{ marginTop: 4 }}>
                <label htmlFor="slot" className="velvet-form-label">
                  Scegli un nuovo orario
                </label>
                <select
                  id="slot"
                  className="velvet-soft-field"
                  value={selectedSlot ?? ""}
                  onChange={(e) => setSelectedSlot(e.target.value || null)}
                >
                  <option value="">—</option>
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {new Date(s).toLocaleString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="velvet-btn velvet-btn--primary"
                  style={{ marginTop: 12, width: "100%" }}
                  onClick={() => void onReschedule()}
                  disabled={!selectedSlot || busy}
                >
                  Conferma nuovo orario
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link to="/" className="velvet-link-back" style={{ marginBottom: 0 }}>
          ← Torna alla home
        </Link>
      </p>
      <LegalSiteFootnote style={{ marginTop: "1rem" }} />
    </main>
  );
}
