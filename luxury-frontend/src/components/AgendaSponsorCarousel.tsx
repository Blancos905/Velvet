import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import { useLuxuryT } from "../i18n/useLuxuryLocale";
import {
  AGENDA_SPONSOR_PLACEMENT,
  resolveAgendaSponsors,
  type AgendaSponsor,
} from "../lib/agendaSponsors";
import "../styles/luxury-agenda-sponsor.css";

const SLIDE_MS = 4500;

function sponsorHrefIsExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Carousel di sponsor solo in fondo all'agenda cliente.
 * Le immagini scorrono da sole. Il clic apre il sito dello sponsor.
 */
export function AgendaSponsorCarousel() {
  const t = useLuxuryT();
  const query = useQuery({
    queryKey: ["public", "placement-sponsors", AGENDA_SPONSOR_PLACEMENT],
    queryFn: () =>
      apiJson<AgendaSponsor[]>(
        `/api/v1/public/placement-sponsors?placement=${AGENDA_SPONSOR_PLACEMENT}`,
      ),
    staleTime: 60_000,
  });
  const sponsors = resolveAgendaSponsors(query.isError ? null : query.data);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const sponsorKey = sponsors.map((sponsor) => sponsor.id).join("|");

  useEffect(() => {
    setIndex(0);
  }, [sponsorKey]);

  useEffect(() => {
    if (sponsors.length < 2) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % sponsors.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, sponsors.length]);

  if (sponsors.length === 0) return null;

  const go = (delta: number) => {
    setIndex((currentIndex) => (currentIndex + delta + sponsors.length) % sponsors.length);
  };

  return (
    <aside
      className={`luxury-agenda-sponsor${reducedMotion ? " is-reduced-motion" : ""}`}
      aria-roledescription="carousel"
      aria-label={t("agenda.sponsor.aria")}
    >
      <p className="luxury-agenda-sponsor__label">{t("header.sponsor.label")}</p>
      <div className="luxury-agenda-sponsor__viewport">
        <div
          className="luxury-agenda-sponsor__track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {sponsors.map((sponsor) => {
            const external = sponsorHrefIsExternal(sponsor.href);
            return (
              <a
                key={sponsor.id}
                className="luxury-agenda-sponsor__slide"
                href={sponsor.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer sponsored" : undefined}
              >
                <img
                  src={sponsor.imageSrc}
                  alt=""
                  className="luxury-agenda-sponsor__image"
                  decoding="async"
                />
                <span className="luxury-agenda-sponsor__copy">
                  <span className="luxury-agenda-sponsor__brand">{sponsor.brandName}</span>
                  <span className="luxury-agenda-sponsor__headline">{sponsor.headline}</span>
                  <span className="luxury-agenda-sponsor__cta">{sponsor.ctaLabel}</span>
                </span>
              </a>
            );
          })}
        </div>
        {sponsors.length > 1 ? (
          <>
            <button
              type="button"
              className="luxury-agenda-sponsor__nav luxury-agenda-sponsor__nav--prev"
              onClick={() => go(-1)}
              aria-label={t("agenda.sponsor.prev")}
            >
              ‹
            </button>
            <button
              type="button"
              className="luxury-agenda-sponsor__nav luxury-agenda-sponsor__nav--next"
              onClick={() => go(1)}
              aria-label={t("agenda.sponsor.next")}
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {sponsors.length > 1 ? (
        <div className="luxury-agenda-sponsor__dots" role="tablist" aria-label={t("agenda.sponsor.dots")}>
          {sponsors.map((sponsor, dotIndex) => (
            <button
              key={sponsor.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={t("agenda.sponsor.dot", { name: sponsor.brandName, n: String(dotIndex + 1) })}
              className={`luxury-agenda-sponsor__dot${dotIndex === index ? " is-active" : ""}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}
