import type { UseQueryResult } from "@tanstack/react-query";
import { useId, useMemo } from "react";
import { CalendarCheck, Clock, Euro, MessageSquare, Store, Users } from "lucide-react";
import type { SuperAdminOverviewResponseDto } from "../../api/types";
import BookingsChart from "../../components/stats/BookingsChart";
import StatCard from "../../components/stats/StatCard";
import {
  formatEuroFromCents,
  monthlyTrendFieldToSeries,
  parseSuperAdminCounts,
  parseSuperAdminPlatformInsights,
} from "./superAdminPlatformStats";
import SuperAdminPlatformInsightsPanels from "./SuperAdminPlatformInsightsPanels";
import "../../styles/luxury-admin-statistics.css";

type Props = {
  overviewQ: UseQueryResult<SuperAdminOverviewResponseDto, Error>;
};

function seriesMax(series: { count: number }[]): number {
  return series.reduce((m, r) => Math.max(m, r.count), 0);
}

export default function SuperAdminStatisticsSection({ overviewQ }: Props) {
  const usersChartId = useId().replace(/:/g, "");
  const salonsChartId = useId().replace(/:/g, "");
  const appointmentsChartId = useId().replace(/:/g, "");

  const counts = overviewQ.data ? parseSuperAdminCounts(overviewQ.data.counts) : null;
  const platformInsights = overviewQ.data
    ? parseSuperAdminPlatformInsights(overviewQ.data.platformInsights)
    : null;

  const monthlyTrend = useMemo(() => {
    if (!overviewQ.data) return [];
    return parseSuperAdminPlatformInsights(overviewQ.data.platformInsights)?.monthlyTrend ?? [];
  }, [overviewQ.data]);

  const userSeries = useMemo(
    () => monthlyTrendFieldToSeries(monthlyTrend, "consumersCreated"),
    [monthlyTrend],
  );
  const salonSeries = useMemo(
    () => monthlyTrendFieldToSeries(monthlyTrend, "salonsCreated"),
    [monthlyTrend],
  );
  const appointmentSeries = useMemo(
    () => monthlyTrendFieldToSeries(monthlyTrend, "appointmentsStarted"),
    [monthlyTrend],
  );

  const currentMonthUsers = userSeries[userSeries.length - 1]?.count ?? 0;
  const previousMonthUsers = userSeries[userSeries.length - 2]?.count ?? 0;
  const userMonthDelta = currentMonthUsers - previousMonthUsers;

  const generatedLabel = useMemo(() => {
    const g = overviewQ.data?.generatedAt;
    if (!g) return "Aggiornamento in corso";
    try {
      return new Date(g).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "—";
    }
  }, [overviewQ.data?.generatedAt]);

  const mrrLabel =
    platformInsights?.revenue.paymentsIntegrated && counts
      ? formatEuroFromCents(platformInsights.revenue.estimatedMrrCents)
      : null;

  return (
    <section className="luxury-admin-panel luxury-admin-premium-card" aria-labelledby="super-admin-stats-h">
      <h2 id="super-admin-stats-h" className="luxury-admin-section-title" style={{ marginBottom: "0.5rem" }}>
        Statistiche piattaforma
      </h2>

      <div className="luxury-sa-stats luxury-stats-dash">
        <div className="luxury-stats-dash__shell">
          <header className="luxury-stats-dash__header luxury-stats-dash__header--bordered">
            <div className="luxury-stats-dash__header-inner">
              <div>
                <p className="luxury-stats-dash__eyebrow">Super admin</p>
                <h3 className="luxury-stats-dash__title-h1">Panoramica piattaforma</h3>
                <p className="luxury-stats-dash__subtitle">
                  Numeri globali aggiornati ad ogni apertura della dashboard.
                </p>
              </div>
              <div className="luxury-stats-dash__period">
                <Clock className="luxury-stats-dash__period-icon" strokeWidth={2} aria-hidden />
                <span className="luxury-stats-dash__period-label">{generatedLabel}</span>
              </div>
            </div>
          </header>

          {overviewQ.isPending ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-stats-metric-muted" style={{ margin: 0 }}>
                Caricamento statistiche…
              </p>
            </div>
          ) : overviewQ.isError ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-alert luxury-alert--error" role="alert" style={{ margin: 0 }}>
                {overviewQ.error instanceof Error ? overviewQ.error.message : "Errore caricamento statistiche"}
              </p>
            </div>
          ) : !counts || !platformInsights ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-stats-metric-muted" style={{ margin: 0 }}>
                Dati di riepilogo non disponibili.
              </p>
            </div>
          ) : (
            <main className="luxury-stats-dash__main">
              <ul className="luxury-sa-stats-legend" aria-label="Legenda termini">
                <li className="luxury-sa-stats-legend__chip">
                  <span className="luxury-sa-stats-legend__dot" aria-hidden />
                  <span>
                    <strong>Partner</strong> — senza Stripe
                  </span>
                </li>
                <li className="luxury-sa-stats-legend__chip">
                  <span className="luxury-sa-stats-legend__dot" aria-hidden />
                  <span>
                    <strong>Premium</strong> — abbonamento attivo · le altre righe sono senza Premium
                  </span>
                </li>
                <li className="luxury-sa-stats-legend__chip">
                  <span className="luxury-sa-stats-legend__dot" aria-hidden />
                  <span>
                    <strong>Stripe</strong> — pagante, prova o disdetta
                  </span>
                </li>
              </ul>

              <section className="luxury-stats-dash__kpi" aria-label="Indicatori principali">
                <StatCard
                  icon={Store}
                  label="Saloni"
                  value={String(counts.studioGroups)}
                  subValue={`${counts.studioGroupsProvider} partner · ${counts.studioGroupsPayingPremium} Premium · ${counts.studioGroupsPayingBase} senza Premium`}
                  trend={null}
                />
                <StatCard
                  icon={Users}
                  label="Utenti registrati"
                  value={String(counts.consumerProfilesActive)}
                  subValue={`${counts.consumerProfilesTotal} totali · ${counts.consumerOwners} titolari · ${platformInsights.b2c.consumersRegisteredThisMonth} nuovi questo mese`}
                  trend={null}
                />
                <StatCard
                  icon={CalendarCheck}
                  label="Prenotazioni"
                  value={String(counts.appointmentsTotal)}
                  subValue={`${platformInsights.appointments.thisMonth} nel mese corrente · ${counts.appointmentsUpcoming} future`}
                  trend={null}
                />
                <StatCard
                  icon={Euro}
                  label="Abbonamenti Stripe"
                  value={String(counts.studioGroupsSubscribedPaying ?? 0)}
                  subValue={`${counts.studioGroupsSubscribedTrial ?? 0} in prova · ${counts.studioGroupsSubscribedCancelled ?? 0} disdetta${mrrLabel ? ` · MRR ${mrrLabel}` : ""}`}
                  trend={null}
                  className="luxury-sa-stats-kpi--stripe"
                />
                <StatCard
                  icon={Users}
                  label="Clienti in anagrafica"
                  value={String(counts.salonClients)}
                  subValue={`${platformInsights.b2c.salonClientsCreatedThisMonth} aggiunti questo mese · ${counts.favorites} preferiti`}
                  trend={null}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Assistenza saloni"
                  value={String(platformInsights.support.unreadFromSalons)}
                  subValue={`${platformInsights.support.totalRequestsFromSalons} richieste totali · sezione Messaggi`}
                  trend={null}
                  className="luxury-sa-stats-kpi--assistenza"
                />
              </section>

              {monthlyTrend.length > 0 ? (
                <div className="luxury-stats-dash__charts">
                  <BookingsChart
                    title="Nuovi utenti"
                    subtitle="Profili cliente creati per mese · ultimi 5 mesi"
                    monthlySeries={userSeries}
                    trendMax={seriesMax(userSeries)}
                    barGradientId={usersChartId}
                    loading={false}
                    tone="orange"
                    showBarValues
                    compareLine={
                      <span className="luxury-stats-chart-card__compare-note">
                        Mese corrente: <strong>{currentMonthUsers}</strong>
                        {previousMonthUsers > 0 ? (
                          <>
                            {" "}
                            ·{" "}
                            <span
                              className={
                                "luxury-stats-delta " +
                                (userMonthDelta > 0
                                  ? "luxury-stats-delta--up"
                                  : userMonthDelta < 0
                                    ? "luxury-stats-delta--down"
                                    : "luxury-stats-delta--flat")
                              }
                            >
                              {userMonthDelta > 0 ? "+" : ""}
                              {userMonthDelta} vs mese precedente ({previousMonthUsers})
                            </span>
                          </>
                        ) : null}
                      </span>
                    }
                  />
                  <BookingsChart
                    title="Nuovi saloni"
                    subtitle={`Registrazioni per mese · ${counts.studioGroups} saloni totali`}
                    monthlySeries={salonSeries}
                    trendMax={seriesMax(salonSeries)}
                    barGradientId={salonsChartId}
                    loading={false}
                    tone="orange"
                    showBarValues
                    compareLine={null}
                  />
                  <BookingsChart
                    title="Prenotazioni"
                    subtitle="Appuntamenti con inizio nel mese"
                    monthlySeries={appointmentSeries}
                    trendMax={seriesMax(appointmentSeries)}
                    barGradientId={appointmentsChartId}
                    loading={false}
                    tone="orange"
                    showBarValues
                    compareLine={
                      <span className="luxury-stats-chart-card__compare-note">
                        {platformInsights.appointments.completed} completate · {platformInsights.appointments.cancelled}{" "}
                        annullate · {platformInsights.appointments.noShow} no-show
                      </span>
                    }
                  />
                </div>
              ) : null}

              <SuperAdminPlatformInsightsPanels counts={counts} insights={platformInsights} />
            </main>
          )}
        </div>
      </div>
    </section>
  );
}
