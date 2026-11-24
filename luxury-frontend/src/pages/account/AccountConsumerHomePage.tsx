import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { AdSoftPlacement } from "../../components/AdSoftPlacement";
import { intlLocaleForUi } from "../../i18n/intlLocaleForUi";
import { useLuxuryLocale } from "../../i18n/useLuxuryLocale";
import { resolveLuxuryAccountGreetingName, useMeProfileQuery } from "../../hooks/useMeProfile";
import { formatPriceEUR } from "../../lib/format";

function formatWhen(iso: string, locale: ReturnType<typeof useLuxuryLocale>["locale"]): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(intlLocaleForUi(locale), {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function AccountConsumerHomePage() {
  const { accessToken, isSalonTitolare, isLuxurySuperAdmin } = useLuxuryAuth();
  const { locale, t } = useLuxuryLocale();
  const meProfile = useMeProfileQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingConfirmed = searchParams.get("booking") === "confirmed";
  const showClientHome = !isLuxurySuperAdmin && !isSalonTitolare;

  const appointmentsQ = useQuery({
    queryKey: ["me", "appointments", "upcoming", "home"],
    queryFn: () =>
      apiJson<AppointmentDto[]>(`/api/v1/me/appointments?upcoming=${true}`, {
        accessToken,
      }),
    enabled: Boolean(accessToken) && showClientHome,
  });

  if (isLuxurySuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/salone" replace />;
  }

  const upcomingPreview = (appointmentsQ.data ?? []).slice(0, 6);

  const greetingName = resolveLuxuryAccountGreetingName(meProfile.data?.displayName);
  const greeting = greetingName
    ? `${t("account.greeting.hi")} ${greetingName}`
    : t("account.consumer.home.yourSpace");

  return (
    <div className="luxury-consumer-home">
      <h1 className="luxury-page-title">{greeting}</h1>
      <p className="luxury-page-subtitle">{t("account.consumer.home.subtitle")}</p>
      {bookingConfirmed && (
        <p className="luxury-alert luxury-alert--success luxury-consumer-home__confirm" role="status">
          {t("account.consumer.home.confirmed")}
          <button
            type="button"
            className="luxury-link-inline"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("booking");
              setSearchParams(next, { replace: true });
            }}
          >
            {t("account.consumer.home.close")}
          </button>
        </p>
      )}

      {appointmentsQ.isLoading && <p className="luxury-text-muted">{t("common.loading")}</p>}
      {appointmentsQ.error && (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {appointmentsQ.error instanceof Error ? appointmentsQ.error.message : t("common.errorRetry")}
        </p>
      )}
      {appointmentsQ.data && upcomingPreview.length === 0 && (
        <div className="luxury-surface-card luxury-consumer-home__empty">
          <p className="luxury-consumer-home__empty-text">
            {t("account.consumer.home.emptyPrefix")}{" "}
            <Link className="luxury-link-inline" to="/search">
              {t("account.consumer.home.searchSalon")}
            </Link>{" "}
            {t("account.consumer.home.emptySuffix")}
          </p>
        </div>
      )}
      <ul className="luxury-consumer-home__appointments-list">
        {upcomingPreview.map((a) => (
          <li key={a.id} className="luxury-surface-card luxury-consumer-home__appointment-item">
            <Link to={`/account/prenotazioni/${a.id}`} className="luxury-link-inline luxury-consumer-home__appointment-title">
              {a.serviceName}
            </Link>
            <p className="luxury-consumer-home__appointment-meta">
              {a.locationName} · {formatWhen(a.start, locale)} · {formatPriceEUR(a.priceCents)}
            </p>
            {(a.canConsumerCancel || a.canConsumerReschedule) && (
              <p className="luxury-consumer-home__appointment-manage">
                <Link to={`/account/prenotazioni/${a.id}`} className="luxury-link-inline">
                  {t("account.consumer.home.manage")}
                </Link>
              </p>
            )}
          </li>
        ))}
      </ul>
      {appointmentsQ.data && appointmentsQ.data.length > 3 && (
        <p className="luxury-consumer-home__all-link-wrap">
          <Link className="luxury-link-inline" to="/account/prenotazioni">
            {t("account.consumer.home.seeAll")}
          </Link>
        </p>
      )}
      <AdSoftPlacement zone="client_home" variant="strip" />
    </div>
  );
}
