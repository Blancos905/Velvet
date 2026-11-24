import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Globe,
  MapPin,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SuperAdminCountsDto, SuperAdminPlatformInsightsDto } from "../../api/types";
import { formatEuroFromCents, pct } from "./superAdminPlatformStats";

type Props = {
  counts: SuperAdminCountsDto;
  insights: SuperAdminPlatformInsightsDto;
};

function SectionHead({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="luxury-sa-insights__section-head">
      <span className="luxury-sa-insights__section-icon" aria-hidden>
        <Icon size={18} strokeWidth={2} />
      </span>
      <h3 className="luxury-sa-insights__title">{title}</h3>
    </div>
  );
}

function FunnelBar({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;
  return (
    <div className="luxury-sa-insights-funnel__row">
      <div className="luxury-sa-insights-funnel__label">
        <span>{label}</span>
        <span className="luxury-sa-insights-funnel__nums">
          {value} <span className="luxury-admin-muted">({pct(value, total)}%)</span>
        </span>
      </div>
      <div className="luxury-sa-insights-funnel__track" aria-hidden>
        <div className="luxury-sa-insights-funnel__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StarBar({ stars, count, max }: { stars: number; count: number; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  return (
    <div className="luxury-sa-insights-stars__row">
      <span className="luxury-sa-insights-stars__label">{stars} ★</span>
      <div className="luxury-sa-insights-stars__track" aria-hidden>
        <div className="luxury-sa-insights-stars__fill" style={{ width: `${width}%` }} />
      </div>
      <span className="luxury-sa-insights-stars__count">{count}</span>
    </div>
  );
}

function formatRating(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1).replace(".", ",");
}

export default function SuperAdminPlatformInsightsPanels({ counts, insights }: Props) {
  const { support, appointments, salonActivation, reviews, topCities, topSalons, b2c, revenue, engagement } =
    insights;
  const starMax = Math.max(1, ...reviews.postVisitStars.map((s) => s.count));
  const funnelTotal = salonActivation.salonsTotal || 1;
  const reviewsTotal = counts.reviews + counts.platformReviews;

  return (
    <div className="luxury-sa-insights" aria-label="Dettaglio statistiche piattaforma">
      <section className="luxury-sa-insights__section">
        <SectionHead icon={Activity} title="Attività del mese" />
        <div className="luxury-sa-insights__grid luxury-sa-insights__grid--4">
          <div className="luxury-sa-insights__metric">
            <span className="luxury-sa-insights__metric-label">Nuovi profili utente</span>
            <strong className="luxury-sa-insights__metric-value">{b2c.consumersRegisteredThisMonth}</strong>
            <span className="luxury-sa-insights__metric-hint">Registrazioni cliente</span>
          </div>
          <div className="luxury-sa-insights__metric">
            <span className="luxury-sa-insights__metric-label">Nuovi clienti in anagrafica</span>
            <strong className="luxury-sa-insights__metric-value">{b2c.salonClientsCreatedThisMonth}</strong>
            <span className="luxury-sa-insights__metric-hint">Schede create dai saloni</span>
          </div>
          <div className="luxury-sa-insights__metric">
            <span className="luxury-sa-insights__metric-label">Prenotazioni nel mese</span>
            <strong className="luxury-sa-insights__metric-value">{appointments.thisMonth}</strong>
            <span className="luxury-sa-insights__metric-hint">{appointments.upcomingNonCancelled} in calendario</span>
          </div>
          <div className="luxury-sa-insights__metric">
            <span className="luxury-sa-insights__metric-label">Assistenza da leggere</span>
            <strong className="luxury-sa-insights__metric-value">{support.unreadFromSalons}</strong>
            <span className="luxury-sa-insights__metric-hint">
              <Link to="/admin/messaggi">Apri messaggi</Link> · {support.totalRequestsFromSalons} totali
            </span>
          </div>
        </div>
      </section>

      <section className="luxury-sa-insights__section">
        <SectionHead icon={TrendingUp} title="Quanto sono attivi i saloni" />
        <p className="luxury-sa-insights__intro">
          Su {salonActivation.salonsTotal} saloni, quanti hanno superato le tappe minime per lavorare sulla piattaforma.
        </p>
        <div className="luxury-sa-insights-funnel">
          <FunnelBar label="Servizi in catalogo" value={salonActivation.withCatalogService} total={funnelTotal} />
          <FunnelBar label="Operatori staff" value={salonActivation.withStaff} total={funnelTotal} />
          <FunnelBar label="Almeno una prenotazione" value={salonActivation.withBooking} total={funnelTotal} />
          <FunnelBar label="Completamente operativi" value={salonActivation.fullyActive} total={funnelTotal} />
        </div>
      </section>

      <div className="luxury-sa-insights__split">
        <section className="luxury-sa-insights__section">
          <SectionHead icon={Star} title={`Recensioni (${reviewsTotal})`} />
          <div className="luxury-sa-insights__grid luxury-sa-insights__grid--2">
            <div>
              <p className="luxury-sa-insights__subhead">Dopo la visita</p>
              <p className="luxury-sa-insights__big">{formatRating(reviews.postVisitAverageRating)}</p>
              <p className="luxury-sa-insights__metric-hint">
                {reviews.postVisitCount} totali · {reviews.postVisitThisMonth} questo mese
              </p>
            </div>
            <div>
              <p className="luxury-sa-insights__subhead">Su Luxury</p>
              <p className="luxury-sa-insights__big">{formatRating(reviews.platformAverageRating)}</p>
              <p className="luxury-sa-insights__metric-hint">
                {reviews.platformCount} totali · {reviews.platformThisMonth} questo mese
              </p>
            </div>
          </div>
          {reviews.postVisitStars.length > 0 ? (
            <div className="luxury-sa-insights-stars">
              {reviews.postVisitStars.map((s) => (
                <StarBar key={s.stars} stars={s.stars} count={s.count} max={starMax} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="luxury-sa-insights__section">
          <SectionHead icon={Wallet} title="Tipi di salone e fatturazione" />
          <table className="luxury-sa-insights-table">
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">N.</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Partner Luxury</td>
                <td>{counts.studioGroupsProvider}</td>
                <td>Nessun abbonamento Stripe</td>
              </tr>
              <tr>
                <td>Premium a pagamento</td>
                <td>{counts.studioGroupsPayingPremium}</td>
                <td>Piano Premium</td>
              </tr>
              <tr>
                <td>Senza Premium</td>
                <td>{counts.studioGroupsPayingBase}</td>
                <td>Abbonamento Premium non attivo</td>
              </tr>
              <tr>
                <td>Stripe · paganti</td>
                <td>{counts.studioGroupsSubscribedPaying ?? 0}</td>
                <td>In regola</td>
              </tr>
              <tr>
                <td>Stripe · prova</td>
                <td>{counts.studioGroupsSubscribedTrial ?? 0}</td>
                <td>Periodo di prova</td>
              </tr>
              <tr>
                <td>Stripe · disdetta</td>
                <td>{counts.studioGroupsSubscribedCancelled ?? 0}</td>
                <td>Non rinnovato</td>
              </tr>
            </tbody>
          </table>
          <div className="luxury-sa-insights__revenue">
            {revenue.paymentsIntegrated ? (
              <p>
                <strong>MRR stimato:</strong> {formatEuroFromCents(revenue.estimatedMrrCents)}
                <span className="luxury-admin-muted">
                  {" "}
                  — {counts.studioGroupsPayingPremium} Premium ×{" "}
                  {formatEuroFromCents(revenue.premiumMonthlyPriceCents)}/mese
                </span>
              </p>
            ) : (
              <p className="luxury-sa-insights__metric-hint">
                MRR non disponibile: configura il prezzo mensile Premium nel backend.
              </p>
            )}
            <p className="luxury-sa-insights__metric-hint">
              Saloni a pagamento inattivi (90 giorni senza prenotazioni): {revenue.payingSalonsInactive90Days}
            </p>
          </div>
        </section>
      </div>

      <div className="luxury-sa-insights__split">
        <section className="luxury-sa-insights__section">
          <SectionHead icon={MapPin} title="Città con più saloni" />
          {topCities.length === 0 ? (
            <p className="luxury-sa-insights__metric-hint">Nessuna città in anagrafica sedi.</p>
          ) : (
            <ol className="luxury-sa-insights-ranked">
              {topCities.map((c, idx) => (
                <li key={c.city}>
                  <span>
                    {idx + 1}. {c.city}
                  </span>
                  <span>{c.salonCount}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="luxury-sa-insights__section">
          <SectionHead icon={Activity} title="Saloni più attivi" />
          {topSalons.length === 0 ? (
            <p className="luxury-sa-insights__metric-hint">Nessun salone.</p>
          ) : (
            <div className="luxury-admin-table-wrap">
              <table className="luxury-admin-table luxury-admin-table--compact luxury-sa-insights-table">
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
                        {s.provider ? <span className="luxury-sa-insights-badge">partner</span> : null}
                        {s.primaryCity ? <span className="luxury-admin-muted"> · {s.primaryCity}</span> : null}
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

      <section className="luxury-sa-insights__section">
        <SectionHead icon={Globe} title="Vetrina e comunicazioni" />
        <div className="luxury-sa-insights__grid luxury-sa-insights__grid--2">
          <div className="luxury-sa-insights__metric">
            <span className="luxury-sa-insights__metric-label">Sedi pubblicate</span>
            <strong className="luxury-sa-insights__metric-value">{engagement.locationsPublished}</strong>
            <span className="luxury-sa-insights__metric-hint">Visibili in ricerca ed esplora</span>
          </div>
          <div className="luxury-sa-insights__metric">
            <span className="luxury-sa-insights__metric-label">Messaggi ai titolari</span>
            <strong className="luxury-sa-insights__metric-value">{engagement.adminPlatformMessagesSent}</strong>
            <span className="luxury-sa-insights__metric-hint">Notifiche di sistema inviate</span>
          </div>
        </div>
        <p className="luxury-sa-insights__metric-hint" style={{ marginTop: "0.75rem" }}>
          Catalogo: {counts.salonServices} servizi · {counts.staffOperators} operatori · {counts.locations} sedi
        </p>
      </section>
    </div>
  );
}

