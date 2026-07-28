import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiJson } from "../api/client";
import type { OrganizationDetail } from "../api/types";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { parseInlineBold } from "../lib/parseInlineBold";
import {
  emptySalonPersonalPageData,
  readSalonPersonalPageDataAsync,
  type SalonPersonalPageData,
} from "../lib/salonPersonalPageStorage";
import { emptySalonShowcase, readSalonShowcaseAsync, type SalonShowcaseStored } from "../lib/salonShowcaseStorage";
import "../styles/luxury-salon-personal-page.css";

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

export default function SalonPersonalPage() {
  const { slug } = useParams<{ slug: string }>();
  const s = slug ?? "";
  const [showcase, setShowcase] = useState<SalonShowcaseStored>(() => emptySalonShowcase());

  useEffect(() => {
    if (!s) return;
    let alive = true;
    void readSalonShowcaseAsync(s).then((data) => {
      if (alive) setShowcase(data ?? emptySalonShowcase());
    });
    return () => {
      alive = false;
    };
  }, [s]);

  const detailQ = useQuery({
    queryKey: ["org", "detail", s],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(s)}`),
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

  const galleryUrls = useMemo(
    () => showcase.exploreGalleryImageDataUrls.filter((url): url is string => Boolean(url?.trim())),
    [showcase.exploreGalleryImageDataUrls],
  );

  const instagramHref = sanitizeExternalHttpUrl(personal.instagramUrl);
  const facebookHref = sanitizeExternalHttpUrl(personal.facebookUrl);

  const detail = detailQ.data;

  return (
    <main className="luxury-page-main luxury-salon-personal-page">
      <div className="luxury-salon-personal-page__topbar">
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

      {detail ? (
        <>
          <section className="luxury-salon-personal-hero">
            <p className="luxury-salon-personal-hero__eyebrow">Il tuo sito</p>
            <h1 className="luxury-salon-personal-hero__title">{personal.heroTitle || detail.name}</h1>
            <p className="luxury-salon-personal-hero__subtitle">
              {personal.heroSubtitle?.trim()
                ? personal.heroSubtitle
                : `${detail.name}${
                    detail.city?.trim()
                      ? `, ${formatSalonCityForDisplay(detail.city) ?? detail.city.trim()}`
                      : ""
                  } su Saloni Luxury.`}
            </p>
          </section>

          {personal.ownerIntro?.trim() ? (
            <section className="luxury-salon-personal-card luxury-salon-personal-card--intro" aria-labelledby="vp-intro">
              <h2 id="vp-intro">Introduzione</h2>
              <p className="luxury-salon-personal-card__intro">{parseInlineBold(personal.ownerIntro.trim())}</p>
            </section>
          ) : null}

          <section className="luxury-salon-personal-grid" aria-label="Informazioni salone">
            <article className="luxury-salon-personal-card">
              <h2>Chi siamo</h2>
              <p>{personal.about?.trim() || detail.welcomeMessage?.trim() || "Informazioni in aggiornamento."}</p>
            </article>

            <article className="luxury-salon-personal-card">
              <h2>Punti di forza</h2>
              <p>{personal.strengths?.trim() || "Servizi professionali, attenzione ai dettagli, esperienza personalizzata."}</p>
            </article>

            <article className="luxury-salon-personal-card">
              <h2>Orari</h2>
              <p>{personal.openingHours?.trim() || "Martedi - Sabato 08:30 - 19:00"}</p>
            </article>

            <article className="luxury-salon-personal-card">
              <h2>Contatti e prenotazione</h2>
              <p>{personal.contactsNote?.trim() || "Apri la scheda principale per contatti, mappa e prenotazione online."}</p>
              {personal.bookingNote?.trim() ? <p className="luxury-salon-personal-card__booking-note">{personal.bookingNote.trim()}</p> : null}
              <Link className="luxury-salon-personal-card__cta" to={`/s/${encodeURIComponent(s)}`}>
                {personal.bookingCtaLabel?.trim() || "Prenota ora"}
              </Link>
            </article>
          </section>

          {instagramHref || facebookHref ? (
            <section className="luxury-salon-personal-card luxury-salon-personal-card--social" aria-label="Social">
              <h2>Social</h2>
              <div className="luxury-salon-personal-social">
                {instagramHref ? (
                  <a className="luxury-salon-personal-social__link" href={instagramHref} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                ) : null}
                {facebookHref ? (
                  <a className="luxury-salon-personal-social__link" href={facebookHref} target="_blank" rel="noreferrer">
                    Facebook
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          {galleryUrls.length > 0 ? (
            <section className="luxury-salon-personal-gallery" aria-label="Gallery">
              {galleryUrls.map((src, i) => (
                <img key={i} className="luxury-salon-personal-gallery__thumb" src={src} alt="" loading="lazy" decoding="async" />
              ))}
            </section>
          ) : null}

          <p className="luxury-salon-personal-explore-hint">
            <Link to={`/s/${encodeURIComponent(s)}/esplora`}>Esplora il nostro salone</Link>
            {" — "}
            sezione estesa con servizi, recensioni e gallery collegata agli stessi contenuti.
          </p>
        </>
      ) : null}
    </main>
  );
}
