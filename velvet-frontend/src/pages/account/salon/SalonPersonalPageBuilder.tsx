import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiJson } from "../../../api/client";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import {
  formatSalonSplitOpeningHours,
  minuteOfDayToTimeValue,
  parseOpeningHoursRange,
  replaceOpeningHoursTimes,
  timeValueToMinuteOfDay,
} from "../../../lib/salonOpeningHours";
import { readImageFileAsGalleryDataUrl } from "../../../lib/readImageDataUrl";
import {
  emptySalonShowcase,
  readSalonShowcaseAsync,
  writeSalonShowcaseAsync,
  type SalonShowcaseStored,
} from "../../../lib/salonShowcaseStorage";
import {
  emptySalonPersonalPageData,
  readSalonPersonalPageDataAsync,
  writeSalonPersonalPageDataAsync,
  type SalonPersonalPageData,
} from "../../../lib/salonPersonalPageStorage";
import "../../../styles/luxury-account-page-shell.css";
import "../../../styles/luxury-account-salon-services.css";
import "../../../styles/luxury-salon-personal-builder.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

export default function SalonPersonalPageBuilder() {
  const { accessToken } = useVelvetAuth();
  const qc = useQueryClient();
  const meSalon = useMeSalonSummaryQuery();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const [state, setState] = useState<SalonPersonalPageData>(emptySalonPersonalPageData());
  const [bookingOpenTime, setBookingOpenTime] = useState("08:30");
  const [bookingMorningEndTime, setBookingMorningEndTime] = useState("");
  const [bookingAfternoonStartTime, setBookingAfternoonStartTime] = useState("");
  const [bookingCloseTime, setBookingCloseTime] = useState("19:00");
  const [feedback, setFeedback] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [showcase, setShowcase] = useState<SalonShowcaseStored>(() => emptySalonShowcase());

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setFeedback(null);
    void readSalonPersonalPageDataAsync(slug, accessToken).then((fromStorage) => {
      if (alive) setState(fromStorage ?? emptySalonPersonalPageData());
    });
    return () => {
      alive = false;
    };
  }, [slug, accessToken]);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    void readSalonShowcaseAsync(slug, accessToken).then((data) => {
      if (alive) setShowcase(data ?? emptySalonShowcase());
    });
    return () => {
      alive = false;
    };
  }, [slug, accessToken]);

  useEffect(() => {
    if (!meSalon.data) return;
    const open = meSalon.data.primaryLocationOpeningMinuteOfDay;
    const close = meSalon.data.primaryLocationClosingMinuteOfDay;
    if (open != null) {
      setBookingOpenTime(minuteOfDayToTimeValue(open));
    }
    if (close != null) {
      setBookingCloseTime(minuteOfDayToTimeValue(close));
    }
    const morningEnd = meSalon.data.primaryLocationMorningEndMinuteOfDay;
    const afternoonStart = meSalon.data.primaryLocationAfternoonStartMinuteOfDay;
    if (morningEnd != null) {
      setBookingMorningEndTime(minuteOfDayToTimeValue(morningEnd));
    }
    if (afternoonStart != null) {
      setBookingAfternoonStartTime(minuteOfDayToTimeValue(afternoonStart));
    }
    if (open != null && close != null) {
      setState((prev) => ({
        ...prev,
        openingHours:
          morningEnd != null && afternoonStart != null
            ? formatSalonSplitOpeningHours(open, morningEnd, afternoonStart, close)
            : replaceOpeningHoursTimes(prev.openingHours, open, close),
      }));
    }
  }, [meSalon.data]);

  const onBookingOpenTimeChange = (value: string) => {
    setBookingOpenTime(value);
    const open = timeValueToMinuteOfDay(value);
    const close = timeValueToMinuteOfDay(bookingCloseTime);
    if (open != null && close != null) {
      setState((prev) => ({ ...prev, openingHours: replaceOpeningHoursTimes(prev.openingHours, open, close) }));
    }
  };

  const onBookingCloseTimeChange = (value: string) => {
    setBookingCloseTime(value);
    const open = timeValueToMinuteOfDay(bookingOpenTime);
    const close = timeValueToMinuteOfDay(value);
    if (open != null && close != null) {
      setState((prev) => ({ ...prev, openingHours: replaceOpeningHoursTimes(prev.openingHours, open, close) }));
    }
  };

  const onOpeningHoursTextChange = (value: string) => {
    setState((prev) => ({ ...prev, openingHours: value }));
    const parsed = parseOpeningHoursRange(value);
    if (parsed) {
      setBookingOpenTime(minuteOfDayToTimeValue(parsed.open));
      setBookingCloseTime(minuteOfDayToTimeValue(parsed.close));
    }
  };

  const publicHref = useMemo(() => {
    if (!slug) return null;
    return `/s/${encodeURIComponent(slug)}/il-tuo-salone`;
  }, [slug]);

  const onSave = () => {
    if (!slug || !accessToken || !meSalon.data?.primaryLocationName?.trim()) {
      setFeedback({ text: "Dati salone non disponibili. Completa prima registrazione/provisioning.", kind: "error" });
      return;
    }
    const openMinute = timeValueToMinuteOfDay(bookingOpenTime);
    const morningEndMinute = timeValueToMinuteOfDay(bookingMorningEndTime);
    const afternoonStartMinute = timeValueToMinuteOfDay(bookingAfternoonStartTime);
    const closeMinute = timeValueToMinuteOfDay(bookingCloseTime);
    if (openMinute == null || closeMinute == null) {
      setFeedback({ text: "Inserisci orari di apertura mattina e chiusura pomeriggio validi.", kind: "error" });
      return;
    }
    const hasBreak = Boolean(bookingMorningEndTime.trim() || bookingAfternoonStartTime.trim());
    if (hasBreak) {
      if (morningEndMinute == null || afternoonStartMinute == null) {
        setFeedback({
          text: "Per la pausa pranzo inserisci sia chiusura mattina sia apertura pomeriggio.",
          kind: "error",
        });
        return;
      }
      if (openMinute >= morningEndMinute || morningEndMinute >= afternoonStartMinute || afternoonStartMinute >= closeMinute) {
        setFeedback({
          text: "Gli orari devono essere: apertura mattina < chiusura mattina < apertura pomeriggio < chiusura.",
          kind: "error",
        });
        return;
      }
    } else if (openMinute >= closeMinute) {
      setFeedback({ text: "L'orario di chiusura deve essere successivo all'apertura.", kind: "error" });
      return;
    }

    void writeSalonPersonalPageDataAsync(slug, state, accessToken);
    void (async () => {
      try {
        await apiJson("/api/v1/me/salon", {
          method: "PATCH",
          accessToken,
          body: JSON.stringify({
            primaryLocationName: meSalon.data.primaryLocationName!.trim(),
            primaryLocationSlug: slug,
            primaryLocationCity: meSalon.data.primaryLocationCity?.trim() ?? "",
            primaryLocationPostalCode: meSalon.data.primaryLocationPostalCode?.trim() ?? "",
            primaryLocationAddressLine: meSalon.data.primaryLocationAddressLine?.trim() ?? "",
            primaryLocationOpeningMinuteOfDay: openMinute,
            primaryLocationClosingMinuteOfDay: closeMinute,
            primaryLocationMorningEndMinuteOfDay: hasBreak ? morningEndMinute : null,
            primaryLocationAfternoonStartMinuteOfDay: hasBreak ? afternoonStartMinute : null,
          }),
        });
        await qc.invalidateQueries({ queryKey: ["me", "salon"] });
        setFeedback(null);
      } catch (e) {
        setFeedback({
          text: e instanceof Error ? e.message : "Salvataggio orari agenda non riuscito.",
          kind: "error",
        });
      }
    })();
  };

  /** Come commitShowcase in SalonBrandPage: merge sullo stato più recente così non si sovrascrive logo/carousel salvati altrove. */
  const commitGalleryShowcase = useCallback(
    (build: (prev: SalonShowcaseStored) => SalonShowcaseStored, successMsg: string) => {
      if (!slug) return;
      setShowcase((prev) => {
        const next = build(prev);
        void writeSalonShowcaseAsync(slug, next, accessToken).then((res) => {
          if (!res.ok) {
            setFeedback({ text: res.error, kind: "error" });
            void readSalonShowcaseAsync(slug).then((restored) => {
              setShowcase(restored ?? emptySalonShowcase());
            });
            return;
          }
          setFeedback({ text: successMsg, kind: "success" });
        });
        return next;
      });
    },
    [slug, accessToken],
  );

  const onGalleryImage = async (index: number, file: File | null) => {
    if (!file || !slug) return;
    try {
      const dataUrl = await readImageFileAsGalleryDataUrl(file);
      commitGalleryShowcase((prev) => {
        const slots = [...prev.exploreGalleryImageDataUrls] as SalonShowcaseStored["exploreGalleryImageDataUrls"];
        slots[index] = dataUrl;
        return { ...prev, exploreGalleryImageDataUrls: slots };
      }, "Immagine gallery salvata.");
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : "Errore caricamento immagine", kind: "error" });
    }
  };

  const clearGalleryImage = (index: number) => {
    commitGalleryShowcase((prev) => {
      const slots = [...prev.exploreGalleryImageDataUrls] as SalonShowcaseStored["exploreGalleryImageDataUrls"];
      slots[index] = null;
      return { ...prev, exploreGalleryImageDataUrls: slots };
    }, "Immagine gallery rimossa.");
  };

  return (
    <SalonStandardSectionGuard>
      <>
        <div className="luxury-account-page-shell luxury-account-page-shell--narrow luxury-account-page-shell--personal-builder">
          <header className="luxury-account-page-shell__hero">
            <div className="luxury-account-page-shell__hero-glow" aria-hidden />
            <div className="luxury-account-page-shell__hero-inner">
              <Link to="/account/salone" className="luxury-link-back">
                ← Panoramica salone
              </Link>
              <h1 className="luxury-personal-builder-hero__headline">
                <span className="luxury-personal-builder-hero__headline-pre">Crea il </span>
                <span className="luxury-personal-builder-hero__headline-accent">tuo sito</span>
              </h1>
              <p className="luxury-account-page-shell__hero-sub">
                Titoli, testi, gallery e bottone prenotazione: compaiono sulla pagina pubblica del salone e in Esplora.
              </p>
            </div>
          </header>
        </div>

        <div className="luxury-salon-services-page luxury-personal-builder">
          {!slug ? (
            <p className="luxury-alert luxury-alert--error" role="alert">
              Slug salone non disponibile. Completa prima registrazione/provisioning.
            </p>
          ) : null}

          <div className="luxury-personal-builder__stack">
            <section className="luxury-surface-card luxury-salon-services-form-card" aria-labelledby="vpb-hero-heading">
              <div className="luxury-personal-builder__card-intro">
                <p className="luxury-personal-builder__eyebrow">Intestazione</p>
                <h2 id="vpb-hero-heading" className="luxury-card-title">
                  Hero in alto
                </h2>
                <p className="luxury-text-muted luxury-personal-builder__card-hint">
                  Titolo e sottotitolo compaiono come prima impressione nella pagina pubblica.
                </p>
              </div>
              <div className="luxury-personal-builder__fields">
                <label className="luxury-form-label">
                  Titolo hero
                  <input
                    className="luxury-soft-field"
                    value={state.heroTitle}
                    onChange={(e) => setState((p) => ({ ...p, heroTitle: e.target.value }))}
                    placeholder="Es. Benvenuto nel nostro salone"
                  />
                </label>

                <label className="luxury-form-label">
                  Sottotitolo
                  <textarea
                    className="luxury-soft-field"
                    value={state.heroSubtitle}
                    onChange={(e) => setState((p) => ({ ...p, heroSubtitle: e.target.value }))}
                    placeholder="Un breve testo di presentazione"
                    rows={3}
                  />
                </label>
              </div>
            </section>

            <section className="luxury-surface-card luxury-salon-services-form-card" aria-labelledby="vpb-story-heading">
              <div className="luxury-personal-builder__card-intro">
                <p className="luxury-personal-builder__eyebrow">Contenuti</p>
                <h2 id="vpb-story-heading" className="luxury-card-title">
                  Storia e valori
                </h2>
              </div>
              <div className="luxury-personal-builder__fields">
                <label className="luxury-form-label">
                  Introduzione titolare/team
                  <textarea
                    className="luxury-soft-field"
                    value={state.ownerIntro}
                    onChange={(e) => setState((p) => ({ ...p, ownerIntro: e.target.value }))}
                    placeholder="Es. Ciao sono..., insieme al mio team..."
                    rows={4}
                  />
                </label>

                <label className="luxury-form-label">
                  Chi siamo
                  <textarea
                    className="luxury-soft-field"
                    value={state.about}
                    onChange={(e) => setState((p) => ({ ...p, about: e.target.value }))}
                    placeholder="Racconta storia, stile e filosofia del salone"
                    rows={5}
                  />
                </label>

                <label className="luxury-form-label">
                  Punti di forza
                  <textarea
                    className="luxury-soft-field"
                    value={state.strengths}
                    onChange={(e) => setState((p) => ({ ...p, strengths: e.target.value }))}
                    placeholder="Es. Colore su misura, pieghe evento, consulenza personalizzata"
                    rows={4}
                  />
                </label>
              </div>
            </section>

            <section className="luxury-surface-card luxury-salon-services-form-card" aria-labelledby="vpb-practical-heading">
              <div className="luxury-personal-builder__card-intro">
                <p className="luxury-personal-builder__eyebrow">Operatività</p>
                <h2 id="vpb-practical-heading" className="luxury-card-title">
                  Orari, contatti e prenotazione
                </h2>
              </div>
              <div className="luxury-personal-builder__fields">
                <div className="luxury-personal-builder__row-2">
                  <label className="luxury-form-label">
                    Apertura mattina (agenda)
                    <input
                      className="luxury-soft-field"
                      type="time"
                      value={bookingOpenTime}
                      onChange={(e) => onBookingOpenTimeChange(e.target.value)}
                      required
                    />
                  </label>
                  <label className="luxury-form-label">
                    Chiusura mattina (pausa)
                    <input
                      className="luxury-soft-field"
                      type="time"
                      value={bookingMorningEndTime}
                      onChange={(e) => setBookingMorningEndTime(e.target.value)}
                      placeholder="Es. 13:00"
                    />
                  </label>
                </div>
                <div className="luxury-personal-builder__row-2">
                  <label className="luxury-form-label">
                    Apertura pomeriggio
                    <input
                      className="luxury-soft-field"
                      type="time"
                      value={bookingAfternoonStartTime}
                      onChange={(e) => setBookingAfternoonStartTime(e.target.value)}
                      placeholder="Es. 14:30"
                    />
                  </label>
                  <label className="luxury-form-label">
                    Chiusura pomeriggio (agenda)
                    <input
                      className="luxury-soft-field"
                      type="time"
                      value={bookingCloseTime}
                      onChange={(e) => onBookingCloseTimeChange(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <p className="luxury-text-muted luxury-personal-builder__hours-hint">
                  Compila chiusura mattina e apertura pomeriggio se il salone fa pausa: in quella fascia il cliente non può prenotare.
                </p>

                <label className="luxury-form-label">
                  Testo orari (pagina pubblica)
                  <textarea
                    className="luxury-soft-field"
                    value={state.openingHours}
                    onChange={(e) => onOpeningHoursTextChange(e.target.value)}
                    placeholder="Es. Martedi - Sabato 08:30 - 19:00"
                    rows={2}
                  />
                </label>

                <label className="luxury-form-label">
                  Nota contatti
                  <textarea
                    className="luxury-soft-field"
                    value={state.contactsNote}
                    onChange={(e) => setState((p) => ({ ...p, contactsNote: e.target.value }))}
                    placeholder="Es. Scrivici su WhatsApp per consulenza rapida"
                    rows={3}
                  />
                </label>

                <label className="luxury-form-label">
                  Testo prenotazione
                  <textarea
                    className="luxury-soft-field"
                    value={state.bookingNote}
                    onChange={(e) => setState((p) => ({ ...p, bookingNote: e.target.value }))}
                    placeholder="Es. Prenota come e quando vuoi..."
                    rows={3}
                  />
                </label>

                <label className="luxury-form-label">
                  Etichetta bottone prenota
                  <input
                    className="luxury-soft-field"
                    value={state.bookingCtaLabel}
                    onChange={(e) => setState((p) => ({ ...p, bookingCtaLabel: e.target.value }))}
                    placeholder="Es. Prenota ora"
                  />
                </label>
              </div>
            </section>

            <section className="luxury-surface-card luxury-salon-services-form-card" aria-labelledby="vpb-social-heading">
              <div className="luxury-personal-builder__card-intro">
                <p className="luxury-personal-builder__eyebrow">Social</p>
                <h2 id="vpb-social-heading" className="luxury-card-title">
                  Link esterni
                </h2>
              </div>
              <div className="luxury-personal-builder__row-2">
                <label className="luxury-form-label">
                  Instagram
                  <input
                    className="luxury-soft-field"
                    value={state.instagramUrl}
                    onChange={(e) => setState((p) => ({ ...p, instagramUrl: e.target.value }))}
                    placeholder="https://instagram.com/..."
                  />
                </label>
                <label className="luxury-form-label">
                  Facebook
                  <input
                    className="luxury-soft-field"
                    value={state.facebookUrl}
                    onChange={(e) => setState((p) => ({ ...p, facebookUrl: e.target.value }))}
                    placeholder="https://facebook.com/..."
                  />
                </label>
              </div>
            </section>

            <fieldset className="luxury-surface-card luxury-salon-services-form-card luxury-personal-builder__gallery">
              <legend className="luxury-card-title">Gallery (6 immagini)</legend>
              <div className="luxury-personal-builder__gallery-inner">
                <div className="luxury-personal-builder__gallery-grid">
                  {showcase.exploreGalleryImageDataUrls.map((img, idx) => (
                    <div key={idx} className="luxury-personal-builder__gallery-slot">
                      <span className="luxury-personal-builder__gallery-slot-label">Immagine {idx + 1}</span>
                      {img ? (
                        <img className="luxury-personal-builder__gallery-thumb" src={img} alt="" />
                      ) : (
                        <div className="luxury-personal-builder__gallery-placeholder" aria-hidden />
                      )}
                      <input type="file" accept="image/*" onChange={(e) => void onGalleryImage(idx, e.currentTarget.files?.[0] ?? null)} />
                      {img ? (
                        <button type="button" className="luxury-btn luxury-btn--secondary" onClick={() => clearGalleryImage(idx)}>
                          Rimuovi
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>

            <div className="luxury-surface-card luxury-salon-services-form-card">
              <h2 className="luxury-card-title">Salva e anteprima</h2>
              <div className="luxury-personal-builder__actions">
                <button type="button" className="luxury-btn luxury-btn--primary" onClick={onSave} disabled={!slug}>
                  Salva home personale
                </button>
                {publicHref ? (
                  <Link
                    className="luxury-btn luxury-btn--secondary luxury-personal-builder__btn-public"
                    to={publicHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apri pagina pubblica
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {feedback ? (
            <p
              className={`luxury-alert luxury-personal-builder__feedback ${feedback.kind === "error" ? "luxury-alert--error" : "luxury-alert--success"}`}
              role={feedback.kind === "error" ? "alert" : "status"}
            >
              {feedback.text}
            </p>
          ) : null}
        </div>
      </>
    </SalonStandardSectionGuard>
  );
}
