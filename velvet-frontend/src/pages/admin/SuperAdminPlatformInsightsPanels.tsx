import { useId } from "react";
import { Link } from "react-router-dom";
import type { SuperAdminCountsDto, SuperAdminPlatformInsightsDto } from "../../api/types";
import BookingsChart from "../../components/stats/BookingsChart";
import type { MonthlyCountPoint } from "../../components/stats/BookingsChart";
import { formatEuroFromCents, pct } from "./superAdminPlatformStats";

type Props = {
  counts: SuperAdminCountsDto;
  insights: SuperAdminPlatformInsightsDto;
  salonClientSeries: MonthlyCountPoint[];
  salonClientTrendMax: number;
};

function FunnelBar({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;
  return (
    <div className="velvet-sa-insights-funnel__row">
      <div className="velvet-sa-insights-funnel__label">
        <span>{label}</span>
        <span className="velvet-sa-insights-funnel__nums">
          {value} <span className="velvet-admin-muted">({pct(value, total)}%)</span>
        </span>
      </div>
      <div className="velvet-sa-insights-funnel__track" aria-hidden>
        <div className="velvet-sa-insights-funnel__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StarBar({ stars, count, max }: { stars: number; count: number; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  return (
    <div className="velvet-sa-insights-stars__row">
      <span className="velvet-sa-insights-stars__label">{stars} ★</span>
      <div className="velvet-sa-insights-stars__track" aria-hidden>
        <div className="velvet-sa-insights-stars__fill" style={{ width: `${width}%` }} />
      </div>
      <span className="velvet-sa-insights-stars__count">{count}</span>
    </div>
  );
}

function formatRating(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1).replace(".", ",");
}

export default function SuperAdminPlatformInsightsPanels({
  counts,
  insights,
  salonClientSeries,
  salonClientTrendMax,
}: Props) {
  const b2cChartId = useId().replace(/:/g, "");
  const { support, appointments, salonActivation, reviews, topCities, topSalons, b2c, revenue, engagement } =
    insights;
  const starMax = Math.max(1, ...reviews.postVisitStars.map((s) => s.count));
  const funnelTotal = salonActivation.salonsTotal || 1;

  return (
    <div className="velvet-sa-insights" aria-label="Dettaglio statistiche piattaforma">
      <section className="velvet-stats-pro-card velvet-sa-insights__section">
        <h3 className="velvet-sa-insights__title">Operatività</h3>
        <div className="velvet-sa-insights__grid velvet-sa-insights__grid--4">
          <div className="velvet-sa-insights__metric">
            <span className="velvet-sa-insights__metric-label">Assistenza non letta</span>
            <strong className="velvet-sa-insights__metric-value">{support.unreadFromSalons}</strong>
            <span className="velvet-sa-insights__metric-hint">
              <Link to="/admin/messaggi">Vai a Messaggi</Link> · {support.totalRequestsFromSalons} richieste totali dai
              saloni
            </span>
          </div>
          <div className="velvet-sa-insights__metric">
            <span className="velvet-sa-insights__metric-label">Prenotazioni questo mese</span>
            <strong className="velvet-sa-insights__metric-value">{appointments.thisMonth}</strong>
            <span className="velvet-sa-insights__metric-hint">Per data inizio appuntamento</span>
          </div>
          <div className="velvet-sa-insights__metric">
            <span className="velvet-sa-insights__metric-label">Annullate · Completate · No-show</span>
            <strong className="velvet-sa-insights__metric-value">
              {appointments.cancelled} · {appointments.completed} · {appointments.noShow}
            </strong>
            <span className="velvet-sa-insights__metric-hint">{appointments.upcomingNonCancelled} in calendario</span>
          </div>
          <div className="velvet-sa-insights__metric">
            <span className="velvet-sa-insights__metric-label">Messaggi admin inviati</span>
            <strong className="velvet-sa-insights__metric-value">{engagement.adminPlatformMessagesSent}</strong>
            <span className="velvet-sa-insights__metric-hint">Notifiche sistema ai titolari</span>
          </div>
        </div>
      </section>

      <section className="velvet-stats-pro-card velvet-sa-insights__section">
        <h3 className="velvet-sa-insights__title">Attivazione saloni</h3>
        <p className="velvet-sa-insights__intro">
          Quanti saloni hanno superato le tappe minime (catalogo, staff, almeno una prenotazione).
        </p>
        <div className="velvet-sa-insights-funnel">
          <FunnelBar label="Con servizi in catalogo" value={salonActivation.withCatalogService} total={funnelTotal} />
          <FunnelBar label="Con operatori staff" value={salonActivation.withStaff} total={funnelTotal} />
          <FunnelBar label="Con almeno una prenotazione" value={salonActivation.withBooking} total={funnelTotal} />
          <FunnelBar label="Completamente attivi" value={salonActivation.fullyActive} total={funnelTotal} />
        </div>
      </section>

      <div className="velvet-sa-insights__split">
        <section className="velvet-stats-pro-card velvet-sa-insights__section">
          <h3 className="velvet-sa-insights__title">Recensioni</h3>
          <div className="velvet-sa-insights__grid velvet-sa-insights__grid--2">
            <div>
              <p className="velvet-sa-insights__subhead">Post-visita</p>
              <p className="velvet-sa-insights__big">{formatRating(reviews.postVisitAverageRating)}</p>
              <p className="velvet-sa-insights__metric-hint">
                {reviews.postVisitCount} totali · {reviews.postVisitThisMonth} questo mese
              </p>
            </div>
            <div>
              <p className="velvet-sa-insights__subhead">Su Luxury (piattaforma)</p>
              <p className="velvet-sa-insights__big">{formatRating(reviews.platformAverageRating)}</p>
              <p className="velvet-sa-insights__metric-hint">
                {reviews.platformCount} totali · {reviews.platformThisMonth} questo mese
              </p>
            </div>
          </div>
          {reviews.postVisitStars.length > 0 ? (
            <div className="velvet-sa-insights-stars">
              {reviews.postVisitStars.map((s) => (
                <StarBar key={s.stars} stars={s.stars} count={s.count} max={starMax} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="velvet-stats-pro-card velvet-sa-insights__section">
          <h3 className="velvet-sa-insights__title">Abbonamenti e provider</h3>
          <table className="velvet-sa-insights-table">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">N.</th>
                <th scope="col">Pagamento</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A pagamento · Premium</td>
                <td>{counts.studioGroupsPayingPremium}</td>
                <td>Sì</td>
              </tr>
              <tr>
                <td>A pagamento · Free</td>
                <td>{counts.studioGroupsPayingBase}</td>
                <td>Sì</td>
              </tr>
              <tr>
                <td>Provider</td>
                <td>{counts.studioGroupsProvider}</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
          <div className="velvet-sa-insights__revenue">
            {revenue.paymentsIntegrated ? (
              <p>
                <strong>MRR stimato:</strong> {formatEuroFromCents(revenue.estimatedMrrCents)}
                <span className="velvet-admin-muted">
                  {" "}
                  ({counts.studioGroupsPayingPremium} Premium × {formatEuroFromCents(revenue.premiumMonthlyPriceCents)}
                  /mese)
                </span>
              </p>
            ) : (
              <p className="velvet-sa-insights__metric-hint">
                MRR non calcolato: imposta{" "}
                <code>velvet.admin.stats.premium-monthly-price-cents</code> in Spring per una stima.
              </p>
            )}
            <p className="velvet-sa-insights__metric-hint">
              Churn proxy: {revenue.payingSalonsInactive90Days} saloni a pagamento senza prenotazioni negli ultimi 90
              giorni
            </p>
          </div>
        </section>
      </div>

      <div className="velvet-sa-insights__split">
        <section className="velvet-stats-pro-card velvet-sa-insights__section">
          <h3 className="velvet-sa-insights__title">Top città</h3>
          {topCities.length === 0 ? (
            <p className="velvet-sa-insights__metric-hint">Nessuna città in anagrafica sedi.</p>
          ) : (
            <ol className="velvet-sa-insights-ranked">
              {topCities.map((c) => (
                <li key={c.city}>
                  <span>{c.city}</span>
                  <span>{c.salonCount} saloni</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="velvet-stats-pro-card velvet-sa-insights__section">
          <h3 className="velvet-sa-insights__title">Top saloni per attività</h3>
          {topSalons.length === 0 ? (
            <p className="velvet-sa-insights__metric-hint">Nessun salone.</p>
          ) : (
            <div className="velvet-admin-table-wrap">
              <table className="velvet-admin-table velvet-admin-table--compact velvet-sa-insights-table">
                <thead>
                  <tr>
                    <th scope="col">Salone</th>
                    <th scope="col">Prenot.</th>
                    <th scope="col">Rec.</th>
                    <th scope="col">Clienti</th>
                  </tr>
                </thead>
                <tbody>
                  {topSalons.map((s) => (
                    <tr key={s.studioGroupId}>
                      <td>
                        {s.name}
                        {s.provider ? (
                          <span className="velvet-sa-insights-badge">provider</span>
                        ) : null}
                        {s.primaryCity ? (
                          <span className="velvet-admin-muted"> · {s.primaryCity}</span>
                        ) : null}
                      </td>
                      <td>{s.appointmentCount}</td>
                      <td>{s.reviewCount}</td>
                      <td>{s.salonClientCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="velvet-stats-pro-card velvet-sa-insights__section">
        <h3 className="velvet-sa-insights__title">Clienti B2C vs anagrafica salone</h3>
        <div className="velvet-sa-insights__grid velvet-sa-insights__grid--2">
          <div className="velvet-sa-insights__metric">
            <span className="velvet-sa-insights__metric-label">Nuovi profili utente (mese corrente)</span>
            <strong className="velvet-sa-insights__metric-value">{b2c.consumersRegisteredThisMonth}</strong>
          </div>
          <div className="velvet-sa-insights__metric">
            <span className="velvet-sa-insights__metric-label">Nuovi clienti in anagrafica saloni (mese)</span>
            <strong className="velvet-sa-insights__metric-value">{b2c.salonClientsCreatedThisMonth}</strong>
          </div>
        </div>
        <BookingsChart
          title="Clienti anagrafica saloni (campione)"
          subtitle="Ultimi 5 mesi — fino a 28 clienti salone più recenti per data creazione"
          monthlySeries={salonClientSeries}
          trendMax={salonClientTrendMax}
          barGradientId={b2cChartId}
          loading={false}
          compareLine={null}
        />
      </section>

      <section className="velvet-stats-pro-card velvet-sa-insights__section">
        <h3 className="velvet-sa-insights__title">Vetrina pubblica</h3>
        <p className="velvet-sa-insights__metric-hint">
          {engagement.locationsPublished} sedi pubblicate (slug) su {counts.studioGroups} saloni — base per ricerca e
          esplora.
        </p>
      </section>
    </div>
  );
}
