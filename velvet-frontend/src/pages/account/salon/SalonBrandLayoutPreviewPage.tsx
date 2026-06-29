import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../../api/client";
import type { ServicePublic } from "../../../api/types";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { SalonBrandAmbientSidebar } from "../../../components/salon/SalonBrandAmbientSidebar";
import { SalonCustomLayoutShowcase } from "../../../components/salon/SalonCustomLayoutShowcase";
import { WRITING_STYLE_CATALOG } from "../../../data/writingStyleCatalog";
import {
  PREVIEW_AMBIENT_UI_TONE,
  PREVIEW_ANIMATED_BG_COUNT,
  readStoredPreviewAnimatedBgIndex,
  writeStoredPreviewAnimatedBgIndex,
} from "../../../data/previewAnimatedBackgrounds";
import { readStoredStandardLayoutTemplateId, type StandardLayoutTemplateId } from "../../../data/standardLayoutCatalog";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { showcaseLayoutThemeClass } from "../../../lib/showcaseLayoutThemeClass";
import { invalidateSalonShowcaseHitVisualQueries } from "../../../lib/salonShowcaseHitVisualQuery";
import {
  defaultShowcaseCustomLayout,
  defaultShowcaseCustomTextStyles,
  emptySalonShowcase,
  readSalonShowcaseAsync,
  salonShowcaseHasContent,
  writeSalonShowcaseAsync,
  type SalonShowcaseStored,
  type ShowcaseCustomLayout,
  type ShowcaseCustomTextStyles,
} from "../../../lib/salonShowcaseStorage";
import "../../../styles/luxury-salon-showcase.css";
import "../../../styles/luxury-brand-layout-preview.css";
import "../../../styles/luxury-brand-layout-preview-scenes.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

/**
 * Anteprima layout creator a **pagina intera**: canvas centrale + sfondi scena a sinistra.
 */
export default function SalonBrandLayoutPreviewPage() {
  const qc = useQueryClient();
  const { accessToken, isSalonTitolare } = useVelvetAuth();
  const meSalon = useMeSalonSummaryQuery();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";

  const [state, setState] = useState<SalonShowcaseStored>(() => emptySalonShowcase());
  const [previewTemplateId] = useState<StandardLayoutTemplateId>(() => readStoredStandardLayoutTemplateId() ?? "brand-hero");
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [animatedBgIndex, setAnimatedBgIndex] = useState(() => readStoredPreviewAnimatedBgIndex() ?? 0);
  const [customLayout, setCustomLayout] = useState<ShowcaseCustomLayout>(() => defaultShowcaseCustomLayout());
  const [customTextStyles, setCustomTextStyles] = useState<ShowcaseCustomTextStyles>(() => defaultShowcaseCustomTextStyles());

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    void readSalonShowcaseAsync(slug, accessToken).then((data) => {
      if (!alive) return;
      const d = data ?? emptySalonShowcase();
      setState(d);
      // Il layout pubblico è fisso lato sito: manteniamo solo un preset di anteprima locale.
      if (typeof d.publicAmbientBgIndex === "number" && d.publicAmbientBgIndex >= 0) {
        const persisted = Math.min(PREVIEW_ANIMATED_BG_COUNT - 1, d.publicAmbientBgIndex);
        setAnimatedBgIndex(persisted);
        writeStoredPreviewAnimatedBgIndex(persisted);
      }
      setCustomLayout(d.publicCustomLayout ?? defaultShowcaseCustomLayout());
      setCustomTextStyles(d.publicCustomTextStyles ?? defaultShowcaseCustomTextStyles());
    });
    return () => {
      alive = false;
    };
  }, [slug, accessToken]);

  const servicesQ = useQuery({
    queryKey: ["me", "salon", "services"],
    queryFn: () => apiJson<ServicePublic[]>("/api/v1/me/salon/services", { accessToken }),
    enabled: Boolean(accessToken) && isSalonTitolare,
  });

  const previewName = meSalon.data?.primaryLocationName?.trim() || "Il tuo sito";
  const hasPreview = Boolean(slug && salonShowcaseHasContent(state));
  const previewThemeClass = showcaseLayoutThemeClass(previewTemplateId);

  const onPickAnimatedBg = useCallback((index: number) => {
    const next = Math.max(0, Math.min(PREVIEW_ANIMATED_BG_COUNT - 1, index));
    writeStoredPreviewAnimatedBgIndex(next);
    setAnimatedBgIndex(next);
  }, []);

  const onSaveVetrina = useCallback(async () => {
    if (!slug) return;
    setSaveFeedback(null);
    const next: SalonShowcaseStored = {
      ...state,
      publicCustomLayout: customLayout,
      publicCustomTextStyles: customTextStyles,
      publicAmbientBgIndex: animatedBgIndex,
    };
    const res = await writeSalonShowcaseAsync(slug, next, accessToken);
    if (!res.ok) {
      setSaveFeedback({ kind: "error", text: res.error });
      return;
    }
    setState(next);
    invalidateSalonShowcaseHitVisualQueries(qc, slug);
    setSaveFeedback({
      kind: "success",
      text: "Vetrina salvata e pubblicata: layout, colori, font e scena selezionata, visibili su ogni dispositivo.",
    });
  }, [slug, state, customLayout, customTextStyles, animatedBgIndex, qc, accessToken]);

  return (
    <SalonStandardSectionGuard>
      <div className="luxury-brand-layout-preview--fullscreen" aria-label="Anteprima layout vetrina">
        <div className="luxury-brand-layout-preview__topbar">
          <Link to="/account/salone/brand" className="luxury-link-back" style={{ margin: 0 }}>
            ← Brand e vetrina
          </Link>
          <div className="luxury-brand-layout-preview__topbar-right">
            <h1 className="luxury-brand-layout-preview__topbar-title">
              <span className="luxury-brand-layout-preview__topbar-title-pre">Anteprima layout · </span>
              <span className="luxury-brand-layout-preview__topbar-title-accent">vetrina pubblica</span>
            </h1>
            {slug ? (
              <div className="luxury-brand-layout-preview__save-row">
                <button type="button" className="luxury-btn luxury-btn--primary" onClick={() => void onSaveVetrina()}>
                  Salva vetrina
                </button>
                <span className="luxury-brand-layout-preview__save-note luxury-text-muted">
                  Salva layout, tipografia e scena in questo browser dopo aver modificato il creator.
                </span>
              </div>
            ) : null}
          </div>
        </div>
        {saveFeedback ? (
          <p
            className={`luxury-alert ${saveFeedback.kind === "success" ? "luxury-alert--success" : "luxury-alert--error"}`}
            role={saveFeedback.kind === "error" ? "alert" : "status"}
            style={{ marginTop: "0.5rem", marginBottom: 0 }}
          >
            {saveFeedback.text}
          </p>
        ) : null}

        {!slug ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            Slug sede non disponibile: torna a Brand dopo il provisioning del salone.
          </p>
        ) : (
          <div className="luxury-brand-layout-preview__grid luxury-brand-layout-preview__grid--tri">
            <div className="luxury-brand-layout-preview__ambient-column">
              <SalonBrandAmbientSidebar selectedIndex={animatedBgIndex} onSelect={onPickAnimatedBg} />
            </div>
            <div className="luxury-brand-layout-preview__main">
              <SalonCustomLayoutShowcase
                salonName={previewName}
                city={meSalon.data?.primaryLocationCity ?? null}
                positionLine={meSalon.data?.primaryLocationAddressLine ?? meSalon.data?.primaryLocationCity ?? null}
                showcase={state}
                services={(servicesQ.data ?? []).map((x) => ({
                  id: x.id,
                  name: x.name,
                  description: x.description ?? null,
                  priceCents: x.priceCents,
                  durationMinutes: x.durationMinutes,
                  photoDataUrl: state.servicePhotoDataUrls[x.id] ?? null,
                  photoObjectPosition: state.servicePhotoObjectPositions[x.id] ?? "50% 50%",
                }))}
                themeClass={previewThemeClass}
                cardAmbientClass={`luxury-brand-preview-bg--${animatedBgIndex}`}
                cardAmbientUiTone={PREVIEW_AMBIENT_UI_TONE[Math.min(animatedBgIndex, PREVIEW_AMBIENT_UI_TONE.length - 1)]}
                layout={customLayout}
                editable
                onLayoutChange={setCustomLayout}
                textStyles={customTextStyles}
              />
              {!hasPreview ? (
                <p className="luxury-brand-layout-preview__hint">
                  Suggerimento: da Brand carica logo o immagini sito per vedere il carousel; qui provi subito posizionamento,
                  dimensioni, colori e tipografia del tuo layout personalizzato.
                </p>
              ) : null}
              <p className="luxury-text-muted" style={{ margin: "0.75rem 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Scheda pubblica di esempio:{" "}
                <Link to={`/s/${encodeURIComponent(slug)}`} className="luxury-link-inline">
                  /s/{slug}
                </Link>
              </p>
            </div>
            <aside className="luxury-brand-layout-preview__sidebar">
              <div className="luxury-surface-card luxury-surface-card--plan-standard" style={{ marginBottom: "0.75rem" }}>
                <p className="luxury-text-muted" style={{ margin: "0 0 0.45rem", fontSize: "0.78rem" }}>
                  Creator layout
                </p>
                <button
                  type="button"
                  className="luxury-btn luxury-btn--secondary"
                  onClick={() => {
                    setCustomLayout(defaultShowcaseCustomLayout());
                    setCustomTextStyles(defaultShowcaseCustomTextStyles());
                  }}
                >
                  Reset blocchi + stili
                </button>
                <div style={{ marginTop: "0.65rem", display: "grid", gap: "0.5rem" }}>
                  <label className="luxury-form-label" style={{ margin: 0 }}>
                    Font titolo
                    <select
                      className="luxury-soft-field"
                      value={customTextStyles.titleStyleId}
                      onChange={(e) =>
                        setCustomTextStyles((p) => ({ ...p, titleStyleId: e.target.value as ShowcaseCustomTextStyles["titleStyleId"] }))
                      }
                    >
                      {WRITING_STYLE_CATALOG.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="luxury-form-label" style={{ margin: 0 }}>
                    Font testo
                    <select
                      className="luxury-soft-field"
                      value={customTextStyles.bodyStyleId}
                      onChange={(e) =>
                        setCustomTextStyles((p) => ({ ...p, bodyStyleId: e.target.value as ShowcaseCustomTextStyles["bodyStyleId"] }))
                      }
                    >
                      {WRITING_STYLE_CATALOG.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="luxury-form-label" style={{ margin: 0 }}>
                    Font pulsanti servizi
                    <select
                      className="luxury-soft-field"
                      value={customTextStyles.buttonStyleId}
                      onChange={(e) =>
                        setCustomTextStyles((p) => ({ ...p, buttonStyleId: e.target.value as ShowcaseCustomTextStyles["buttonStyleId"] }))
                      }
                    >
                      {WRITING_STYLE_CATALOG.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="luxury-form-label" style={{ margin: 0 }}>
                    Colore titolo
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <input
                        type="color"
                        value={customTextStyles.titleColorHex ?? "#f8fafc"}
                        onChange={(e) => setCustomTextStyles((p) => ({ ...p, titleColorHex: e.target.value }))}
                        style={{ width: "2.2rem", height: "2rem", padding: 0, border: "none", background: "transparent" }}
                      />
                      <button
                        type="button"
                        className="luxury-btn luxury-btn--secondary"
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}
                        onClick={() => setCustomTextStyles((p) => ({ ...p, titleColorHex: null }))}
                      >
                        Default
                      </button>
                    </div>
                  </div>
                  <div className="luxury-form-label" style={{ margin: 0 }}>
                    Colore testo
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <input
                        type="color"
                        value={customTextStyles.bodyColorHex ?? "#e2e8f0"}
                        onChange={(e) => setCustomTextStyles((p) => ({ ...p, bodyColorHex: e.target.value }))}
                        style={{ width: "2.2rem", height: "2rem", padding: 0, border: "none", background: "transparent" }}
                      />
                      <button
                        type="button"
                        className="luxury-btn luxury-btn--secondary"
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}
                        onClick={() => setCustomTextStyles((p) => ({ ...p, bodyColorHex: null }))}
                      >
                        Default
                      </button>
                    </div>
                  </div>
                  <div className="luxury-form-label" style={{ margin: 0 }}>
                    Colore testo pulsanti
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <input
                        type="color"
                        value={customTextStyles.buttonTextColorHex ?? "#fffbeb"}
                        onChange={(e) => setCustomTextStyles((p) => ({ ...p, buttonTextColorHex: e.target.value }))}
                        style={{ width: "2.2rem", height: "2rem", padding: 0, border: "none", background: "transparent" }}
                      />
                      <button
                        type="button"
                        className="luxury-btn luxury-btn--secondary"
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}
                        onClick={() => setCustomTextStyles((p) => ({ ...p, buttonTextColorHex: null }))}
                      >
                        Default
                      </button>
                    </div>
                  </div>
                  <div className="luxury-form-label" style={{ margin: 0 }}>
                    Sfondo pulsanti
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <input
                        type="color"
                        value={customTextStyles.buttonBgColorHex ?? "#f97316"}
                        onChange={(e) => setCustomTextStyles((p) => ({ ...p, buttonBgColorHex: e.target.value }))}
                        style={{ width: "2.2rem", height: "2rem", padding: 0, border: "none", background: "transparent" }}
                      />
                      <button
                        type="button"
                        className="luxury-btn luxury-btn--secondary"
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}
                        onClick={() => setCustomTextStyles((p) => ({ ...p, buttonBgColorHex: null }))}
                      >
                        Default
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="luxury-btn luxury-btn--primary"
                  style={{ marginTop: "0.85rem", width: "100%" }}
                  onClick={() => void onSaveVetrina()}
                >
                  Salva vetrina
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </SalonStandardSectionGuard>
  );
}
