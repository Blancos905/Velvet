import type { MonthlyCountPoint } from "../../components/stats/BookingsChart";
import type { MonthlyRevenuePoint } from "../../components/stats/RevenueChart";
import type { SuperAdminCountsDto, SuperAdminPlatformInsightsDto } from "../../api/types";

export function lastFiveMonthBuckets(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let offset = -4; offset <= 0; offset += 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("it-IT", { month: "short" });
    out.push({ key, label });
  }
  return out;
}

export function binCreatedAtPerMonth(
  items: readonly { createdAt?: string | null }[],
  buckets: readonly { key: string; label: string }[],
): MonthlyCountPoint[] {
  const map = new Map(buckets.map((b) => [b.key, 0]));
  for (const it of items) {
    const ym = it.createdAt?.slice(0, 7);
    if (ym && map.has(ym)) {
      map.set(ym, (map.get(ym) ?? 0) + 1);
    }
  }
  return buckets.map((b) => ({ key: b.key, label: b.label, count: map.get(b.key) ?? 0 }));
}

export function countsToRevenueLikeSeries(series: MonthlyCountPoint[]): MonthlyRevenuePoint[] {
  return series.map((r) => ({
    key: r.key,
    label: r.label,
    cents: r.count * 100_000,
  }));
}

function num(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

export function parseSuperAdminCounts(raw: unknown): SuperAdminCountsDto | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  return {
    consumerProfilesTotal: num(c.consumerProfilesTotal),
    consumerProfilesActive: num(c.consumerProfilesActive),
    consumerOwners: num(c.consumerOwners),
    studioGroups: num(c.studioGroups),
    locations: num(c.locations),
    salonClients: num(c.salonClients),
    appointmentsTotal: num(c.appointmentsTotal),
    appointmentsUpcoming: num(c.appointmentsUpcoming),
    salonServices: num(c.salonServices),
    staffOperators: num(c.staffOperators),
    reviews: num(c.reviews),
    platformReviews: num(c.platformReviews),
    favorites: num(c.favorites),
    studioGroupsProvider: num(c.studioGroupsProvider),
    studioGroupsPaying: num(c.studioGroupsPaying),
    studioGroupsPayingPremium: num(c.studioGroupsPayingPremium),
    studioGroupsPayingBase: num(c.studioGroupsPayingBase),
  };
}

function numOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function bool(x: unknown): boolean {
  return x === true;
}

export function parseSuperAdminPlatformInsights(raw: unknown): SuperAdminPlatformInsightsDto | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const support = o.support as Record<string, unknown> | undefined;
  const appointments = o.appointments as Record<string, unknown> | undefined;
  const salonActivation = o.salonActivation as Record<string, unknown> | undefined;
  const reviews = o.reviews as Record<string, unknown> | undefined;
  const b2c = o.b2c as Record<string, unknown> | undefined;
  const revenue = o.revenue as Record<string, unknown> | undefined;
  const engagement = o.engagement as Record<string, unknown> | undefined;
  if (!support || !appointments || !salonActivation || !reviews || !b2c || !revenue || !engagement) {
    return null;
  }
  const starsRaw = reviews.postVisitStars;
  const postVisitStars = Array.isArray(starsRaw)
    ? starsRaw
        .map((row) => {
          if (row == null || typeof row !== "object") return null;
          const s = row as Record<string, unknown>;
          return { stars: num(s.stars), count: num(s.count) };
        })
        .filter((x): x is { stars: number; count: number } => x != null)
    : [];
  const topCitiesRaw = o.topCities;
  const topCities = Array.isArray(topCitiesRaw)
    ? topCitiesRaw
        .map((row) => {
          if (row == null || typeof row !== "object") return null;
          const c = row as Record<string, unknown>;
          const city = typeof c.city === "string" ? c.city : "";
          return { city, salonCount: num(c.salonCount) };
        })
        .filter((x): x is { city: string; salonCount: number } => x != null && x.city.length > 0)
    : [];
  const topSalonsRaw = o.topSalons;
  const topSalons = Array.isArray(topSalonsRaw)
    ? topSalonsRaw
        .map((row) => {
          if (row == null || typeof row !== "object") return null;
          const t = row as Record<string, unknown>;
          return {
            studioGroupId: String(t.studioGroupId ?? ""),
            name: String(t.name ?? ""),
            provider: bool(t.provider),
            primaryCity: typeof t.primaryCity === "string" ? t.primaryCity : "",
            appointmentCount: num(t.appointmentCount),
            reviewCount: num(t.reviewCount),
            salonClientCount: num(t.salonClientCount),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null && x.studioGroupId.length > 0)
    : [];
  return {
    support: {
      unreadFromSalons: num(support.unreadFromSalons),
      totalRequestsFromSalons: num(support.totalRequestsFromSalons),
    },
    appointments: {
      thisMonth: num(appointments.thisMonth),
      cancelled: num(appointments.cancelled),
      completed: num(appointments.completed),
      noShow: num(appointments.noShow),
      upcomingNonCancelled: num(appointments.upcomingNonCancelled),
    },
    salonActivation: {
      salonsTotal: num(salonActivation.salonsTotal),
      withCatalogService: num(salonActivation.withCatalogService),
      withStaff: num(salonActivation.withStaff),
      withBooking: num(salonActivation.withBooking),
      fullyActive: num(salonActivation.fullyActive),
    },
    reviews: {
      postVisitAverageRating: numOrNull(reviews.postVisitAverageRating),
      postVisitCount: num(reviews.postVisitCount),
      postVisitThisMonth: num(reviews.postVisitThisMonth),
      platformAverageRating: numOrNull(reviews.platformAverageRating),
      platformCount: num(reviews.platformCount),
      platformThisMonth: num(reviews.platformThisMonth),
      postVisitStars,
    },
    topCities,
    topSalons,
    b2c: {
      consumersRegisteredThisMonth: num(b2c.consumersRegisteredThisMonth),
      salonClientsCreatedThisMonth: num(b2c.salonClientsCreatedThisMonth),
    },
    revenue: {
      paymentsIntegrated: bool(revenue.paymentsIntegrated),
      estimatedMrrCents: num(revenue.estimatedMrrCents),
      premiumMonthlyPriceCents: num(revenue.premiumMonthlyPriceCents),
      payingSalonsInactive90Days: num(revenue.payingSalonsInactive90Days),
    },
    engagement: {
      adminPlatformMessagesSent: num(engagement.adminPlatformMessagesSent),
      locationsPublished: num(engagement.locationsPublished),
    },
  };
}

export function formatEuroFromCents(cents: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
