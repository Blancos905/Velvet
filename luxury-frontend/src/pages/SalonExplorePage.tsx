import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiJson } from "../api/client";
import type { OrganizationDetail, PublicSalonReview, ServicePublic } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { canBookOnlineAsConsumer } from "../lib/luxuryConsumerBooking";
import { formatPriceEUR } from "../lib/format";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { useMapsCookieAllowed } from "../hooks/useCookieConsent";
import { googleMapsEmbedSrc } from "../lib/salonMap";
import { googleMapsEmbedApiKey } from "../config/env";
import { parseInlineBold } from "../lib/parseInlineBold";
import {
  emptySalonPersonalPageData,
  readSalonPersonalPageDataAsync,
  type SalonPersonalPageData,
} from "../lib/salonPersonalPageStorage";
import { emptySalonShowcase, readSalonShowcaseAsync, type SalonShowcaseStored } from "../lib/salonShowcaseStorage";
import { SalonPublicReviewsBlock } from "../components/salon/SalonPublicReviewsBlock";
import "../styles/luxury-salon-explore-page.css";
import "../styles/luxury-salon-map-native-app.css";

type GalleryItem = { src: string; caption: string };

function isSupportedServicePhotoSrc(src: string): boolean {
  return (
    src.startsWith("data:image/") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("blob:")
  );
}

function isPublicReviewsEndpointUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("404") || msg.includes("not found") || msg.includes("failed to fetch");
}

function sanitizeExternalHttpUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const EXPLORE_SECTION_IDS = ["il-salone", "gallery", "servizi", "recensioni", "orari", "prenota", "contatti"] as const;
type ExploreSectionId = (typeof EXPLORE_SECTION_IDS)[number];

const EXPLORE_NAV: { id: ExploreSectionId; label: string }[] = [
  { id: "il-salone", label: "Il salone" },
  { id: "gallery", label: "Gallery" },
  { id: "servizi", label: "Servizi" },
  { id: "recensioni", label: "Recensioni" },
  { id: "orari", label: "Orari" },
  { id: "prenota", label: "Prenota" },
  { id: "contatti", label: "Contatti" },
];

function isExploreSectionId(id: string): id is ExploreSectionId {
  return (EXPLORE_SECTION_IDS as readonly string[]).includes(id);
}

function ServiceRow({
  service,
  photoSrc,
  photoObjectPosition,
  isPhotoLoading,
}: {
  service: ServicePublic;
  photoSrc: string | null;
  photoObjectPosition: string;
  isPhotoLoading: boolean;
}) {
  const [photoReady, setPhotoReady] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(photoSrc);
  const [retryAttempted, setRetryAttempted] = useState(false);

  useEffect(() => {
    setPhotoReady(false);
    setPhotoFailed(false);
    setRetryAttempted(false);
    setDisplaySrc(photoSrc);
  }, [photoSrc, service.id]);

  return (
    <li className="luxury-salon-explore__service-row">
      <div className="luxury-salon-explore__service-media">
        {displaySrc && !photoFailed ? (
          <>
            <img
              className={`luxury-salon-explore__service-photo${photoReady ? " is-ready" : ""}`}
              src={displaySrc}
              alt=""
              style={{ objectPosition: photoObjectPosition }}
              loading="lazy"
              decoding="async"
              onLoad={() => setPhotoReady(true)}
              onError={() => {
                if (!retryAttempted && displaySrc.startsWith("http")) {
                  setRetryAttempted(true);
                  const hasQuery = displaySrc.includes("?");
                  setDisplaySrc(`${displaySrc}${hasQuery ? "&" : "?"}retry=${Date.now()}`);
                  return;
                }
                setPhotoFailed(true);
              }}
            />
            {!photoReady ? <span className="luxury-salon-explore__service-photo-skeleton" aria-hidden /> : null}
          </>
        ) : isPhotoLoading ? (
          <span className="luxury-salon-explore__service-photo-skeleton" aria-hidden />
        ) : (
          <span className="luxury-salon-explore__service-photo-placeholder" aria-hidden />
        )}
      </div>
      <div>
        <strong>{service.name}</strong>
        {service.description?.trim() ? <p>{service.description.trim()}</p> : null}
      </div>
      <span>
        {formatPriceEUR(service.priceCents)} · {service.durationMinutes} min
      </span>
    </li>
  );
}

export default function SalonExplorePage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const mapsAllowed = useMapsCookieAllowed();
  const { isAuthenticated, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const canBookAsClient = canBookOnlineAsConsumer(isSalonTitolare, isSalonStaff);
  const s = slug ?? "";
  const [showcase, setShowcase] = useState<SalonShowcaseStored>(() => emptySalonShowcase());
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [servicePhotoSlowLoading, setServicePhotoSlowLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<ExploreSectionId>(() => {
    const h = location.hash.replace(/^#/, "");
    return isExploreSectionId(h) ? h : "il-salone";
  });

  useEffect(() => {
    if (!s) return;
    let alive = true;
    setShowcaseLoading(true);
    void readSalonShowcaseAsync(s).then((data) => {
      if (alive) {
        setShowcase(data ?? emptySalonShowcase());
        setShowcaseLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [s]);

  useEffect(() => {
    const h = location.hash.replace(/^#/, "");
    if (isExploreSectionId(h)) setActiveSection(h);
  }, [location.hash]);

  const detailQ = useQuery({
    queryKey: ["org", "detail", s],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(s)}`),
    enabled: Boolean(s),
  });
  const servicesQ = useQuery({
    queryKey: ["org", "services", s],
    queryFn: () =>
      apiJson<ServicePublic[]>(`/api/v1/public/organizations/${encodeURIComponent(s)}/services`),
    enabled: Boolean(s),
  });
  const reviewsQ = useQuery({
    queryKey: ["org", "reviews", s],
    queryFn: async () => {
      try {
        return await apiJson<PublicSalonReview[]>(`/api/v1/public/organizations/${encodeURIComponent(s)}/reviews`);
      } catch (error) {
        if (isPublicReviewsEndpointUnavailable(error)) return [];
        throw error;
      }
    },
    enabled: Boolean(s),
  });
  const [personal, setPersonal] = useState<SalonPersonalPageData>(() => emptySalonPersonalPageData());

  useEffect(() => {
    if (!s) {
      setPersonal(emptySalonPersonalPageData());
      return;
    }
    let alive = true;
    void readSalonPersonalPageDataAsync(s).then((data) => {
      if (alive) setPersonal(data ?? emptySalonPersonalPageData());
    });
    return () => {
      alive = false;
    };
  }, [s]);
  const services = servicesQ.data ?? [];
  const servicePhotoById = useMemo(() => {
    const entries = Object.entries(showcase.servicePhotoDataUrls ?? {});
    const normalized = new Map<string, string>();
    for (const [serviceId, maybeSrc] of entries) {
      const src = maybeSrc?.trim();
      if (!src) continue;
      if (isSupportedServicePhotoSrc(src)) {
        normalized.set(serviceId, src);
      }
    }
    return normalized;
  }, [showcase.servicePhotoDataUrls]);
  const servicePhotoPreloadList = useMemo(() => {
    if (services.length === 0) return [];
    const urls: string[] = [];
    for (const svc of services) {
      const src = servicePhotoById.get(svc.id);
      if (!src) continue;
      urls.push(src);
      if (urls.length >= 4) break;
    }
    return urls;
  }, [services, servicePhotoById]);
  const servicePhotoPositionById = useMemo(() => {
    const entries = Object.entries(showcase.servicePhotoObjectPositions ?? {});
    const normalized = new Map<string, string>();
    for (const [serviceId, maybePos] of entries) {
      const pos = maybePos?.trim();
      if (!pos) continue;
      if (!/^[0-9]{1,3}%\s+[0-9]{1,3}%$/.test(pos)) continue;
      normalized.set(serviceId, pos);
    }
    return normalized;
  }, [showcase.servicePhotoObjectPositions]);
  const hasAnyServicePhoto = useMemo(() => {
    if (services.length === 0) return false;
    return services.some((svc) => servicePhotoById.has(svc.id));
  }, [services, servicePhotoById]);
  const isServicePhotoLoading = showcaseLoading;
  useEffect(() => {
    if (!isServicePhotoLoading) {
      setServicePhotoSlowLoading(false);
      return;
    }
    const t = window.setTimeout(() => {
      setServicePhotoSlowLoading(true);
    }, 2400);
    return () => {
      window.clearTimeout(t);
    };
  }, [isServicePhotoLoading]);

  useEffect(() => {
    if (servicePhotoPreloadList.length === 0) return;
    const preloaded: HTMLImageElement[] = [];
    for (const src of servicePhotoPreloadList) {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      preloaded.push(img);
    }
    return () => {
      for (const img of preloaded) {
        img.src = "";
      }
    };
  }, [servicePhotoPreloadList]);
  const galleryItems = useMemo(() => {
    const out: GalleryItem[] = [];
    showcase.exploreGalleryImageDataUrls.forEach((url, idx) => {
      if (!url) return;
      out.push({ src: url, caption: `Gallery ${idx + 1}` });
    });
    if (out.length > 0) return out;
    // fallback legacy per chi ha già salvato su vecchio storage
    personal.galleryImageDataUrls.forEach((url, idx) => {
      if (!url) return;
      out.push({ src: url, caption: `Gallery ${idx + 1}` });
    });
    return out;
  }, [showcase.exploreGalleryImageDataUrls, personal.galleryImageDataUrls]);

  const heroImageSrc = galleryItems[0]?.src ?? null;
  const splitImageSrc = galleryItems.length > 1 ? galleryItems[1]?.src : galleryItems[0]?.src ?? null;
  const splitImageCaption = galleryItems.length > 1 ? galleryItems[1]?.caption : null;
  /** Immagini oltre le prime due (hero + colonna) */
  const galleryExtraItems = useMemo(() => {
    if (galleryItems.length <= 2) return [];
    return galleryItems.slice(2);
  }, [galleryItems]);

  const detail = detailQ.data;

  useEffect(() => {
    if (!detail) return;
    const elements = EXPLORE_SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement =>
      Boolean(el),
    );
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        const id = visible[0]?.target.id;
        if (id && isExploreSectionId(id)) setActiveSection(id);
      },
      { root: null, rootMargin: "-14% 0px -58% 0px", threshold: [0, 0.06, 0.12, 0.2, 0.35] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [detail, s]);

  const telForDisplay = detail?.contactPhone?.trim() || detail?.phoneE164?.trim() || "";
  const waFromWhatsapp = detail?.whatsappE164?.replace(/\D/g, "") ?? "";
  const waDigits = waFromWhatsapp || telForDisplay.replace(/\D/g, "");
  const phoneHref = telForDisplay ? `tel:${telForDisplay.replace(/\s+/g, "")}` : null;
  const waHref = waDigits.length > 0 ? `https://wa.me/${waDigits}` : null;
  const instagramHref = sanitizeExternalHttpUrl(personal.instagramUrl);
  const facebookHref = sanitizeExternalHttpUrl(personal.facebookUrl);

  const mapQuery = useMemo(() => {
    const cityLine = formatSalonCityForDisplay(detail?.city) ?? detail?.city?.trim();
    const parts = [detail?.addressLine?.trim(), cityLine].filter((x): x is string => Boolean(x));
    return parts.length > 0 ? parts.join(", ") : (detail?.name?.trim() ?? "");
  }, [detail]);

  const mapEmbedSrc =
    mapQuery.length > 0 ? googleMapsEmbedSrc(`${mapQuery}, Italia`, googleMapsEmbedApiKey) : null;

  const addressLineFull = useMemo(() => {
    const a = detail?.addressLine?.trim();
    const c = formatSalonCityForDisplay(detail?.city) ?? detail?.city?.trim();
    if (a && c) return `${a} - ${c}`;
    return a || c || null;
  }, [detail]);

  return (
    <main className="luxury-page-main luxury-salon-explore luxury-salon-explore--studio luxury-salon-explore--concept">
      <a href="#il-salone" className="luxury-salon-explore__skip">
        Vai al contenuto
      </a>
      <div className="luxury-salon-explore__topbar">
        <Link
          to={s ? `/s/${encodeURIComponent(s)}` : "/search"}
          className="luxury-link-back luxury-link-back--salon-return"
        >
          <span className="luxury-link-back__chevron" aria-hidden="true">
            ←
          </span>
          <span className="luxury-link-back__text">Torna alla scheda salone</span>
        </Link>
      </div>

      {detailQ.isLoading && <p className="luxury-text-muted">Caricamento…</p>}
      {detailQ.error && (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {detailQ.error instanceof Error ? detailQ.error.message : "Sede non trovata"}
        </p>
      )}

      {detail && (
        <>
          <div className="luxury-salon-explore__toolbar">
            <p className="luxury-salon-explore__menu-label">Menu principale</p>
            <div className="luxury-salon-explore__nav-wrap luxury-salon-explore__nav-wrap--concept">
              <nav className="luxury-salon-explore__section-nav" aria-label="Sezioni pagina">
                {EXPLORE_NAV.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`luxury-salon-explore__nav-link${id === "prenota" ? " luxury-salon-explore__nav-link--prenota" : ""}${activeSection === id ? " is-active" : ""}`}
                    aria-current={activeSection === id ? "true" : undefined}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          <div className="luxury-salon-explore__layout">
            <section
              id="il-salone"
              className={`luxury-salon-explore__salone-chapter${activeSection === "il-salone" ? " is-active" : ""}`}
              aria-labelledby="explore-heading-il-salone"
            >
              <div className="luxury-salon-explore__screen luxury-salon-explore__screen--hero">
                {heroImageSrc ? (
                  <img
                    className="luxury-salon-explore__hero-img"
                    src={heroImageSrc}
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="luxury-salon-explore__hero-fallback" aria-hidden />
                )}
              </div>

              <div className="luxury-salon-explore__screen luxury-salon-explore__screen--split">
                <div className="luxury-salon-explore__split-text">
                  <h2 id="explore-heading-il-salone" className="luxury-salon-explore__split-heading">
                    Benvenuto in {detail.name}
                  </h2>
                  <span className="luxury-salon-explore__split-rule" aria-hidden />
                  {personal.heroSubtitle?.trim() ? (
                    <p className="luxury-salon-explore__split-lead">{personal.heroSubtitle.trim()}</p>
                  ) : null}
                  {personal.ownerIntro?.trim() ? (
                    <p className="luxury-salon-explore__split-body">{parseInlineBold(personal.ownerIntro.trim())}</p>
                  ) : null}
                  <p className="luxury-salon-explore__split-body">
                    {parseInlineBold(
                      personal.about?.trim() ||
                        detail.welcomeMessage?.trim() ||
                        "Descrizione del salone in aggiornamento.",
                    )}
                  </p>
                  <p className="luxury-salon-explore__split-body luxury-salon-explore__split-body--soft">
                    {parseInlineBold(
                      personal.strengths?.trim() ||
                        "Tecniche personalizzate, consulenza professionale e attenzione ai dettagli per valorizzare il tuo stile.",
                    )}
                  </p>
                </div>
                <div className="luxury-salon-explore__split-visual">
                  {splitImageSrc ? (
                    <figure className="luxury-salon-explore__split-figure">
                      {splitImageCaption ? (
                        <figcaption className="luxury-salon-explore__split-tag">{splitImageCaption}</figcaption>
                      ) : null}
                      <img src={splitImageSrc} alt="" loading="lazy" decoding="async" />
                    </figure>
                  ) : (
                    <div className="luxury-salon-explore__split-placeholder">
                      <span>Aggiungi immagini dalla vetrina “Crea il tuo sito”</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              id="gallery"
              className={`luxury-salon-explore__panel${activeSection === "gallery" ? " is-active" : ""}`}
              aria-labelledby="explore-heading-gallery"
            >
              <h2 id="explore-heading-gallery" className="luxury-salon-explore__section-title">
                Gallery
              </h2>
              {galleryExtraItems.length === 0 ? (
                <p className="luxury-salon-explore__empty">
                  {galleryItems.length === 0
                    ? "Nessuna immagine in gallery. Carica le foto dalla pagina “Crea il tuo sito”."
                    : galleryItems.length <= 2
                      ? "Aggiungi altre foto in gallery dalla pagina “Crea il tuo sito” per completare la vetrina."
                      : "Nessuna immagine aggiuntiva."}
                </p>
              ) : (
                <div className="luxury-salon-explore__gallery">
                  {galleryExtraItems.map((item) => (
                    <figure key={item.src}>
                      <img src={item.src} alt="" loading="lazy" decoding="async" />
                      <figcaption>{item.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>

            <section
              id="servizi"
              className={`luxury-salon-explore__panel${activeSection === "servizi" ? " is-active" : ""}`}
              aria-labelledby="explore-heading-servizi"
            >
              <h2 id="explore-heading-servizi" className="luxury-salon-explore__section-title">
                Listino servizi
              </h2>
              <p className="luxury-salon-explore__label">Prezzi a partire da</p>
              {servicesQ.isLoading && <p className="luxury-text-muted">Carico servizi…</p>}
              {!servicesQ.isLoading && !servicesQ.error && isServicePhotoLoading ? (
                <p className="luxury-text-muted" role="status" aria-live="polite">
                  {servicePhotoSlowLoading ? "Sto ottimizzando le immagini…" : "Foto servizi in caricamento…"}
                </p>
              ) : null}
              {!servicesQ.isLoading && !servicesQ.error && !isServicePhotoLoading && !hasAnyServicePhoto && services.length > 0 ? (
                <p className="luxury-text-muted" role="status" aria-live="polite">
                  Nessuna foto servizio disponibile: puoi comunque vedere listino e prezzi.
                </p>
              ) : null}
              {servicesQ.error && (
                <p className="luxury-alert luxury-alert--error" role="alert">
                  {servicesQ.error instanceof Error ? servicesQ.error.message : "Servizi non disponibili"}
                </p>
              )}
              {!servicesQ.isLoading && !servicesQ.error && services.length === 0 ? (
                <p className="luxury-salon-explore__empty">Nessun servizio disponibile.</p>
              ) : null}
              {services.length > 0 ? (
                <>
                  <h3 className="luxury-salon-explore__service-group-title">Servizi</h3>
                  <ul className="luxury-salon-explore__service-list">
                  {services.map((svc) => (
                    <ServiceRow
                      key={svc.id}
                      service={svc}
                      photoSrc={servicePhotoById.get(svc.id) ?? null}
                      photoObjectPosition={servicePhotoPositionById.get(svc.id) ?? "50% 50%"}
                      isPhotoLoading={isServicePhotoLoading}
                    />
                  ))}
                  </ul>
                </>
              ) : null}
            </section>
          </div>

          <div className="luxury-salon-explore__tail">
            <section
              id="recensioni"
              className={`luxury-salon-explore__panel${activeSection === "recensioni" ? " is-active" : ""}`}
              aria-label="Recensioni ricevute"
            >
              <h2 className="luxury-salon-explore__section-title">Recensioni ricevute</h2>
              <SalonPublicReviewsBlock
                isLoading={reviewsQ.isLoading}
                isError={Boolean(reviewsQ.error)}
                reviews={reviewsQ.data}
              />
            </section>

            <section
              id="orari"
              className={`luxury-salon-explore__strip-orari${activeSection === "orari" ? " is-active" : ""}`}
              aria-labelledby="explore-heading-orari"
            >
              <h2 id="explore-heading-orari" className="luxury-salon-explore__strip-orari-text">
                Orari: {personal.openingHours?.trim() || "Martedì - Sabato 08:30 - 19:00"}
              </h2>
            </section>

            <section
              id="prenota"
              className={`luxury-salon-explore__block-prenota${activeSection === "prenota" ? " is-active" : ""}`}
              aria-labelledby="explore-heading-prenota"
            >
              <div className="luxury-salon-explore__block-prenota-inner">
                <h2 id="explore-heading-prenota" className="luxury-salon-explore__block-prenota-title">
                  Prenota ora
                </h2>
                <span className="luxury-salon-explore__title-accent-line" aria-hidden />
                <p className="luxury-salon-explore__block-prenota-text">
                  {personal.bookingNote?.trim() || "Prenota come e quando vuoi con un semplice click."}
                </p>
                <div className="luxury-salon-explore__prenota-cta-row">
                  {isAuthenticated && !canBookAsClient ? (
                    <>
                      <p className="luxury-salon-explore__block-prenota-text">
                        Con il profilo salone non puoi prenotare online: gestisci gli appuntamenti dall&apos;agenda in area
                        account.
                      </p>
                      <Link className="luxury-salon-explore__prenota-main-cta" to="/account/prenotazioni">
                        Vai all&apos;agenda salone
                      </Link>
                    </>
                  ) : (
                    <Link className="luxury-salon-explore__prenota-main-cta" to={`/s/${encodeURIComponent(s)}`}>
                      {personal.bookingCtaLabel?.trim() || "Prenota ora"}
                    </Link>
                  )}
                </div>
              </div>
            </section>

            <section
              id="contatti"
              className={`luxury-salon-explore__block-contatti${activeSection === "contatti" ? " is-active" : ""}`}
              aria-labelledby="explore-heading-contatti"
            >
              <div className="luxury-salon-explore__block-contatti-inner">
                <div className="luxury-salon-explore__contatti-col">
                  <h2 id="explore-heading-contatti" className="luxury-salon-explore__contatti-heading">
                    Contatti
                  </h2>
                  <span className="luxury-salon-explore__title-accent-line luxury-salon-explore__title-accent-line--wide" aria-hidden />
                  <ul className="luxury-salon-explore__contacts-list">
                    {addressLineFull ? (
                      <li>
                        <span className="luxury-salon-explore__contact-icon" aria-hidden />
                        <span>{addressLineFull}</span>
                      </li>
                    ) : null}
                    {detail.contactEmail?.trim() ? (
                      <li>
                        <span className="luxury-salon-explore__contact-icon" aria-hidden />
                        <span>Email: {detail.contactEmail.trim()}</span>
                      </li>
                    ) : null}
                    {telForDisplay ? (
                      <li>
                        <span className="luxury-salon-explore__contact-icon" aria-hidden />
                        <span>Telefono: {telForDisplay}</span>
                      </li>
                    ) : null}
                    {detail.whatsappE164 ? (
                      <li>
                        <span className="luxury-salon-explore__contact-icon" aria-hidden />
                        <span>WhatsApp: {detail.whatsappE164}</span>
                      </li>
                    ) : null}
                    {facebookHref ? (
                      <li>
                        <span className="luxury-salon-explore__contact-icon" aria-hidden />
                        <a href={facebookHref} target="_blank" rel="noreferrer">
                          Seguici su Facebook
                        </a>
                      </li>
                    ) : null}
                    {instagramHref ? (
                      <li>
                        <span className="luxury-salon-explore__contact-icon" aria-hidden />
                        <a href={instagramHref} target="_blank" rel="noreferrer">
                          Seguici su Instagram
                        </a>
                      </li>
                    ) : null}
                    <li>
                      <span className="luxury-salon-explore__contact-icon" aria-hidden />
                      <Link to={`/s/${encodeURIComponent(s)}`} className="luxury-salon-explore__contatti-site-link">
                        {detail.name}
                      </Link>
                    </li>
                  </ul>
                  {personal.contactsNote?.trim() ? (
                    <p className="luxury-salon-explore__contatti-note">{personal.contactsNote.trim()}</p>
                  ) : null}
                  <div className="luxury-salon-explore__contatti-quick">
                    {phoneHref ? (
                      <a href={phoneHref} className="luxury-salon-explore__contatti-chip">
                        Chiama
                      </a>
                    ) : null}
                    {waHref ? (
                      <a href={waHref} target="_blank" rel="noreferrer" className="luxury-salon-explore__contatti-chip">
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="luxury-salon-explore__map-col">
                  {mapEmbedSrc && mapsAllowed ? (
                    <iframe
                      title={`Mappa — ${detail.name}`}
                      className="luxury-salon-explore__map-iframe"
                      src={mapEmbedSrc}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : mapEmbedSrc ? (
                    <div className="luxury-salon-explore__map-fallback">
                      {addressLineFull ? <p>{addressLineFull}</p> : null}
                      <p>
                        Per visualizzare la mappa interattiva attiva le preferenze «Mappe e geocodifica» in{" "}
                        <Link to="/privacy/scelte" className="luxury-link-inline">
                          Scelte privacy
                        </Link>
                        .
                      </p>
                    </div>
                  ) : (
                    <div className="luxury-salon-explore__map-fallback">Indirizzo non disponibile per la mappa.</div>
                  )}
                </div>
              </div>
            </section>

            <footer className="luxury-salon-explore__site-footer">
              <div className="luxury-salon-explore__site-footer-inner">
                <p className="luxury-salon-explore__footer-copy">
                  Copyright © {new Date().getFullYear()} {detail.name}
                </p>
                <p className="luxury-salon-explore__footer-powered">Powered by Saloni Luxury</p>
              </div>
            </footer>
          </div>
        </>
      )}
    </main>
  );
}
