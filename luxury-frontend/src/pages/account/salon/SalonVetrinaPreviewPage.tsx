import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson } from "../../../api/client";
import type { MeSalonService, OrganizationDetail } from "../../../api/types";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { SalonClientVisibilitySwitch } from "../../../components/salon/SalonClientVisibilitySwitch";
import { SalonPublicShowcase } from "../../../components/salon/SalonPublicShowcase";
import { SalonVetrinaPreviewRest } from "../../../components/salon/SalonVetrinaPreviewRest";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { useLuxuryT } from "../../../i18n/useLuxuryLocale";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import { emptySalonShowcase, readSalonShowcaseAsync } from "../../../lib/salonShowcaseStorage";
import "../../../styles/luxury-account-page-shell.css";
import "../../../styles/luxury-salon-showcase.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

export default function SalonVetrinaPreviewPage() {
  const t = useLuxuryT();
  const { accessToken } = useLuxuryAuth();
  const meSalon = useMeSalonSummaryQuery();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const visible = Boolean(meSalon.data?.visibleToClients);

  const detailQ = useQuery({
    queryKey: ["me", "salon", "vetrina-preview", slug, accessToken],
    queryFn: () => apiJson<OrganizationDetail>("/api/v1/me/salon/vetrina-preview", { accessToken }),
    enabled: Boolean(accessToken && slug),
  });

  const servicesQ = useQuery({
    queryKey: ["me", "salon", "services", accessToken],
    queryFn: () => apiJson<MeSalonService[]>("/api/v1/me/salon/services", { accessToken }),
    enabled: Boolean(accessToken && slug),
  });

  const showcaseQ = useQuery({
    queryKey: ["salon-showcase", "owner-preview", slug, accessToken],
    queryFn: () => readSalonShowcaseAsync(slug, accessToken),
    enabled: Boolean(slug),
  });

  const detail = detailQ.data;
  const showcase = showcaseQ.data ?? emptySalonShowcase();

  return (
    <SalonStandardSectionGuard>
      <div className={`luxury-account-page-shell ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}>
        <section className="luxury-surface-card" aria-label={t("account.showcase.previewTitle")}>
          <h1 className="luxury-section-title">{t("account.showcase.previewTitle")}</h1>
          <p className="luxury-text-muted">{t("account.showcase.previewLead")}</p>
          <SalonClientVisibilitySwitch />
          {visible && slug ? (
            <p>
              <Link className="luxury-link-inline" to={`/s/${encodeURIComponent(slug)}`}>
                {t("account.showcase.openPublic")}
              </Link>
            </p>
          ) : null}
        </section>

        {!slug && !meSalon.isLoading ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {t("account.showcase.previewMissing")}
          </p>
        ) : null}
        {detailQ.error ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {t("account.showcase.previewError")}
          </p>
        ) : null}
        {detail ? (
          <SalonPublicShowcase
            salonName={detail.name}
            city={detail.city}
            showcase={showcase}
            services={(servicesQ.data ?? []).map((service) => ({
              id: service.id,
              name: service.name,
              description: service.description ?? null,
              priceCents: service.priceCents,
              durationMinutes: service.durationMinutes,
              photoDataUrl: showcase.servicePhotoDataUrls[service.id] ?? null,
              photoObjectPosition: showcase.servicePhotoObjectPositions[service.id] ?? "50% 50%",
            }))}
            detachedPublicLayout
            siteFullscreenBleed
            serviceListVariant="cards"
            themeClass="luxury-salon-showcase--t-brand-hero"
            allowEmptyPreview
            embedHeading
            servicesInitiallyOpen
            siblingLocations={(detail.siblingLocations ?? []).filter(
              (location) => location.slug.trim().length > 0 && location.slug !== detail.slug,
            )}
          />
        ) : null}
        {detail ? (
          <SalonVetrinaPreviewRest
            detail={detail}
            logoDataUrl={showcase.logoDataUrl}
            publicExplore={visible}
          />
        ) : null}
      </div>
    </SalonStandardSectionGuard>
  );
}
