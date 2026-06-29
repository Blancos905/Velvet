import type { UseQueryResult } from "@tanstack/react-query";
import React, { useId, useMemo, type ComponentType, type SVGProps } from "react";
import { CalendarCheck, Clock, Euro, Star, TrendingUp, Users } from "lucide-react";
import type { SuperAdminOverviewResponseDto } from "../../api/types";
import BookingsChart from "../../components/stats/BookingsChart";
import RevenueChart from "../../components/stats/RevenueChart";
import StatCard from "../../components/stats/StatCard";
import TopServices from "../../components/stats/TopServices";
import type { ServiceRow } from "../../components/stats/TopServices";
import {
  binCreatedAtPerMonth,
  countsToRevenueLikeSeries,
  lastFiveMonthBuckets,
  parseSuperAdminCounts,
  parseSuperAdminPlatformInsights,
} from "./superAdminPlatformStats";
import SuperAdminPlatformInsightsPanels from "./SuperAdminPlatformInsightsPanels";
import "../../styles/salon-statistics.css";

type LucideCompat = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

type Props = {
  overviewQ: UseQueryResult<SuperAdminOverviewResponseDto, Error>;
};

export default function SuperAdminStatisticsSection({ overviewQ }: Props) {
  const barGradientId = useId().replace(/:/g, "");
  const revenueBarGradientId = useId().replace(/:/g, "");

  const buckets = useMemo(() => lastFiveMonthBuckets(), []);

  const counts = overviewQ.data ? parseSuperAdminCounts(overviewQ.data.counts) : null;
  const platformInsights = overviewQ.data
    ? parseSuperAdminPlatformInsights(overviewQ.data.platformInsights)
    : null;

  const salonClientSeries = useMemo(() => {
    const clients = overviewQ.data?.recentSalonClients ?? [];
    return binCreatedAtPerMonth(clients, buckets);
  }, [overviewQ.data?.recentSalonClients, buckets]);

  const salonClientTrendMax = salonClientSeries.reduce((m, r) => Math.max(m, r.count), 0);

  const userSeries = useMemo(() => {
    const users = overviewQ.data?.recentUsers ?? [];
    return binCreatedAtPerMonth(users, buckets);
  }, [overviewQ.data?.recentUsers, buckets]);

  const payingSalonSeries = useMemo(() => {
    const salons = (overviewQ.data?.recentSalons ?? []).filter((s) => !s.provider);
    return binCreatedAtPerMonth(salons, buckets);
  }, [overviewQ.data?.recentSalons, buckets]);

  const payingSalonRevenueLikeSeries = useMemo(
    () => countsToRevenueLikeSeries(payingSalonSeries),
    [payingSalonSeries],
  );

  const payingSalonsInSample = useMemo(
    () => (overviewQ.data?.recentSalons ?? []).filter((s) => !s.provider).length,
    [overviewQ.data?.recentSalons],
  );

  const trendMax = userSeries.reduce((m, r) => Math.max(m, r.count), 0);
  const payingSalonTrendMax = payingSalonRevenueLikeSeries.reduce((m, r) => Math.max(m, r.cents), 0);

  const currentMonthCount = userSeries[userSeries.length - 1]?.count ?? 0;
  const previousMonthCount = userSeries[userSeries.length - 2]?.count ?? 0;
  const monthDelta = currentMonthCount - previousMonthCount;
  const trendUp = monthDelta > 0;
  const trendDown = monthDelta < 0;
  const pctVsPrevious =
    previousMonthCount > 0 ? Math.round((monthDelta / previousMonthCount) * 1000) / 10 : null;

  const providerSalonSeries = useMemo(() => {
    const salons = (overviewQ.data?.recentSalons ?? []).filter((s) => s.provider);
    return binCreatedAtPerMonth(salons, buckets);
  }, [overviewQ.data?.recentSalons, buckets]);

  const providerSalonsInSample = useMemo(
    () => (overviewQ.data?.recentSalons ?? []).filter((s) => s.provider).length,
    [overviewQ.data?.recentSalons],
  );

  const serviceRows: ServiceRow[] = useMemo(() => {
    if (!counts) return [];
    const rows: ServiceRow[] = [
      { name: "Appuntamenti (totali)", count: counts.appointmentsTotal, revenue: 0 },
      { name: "Clienti in anagrafica saloni", count: counts.salonClients, revenue: 0 },
      { name: "Profili utente attivi", count: counts.consumerProfilesActive, revenue: 0 },
      { name: "Gruppi salone", count: counts.studioGroups, revenue: 0 },
      { name: "Saloni a pagamento", count: counts.studioGroupsPaying, revenue: 0 },
      { name: "— Premium (a pagamento)", count: counts.studioGroupsPayingPremium, revenue: 0 },
      { name: "— Free/BASE (a pagamento)", count: counts.studioGroupsPayingBase, revenue: 0 },
      { name: "Abbonati paganti (Stripe)", count: counts.studioGroupsSubscribedPaying ?? 0, revenue: 0 },
      { name: "In prova (Stripe)", count: counts.studioGroupsSubscribedTrial ?? 0, revenue: 0 },
      { name: "Disdetta abbonamento", count: counts.studioGroupsSubscribedCancelled ?? 0, revenue: 0 },
      { name: "Saloni provider (senza pagamento)", count: counts.studioGroupsProvider, revenue: 0 },
      { name: "Sedi attive", count: counts.locations, revenue: 0 },
      { name: "Servizi in catalogo", count: counts.salonServices, revenue: 0 },
      { name: "Operatori staff", count: counts.staffOperators, revenue: 0 },
      { name: "Preferiti salvati", count: counts.favorites, revenue: 0 },
    ];
    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, 8);
  }, [counts]);

  const serviceBookingsTotal = serviceRows.reduce((acc, s) => acc + s.count, 0) || 1;

  const generatedLabel = useMemo(() => {
    const g = overviewQ.data?.generatedAt;
    if (!g) return "Aggiornamento in corso";
    try {
      return new Date(g).toLocaleString("it-IT", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  }, [overviewQ.data?.generatedAt]);

  const ClockIcon = Clock as unknown as LucideCompat;
  const TrendingIcon = TrendingUp as unknown as LucideCompat;

  const compareLine =
    overviewQ.isPending ? null : (
      <>
        <span
          className={
            "luxury-stats-delta " +
            (trendUp ? "luxury-stats-delta--up" : trendDown ? "luxury-stats-delta--down" : "luxury-stats-delta--flat")
          }
        >
          {trendUp ? "↑" : trendDown ? "↓" : "→"} {monthDelta > 0 ? `+${monthDelta}` : monthDelta} vs mese precedente
          {pctVsPrevious != null ? (
            <span className="luxury-stats-delta__pct">
              {" "}
              ({pctVsPrevious > 0 ? "+" : ""}
              {pctVsPrevious}%)
            </span>
          ) : null}
        </span>
        <span className="luxury-stats-chart-card__compare-note">
          Campione utenti: ultimo mese {currentMonthCount} · precedente {previousMonthCount}
        </span>
      </>
    );

  const reviewsTotal = counts ? counts.reviews + counts.platformReviews : 0;
  const bannerPositive = trendUp;

  let bannerBody: React.ReactNode;
  if (bannerPositive && pctVsPrevious != null && pctVsPrevious > 0) {
    bannerBody = (
      <>
        Nel campione di profili recenti, le registrazioni utente dell&apos;ultimo mese sono cresciute del{" "}
        {Math.abs(pctVsPrevious)}% rispetto al mese precedente.
      </>
    );
  } else {
    bannerBody = (
      <>
        Conteggi globali: {counts?.appointmentsTotal ?? "—"} appuntamenti, {counts?.studioGroupsSubscribedPaying ?? "—"}{" "}
        abbonati paganti, {counts?.studioGroupsSubscribedTrial ?? "—"} in prova,{" "}
        {counts?.studioGroupsSubscribedCancelled ?? "—"} con disdetta e {counts?.studioGroupsProvider ?? "—"} provider
        senza pagamento abbonamento.
      </>
    );
  }

  return (
    <section className="luxury-admin-panel luxury-admin-premium-card" aria-labelledby="super-admin-stats-h">
      <h2 id="super-admin-stats-h" className="luxury-admin-section-title" style={{ marginBottom: "0.75rem" }}>
        Statistiche piattaforma
      </h2>
      <div className="luxury-stats-page luxury-stats-dash luxury-stats-dash--metrics-pro luxury-stats-dash--base44">
        <div className="luxury-stats-dash__shell">
          <header className="luxury-stats-dash__header luxury-stats-dash__header--bordered">
            <div className="luxury-stats-dash__header-inner">
              <div>
                <p className="luxury-stats-dash__eyebrow">Super admin</p>
                <h1 className="luxury-stats-dash__title-h1 luxury-stats-dash__title-h1--playfair">Statistiche</h1>
                <p className="luxury-stats-dash__subtitle">
                  Panoramica globale Luxury — i saloni provider non generano ricavi da abbonamento
                </p>
              </div>
              <div className="luxury-stats-dash__period">
                <ClockIcon className="luxury-stats-dash__period-icon" strokeWidth={2} aria-hidden />
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
          ) : !counts ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-stats-metric-muted" style={{ margin: 0 }}>
                Dati di riepilogo non disponibili.
              </p>
            </div>
          ) : (
            <main className="luxury-stats-dash__main luxury-stats-dash__main--spaced">
              <section className="luxury-stats-dash__kpi" aria-label="Indicatori principali">
                <StatCard
                  icon={Users}
                  label="Clienti in anagrafica"
                  value={String(counts.salonClients)}
                  subValue={`${counts.favorites} preferiti tra i saloni`}
                  trend={null}
                />
                <StatCard
                  icon={CalendarCheck}
                  label="Prenotazioni"
                  value={String(counts.appointmentsTotal)}
                  subValue={`${counts.appointmentsUpcoming} futuri (non annullati)`}
                  trend={null}
                />
                <StatCard
                  icon={Euro}
                  label="Abbonati paganti"
                  value={String(counts.studioGroupsSubscribedPaying ?? 0)}
                  subValue={`${counts.studioGroupsSubscribedTrial ?? 0} in prova · ${counts.studioGroupsSubscribedCancelled ?? 0} disdetta`}
                  trend={null}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Saloni a pagamento"
                  value={String(counts.studioGroupsPaying)}
                  subValue={`${counts.studioGroupsPayingPremium} Premium · ${counts.studioGroupsPayingBase} Free — esclusi ${counts.studioGroupsProvider} provider`}
                  trend={null}
                />
                <StatCard
                  icon={Star}
                  label="Recensioni"
                  value={String(reviewsTotal)}
                  subValue={`${counts.reviews} post‑visita · ${counts.platformReviews} su Luxury`}
                  trend={null}
                />
              </section>

              <div className="luxury-stats-dash__charts">
                <BookingsChart
                  title="Nuovi utenti (campione)"
                  subtitle="Ultimi 5 mesi — fino a 28 profili più recenti per data di creazione"
                  monthlySeries={userSeries}
                  trendMax={trendMax}
                  barGradientId={barGradientId}
                  loading={overviewQ.isPending}
                  compareLine={compareLine}
                />
                <RevenueChart
                  title="Nuovi saloni a pagamento (campione)"
                  subtitle={`Ultimi 5 mesi — ${payingSalonsInSample} saloni con abbonamento tra i 28 più recenti (provider esclusi). Piattaforma: ${counts.studioGroupsPaying} a pagamento (${counts.studioGroupsPayingPremium} Premium, ${counts.studioGroupsPayingBase} Free)`}
                  monthlySeries={payingSalonRevenueLikeSeries}
                  trendMax={payingSalonTrendMax}
                  barGradientId={revenueBarGradientId}
                  loading={overviewQ.isPending}
                />
                <BookingsChart
                  title="Nuovi saloni provider (campione)"
                  subtitle={`Ultimi 5 mesi — ${providerSalonsInSample} provider senza pagamento tra i 28 più recenti`}
                  monthlySeries={providerSalonSeries}
                  trendMax={providerSalonSeries.reduce((m, r) => Math.max(m, r.count), 0)}
                  barGradientId={`${barGradientId}-provider`}
                  loading={overviewQ.isPending}
                  compareLine={
                    <span className="luxury-stats-chart-card__compare-note">
                      Piattaforma: {counts.studioGroupsProvider} provider — nessun ricavo abbonamento
                    </span>
                  }
                />
              </div>

              <div className="luxury-stats-dash__triple luxury-stats-dash__triple--single">
                <TopServices rows={serviceRows} totalBookings={serviceBookingsTotal} />
              </div>

              {platformInsights && counts ? (
                <SuperAdminPlatformInsightsPanels
                  counts={counts}
                  insights={platformInsights}
                  salonClientSeries={salonClientSeries}
                  salonClientTrendMax={salonClientTrendMax}
                />
              ) : null}

              <section className="luxury-stats-dash__banner">
                <div className="luxury-stats-dash__banner-deco" aria-hidden />
                <div className="luxury-stats-dash__banner-inner">
                  <div className="luxury-stats-dash__banner-icon-wrap">
                    <TrendingIcon className="luxury-stats-dash__banner-icon" strokeWidth={2} aria-hidden />
                  </div>
                  <div>
                    <h3 className="luxury-stats-dash__banner-title">
                      {bannerPositive ? "Segnali positivi nel campione" : "Panoramica aggiornata"}
                    </h3>
                    <p className="luxury-stats-dash__banner-text">{bannerBody}</p>
                  </div>
                </div>
              </section>
            </main>
          )}
        </div>
      </div>
    </section>
  );
}
