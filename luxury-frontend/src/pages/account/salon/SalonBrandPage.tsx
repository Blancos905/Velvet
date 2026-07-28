import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import { readImageFileAsDataUrl, readImageFileAsSiteImageDataUrl } from "../../../lib/readImageDataUrl";
import { invalidateSalonShowcaseHitVisualQueries } from "../../../lib/salonShowcaseHitVisualQuery";
import {
  emptySalonShowcase,
  readSalonShowcaseAsync,
  writeSalonShowcaseAsync,
  type SalonShowcaseStored,
} from "../../../lib/salonShowcaseStorage";
import "../../../styles/luxury-account-page-shell.css";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-account-salon-services.css";
import "../../../styles/luxury-salon-showcase.css";
import "../../../styles/luxury-salon-services-salon.css";
import "../../../styles/luxury-salon-brand-salon.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

export default function SalonBrandPage() {
  const qc = useQueryClient();
  const { accessToken } = useLuxuryAuth();
  const meSalon = useMeSalonSummaryQuery();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";

  const [state, setState] = useState<SalonShowcaseStored>(() => emptySalonShowcase());
  const [persistMsg, setPersistMsg] = useState<string | null>(null);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setPersistMsg(null);
    setSlotMsg(null);
    void readSalonShowcaseAsync(slug, accessToken).then((data) => {
      if (alive) setState(data ?? emptySalonShowcase());
    });
    return () => {
      alive = false;
    };
  }, [slug, accessToken]);

  /** Scrive su localStorage e aggiorna lo stato a partire dall’ultimo snapshot (importante dopo `await` FileReader). */
  const commitShowcase = useCallback(
    (build: (prev: SalonShowcaseStored) => SalonShowcaseStored) => {
      if (!slug) return;
      setState((prev) => {
        const next = build(prev);
        void writeSalonShowcaseAsync(slug, next, accessToken).then((res) => {
          if (!res.ok) {
            setPersistMsg(res.error);
            void readSalonShowcaseAsync(slug).then((restored) => {
              setState(restored ?? emptySalonShowcase());
            });
            return;
          }
          invalidateSalonShowcaseHitVisualQueries(qc, slug);
          setPersistMsg("Vetrina salvata e pubblicata: visibile su tutti i dispositivi e nell'app.");
          setSlotMsg(null);
        });
        return next;
      });
    },
    [slug, qc, accessToken],
  );

  const onLogo = async (file: File | null) => {
    if (!slug) return;
    setSlotMsg(null);
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      commitShowcase((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    } catch (e) {
      setSlotMsg(e instanceof Error ? e.message : "Errore caricamento");
    }
  };

  const onSiteSlot = async (index: 0 | 1 | 2 | 3 | 4, file: File | null) => {
    if (!slug || !file) return;
    setSlotMsg(null);
    try {
      const dataUrl = await readImageFileAsSiteImageDataUrl(file);
      commitShowcase((prev) => {
        const slots = [...prev.siteImageDataUrls] as SalonShowcaseStored["siteImageDataUrls"];
        slots[index] = dataUrl;
        return { ...prev, siteImageDataUrls: slots };
      });
    } catch (e) {
      setSlotMsg(e instanceof Error ? e.message : "Errore caricamento");
    }
  };

  const clearSiteSlot = (index: 0 | 1 | 2 | 3 | 4) => {
    commitShowcase((prev) => {
      const slots = [...prev.siteImageDataUrls] as SalonShowcaseStored["siteImageDataUrls"];
      slots[index] = null;
      return { ...prev, siteImageDataUrls: slots };
    });
  };

  /** Conferma esplicita su IndexedDB (le immagini si salvano anche al caricamento; qui eviti dubbi dopo modifiche). */
  const onSaveVetrinaExplicit = useCallback(async () => {
    if (!slug) return;
    setSlotMsg(null);
    const res = await writeSalonShowcaseAsync(slug, state, accessToken);
    if (!res.ok) {
      setPersistMsg(res.error);
      return;
    }
    invalidateSalonShowcaseHitVisualQueries(qc, slug);
    setPersistMsg("Vetrina salvata e pubblicata: visibile su tutti i dispositivi e nell'app.");
  }, [slug, state, qc, accessToken]);

  const siteLabels = useMemo(
    () => ["Immagine 1", "Immagine 2", "Immagine 3", "Immagine 4", "Immagine 5"] as const,
    [],
  );

  return (
    <SalonStandardSectionGuard>
      <div
        className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-brand-account-shell luxury-salon-brand-account-shell--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
      >
        <div className="luxury-consumer-bookings-dash__shell">
          <ClientAccountHeroHeader
            headlinePre="Brand e "
            headlineAccent="vetrina"
            badgePrimary="Area salone"
            badgeSecondary="Identità visiva"
            kickerLabel="Logo & immagini"
            kickerChip="Scheda pubblica & Esplora"
            subtitle={
              <>
                Logo e immagini per la scheda pubblica del salone e per la pagina{" "}
                <strong>Esplora il nostro salone</strong>.
              </>
            }
            metaItems={[
              { icon: CLIENT_ACCOUNT_ICONS.user, label: "Identità del brand" },
              { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Visibile in ricerca" },
            ]}
          />

          <div className="luxury-salon-services-page luxury-salon-services-page--salon-side luxury-brand-account luxury-brand-account--salon-side">
          {!slug ? (
            <p className="luxury-alert luxury-alert--error" role="alert">
              Slug sede non disponibile: completa la registrazione salone o attendi il provisioning.
            </p>
          ) : null}

          {slotMsg ? (
            <p className="luxury-alert luxury-alert--error luxury-brand-account__alert-spaced" role="alert">
              {slotMsg}
            </p>
          ) : null}
          {persistMsg ? (
            <p
              className={`luxury-alert luxury-brand-account__alert-spaced ${persistMsg.includes("non") ? "luxury-alert--error" : "luxury-alert--success"}`}
              role="status"
            >
              {persistMsg}
            </p>
          ) : null}

          <div className="luxury-brand-account__stack">
            <section className="luxury-surface-card luxury-salon-services-form-card">
              <h2 className="luxury-card-title">Carica il tuo logo</h2>
              <p className="luxury-text-muted luxury-brand-account__lede">
                Il logo viene mostrato in un <strong>cerchio</strong> con riempimento tipo zoom (ritaglio al centro). Preferisci
                immagini quadrate o leggermente più alte che larghe.
              </p>
              {state.logoDataUrl ? (
                <div className="luxury-brand-preview-logo luxury-brand-account__logo-block">
                  <img src={state.logoDataUrl} alt="Logo caricato" />
                </div>
              ) : (
                <div className="luxury-brand-upload-zone luxury-brand-upload-zone--logo luxury-brand-account__logo-block">
                  <span className="luxury-text-muted luxury-brand-account__placeholder-label">Nessun logo ancora</span>
                </div>
              )}
              <div className="luxury-brand-account__btn-row">
                <label className="luxury-btn luxury-btn--primary luxury-brand-account__file-trigger">
                  <input
                    type="file"
                    accept="image/*"
                    className="luxury-salon-services-hidden-file"
                    disabled={!slug}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      void onLogo(f);
                    }}
                  />
                  Scegli file…
                </label>
                {state.logoDataUrl ? (
                  <button type="button" className="luxury-btn luxury-btn--secondary" onClick={() => commitShowcase((p) => ({ ...p, logoDataUrl: null }))}>
                    Rimuovi logo
                  </button>
                ) : null}
              </div>
            </section>

            <section className="luxury-surface-card luxury-salon-services-form-card">
              <h2 className="luxury-card-title">Aggiungi immagini sito</h2>
              <div className="luxury-salon-services-form">
                <p className="luxury-text-muted luxury-brand-account__lede">
                  Fino a <strong>5 immagini</strong> per il carousel in vetrina (formato orizzontale consigliato).
                </p>
                <div className="luxury-brand-site-grid">
                  {([0, 1, 2, 3, 4] as const).map((i) => {
                    const filled = Boolean(state.siteImageDataUrls[i]);
                    return (
                      <div
                        key={i}
                        className={`luxury-brand-site-slot${filled ? " luxury-brand-site-slot--filled" : " luxury-brand-site-slot--empty"}`}
                      >
                        {filled ? (
                          <img src={state.siteImageDataUrls[i]!} alt="" />
                        ) : (
                          <div className="luxury-brand-upload-zone luxury-brand-site-slot__placeholder">
                            <span className="luxury-brand-site-slot__glyph" aria-hidden="true">
                              +
                            </span>
                            <span className="luxury-brand-site-slot__label">{siteLabels[i]}</span>
                          </div>
                        )}
                        <div className="luxury-brand-site-slot__toolbar">
                          <label className="luxury-btn luxury-btn--secondary luxury-brand-site-slot__btn">
                            <input
                              type="file"
                              accept="image/*"
                              className="luxury-salon-services-hidden-file"
                              disabled={!slug}
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                e.target.value = "";
                                void onSiteSlot(i, f);
                              }}
                            />
                            {filled ? "Sostituisci" : "Carica"}
                          </label>
                          {filled ? (
                            <button
                              type="button"
                              className="luxury-btn luxury-btn--secondary luxury-brand-site-slot__btn"
                              onClick={() => clearSiteSlot(i)}
                            >
                              Rimuovi
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {slug ? (
              <section className="luxury-surface-card luxury-salon-services-form-card">
                <h2 className="luxury-card-title">Salva vetrina</h2>
                <p className="luxury-text-muted luxury-brand-account__lede" style={{ marginBottom: "0.85rem" }}>
                  Logo e immagini si salvano anche subito dopo il caricamento; puoi premere qui per riscrivere tutto su
                  questo browser e aggiornare anteprima in home/ricerca.
                </p>
                <div className="luxury-brand-account__btn-row">
                  <button type="button" className="luxury-btn luxury-btn--primary" onClick={() => void onSaveVetrinaExplicit()}>
                    Salva vetrina
                  </button>
                </div>
              </section>
            ) : null}
          </div>
          </div>
        </div>
      </div>
    </SalonStandardSectionGuard>
  );
}
