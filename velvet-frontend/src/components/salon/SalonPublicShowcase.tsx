import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";
import type { PreviewAmbientUiTone } from "../../data/previewAnimatedBackgrounds";
import { vetPaletteHueFromTemplateId, vetPaletteSkinIndexFromTemplateId } from "../../data/standardLayoutCatalog";
import { isVelvetNativeAppShell } from "../../hooks/useVelvetNativeAppShell";
import { formatPriceEUR } from "../../lib/format";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import { normalizeShowcaseHexColor, type SalonShowcaseStored } from "../../lib/salonShowcaseStorage";
import { salonShowcaseHasContent } from "../../lib/salonShowcaseStorage";
import "../../styles/app-header.css";
import "../../styles/velvet-salon-showcase.css";

export type SalonShowcaseServiceChip = {
  id: string;
  name: string;
  description?: string | null;
  priceCents?: number;
  durationMinutes?: number;
  /** Da `showcase.servicePhotoDataUrls[id]` (localStorage brand). */
  photoDataUrl?: string | null;
  /** Posizionamento foto (object-position), es. `50% 50%`. */
  photoObjectPosition?: string | null;
};

const DEMO_SERVICES: SalonShowcaseServiceChip[] = [
  { id: "_demo1", name: "Taglio", description: "Taglio e piega con consulenza su forma del viso e routine a casa." },
  { id: "_demo2", name: "Colore", description: "Colore completo o ritocco radici, tonalità personalizzate." },
  { id: "_demo3", name: "Piega", description: "Piega express o cerimonia, finish luminoso e duraturo." },
];

export type SalonShowcaseServiceListVariant = "chips" | "cards";

type Props = {
  salonName: string;
  city: string | null | undefined;
  showcase: SalonShowcaseStored;
  services?: SalonShowcaseServiceChip[];
  selectedServiceId?: string | null;
  onSelectService?: (id: string) => void;
  /** Pagina pubblica: logo + titolo sopra, carousel largo sotto, card servizi con Prenota. */
  detachedPublicLayout?: boolean;
  /** Con `detachedPublicLayout`: card vetrina a tutta larghezza e altezza tra header e footer del sito. */
  siteFullscreenBleed?: boolean;
  serviceListVariant?: SalonShowcaseServiceListVariant;
  /** Es. selezione servizio + scroll alla prenotazione (pagina /s/…). */
  onBookService?: (serviceId: string) => void;
  embedHeading?: boolean;
  themeClass?: string;
  allowEmptyPreview?: boolean;
  /** Solo anteprima layout: classe scene (es. `velvet-brand-preview-bg--0`) sul `<section>` = sfondo di tutta la card vetrina. */
  cardAmbientClass?: string;
  /** Abbinato allo sfondo: testi/controlli chiari o scuri per leggibilità. */
  cardAmbientUiTone?: PreviewAmbientUiTone;
};

function sectionClass(themeClass?: string): string {
  const t = themeClass?.trim();
  return t ? `velvet-salon-showcase ${t}` : "velvet-salon-showcase";
}

function sectionRootClass(themeClass: string | undefined, cardAmbient: string | undefined): string {
  const base = sectionClass(themeClass);
  const amb = cardAmbient?.trim();
  if (!amb) return base;
  return `${base} velvet-salon-showcase--ambient-scene ${amb}`.trim();
}

function trimServiceLabel(name: string, max = 22): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Testo in vetrina quando il titolare non ha ancora salvato il messaggio libero. */
const SALON_SITE_DESC_PLACEHOLDER =
  "Scrivi qui il messaggio per i tuoi clienti: professionalità, servizi e ciò che rende unico il tuo salone. Puoi aggiornarlo dal pannello Brand.";

function SalonSiteDescription({
  text,
  detached = false,
  isPlaceholder = false,
}: {
  text: string;
  detached?: boolean;
  isPlaceholder?: boolean;
}) {
  const wrapClass = [
    "velvet-salon-showcase__site-desc-wrap",
    detached ? "velvet-salon-showcase__site-desc-wrap--detached" : "",
    isPlaceholder ? "velvet-salon-showcase__site-desc-wrap--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const descClass = [
    "velvet-salon-showcase__site-desc",
    detached ? "velvet-salon-showcase__site-desc--detached" : "",
    isPlaceholder ? "velvet-salon-showcase__site-desc--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass}>
      <span className="velvet-salon-showcase__site-desc-flourish velvet-salon-showcase__site-desc-flourish--top" aria-hidden="true" />
      <div className="velvet-salon-showcase__site-desc-panel">
        <span className="velvet-salon-showcase__site-desc-quote velvet-salon-showcase__site-desc-quote--open" aria-hidden="true">
          “
        </span>
        <p className={descClass}>{text}</p>
        <span className="velvet-salon-showcase__site-desc-quote velvet-salon-showcase__site-desc-quote--close" aria-hidden="true">
          ”
        </span>
      </div>
      <span className="velvet-salon-showcase__site-desc-flourish velvet-salon-showcase__site-desc-flourish--bottom" aria-hidden="true" />
    </div>
  );
}

export function SalonPublicShowcase({
  salonName,
  city,
  showcase,
  services = [],
  selectedServiceId,
  onSelectService,
  detachedPublicLayout = false,
  siteFullscreenBleed = false,
  serviceListVariant = "chips",
  onBookService,
  embedHeading,
  themeClass,
  allowEmptyPreview,
  cardAmbientClass,
  cardAmbientUiTone,
}: Props) {
  const detailTitleId = useId();
  const servicesStripRegionId = useId();
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [detailServiceId, setDetailServiceId] = useState<string | null>(null);
  /** Scheda pubblica detached: servizi nascosti fino a «I nostri servizi». */
  const [publicServicesStripOpen, setPublicServicesStripOpen] = useState(false);
  const effectiveSelectedId = selectedServiceId ?? internalSelectedId;
  const sectionExtraClass = [
    detachedPublicLayout ? "velvet-salon-showcase--detached-public" : "",
    detachedPublicLayout && siteFullscreenBleed ? "velvet-salon-showcase--site-fullscreen" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const paletteTheme = useMemo(() => {
    const t = themeClass?.trim();
    if (!t) return null;
    const m = /--t-(vet-palette-\d{3})\b/.exec(t);
    if (!m) return null;
    const paletteId = m[1];
    const hue = vetPaletteHueFromTemplateId(paletteId);
    const skin = vetPaletteSkinIndexFromTemplateId(paletteId);
    if (hue === null || skin === null) return null;
    return { hue, skin };
  }, [themeClass]);

  const paletteSectionStyle: CSSProperties | undefined =
    paletteTheme !== null ? { ["--showcase-h" as string]: paletteTheme.hue } : undefined;

  const customShowcaseColors = useMemo((): CSSProperties | undefined => {
    const ambientActive =
      Boolean(cardAmbientClass?.trim()) && (cardAmbientUiTone === "on-light" || cardAmbientUiTone === "on-dark");
    const tone = ambientActive ? cardAmbientUiTone! : "on-dark";
    const svcHex =
      tone === "on-light" ? showcase.showcaseServiceTextHexOnLight : showcase.showcaseServiceTextHexOnDark;
    const descHex = tone === "on-light" ? showcase.showcaseSiteDescHexOnLight : showcase.showcaseSiteDescHexOnDark;
    const svc = normalizeShowcaseHexColor(svcHex);
    const desc = normalizeShowcaseHexColor(descHex);
    if (!svc && !desc) return undefined;
    const o: Record<string, string> = {};
    if (svc) o["--vs-showcase-custom-service-text"] = svc;
    if (desc) o["--vs-showcase-custom-site-desc"] = desc;
    return o as CSSProperties;
  }, [
    showcase.showcaseServiceTextHexOnLight,
    showcase.showcaseServiceTextHexOnDark,
    showcase.showcaseSiteDescHexOnLight,
    showcase.showcaseSiteDescHexOnDark,
    cardAmbientClass,
    cardAmbientUiTone,
  ]);

  const sectionCombinedStyle = useMemo((): CSSProperties | undefined => {
    if (!paletteSectionStyle && !customShowcaseColors) return undefined;
    return { ...paletteSectionStyle, ...customShowcaseColors };
  }, [paletteSectionStyle, customShowcaseColors]);

  const slides = useMemo(
    () => showcase.siteImageDataUrls.filter((u): u is string => Boolean(u)),
    [showcase.siteImageDataUrls],
  );
  const [idx, setIdx] = useState(0);

  const slidesKey = JSON.stringify(showcase.siteImageDataUrls);
  useEffect(() => {
    setIdx(0);
  }, [slidesKey]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(t);
  }, [slides.length]);

  const hasAnyContent = salonShowcaseHasContent(showcase);
  const slide = slides.length > 0 ? slides[Math.min(idx, slides.length - 1)] : null;
  const hasCarousel = slides.length > 0;
  const hasLogo = Boolean(showcase.logoDataUrl);
  const siteDesc = showcase.siteShowcaseDescription?.trim() ?? "";
  const hasSiteDesc = Boolean(siteDesc);
  const showSiteDescBox = hasSiteDesc || detachedPublicLayout;
  const hasVisualMini = hasCarousel || hasLogo || Boolean(embedHeading) || showSiteDescBox;
  const brandInitial = useMemo(() => {
    const t = salonName.trim();
    if (!t) return "?";
    const ch = t.charAt(0);
    return ch.toLocaleUpperCase("it-IT");
  }, [salonName]);

  const cityDisplay = formatSalonCityForDisplay(city);

  const stripServices =
    services.length > 0 ? services : allowEmptyPreview && embedHeading && !hasAnyContent ? DEMO_SERVICES : [];

  const selectedService = useMemo(
    () => stripServices.find((x) => x.id === effectiveSelectedId) ?? null,
    [stripServices, effectiveSelectedId],
  );

  const stripServiceIds = useMemo(() => stripServices.map((x) => x.id).join("\n"), [stripServices]);
  useEffect(() => {
    if (!internalSelectedId) return;
    if (!stripServices.some((x) => x.id === internalSelectedId)) {
      setInternalSelectedId(null);
    }
  }, [stripServiceIds, internalSelectedId, stripServices]);

  const detailService = useMemo(
    () => (detailServiceId ? stripServices.find((s) => s.id === detailServiceId) ?? null : null),
    [stripServices, detailServiceId],
  );

  useEffect(() => {
    if (!detailServiceId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailServiceId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailServiceId]);

  useEffect(() => {
    if (!detailServiceId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailServiceId]);

  const closeServiceDetail = () => setDetailServiceId(null);

  /** In app WebView: prenotazione inline sotto la vetrina, senza modale dettaglio servizio. */
  const bookServiceDirectInNativeApp = (serviceId: string) => {
    if (serviceId.startsWith("_demo")) return false;
    if (!isVelvetNativeAppShell()) return false;
    if (!onBookService && !onSelectService) return false;
    setInternalSelectedId(serviceId);
    closeServiceDetail();
    if (onBookService) {
      onBookService(serviceId);
    } else {
      onSelectService?.(serviceId);
    }
    return true;
  };

  const renderServiceChipsAndDetail = () => {
    if (stripServices.length === 0) return null;
    return (
      <>
        <nav className="velvet-salon-showcase__service-strip" aria-label="Servizi in evidenza">
          {stripServices.map((svc) => {
            const active = effectiveSelectedId === svc.id;
            const label = <span className="velvet-salon-showcase__pill-label">{trimServiceLabel(svc.name)}</span>;
            const demo = svc.id.startsWith("_demo");
            const pillSelectable = onSelectService ? !demo : true;
            if (pillSelectable) {
              return (
                <button
                  key={svc.id}
                  type="button"
                  className={`velvet-header-cta-pill velvet-header-btn-primary velvet-salon-showcase__pill${
                    active ? " active velvet-salon-showcase__pill--active" : ""
                  }`}
                  aria-pressed={active}
                  onClick={() => {
                    const next = active ? null : svc.id;
                    if (next && bookServiceDirectInNativeApp(next)) return;
                    if (onSelectService) {
                      onSelectService(next ?? "");
                    } else {
                      setInternalSelectedId(next);
                    }
                  }}
                >
                  {label}
                </button>
              );
            }
            return (
              <span
                key={svc.id}
                className={`velvet-salon-showcase__pill velvet-salon-showcase__pill--static${active ? " velvet-salon-showcase__pill--active" : ""}`}
              >
                {label}
              </span>
            );
          })}
        </nav>
        {selectedService ? (
          <div
            className="velvet-salon-showcase__service-detail"
            role="region"
            aria-label={`Dettagli: ${selectedService.name}`}
          >
            <p className="velvet-salon-showcase__service-detail-title">{selectedService.name}</p>
            {selectedService.description?.trim() ? (
              <p className="velvet-salon-showcase__service-detail-body">{selectedService.description.trim()}</p>
            ) : null}
          </div>
        ) : null}
      </>
    );
  };

  const renderServiceCards = () => {
    if (stripServices.length === 0) return null;

    const detailDialog =
      detailService &&
      createPortal(
        <div
          className="velvet-salon-showcase__service-detail-backdrop"
          role="presentation"
          onClick={closeServiceDetail}
        >
          <div
            className="velvet-salon-showcase__service-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="velvet-salon-showcase__service-detail-close"
              onClick={closeServiceDetail}
              aria-label="Chiudi"
            >
              ×
            </button>
            {detailService.photoDataUrl?.trim() ? (
              <div className="velvet-salon-showcase__service-detail-photo" aria-hidden="true">
                <img
                  src={detailService.photoDataUrl.trim()}
                  alt=""
                  style={{ objectPosition: detailService.photoObjectPosition?.trim() || "50% 50%" }}
                />
              </div>
            ) : null}
            <h2 id={detailTitleId} className="velvet-salon-showcase__service-detail-dialog-title">
              {detailService.name}
            </h2>
            <p className="velvet-salon-showcase__service-detail-dialog-meta">
              {typeof detailService.priceCents === "number" ? formatPriceEUR(detailService.priceCents) : "—"}
              {typeof detailService.durationMinutes === "number" ? ` · ${detailService.durationMinutes} min` : ""}
            </p>
            {detailService.description?.trim() ? (
              <p className="velvet-salon-showcase__service-detail-dialog-desc">{detailService.description.trim()}</p>
            ) : null}
            <div className="velvet-salon-showcase__service-detail-dialog-actions">
              {!detailService.id.startsWith("_demo") ? (
                <button
                  type="button"
                  className="velvet-btn velvet-btn--primary velvet-salon-showcase__services-toggle velvet-salon-showcase__service-detail-dialog-book"
                  onClick={() => {
                    const id = detailService.id;
                    if (onBookService) {
                      onBookService(id);
                    } else {
                      onSelectService?.(id);
                    }
                    closeServiceDetail();
                  }}
                >
                  Continua
                </button>
              ) : (
                <span className="velvet-text-muted velvet-salon-showcase__service-detail-dialog-demo">
                  Anteprima demo
                </span>
              )}
            </div>
          </div>
        </div>,
        document.body,
      );

    const useServicesToggle = detachedPublicLayout && serviceListVariant === "cards";

    const servicePickStrip = (
      <div
        className={
          "velvet-salon-showcase__service-pick-wrap" +
          (useServicesToggle && !publicServicesStripOpen ? " velvet-salon-showcase__service-pick-wrap--toggle-closed" : "")
        }
        id={useServicesToggle ? servicesStripRegionId : undefined}
        aria-label="Servizi e prenotazione"
        aria-hidden={useServicesToggle && !publicServicesStripOpen ? true : undefined}
      >
        <div className="velvet-salon-showcase__service-pick-strip">
          {stripServices.map((svc) => (
            <button
              key={svc.id}
              type="button"
              className={`velvet-header-cta-pill velvet-header-btn-primary velvet-salon-showcase__service-pick-btn${
                effectiveSelectedId === svc.id ? " active velvet-salon-showcase__service-pick-btn--active" : ""
              }`}
              tabIndex={useServicesToggle && !publicServicesStripOpen ? -1 : undefined}
              onClick={() => {
                if (bookServiceDirectInNativeApp(svc.id)) return;
                setDetailServiceId(svc.id);
                setInternalSelectedId(svc.id);
                if (onSelectService && !svc.id.startsWith("_demo")) {
                  onSelectService(svc.id);
                }
              }}
            >
              {svc.name}
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <>
        {useServicesToggle ? (
          <div className="velvet-salon-showcase__services-toggle-wrap">
            <button
              type="button"
              className="velvet-btn velvet-btn--primary velvet-salon-showcase__services-toggle"
              aria-expanded={publicServicesStripOpen}
              aria-controls={servicesStripRegionId}
              onClick={() => setPublicServicesStripOpen((v) => !v)}
            >
              {publicServicesStripOpen ? "Nascondi servizi" : "prenota i nostri servizi"}
            </button>
          </div>
        ) : null}
        {servicePickStrip}
        {detailDialog}
      </>
    );
  };

  const renderPageShell = (carouselInner: ReactNode, emptyCarouselCopy?: string) => {
    const showCarouselBlock =
      hasLogo || carouselInner != null || Boolean(emptyCarouselCopy && !hasCarousel);

    if (detachedPublicLayout) {
      const showCarouselSection =
        hasCarousel ||
        carouselInner != null ||
        Boolean(emptyCarouselCopy && !hasCarousel) ||
        (!hasCarousel && (hasLogo || Boolean(embedHeading)));
      return (
        <div className="velvet-salon-showcase__page velvet-salon-showcase__page--detached">
          <div className="velvet-salon-showcase__brand-top velvet-salon-showcase__brand-top--detached-centered">
            <div className="velvet-salon-showcase__brand-logo-side">
              <div className="velvet-salon-showcase__logo-frame velvet-salon-showcase__logo-frame--hero velvet-salon-showcase__logo-frame--detached velvet-salon-showcase__logo-frame--public-hero">
                {hasLogo ? (
                  <img src={showcase.logoDataUrl!} alt={`Logo ${salonName}`} />
                ) : (
                  <span className="velvet-salon-showcase__logo-placeholder-letter" aria-hidden="true">
                    {brandInitial}
                  </span>
                )}
              </div>
            </div>
            <div className="velvet-salon-showcase__brand-text">
              <h1 className="velvet-salon-showcase__page-title velvet-salon-showcase__page-title--detached">{salonName}</h1>
              {cityDisplay ? (
                <p className="velvet-salon-showcase__page-sub velvet-salon-showcase__page-sub--detached">{cityDisplay}</p>
              ) : null}
              <SalonSiteDescription
                text={hasSiteDesc ? siteDesc : SALON_SITE_DESC_PLACEHOLDER}
                detached
                isPlaceholder={!hasSiteDesc}
              />
            </div>
          </div>

          {showCarouselSection ? (
            <div className="velvet-salon-showcase__carousel-block velvet-salon-showcase__carousel-block--detached-wide">
              {carouselInner}
              {!hasCarousel && emptyCarouselCopy ? (
                <div className="velvet-salon-showcase__carousel velvet-salon-showcase__carousel--empty velvet-salon-showcase__carousel--in-page velvet-salon-showcase__carousel--wide">
                  {emptyCarouselCopy}
                </div>
              ) : null}
            </div>
          ) : null}

          {serviceListVariant === "cards" ? renderServiceCards() : renderServiceChipsAndDetail()}
        </div>
      );
    }

    return (
    <div className="velvet-salon-showcase__page">
      <header className="velvet-salon-showcase__page-head velvet-salon-showcase__hero-head">
        <h1 className="velvet-salon-showcase__page-title">{salonName}</h1>
        {cityDisplay ? <p className="velvet-salon-showcase__page-sub">{cityDisplay}</p> : null}
        {hasSiteDesc ? <SalonSiteDescription text={siteDesc} /> : null}
      </header>

      {showCarouselBlock ? (
      <div className={`velvet-salon-showcase__carousel-block${hasLogo ? " velvet-salon-showcase__carousel-block--with-logo" : ""}`}>
        {hasLogo ? (
          <div className="velvet-salon-showcase__logo-float" aria-hidden={!embedHeading ? true : undefined}>
            <div className="velvet-salon-showcase__logo-frame velvet-salon-showcase__logo-frame--hero">
              <img src={showcase.logoDataUrl!} alt="" />
            </div>
          </div>
        ) : null}
        {carouselInner}
        {!hasCarousel && emptyCarouselCopy ? (
          <div className="velvet-salon-showcase__carousel velvet-salon-showcase__carousel--empty velvet-salon-showcase__carousel--in-page">
            {emptyCarouselCopy}
          </div>
        ) : null}
      </div>
      ) : null}

      {serviceListVariant === "cards" ? renderServiceCards() : renderServiceChipsAndDetail()}
    </div>
    );
  };

  if (allowEmptyPreview && embedHeading && !hasAnyContent) {
    const emptyAmbientUi: PreviewAmbientUiTone | undefined =
      cardAmbientClass?.trim() && cardAmbientUiTone ? cardAmbientUiTone : undefined;
    return (
      <section
        className={`${sectionRootClass(themeClass, cardAmbientClass)}${sectionExtraClass ? ` ${sectionExtraClass}` : ""}`.trim()}
        style={sectionCombinedStyle}
        data-ambient-ui={emptyAmbientUi}
        aria-label="Anteprima vetrina"
      >
        {renderPageShell(
          null,
          "Carica fino a 5 immagini sito: qui sopra il carousel; sotto nome salone e servizi con il tema scelto.",
        )}
      </section>
    );
  }

  if (!hasAnyContent) return null;
  if (!hasVisualMini) return null;

  const carouselWideClass = detachedPublicLayout ? " velvet-salon-showcase__carousel--wide" : "";

  const carouselNode = hasCarousel ? (
    <div className={`velvet-salon-showcase__carousel velvet-salon-showcase__carousel--in-page${carouselWideClass}`}>
      <div className={`velvet-salon-showcase__carousel-viewport${detachedPublicLayout ? " velvet-salon-showcase__carousel-viewport--wide" : ""}`}>
        {slide ? (
          <img
            src={slide}
            alt=""
            decoding="async"
            {...({ fetchpriority: "high" } as ImgHTMLAttributes<HTMLImageElement>)}
          />
        ) : null}
        {slides.length > 1 ? (
          <div className="velvet-salon-showcase__carousel-nav" aria-hidden="true">
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
              aria-label="Immagine precedente"
            >
              ‹
            </button>
            <button type="button" onClick={() => setIdx((i) => (i + 1) % slides.length)} aria-label="Immagine successiva">
              ›
            </button>
          </div>
        ) : null}
      </div>
      {slides.length > 1 ? (
        <div className="velvet-salon-showcase__carousel-dots" role="tablist" aria-label="Scorri immagini vetrina">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Immagine ${i + 1} di ${slides.length}`}
              aria-current={i === idx}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  ) : hasLogo || embedHeading ? (
    <div
      className={`velvet-salon-showcase__carousel velvet-salon-showcase__carousel--in-page velvet-salon-showcase__carousel--placeholder${carouselWideClass}`}
    />
  ) : null;

  const paletteHueClass = paletteTheme !== null ? " velvet-salon-showcase--palette-hue" : "";
  const ambientUi: PreviewAmbientUiTone | undefined =
    cardAmbientClass?.trim() && cardAmbientUiTone ? cardAmbientUiTone : undefined;

  return (
    <section
      className={`${sectionRootClass(themeClass, cardAmbientClass)}${sectionExtraClass ? ` ${sectionExtraClass}` : ""}${paletteHueClass}`.trim()}
      style={sectionCombinedStyle}
      data-palette-skin={paletteTheme !== null ? String(paletteTheme.skin) : undefined}
      data-ambient-ui={ambientUi}
      aria-label="Vetrina salone"
    >
      {renderPageShell(carouselNode)}
    </section>
  );
}
