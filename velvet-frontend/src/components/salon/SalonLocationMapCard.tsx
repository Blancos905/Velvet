import { Link } from "react-router-dom";
import type { MeSalonSummary } from "../../api/types";
import { googleMapsEmbedApiKey } from "../../config/env";
import { useMapsCookieAllowed } from "../../hooks/useCookieConsent";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import { googleMapsEmbedSrc, salonMapSearchQuery } from "../../lib/salonMap";
import "../../styles/salon-location-map.css";

type Props = {
  meSalon: MeSalonSummary | undefined;
  isPending?: boolean;
  /** Altezza iframe ridotta (es. home dashboard). */
  compact?: boolean;
  heading?: string;
  /** Intestazione stile card pubblica salone (pill + titolo corsivo). */
  publicWarmHeader?: boolean;
  eyebrow?: string;
};

function MapCardHeading({
  heading,
  publicWarmHeader,
  eyebrow,
}: {
  heading: string;
  publicWarmHeader?: boolean;
  eyebrow?: string;
}) {
  if (!publicWarmHeader) {
    return <h2 className="velvet-card-title velvet-salon-map-card__title">{heading}</h2>;
  }
  return (
    <div className="velvet-salon-public-meta__map-head">
      {eyebrow ? <p className="velvet-salon-public-meta__eyebrow">{eyebrow}</p> : null}
      <h2 className="velvet-salon-public-meta__title velvet-salon-map-card__title">{heading}</h2>
    </div>
  );
}

function MapExternalLink({
  href,
  publicWarmHeader,
  label = "Apri in Google Maps",
}: {
  href: string;
  publicWarmHeader?: boolean;
  label?: string;
}) {
  return (
    <a
      className={
        publicWarmHeader
          ? "velvet-salon-map-card__external velvet-salon-public-meta__map-external"
          : "velvet-link-inline velvet-salon-map-card__external"
      }
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

export function SalonLocationMapCard({
  meSalon,
  isPending,
  compact,
  heading = "Posizione del salone",
  publicWarmHeader,
  eyebrow,
}: Props) {
  const mapsAllowed = useMapsCookieAllowed();
  if (isPending) {
    return (
      <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`} aria-busy="true">
        <MapCardHeading heading={heading} publicWarmHeader={publicWarmHeader} eyebrow={eyebrow} />
        <p className="velvet-text-muted" style={{ margin: 0 }}>
          Caricamento mappa…
        </p>
      </article>
    );
  }

  if (!meSalon?.provisioned) {
    return (
      <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`}>
        <MapCardHeading heading={heading} publicWarmHeader={publicWarmHeader} eyebrow={eyebrow} />
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
        <MapCardHeading heading={heading} publicWarmHeader={publicWarmHeader} eyebrow={eyebrow} />
        <p className="velvet-text-muted" style={{ margin: "0 0 0.85rem", lineHeight: 1.55 }}>
          Non risultano ancora indirizzo o città per la sede principale. Quando saranno valorizzati in anagrafica (o in
          registrazione) potrai visualizzare il punto sulla mappa.
        </p>
        {mapsHref && mapsAllowed ? (
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
  const addressLine = [meSalon.primaryLocationAddressLine, meSalon.primaryLocationPostalCode, cityForAddressLine || undefined]
    .filter(Boolean)
    .join(" — ");

  if (!mapsAllowed) {
    return (
      <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`}>
        <MapCardHeading heading={heading} publicWarmHeader={publicWarmHeader} eyebrow={eyebrow} />
        {addressLine ? (
          <p
            className={`velvet-text-muted velvet-salon-map-card__address${publicWarmHeader ? " velvet-salon-public-meta__map-address" : ""}`}
            style={{ margin: "0 0 0.85rem", lineHeight: 1.5 }}
          >
            {addressLine}
          </p>
        ) : null}
        <p className="velvet-text-muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Per visualizzare la mappa interattiva attiva le preferenze «Mappe e geocodifica» in{" "}
          <Link to="/privacy/scelte" className="velvet-link-inline">
            Scelte privacy
          </Link>
          .
        </p>
      </article>
    );
  }

  return (
    <article className={`velvet-salon-map-card${compact ? " velvet-salon-map-card--compact" : ""}`}>
      {publicWarmHeader ? (
        <MapCardHeading heading={heading} publicWarmHeader eyebrow={eyebrow} />
      ) : (
        <div className="velvet-salon-map-card__head">
          <h2 className="velvet-card-title velvet-salon-map-card__title">{heading}</h2>
          {mapsHref ? <MapExternalLink href={mapsHref} /> : null}
        </div>
      )}
      {mapsHref && publicWarmHeader ? (
        <div className="velvet-salon-public-meta__map-external-wrap">
          <MapExternalLink href={mapsHref} publicWarmHeader />
        </div>
      ) : null}
      {addressLine ? (
        <p
          className={`velvet-text-muted velvet-salon-map-card__address${publicWarmHeader ? " velvet-salon-public-meta__map-address" : ""}`}
          style={{ margin: "0 0 0.85rem", lineHeight: 1.5 }}
        >
          {addressLine}
        </p>
      ) : null}
      <div className="velvet-salon-map-card__frame">
        <iframe
          key={src}
          title="Mappa sede salone"
          className="velvet-salon-map-card__iframe"
          src={src}
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </article>
  );
}
