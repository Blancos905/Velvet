import { Link } from "react-router-dom";
import type { StaffPerfRow } from "../../lib/salonStatsDerived";

type StaffPerformanceProps = {
  rows: StaffPerfRow[];
  loading: boolean;
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]!.charAt(0) + p[1]!.charAt(0)).toUpperCase();
}

export default function StaffPerformance({ rows, loading }: StaffPerformanceProps) {
  const preview = rows.slice(0, 8);
  return (
    <section className="velvet-surface-card velvet-stats-metric-card velvet-stats-panel velvet-stats-pro-panel">
      <h2 className="velvet-stats-panel__title">Performance staff</h2>
      <p className="velvet-stats-panel__desc">
        Clienti distinti nel mese corrente e media stelle del voto verso l&apos;operatore sulle recensioni reali (solo dove
        il cliente ha lasciato quel voto).
      </p>
      {loading ? (
        <p className="velvet-stats-metric-muted velvet-stats-panel__empty" style={{ margin: 0 }}>
          Caricamento…
        </p>
      ) : preview.length === 0 ? (
        <p className="velvet-stats-metric-muted velvet-stats-panel__empty" style={{ margin: 0 }}>
          Nessun appuntamento con operatore nel mese corrente.
        </p>
      ) : (
        <ul className="velvet-stats-staff-perf">
          {preview.map((r) => (
            <li key={r.operatorId} className="velvet-stats-staff-perf__row">
              <div className="velvet-stats-staff-perf__avatar" aria-hidden>
                {r.photoDataUrl ? (
                  <img src={r.photoDataUrl} alt="" className="velvet-stats-staff-perf__img" />
                ) : (
                  <span className="velvet-stats-staff-perf__initials">{initials(r.displayName)}</span>
                )}
              </div>
              <div className="velvet-stats-staff-perf__main">
                <div className="velvet-stats-staff-perf__name-line">
                  <span className="velvet-stats-staff-perf__name">{r.displayName}</span>
                  {r.avgRating != null ? (
                    <span
                      className="velvet-stats-staff-perf__stars velvet-stats-staff-perf__stars--beside-name"
                      title="Media del voto operatore sulle recensioni con stelle verso l'operatore"
                    >
                      ★ {r.avgRating.toFixed(1)}
                    </span>
                  ) : (
                    <span
                      className="velvet-stats-staff-perf__stars velvet-stats-staff-perf__stars--na velvet-stats-staff-perf__stars--beside-name"
                      title="Nessuna recensione con voto operatore collegata agli appuntamenti di questo operatore"
                    >
                      —
                    </span>
                  )}
                </div>
                <span className="velvet-stats-staff-perf__role">{r.role}</span>
              </div>
              <div className="velvet-stats-staff-perf__meta">
                <span className="velvet-stats-staff-perf__clients">{r.clientCount} clienti</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/account/salone/staff" className="velvet-stats-pro-link velvet-stats-pro-link--dark">
        Gestisci staff →
      </Link>
    </section>
  );
}
