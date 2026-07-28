import React, { useCallback, useId, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, Euro, FileDown, Star, TrendingUp, Users } from "lucide-react";
import BookingsChart from "../../../components/stats/BookingsChart";
import ClientRetention from "../../../components/stats/ClientRetention";
import RevenueChart from "../../../components/stats/RevenueChart";
import StaffPerformance from "../../../components/stats/StaffPerformance";
import StatCard from "../../../components/stats/StatCard";
import TopServices from "../../../components/stats/TopServices";
import { apiJson } from "../../../api/client";
import type { AppointmentDto, OrganizationDetail, SalonCatalogClientRow } from "../../../api/types";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { useMeSalonReviewsQuery } from "../../../hooks/useMeSalonReviews";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { useSalonStaffList } from "../../../hooks/useSalonStaffList";
import {
  addDays,
  buildStaffPerformance,
  firstAppointmentDayByClient,
  mergeAppointmentIndex,
} from "../../../lib/salonStatsDerived";
import {
  avgRatingList,
  buildTopServiceRows,
  firstOfMonthWithOffset,
  monthBounds,
  semesterBounds,
  uniqueClientsInYm,
  ymKey,
} from "../../../lib/salonStatisticsMetrics";
import * as salonAccountantPdf from "../../../lib/salonSemesterAccountantPdf";
import { formatPriceEUR } from "../../../lib/format";
import { formatLocalYmd } from "../SalonAgendaBoard";
import "../../../styles/salon-statistics.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

type LucideCompat = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

export default function SalonStatisticsPage() {
  const barGradientId = useId().replace(/:/g, "");
  const revenueBarGradientId = useId().replace(/:/g, "");

  const { accessToken, isSalonTitolare } = useLuxuryAuth();
  const meSalonQ = useMeSalonSummaryQuery();
  const { from, to, label } = monthBounds();
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportSemester, setReportSemester] = useState<1 | 2>(() => (new Date().getMonth() < 6 ? 1 : 2));
  const semBounds = useMemo(() => semesterBounds(reportYear, reportSemester), [reportYear, reportSemester]);
  const reportYearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3, y - 4];
  }, []);
  const trendFrom = formatLocalYmd(firstOfMonthWithOffset(-4));
  const trendTo = to;
  const currentYm = from.slice(0, 7);
  const prevYm = ymKey(firstOfMonthWithOffset(-1));

  const blockStatsUntilSalonSummary = Boolean(isSalonTitolare && meSalonQ.isLoading);
  const statsQueriesEnabled =
    Boolean(accessToken) && !blockStatsUntilSalonSummary && meSalonQ.isSuccess;

  const slug = meSalonQ.data?.primaryLocationSlug?.trim() ?? "";
  const orgQ = useQuery({
    queryKey: ["public", "organization", slug],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug && statsQueriesEnabled),
  });
  const clientsQ = useQuery({
    queryKey: ["catalog", "clients", orgQ.data?.id, accessToken],
    queryFn: () =>
      apiJson<SalonCatalogClientRow[]>("/api/v1/clients", {
        accessToken,
        headers: { "X-Location-Id": orgQ.data!.id },
      }),
    enabled: Boolean(accessToken && orgQ.data?.id && statsQueriesEnabled),
  });

  const reviewsQ = useMeSalonReviewsQuery(statsQueriesEnabled);
  const { mergedStaffMembers, staffQuery } = useSalonStaffList();

  const deepToDate = new Date();
  const deepFromDate = addDays(deepToDate, -199);
  const deepFrom = formatLocalYmd(deepFromDate);
  const deepTo = formatLocalYmd(deepToDate);

  const q = useQuery({
    queryKey: ["me", "salon", "agenda", "monthly-stats", from, to],
    queryFn: () => apiJson<AppointmentDto[]>(`/api/v1/me/salon/agenda?from=${from}&to=${to}`, { accessToken }),
    enabled: statsQueriesEnabled,
  });
  const trendQ = useQuery({
    queryKey: ["me", "salon", "agenda", "trend-5m", trendFrom, trendTo],
    queryFn: () => apiJson<AppointmentDto[]>(`/api/v1/me/salon/agenda?from=${trendFrom}&to=${trendTo}`, { accessToken }),
    enabled: statsQueriesEnabled,
  });
  const historyQ = useQuery({
    queryKey: ["me", "salon", "agenda", "history-200d", deepFrom, deepTo],
    queryFn: () => apiJson<AppointmentDto[]>(`/api/v1/me/salon/agenda?from=${deepFrom}&to=${deepTo}`, { accessToken }),
    enabled: statsQueriesEnabled,
  });
  const semesterPdfQ = useQuery({
    queryKey: ["me", "salon", "agenda", "semester-accountant", semBounds.from, semBounds.to],
    queryFn: () =>
      apiJson<AppointmentDto[]>(
        `/api/v1/me/salon/agenda?from=${encodeURIComponent(semBounds.from)}&to=${encodeURIComponent(semBounds.to)}`,
        { accessToken },
      ),
    enabled: statsQueriesEnabled,
  });

  const rows = q.data ?? [];
  const trendAppointments = trendQ.data ?? [];
  const historyAppointments = historyQ.data ?? [];

  const appointmentById = useMemo(
    () => mergeAppointmentIndex([trendAppointments, rows, historyAppointments]),
    [trendAppointments, rows, historyAppointments],
  );

  const staffById = useMemo(() => {
    const m = new Map<
      string,
      { firstName: string; lastName: string; role: string; photoDataUrl: string | null }
    >();
    for (const s of mergedStaffMembers) {
      if (s.source !== "api") continue;
      m.set(s.rawId, {
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.role,
        photoDataUrl: s.photoDataUrl,
      });
    }
    return m;
  }, [mergedStaffMembers]);

  const total = rows.length;
  const completed = rows.filter((a) => a.status === "COMPLETED").length;
  const cancelled = rows.filter((a) => a.status === "CANCELLED").length;
  const planned = rows.filter((a) => a.status === "BOOKED" || a.status === "CONFIRMED").length;
  const billableRows = rows.filter((a) => a.status !== "CANCELLED");
  const revenueCents = billableRows.reduce((acc, a) => acc + (a.priceCents ?? 0), 0);
  const avgTicketCents = billableRows.length > 0 ? Math.round(revenueCents / billableRows.length) : 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const monthlySeries = (() => {
    const map = new Map<string, number>();
    const start = firstOfMonthWithOffset(-4);
    for (let i = 0; i < 5; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, 0);
    }
    for (const a of trendAppointments) {
      const key = a.start.slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, count]) => ({
      key,
      count,
      label: new Date(`${key}-01T00:00:00`).toLocaleString("it-IT", { month: "short" }),
    }));
  })();

  const revenueMonthlySeries = useMemo(() => {
    const map = new Map<string, number>();
    const start = firstOfMonthWithOffset(-4);
    for (let i = 0; i < 5; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, 0);
    }
    for (const a of trendAppointments) {
      if (a.status === "CANCELLED") continue;
      const key = a.start.slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + (a.priceCents ?? 0));
    }
    return [...map.entries()].map(([key, cents]) => ({
      key,
      cents,
      label: new Date(`${key}-01T00:00:00`).toLocaleString("it-IT", { month: "short" }),
    }));
  }, [trendQ.data]);

  const currentMonthCount = monthlySeries[monthlySeries.length - 1]?.count ?? 0;
  const previousMonthCount = monthlySeries[monthlySeries.length - 2]?.count ?? 0;
  const monthDelta = currentMonthCount - previousMonthCount;
  const trendUpBookings = monthDelta > 0;
  const trendDownBookings = monthDelta < 0;
  const trendMax = monthlySeries.reduce((m, r) => Math.max(m, r.count), 0);
  const revenueTrendMax = revenueMonthlySeries.reduce((m, r) => Math.max(m, r.cents), 0);
  const pctVsPrevious =
    previousMonthCount > 0 ? Math.round((monthDelta / previousMonthCount) * 1000) / 10 : null;

  const currentRev = revenueMonthlySeries[revenueMonthlySeries.length - 1]?.cents ?? 0;
  const previousRev = revenueMonthlySeries[revenueMonthlySeries.length - 2]?.cents ?? 0;
  const revenuePctVsPrevious =
    previousRev > 0 ? Math.round(((currentRev - previousRev) / previousRev) * 1000) / 10 : null;

  const uniqueThis = uniqueClientsInYm(trendAppointments, currentYm);
  const uniquePrev = uniqueClientsInYm(trendAppointments, prevYm);
  const clientTrendPct =
    uniquePrev > 0 ? Math.round(((uniqueThis - uniquePrev) / uniquePrev) * 1000) / 10 : null;

  const catalogCount = clientsQ.data?.length ?? null;

  const firstSeen = useMemo(() => firstAppointmentDayByClient(historyAppointments), [historyQ.data]);

  const newClientsThisMonth = useMemo(() => {
    let n = 0;
    for (const [, day] of firstSeen) {
      if (day >= from && day <= to) n += 1;
    }
    return n;
  }, [firstSeen, from, to]);

  const returningPct = useMemo(() => {
    const active = new Set<string>();
    for (const a of rows) {
      if (a.salonClientId) active.add(a.salonClientId);
    }
    if (active.size === 0) return null;
    let ret = 0;
    for (const id of active) {
      const first = firstSeen.get(id);
      if (first && first < from) ret += 1;
    }
    return (ret / active.size) * 100;
  }, [rows, firstSeen, from]);

  const reviews = reviewsQ.data ?? [];
  const avgRating = reviews.length > 0 ? avgRatingList(reviews) : null;
  const reviewsThisMonth = reviews.filter((r) => r.createdAt.slice(0, 7) === currentYm);
  const reviewsPrevMonth = reviews.filter((r) => r.createdAt.slice(0, 7) === prevYm);
  const avgRThis = avgRatingList(reviewsThisMonth);
  const avgRPrev = avgRatingList(reviewsPrevMonth);
  const ratingTrendPct =
    avgRThis != null && avgRPrev != null && avgRPrev > 0
      ? Math.round(((avgRThis - avgRPrev) / avgRPrev) * 1000) / 10
      : null;

  const staffPerfRows = useMemo(
    () => buildStaffPerformance(rows, reviews, appointmentById, staffById),
    [rows, reviews, appointmentById, staffById],
  );

  const serviceRows = buildTopServiceRows(rows, 8);
  const serviceBookingsTotal = serviceRows.reduce((acc, s) => acc + s.count, 0) || 1;

  const onDownloadMonthlyPdf = useCallback(() => {
    const pdfRows = q.data;
    if (!pdfRows) return;
    const salonName = orgQ.data?.name?.trim() || meSalonQ.data?.primaryLocationName?.trim() || "Salone";
    const addressLine =
      orgQ.data?.addressLine?.trim() || meSalonQ.data?.primaryLocationAddressLine?.trim() || null;
    const cityParts = [
      meSalonQ.data?.primaryLocationPostalCode?.trim(),
      orgQ.data?.city?.trim() || meSalonQ.data?.primaryLocationCity?.trim(),
    ].filter(Boolean) as string[];
    const cityLine = cityParts.length > 0 ? cityParts.join(" ") : null;
    salonAccountantPdf.downloadSalonMonthlyAccountantPdf({
      salonName,
      addressLine,
      cityLine,
      periodLabel: label.charAt(0).toUpperCase() + label.slice(1),
      fromYmd: from,
      toYmd: to,
      fileSlug: slug || "salone",
      appointments: pdfRows,
    });
  }, [q.data, orgQ.data, meSalonQ.data, from, to, label, slug]);

  const onDownloadSemesterPdf = useCallback(() => {
    const pdfRows = semesterPdfQ.data;
    if (!pdfRows) return;
    const salonName = orgQ.data?.name?.trim() || meSalonQ.data?.primaryLocationName?.trim() || "Salone";
    const addressLine =
      orgQ.data?.addressLine?.trim() || meSalonQ.data?.primaryLocationAddressLine?.trim() || null;
    const cityParts = [
      meSalonQ.data?.primaryLocationPostalCode?.trim(),
      orgQ.data?.city?.trim() || meSalonQ.data?.primaryLocationCity?.trim(),
    ].filter(Boolean) as string[];
    const cityLine = cityParts.length > 0 ? cityParts.join(" ") : null;
    salonAccountantPdf.downloadSalonSemesterAccountantPdf({
      salonName,
      addressLine,
      cityLine,
      periodLabel: semBounds.label,
      fromYmd: semBounds.from,
      toYmd: semBounds.to,
      fileSlug: slug || "salone",
      appointments: pdfRows,
    });
  }, [semesterPdfQ.data, orgQ.data, meSalonQ.data, semBounds, slug]);

  const bannerPositive =
    (clientTrendPct != null && clientTrendPct > 0) || (revenuePctVsPrevious != null && revenuePctVsPrevious > 0);

  const ClockIcon = Clock as unknown as LucideCompat;
  const TrendingIcon = TrendingUp as unknown as LucideCompat;
  const FileDownIcon = FileDown as unknown as LucideCompat;

  const compareLine = trendQ.isPending ? null : (
    <>
      <span
        className={
          "luxury-stats-delta " +
          (trendUpBookings
            ? "luxury-stats-delta--up"
            : trendDownBookings
              ? "luxury-stats-delta--down"
              : "luxury-stats-delta--flat")
        }
      >
        {trendUpBookings ? "↑" : trendDownBookings ? "↓" : "→"}{" "}
        {monthDelta > 0 ? `+${monthDelta}` : monthDelta} vs mese precedente
        {pctVsPrevious != null ? (
          <span className="luxury-stats-delta__pct">
            {" "}
            ({pctVsPrevious > 0 ? "+" : ""}
            {pctVsPrevious}%)
          </span>
        ) : null}
      </span>
      <span className="luxury-stats-chart-card__compare-note">
        Questo mese: {currentMonthCount} · Mese scorso: {previousMonthCount}
      </span>
    </>
  );

  let bannerBody: React.ReactNode;
  if (
    bannerPositive &&
    clientTrendPct != null &&
    clientTrendPct > 0 &&
    revenuePctVsPrevious != null &&
    revenuePctVsPrevious > 0
  ) {
    bannerBody = (
      <>
        Rispetto al mese scorso, hai un aumento del {Math.abs(clientTrendPct)}% nei clienti e del{" "}
        {Math.abs(revenuePctVsPrevious)}% nei ricavi. Continua così!
      </>
    );
  } else if (bannerPositive) {
    const parts: string[] = [];
    if (clientTrendPct != null && clientTrendPct > 0) parts.push(`clienti con appuntamento +${clientTrendPct}%`);
    if (revenuePctVsPrevious != null && revenuePctVsPrevious > 0) parts.push(`ricavi stimati +${revenuePctVsPrevious}%`);
    bannerBody =
      parts.length > 0 ? (
        <>Rispetto al mese scorso: {parts.join(" · ")}.</>
      ) : (
        <>
          Periodo <strong>{label}</strong>: {planned} in programma, {completed} completati, {cancelled} annullati.
        </>
      );
  } else {
    bannerBody = (
      <>
        Periodo <strong>{label}</strong>: {planned} in programma, {completed} completati, {cancelled} annullati.
      </>
    );
  }

  return (
    <SalonStandardSectionGuard>
      <div className="luxury-stats-page luxury-stats-dash luxury-stats-dash--metrics-pro luxury-stats-dash--base44">
        <div className="luxury-stats-dash__shell">
          <header className="luxury-stats-dash__header luxury-stats-dash__header--bordered">
            <div className="luxury-stats-dash__header-inner">
              <div>
                <p className="luxury-stats-dash__eyebrow">Piano Premium</p>
                <h1 className="luxury-stats-dash__title-h1 luxury-stats-dash__title-h1--playfair">Statistiche Salone</h1>
              </div>
              <div className="luxury-stats-dash__period">
                <ClockIcon className="luxury-stats-dash__period-icon" strokeWidth={2} aria-hidden />
                <span className="luxury-stats-dash__period-label">{label}</span>
              </div>
            </div>
          </header>

          {meSalonQ.isLoading ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-stats-metric-muted" style={{ margin: 0 }}>
                Caricamento profilo salone…
              </p>
            </div>
          ) : q.isPending ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-stats-metric-muted" style={{ margin: 0 }}>
                Caricamento statistiche…
              </p>
            </div>
          ) : q.isError ? (
            <div className="luxury-stats-metric-card luxury-stats-dash__loading">
              <p className="luxury-alert luxury-alert--error" role="alert" style={{ margin: 0 }}>
                {q.error instanceof Error ? q.error.message : "Errore caricamento statistiche"}
              </p>
            </div>
          ) : (
            <main className="luxury-stats-dash__main luxury-stats-dash__main--spaced">
              <section className="luxury-stats-dash__kpi" aria-label="Indicatori principali">
                <StatCard
                  icon={Users}
                  label="Clienti Totali"
                  value={catalogCount != null ? String(catalogCount) : "—"}
                  subValue={
                    newClientsThisMonth > 0
                      ? `${newClientsThisMonth} nuovi questo mese`
                      : "Nessun nuovo cliente rilevato nel mese (nei dati disponibili)"
                  }
                  trend={clientTrendPct}
                  trendUp={clientTrendPct != null ? clientTrendPct >= 0 : true}
                />
                <StatCard
                  icon={CalendarCheck}
                  label="Prenotazioni"
                  value={String(total)}
                  subValue={`${completionPct}% tasso completamento`}
                  trend={pctVsPrevious}
                  trendUp={monthDelta >= 0}
                />
                <StatCard
                  icon={Euro}
                  label="Ricavi del Mese"
                  value={formatPriceEUR(revenueCents)}
                  subValue={`Media ${formatPriceEUR(avgTicketCents)} per servizio`}
                  trend={revenuePctVsPrevious}
                  trendUp={revenuePctVsPrevious != null ? revenuePctVsPrevious >= 0 : true}
                />
                <StatCard
                  icon={Star}
                  label="Valutazione Media"
                  value={avgRating != null ? String(avgRating) : "—"}
                  subValue={
                    reviews.length > 0 ? `Basata su ${reviews.length} recensioni` : "Nessuna recensione ancora"
                  }
                  trend={ratingTrendPct}
                  trendUp={ratingTrendPct != null ? ratingTrendPct >= 0 : true}
                />
              </section>

              <article
                className="luxury-stats-pro-card luxury-stats-dash__pdf-report"
                aria-labelledby="stats-pdf-report-title"
              >
                <div className="luxury-stats-pro-card__head">
                  <span className="luxury-stats-pro-card__label" id="stats-pdf-report-title">
                    Report PDF ricavi
                  </span>
                  <span className="luxury-stats-pro-card__icon-wrap" aria-hidden>
                    <FileDownIcon className="luxury-stats-pro-card__icon" strokeWidth={2} />
                  </span>
                </div>
                <div className="luxury-stats-dash__pdf-month">
                  <div className="luxury-stats-dash__pdf-month-head">
                    <span className="luxury-stats-dash__pdf-section-label">Mese corrente</span>
                    <span className="luxury-stats-dash__pdf-month-period">
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </span>
                  </div>
                  <p className="luxury-stats-dash__pdf-month-hint">
                    Intervallo dati: {from} — {to} (stessi appuntamenti usati per le card sopra).
                  </p>
                  <button
                    type="button"
                    className="luxury-stats-dash__pdf-btn"
                    disabled={q.isPending}
                    onClick={onDownloadMonthlyPdf}
                  >
                    {q.isPending ? "Caricamento…" : "Scarica PDF mese"}
                  </button>
                </div>
                <p className="luxury-stats-dash__pdf-section-label luxury-stats-dash__pdf-section-label--spaced">
                  Semestre
                </p>
                <div className="luxury-stats-dash__pdf-controls">
                  <label className="luxury-stats-dash__pdf-field">
                    <span className="luxury-stats-dash__pdf-field-label">Anno</span>
                    <select
                      className="luxury-stats-dash__pdf-select"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                    >
                      {reportYearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="luxury-stats-dash__pdf-field">
                    <span className="luxury-stats-dash__pdf-field-label">Semestre</span>
                    <select
                      className="luxury-stats-dash__pdf-select"
                      value={reportSemester}
                      onChange={(e) => setReportSemester(Number(e.target.value) as 1 | 2)}
                    >
                      <option value={1}>1° — gennaio / giugno</option>
                      <option value={2}>2° — luglio / dicembre</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="luxury-stats-dash__pdf-btn"
                    disabled={semesterPdfQ.isPending || semesterPdfQ.isError || !semesterPdfQ.data}
                    onClick={onDownloadSemesterPdf}
                  >
                    {semesterPdfQ.isPending ? "Caricamento…" : "Scarica PDF semestre"}
                  </button>
                </div>
                {semesterPdfQ.isError ? (
                  <p className="luxury-stats-dash__pdf-error" role="alert">
                    {semesterPdfQ.error instanceof Error
                      ? semesterPdfQ.error.message
                      : "Errore nel caricamento dati periodo"}
                  </p>
                ) : null}
              </article>

              {/* Stessa riga del Base44 Home: BookingsChart | RevenueChart */}
              <div className="luxury-stats-dash__charts">
                <BookingsChart
                  title="Prenotazioni per mese"
                  subtitle="Ultimi 5 mesi — confronto con il mese precedente"
                  monthlySeries={monthlySeries}
                  trendMax={trendMax}
                  barGradientId={barGradientId}
                  loading={trendQ.isPending}
                  compareLine={compareLine}
                />
                <RevenueChart
                  title="Ricavi Mensili"
                  subtitle="Andamento ricavi ultimi 5 mesi (incasso stimato)"
                  monthlySeries={revenueMonthlySeries}
                  trendMax={revenueTrendMax}
                  barGradientId={revenueBarGradientId}
                  loading={trendQ.isPending}
                />
              </div>

              <div className="luxury-stats-dash__triple">
                <TopServices rows={serviceRows} totalBookings={serviceBookingsTotal} />
                <StaffPerformance rows={staffPerfRows} loading={staffQuery.isPending || q.isPending} />
                <ClientRetention returningPct={returningPct} loading={historyQ.isPending || q.isPending} />
              </div>

              <section className="luxury-stats-dash__banner">
                <div className="luxury-stats-dash__banner-deco" aria-hidden />
                <div className="luxury-stats-dash__banner-inner">
                  <div className="luxury-stats-dash__banner-icon-wrap">
                    <TrendingIcon className="luxury-stats-dash__banner-icon" strokeWidth={2} aria-hidden />
                  </div>
                  <div>
                    <h3 className="luxury-stats-dash__banner-title">
                      {bannerPositive ? "Il tuo salone sta crescendo!" : "Panoramica aggiornata"}
                    </h3>
                    <p className="luxury-stats-dash__banner-text">{bannerBody}</p>
                  </div>
                </div>
              </section>
            </main>
          )}
        </div>
      </div>
    </SalonStandardSectionGuard>
  );
}
