import type { MeSalonSummary } from "../../api/types";
import { googleMapsEmbedApiKey } from "../../config/env";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import { googleMapsEmbedSrc, salonMapSearchQuery } from "../../lib/salonMap";
import "../../styles/salon-location-map.css";

type Props = {
  meSalon: MeSalonSummary | undefined;
  isPending?: boolean;
  /** Altezza iframe ridotta (es. home dashboard). */
  compact?: boolean;
  heading?: string;
};

export function SalonLocationMapCard({ meSalon, isPending, compact, heading = "Posizione del salone" }: Props) {
  if (isPending) {
    return (
      <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`} aria-busy="true">
        <h2 className="velvet-card-title velvet-salon-map-card__title">{heading}</h2>
        <p className="velvet-text-muted" style={{ margin: 0 }}>
          Caricamento mappa…
        </p>
      </article>
    );
  }

  if (!meSalon?.provisioned) {
    return (
      <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`}>
        <h2 className="velvet-card-title velvet-salon-map-card__title">{heading}</h2>
        <p className="velvet-text-muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Quando il salone sarà collegato al tuo account comparirà qui la mappa della sede.
        </p>
      </article>
    );
  }

  const query = salonMapSearchQuery(meSalon);
  const mapsHref =
    query.length > 0
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : meSalon.primaryLocationSlug
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meSalon.primaryLocationName ?? "Salone"}, Italia`)}`
        : null;

  if (!query) {
    return (
      <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`}>
        <h2 className="velvet-card-title velvet-salon-map-card__title">{heading}</h2>
        <p className="velvet-text-muted" style={{ margin: "0 0 0.85rem", lineHeight: 1.55 }}>
          Non risultano ancora indirizzo o città per la sede principale. Quando saranno valorizzati in anagrafica (o in
          registrazione) potrai visualizzare il punto sulla mappa.
        </p>
        {mapsHref ? (
          <a href={mapsHref} className="velvet-btn velvet-btn--primary" rel="noreferrer" target="_blank">
            Apri Google Maps
          </a>
        ) : null}
      </article>
    );
  }

  const src = googleMapsEmbedSrc(query, googleMapsEmbedApiKey);
  const cityForAddressLine =
    formatSalonCityForDisplay(meSalon.primaryLocationCity) ?? meSalon.primaryLocationCity?.trim() ?? "";

  return (
    <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`}>
      <div className="velvet-salon-map-card__head">
        <h2 className="velvet-card-title velvet-salon-map-card__title">{heading}</h2>
        {mapsHref ? (
          <a className="velvet-link-inline velvet-salon-map-card__external" href={mapsHref} rel="noreferrer" target="_blank">
            Apri in Google Maps
          </a>
        ) : null}
      </div>
      {(meSalon.primaryLocationAddressLine ?? meSalon.primaryLocationCity) ? (
        <p className="velvet-text-muted velvet-salon-map-card__address" style={{ margin: "0 0 0.85rem", lineHeight: 1.5 }}>
          {[meSalon.primaryLocationAddressLine, meSalon.primaryLocationPostalCode, cityForAddressLine || undefined].filter(Boolean).join(" — ")}
        </p>
      ) : null}
      <div className="velvet-salon-map-card__frame">
        <iframe
          key={src}
          title="Mappa sede salone"
          className="velvet-salon-map-card__iframe"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </article>
  );
}
