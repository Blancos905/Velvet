import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { MeSalonReview, MeSalonSummary, OrganizationDetail, PublicSalonReview } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import "../../styles/luxury-salon-page.css";
import { SalonLocationMapCard } from "./SalonLocationMapCard";
import { SalonPublicReviewsBlock } from "./SalonPublicReviewsBlock";

function sanitizeMailtoHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return `mailto:${encodeURIComponent(value)}`;
}

function sanitizeTelHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const normalized = value.replace(/[^\d+]/g, "");
  if (!normalized || (normalized.match(/\+/g)?.length ?? 0) > 1) return null;
  if (normalized.includes("+") && !normalized.startsWith("+")) return null;
  return `tel:${normalized}`;
}

function IconEmail() {
  return (
    <svg className="luxury-salon-public-meta__contact-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16v12H4V6zm0 2 8 5.25L20 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.35 1.78.67 2.63a2 2 0 01-.5 2.13L8.09 9.9a16 16 0 006 6l1.42-1.42a2 2 0 012.13-.5c.85.32 1.73.55 2.63.67A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWhatsapp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className="luxury-salon-public-meta__btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M6 18l-2 2 .5-3.5A8 8 0 1118 10a8 8 0 01-12 8z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
    </svg>
  );
}

type Props = {
  detail: OrganizationDetail;
  logoDataUrl: string | null;
  /** Link «Esplora» solo se la vetrina è già pubblica: altrimenti la pagina risponde come assente. */
  publicExplore: boolean;
};

/** Parte bassa della vetrina pubblica, sotto il pulsante dei servizi. */
export function SalonVetrinaPreviewRest({ detail, logoDataUrl, publicExplore }: Props) {
  const t = useLuxuryT();
  const { accessToken } = useLuxuryAuth();
  const reviewsQ = useQuery({
    queryKey: ["me", "salon", "reviews", "vetrina-preview", detail.id, accessToken],
    queryFn: () => apiJson<MeSalonReview[]>("/api/v1/me/salon/reviews", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const reviews = useMemo((): PublicSalonReview[] => {
    const name = detail.name.trim();
    return (reviewsQ.data ?? [])
      .filter((review) => {
        const place = review.locationName?.trim();
        return !place || place === name;
      })
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        staffRating: review.staffRating,
        comment: review.comment,
        reviewerName: review.reviewerName,
        serviceName: review.serviceName,
        staffDisplayName: review.operatorName,
        createdAt: review.createdAt,
      }));
  }, [detail.name, reviewsQ.data]);

  const avgLabel = useMemo(() => {
    if (!reviews.length) return null;
    const avg = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    return avg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }, [reviews]);

  const initial = detail.name.trim().charAt(0).toLocaleUpperCase() || "?";
  const tel = detail.contactPhone?.trim() || detail.phoneE164?.trim() || "";
  const mailHref = sanitizeMailtoHref(detail.contactEmail);
  const telHref = sanitizeTelHref(tel);
  const waDigits = (detail.whatsappE164?.replace(/\D/g, "") || tel.replace(/\D/g, "")).trim();
  const exploreClass =
    "luxury-salon-public-meta__card luxury-salon-public-meta__card--wide luxury-salon-public-meta__card--clickable luxury-salon-public-meta__card--description luxury-salon-public-meta__card--explore-cta luxury-salon-public-meta__card--explore-warm";

  const exploreBody = (
    <div className="luxury-salon-public-meta__explore-inner">
      <div className="luxury-salon-public-meta__explore-aside">
        {logoDataUrl ? (
          <img className="luxury-salon-public-meta__explore-logo" src={logoDataUrl} alt="" width={104} height={104} decoding="async" />
        ) : (
          <span className="luxury-salon-public-meta__explore-logo-fallback" aria-hidden="true">
            {initial}
          </span>
        )}
      </div>
      <div className="luxury-salon-public-meta__explore-main">
        <div className="luxury-salon-public-meta__explore-head">
          <h2 className="luxury-salon-public-meta__title luxury-salon-public-meta__title--explore">{t("account.showcase.exploreTitle")}</h2>
        </div>
        <span className="luxury-salon-public-meta__explore-pill">
          {t("account.showcase.exploreCta")}
          <span className="luxury-salon-public-meta__explore-pill-arrow" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </div>
  );

  const mapSalon = {
    provisioned: true,
    planTier: null,
    primaryLocationName: detail.name,
    primaryLocationSlug: detail.slug,
    primaryLocationId: detail.id,
    primaryLocationCity: detail.city,
    primaryLocationPostalCode: null,
    primaryLocationAddressLine: detail.addressLine,
  } satisfies MeSalonSummary;

  return (
    <div className="luxury-salon-public-page__content">
      <section className="luxury-salon-public-meta" aria-label={t("account.showcase.infoAria")}>
        <div className="luxury-salon-public-meta__grid">
          {publicExplore ? (
            <Link to={`/s/${encodeURIComponent(detail.slug)}/esplora`} className={exploreClass}>
              {exploreBody}
            </Link>
          ) : (
            <div className={exploreClass}>{exploreBody}</div>
          )}

          <div
            className="luxury-salon-public-meta__card luxury-salon-public-meta__card--wide luxury-salon-public-meta__card--reviews-cta luxury-salon-public-meta__card--reviews-band luxury-salon-public-meta__card--reviews-warm"
            aria-label={t("account.showcase.reviewsAria")}
          >
            <div className="luxury-salon-public-meta__reviews-inner">
              <div className="luxury-salon-public-meta__reviews-aside">
                <div className="luxury-salon-public-meta__reviews-aside-stack" aria-hidden="true">
                  <div className="luxury-salon-public-meta__reviews-aside-stars">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span key={index} className="luxury-salon-public-meta__reviews-star">
                        ★
                      </span>
                    ))}
                  </div>
                  <span
                    className={
                      "luxury-salon-public-meta__reviews-aside-avg" +
                      (avgLabel == null ? " luxury-salon-public-meta__reviews-aside-avg--muted" : "")
                    }
                  >
                    {reviewsQ.isLoading ? "…" : (avgLabel ?? "—")}
                  </span>
                </div>
              </div>
              <div className="luxury-salon-public-meta__reviews-main">
                <div className="luxury-salon-public-meta__reviews-head">
                  <h2 className="luxury-salon-public-meta__title luxury-salon-public-meta__title--reviews">
                    {t("account.showcase.reviewsTitle")}
                  </h2>
                </div>
                <SalonPublicReviewsBlock
                  isLoading={reviewsQ.isLoading}
                  isError={Boolean(reviewsQ.error)}
                  reviews={reviews}
                />
              </div>
            </div>
          </div>

          <div className="luxury-salon-public-meta__card luxury-salon-public-meta__card--wide luxury-salon-public-meta__card--location luxury-salon-public-meta__card--map-warm">
            <SalonLocationMapCard
              meSalon={mapSalon}
              isPending={false}
              compact
              publicWarmHeader
              eyebrow={t("account.showcase.mapEyebrow")}
              heading={t("account.showcase.mapTitle")}
            />
          </div>

          <div className="luxury-salon-public-meta__card luxury-salon-public-meta__card--wide luxury-salon-public-meta__card--contacts luxury-salon-public-meta__card--contacts-warm">
            <div className="luxury-salon-public-meta__contacts-head">
              <p className="luxury-salon-public-meta__eyebrow">{t("account.showcase.contactsEyebrow")}</p>
              <h2 className="luxury-salon-public-meta__title">{t("account.showcase.contactsTitle")}</h2>
            </div>
            <div className="luxury-salon-public-meta__contact-lines" aria-label={t("account.showcase.contactsAria")}>
              {detail.contactEmail?.trim() && mailHref ? (
                <p className="luxury-salon-public-meta__contact-line luxury-salon-public-meta__contact-line--with-icon">
                  <span className="luxury-salon-public-meta__contact-icon-wrap" aria-hidden>
                    <IconEmail />
                  </span>
                  <span className="luxury-salon-public-meta__contact-line-body">
                    <span className="luxury-salon-public-meta__contact-label">{t("account.showcase.contactEmail")}</span>
                    <a href={mailHref}>{detail.contactEmail.trim()}</a>
                  </span>
                </p>
              ) : null}
              {tel && telHref ? (
                <p className="luxury-salon-public-meta__contact-line luxury-salon-public-meta__contact-line--with-icon">
                  <span className="luxury-salon-public-meta__contact-icon-wrap" aria-hidden>
                    <IconPhone className="luxury-salon-public-meta__contact-icon" />
                  </span>
                  <span className="luxury-salon-public-meta__contact-line-body">
                    <span className="luxury-salon-public-meta__contact-label">{t("account.showcase.contactPhone")}</span>
                    <a href={telHref}>{tel}</a>
                  </span>
                </p>
              ) : null}
              {waDigits ? (
                <p className="luxury-salon-public-meta__contact-line luxury-salon-public-meta__contact-line--with-icon">
                  <span className="luxury-salon-public-meta__contact-icon-wrap luxury-salon-public-meta__contact-icon-wrap--whatsapp" aria-hidden>
                    <IconWhatsapp className="luxury-salon-public-meta__contact-icon luxury-salon-public-meta__contact-icon--whatsapp" />
                  </span>
                  <span className="luxury-salon-public-meta__contact-line-body">
                    <span className="luxury-salon-public-meta__contact-label">{t("account.showcase.contactWhatsapp")}</span>
                    <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                      {t("account.showcase.contactWhatsappOpen")}
                    </a>
                  </span>
                </p>
              ) : null}
            </div>
            {!detail.contactEmail?.trim() && !tel && !waDigits ? (
              <p className="luxury-salon-public-meta__hint">{t("account.showcase.contactsEmpty")}</p>
            ) : null}
            <div className="luxury-salon-public-meta__actions" aria-label={t("account.showcase.actionsAria")}>
              {tel && telHref ? (
                <a className="luxury-salon-public-meta__btn luxury-salon-public-meta__btn--call" href={telHref}>
                  <IconPhone className="luxury-salon-public-meta__btn-icon" />
                  <span>{t("account.showcase.contactCall")}</span>
                </a>
              ) : null}
              {waDigits ? (
                <a className="luxury-salon-public-meta__btn luxury-salon-public-meta__btn--whatsapp" href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                  <IconWhatsapp className="luxury-salon-public-meta__btn-icon luxury-salon-public-meta__btn-icon--whatsapp" />
                  <span>{t("account.showcase.contactWhatsapp")}</span>
                </a>
              ) : null}
              <Link className="luxury-salon-public-meta__btn luxury-salon-public-meta__btn--chat" to="/account/chat">
                <IconChat />
                <span>{t("account.showcase.contactChat")}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
