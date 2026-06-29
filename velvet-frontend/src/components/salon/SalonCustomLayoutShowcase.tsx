import { Rnd } from "react-rnd";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PreviewAmbientUiTone } from "../../data/previewAnimatedBackgrounds";
import { getWritingStyle } from "../../data/writingStyleCatalog";
import type {
  ShowcaseCustomTextStyles,
  SalonShowcaseStored,
  ShowcaseCustomLayout,
  ShowcaseCustomLayoutBlockId,
} from "../../lib/salonShowcaseStorage";
import {
  defaultShowcaseCustomLayout,
  defaultShowcaseCustomTextStyles,
  normalizeShowcaseHexColor,
} from "../../lib/salonShowcaseStorage";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import type { SalonShowcaseServiceChip } from "./SalonPublicShowcase";
import "../../styles/luxury-salon-custom-layout.css";

type Props = {
  salonName: string;
  city?: string | null;
  positionLine?: string | null;
  showcase: SalonShowcaseStored;
  services: SalonShowcaseServiceChip[];
  layout: ShowcaseCustomLayout | null | undefined;
  editable?: boolean;
  onLayoutChange?: (next: ShowcaseCustomLayout) => void;
  textStyles?: ShowcaseCustomTextStyles | null;
  cardAmbientClass?: string;
  cardAmbientUiTone?: PreviewAmbientUiTone;
  themeClass?: string;
  selectedServiceId?: string | null;
  onSelectService?: (id: string) => void;
  onBookService?: (id: string) => void;
};

const BLOCK_LABELS: Record<ShowcaseCustomLayoutBlockId, string> = {
  logo: "Logo",
  title: "Titolo",
  description: "Descrizione",
  carousel: "Carousel",
  services: "Servizi",
  position: "Posizione",
};

const BLOCK_ORDER: ShowcaseCustomLayoutBlockId[] = ["logo", "title", "description", "carousel", "services", "position"];

function blockStyle(b: { x: number; y: number; w: number; h: number }): CSSProperties {
  return {
    left: `${b.x}%`,
    top: `${b.y}%`,
    width: `${b.w}%`,
    height: `${b.h}%`,
  };
}

export function SalonCustomLayoutShowcase({
  salonName,
  city,
  positionLine,
  showcase,
  services,
  layout,
  editable = false,
  onLayoutChange,
  textStyles,
  cardAmbientClass,
  cardAmbientUiTone,
  themeClass,
  selectedServiceId,
  onSelectService,
  onBookService,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });
  const [carouselIdx, setCarouselIdx] = useState(0);
  const slides = useMemo(() => showcase.siteImageDataUrls.filter((u): u is string => Boolean(u)), [showcase.siteImageDataUrls]);
  const effectiveLayout = layout ?? defaultShowcaseCustomLayout();
  const ambientClass = cardAmbientClass?.trim() ? ` luxury-salon-showcase--ambient-scene ${cardAmbientClass.trim()}` : "";
  const rootClass = `luxury-salon-showcase luxury-salon-showcase--custom-layout${themeClass ? ` ${themeClass}` : ""}${ambientClass}`;

  const onMutateBlock = (
    id: ShowcaseCustomLayoutBlockId,
    next: { x: number; y: number; w: number; h: number; scale?: number },
  ) => {
    if (!editable || !onLayoutChange) return;
    const safeW = Math.max(6, Math.min(96, next.w));
    const safeH = Math.max(6, Math.min(96, next.h));
    // Il blocco deve restare esattamente dove lo lasci, senza "rimbalzi":
    // clamp posizione in base alla dimensione corrente (x <= 100 - w, y <= 100 - h).
    const maxX = Math.max(0, 100 - safeW);
    const maxY = Math.max(0, 100 - safeH);
    const safeX = Math.max(0, Math.min(maxX, next.x));
    const safeY = Math.max(0, Math.min(maxY, next.y));
    onLayoutChange({
      ...effectiveLayout,
      blocks: {
        ...effectiveLayout.blocks,
        [id]: {
          x: safeX,
          y: safeY,
          w: safeW,
          h: safeH,
          scale: Math.max(0.5, Math.min(2.5, next.scale ?? effectiveLayout.blocks[id].scale ?? 1)),
        },
      },
    });
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setCanvasSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setCarouselIdx(0);
  }, [slides.length, showcase.siteImageDataUrls]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setCarouselIdx((i) => (i + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(t);
  }, [slides.length]);

  const selected = services.find((s) => s.id === selectedServiceId) ?? null;
  const siteDesc = showcase.siteShowcaseDescription?.trim() ?? "";
  const cityFmt = formatSalonCityForDisplay(city) ?? city?.trim() ?? "";
  const positionText = positionLine?.trim() || cityFmt || "Posizione salone";
  const typography = textStyles ?? defaultShowcaseCustomTextStyles();
  const titlePreset = getWritingStyle(typography.titleStyleId);
  const bodyPreset = getWritingStyle(typography.bodyStyleId);
  const buttonPreset = getWritingStyle(typography.buttonStyleId);
  const titleColor = normalizeShowcaseHexColor(typography.titleColorHex);
  const bodyColor = normalizeShowcaseHexColor(typography.bodyColorHex);
  const buttonTextColor = normalizeShowcaseHexColor(typography.buttonTextColorHex);
  const buttonBgColor = normalizeShowcaseHexColor(typography.buttonBgColorHex);

  const renderBlockNode = (id: ShowcaseCustomLayoutBlockId) => {
    const b = effectiveLayout.blocks[id];
    const titleStyle: CSSProperties = {
      fontFamily: titlePreset.fontFamily,
      letterSpacing: titlePreset.letterSpacing,
      textTransform: titlePreset.textTransform,
      fontStyle: titlePreset.fontStyle,
      fontWeight: titlePreset.fontWeight,
      color: titleColor ?? undefined,
    };
    const bodyStyle: CSSProperties = {
      fontFamily: bodyPreset.fontFamily,
      letterSpacing: bodyPreset.letterSpacing,
      textTransform: bodyPreset.textTransform,
      fontStyle: bodyPreset.fontStyle,
      fontWeight: bodyPreset.fontWeight,
      color: bodyColor ?? undefined,
    };
    const buttonStyle: CSSProperties = {
      fontFamily: buttonPreset.fontFamily,
      letterSpacing: buttonPreset.letterSpacing,
      textTransform: buttonPreset.textTransform,
      fontStyle: buttonPreset.fontStyle,
      fontWeight: buttonPreset.fontWeight,
      color: buttonTextColor ?? undefined,
      backgroundColor: buttonBgColor ?? undefined,
      borderColor: buttonBgColor ?? undefined,
    };

    if (id === "logo") {
      return (
        <div className="luxury-custom-layout-block__inner luxury-custom-layout-block__inner--logo">
          {showcase.logoDataUrl ? <img src={showcase.logoDataUrl} alt="" /> : <span>Logo</span>}
        </div>
      );
    }
    if (id === "title") {
      return (
        <div className="luxury-custom-layout-block__inner luxury-custom-layout-block__inner--title" style={titleStyle}>
          <h2>{salonName}</h2>
          {cityFmt ? <p>{cityFmt}</p> : null}
        </div>
      );
    }
    if (id === "description") {
      return (
        <div className="luxury-custom-layout-block__inner luxury-custom-layout-block__inner--description" style={bodyStyle}>
          {siteDesc || "Aggiungi una descrizione dal pannello Brand"}
        </div>
      );
    }
    if (id === "carousel") {
      return (
        <div className="luxury-custom-layout-block__inner luxury-custom-layout-block__inner--carousel">
          {slides.length > 0 ? (
            <>
              <img src={slides[Math.min(carouselIdx, slides.length - 1)]} alt="" />
              {slides.length > 1 ? (
                <div className="luxury-custom-layout-carousel-nav">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCarouselIdx((i) => (i - 1 + slides.length) % slides.length);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCarouselIdx((i) => (i + 1) % slides.length);
                    }}
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="luxury-custom-layout-carousel-empty" style={bodyStyle}>
              Carica immagini sito
            </div>
          )}
        </div>
      );
    }
    if (id === "position") {
      return (
        <div className="luxury-custom-layout-block__inner luxury-custom-layout-block__inner--position" style={bodyStyle}>
          <strong style={titleStyle}>Posizione</strong>
          <p>{positionText}</p>
        </div>
      );
    }

    const areaFactor = Math.max(0.85, Math.min(1.9, (b.w * b.h) / (64 * 20)));
    const serviceVars: CSSProperties = {
      ["--vcls-pill-fs" as string]: `${0.74 * areaFactor}rem`,
      ["--vcls-pill-py" as string]: `${0.25 * areaFactor}rem`,
      ["--vcls-pill-px" as string]: `${0.55 * areaFactor}rem`,
      ["--vcls-detail-fs" as string]: `${0.78 * areaFactor}rem`,
      color: bodyColor ?? undefined,
    };
    return (
      <div className="luxury-custom-layout-block__inner luxury-custom-layout-block__inner--services" style={serviceVars}>
        <div className="luxury-custom-layout-services-list">
          {(services.length > 0 ? services : []).slice(0, 8).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`luxury-custom-layout-service-pill${selectedServiceId === s.id ? " luxury-custom-layout-service-pill--active" : ""}`}
              onClick={() => {
                onSelectService?.(s.id);
              }}
              style={buttonStyle}
            >
              {s.name}
            </button>
          ))}
        </div>
        {selected ? (
          <div className="luxury-custom-layout-service-detail" style={bodyStyle}>
            <strong style={titleStyle}>{selected.name}</strong>
            {selected.description?.trim() ? <p>{selected.description.trim()}</p> : null}
            {onBookService ? (
              <button type="button" className="luxury-btn luxury-btn--primary" style={buttonStyle} onClick={() => onBookService(selected.id)}>
                Prenota
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className={rootClass} data-ambient-ui={cardAmbientUiTone}>
      <div className="luxury-custom-layout-canvas" ref={canvasRef}>
        {BLOCK_ORDER.map((id) => {
          const b = effectiveLayout.blocks[id];
          const innerScaleStyle: CSSProperties = {
            transform: `scale(${b.scale ?? 1})`,
            transformOrigin: "top left",
            width: `${100 / (b.scale ?? 1)}%`,
            height: `${100 / (b.scale ?? 1)}%`,
          };
          const nodeInner = (
            <div className="luxury-custom-layout-block__content">
              {editable ? (
                <div className="luxury-custom-layout-block__badge-wrap">
                  <span className="luxury-custom-layout-block__badge">{BLOCK_LABELS[id]}</span>
                  <div className="luxury-custom-layout-block__zoom">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMutateBlock(id, { ...b, scale: (b.scale ?? 1) - 0.1 });
                      }}
                    >
                      −
                    </button>
                    <span>{Math.round((b.scale ?? 1) * 100)}%</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMutateBlock(id, { ...b, scale: (b.scale ?? 1) + 0.1 });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={innerScaleStyle}>{renderBlockNode(id)}</div>
            </div>
          );
          if (!editable) {
            return (
              <div key={id}>
                <div className="luxury-custom-layout-block" style={blockStyle(b)} data-block-id={id}>
                  {nodeInner}
                </div>
              </div>
            );
          }
          const pxX = (b.x / 100) * canvasSize.w;
          const pxY = (b.y / 100) * canvasSize.h;
          const pxW = (b.w / 100) * canvasSize.w;
          const pxH = (b.h / 100) * canvasSize.h;
          return (
            <Rnd
              key={id}
              bounds="parent"
              position={{ x: pxX, y: pxY }}
              size={{ width: pxW, height: pxH }}
              dragGrid={[1, 1]}
              resizeGrid={[1, 1]}
              className="luxury-custom-layout-rnd"
              resizeHandleClasses={{
                top: "luxury-custom-layout-handle luxury-custom-layout-handle--top",
                right: "luxury-custom-layout-handle luxury-custom-layout-handle--right",
                bottom: "luxury-custom-layout-handle luxury-custom-layout-handle--bottom",
                left: "luxury-custom-layout-handle luxury-custom-layout-handle--left",
                topRight: "luxury-custom-layout-handle luxury-custom-layout-handle--top-right",
                bottomRight: "luxury-custom-layout-handle luxury-custom-layout-handle--bottom-right",
                bottomLeft: "luxury-custom-layout-handle luxury-custom-layout-handle--bottom-left",
                topLeft: "luxury-custom-layout-handle luxury-custom-layout-handle--top-left",
              }}
              onDragStop={(_, d) =>
                onMutateBlock(id, {
                  ...b,
                  x: Number((((d.x / canvasSize.w) * 100).toFixed(3))),
                  y: Number((((d.y / canvasSize.h) * 100).toFixed(3))),
                })
              }
              onResizeStop={(_, __, ref, ___, pos) =>
                onMutateBlock(id, {
                  x: Number((((pos.x / canvasSize.w) * 100).toFixed(3))),
                  y: Number((((pos.y / canvasSize.h) * 100).toFixed(3))),
                  w: Number((((Number.parseFloat(ref.style.width) / canvasSize.w) * 100).toFixed(3))),
                  h: Number((((Number.parseFloat(ref.style.height) / canvasSize.h) * 100).toFixed(3))),
                })
              }
              style={{ position: "absolute" }}
              enableResizing={editable}
            >
              <div className="luxury-custom-layout-block luxury-custom-layout-block--editable">{nodeInner}</div>
            </Rnd>
          );
        })}
      </div>
    </section>
  );
}

