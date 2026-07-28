import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiJson } from "../../../api/client";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import {
  formatSalonSplitOpeningHours,
  minuteOfDayToTimeValue,
  parseOpeningHoursRange,
  replaceOpeningHoursTimes,
  timeValueToMinuteOfDay,
} from "../../../lib/salonOpeningHours";
import {
  ALL_SALON_OPEN_DAYS,
  normalizeSalonOpenDays,
  SALON_OPEN_DAY_LABELS,
  SALON_OPEN_DAYS_ORDER,
  type SalonOpenDay,
} from "../../../lib/salonOpenDays";
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
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-account-salon-services.css";
import "../../../styles/luxury-salon-personal-builder.css";
import "../../../styles/luxury-salon-services-salon.css";
import "../../../styles/luxury-salon-personal-builder-salon.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

export default function SalonPersonalPageBuilder() {
  const { accessToken } = useLuxuryAuth();
  const qc = useQueryClient();
  const meSalon = useMeSalonSummaryQuery();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const [state, setState] = useState<SalonPersonalPageData>(emptySalonPersonalPageData());
  const [bookingOpenTime, setBookingOpenTime] = useState("08:30");
  const [bookingMorningEndTime, setBookingMorningEndTime] = useState("");
  const [bookingAfternoonStartTime, setBookingAfternoonStartTime] = useState("");
  const [bookingCloseTime, setBookingCloseTime] = useState("19:00");
  const [openDays, setOpenDays] = useState<SalonOpenDay[]>(() => [...ALL_SALON_OPEN_DAYS]);
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
    setOpenDays(normalizeSalonOpenDays(meSalon.data.primaryLocationOpenDays));
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
    if (openDays.length === 0) {
      setFeedback({ text: "Seleziona almeno un giorno di apertura del salone.", kind: "error" });
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
            primaryLocationOpenDays: openDays,
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
      <div
        className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-personal-builder-account luxury-personal-builder-account--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
      >
        <div className="luxury-consumer-bookings-dash__shell">
          <ClientAccountHeroHeader
            headlinePre="Crea il "
            headlineAccent="tuo sito"
            badgePrimary="Area salone"
            badgeSecondary="Vetrina pubblica"
            kickerLabel="Contenuti"
            kickerChip="Esplora & pagina salone"
            subtitle={
              <>
                Titoli, testi, <strong>gallery</strong> e bottone prenotazione: compaiono sulla pagina pubblica del salone
                e in <em>Esplora</em>.
              </>
            }
            metaItems={[
              { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Prenotazioni dalla vetrina" },
              { icon: CLIENT_ACCOUNT_ICONS.user, label: "Identità del salone" },
            ]}
          />

          <div className="luxury-salon-services-page luxury-salon-services-page--salon-side luxury-personal-builder luxury-personal-builder--salon-side">
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

                <fieldset className="luxury-personal-builder__open-days">
                  <legend className="luxury-form-label">Giorni di apertura (agenda)</legend>
                  <p className="luxury-text-muted luxury-personal-builder__hours-hint">
                    Negli altri giorni il calendario mostra che il salone è chiuso e non propone orari prenotabili.
                  </p>
                  <div className="luxury-personal-builder__open-days-grid">
                    {SALON_OPEN_DAYS_ORDER.map((day) => {
                      const checked = openDays.includes(day);
                      return (
                        <label key={day} className="luxury-personal-builder__open-day">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setOpenDays((prev) =>
                                checked ? prev.filter((d) => d !== day) : [...prev, day].sort(
                                    (a, b) =>
                                      SALON_OPEN_DAYS_ORDER.indexOf(a) - SALON_OPEN_DAYS_ORDER.indexOf(b),
                                  ),
                              );
                            }}
                          />
                          {SALON_OPEN_DAY_LABELS[day]}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

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
        </div>
      </div>
    </SalonStandardSectionGuard>
  );
}
