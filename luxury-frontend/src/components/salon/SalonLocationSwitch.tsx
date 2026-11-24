import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import type { SalonSiblingLocation } from "../../api/types";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";

type Props = {
  locations: SalonSiblingLocation[];
};

function tidy(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function placeLabel(location: SalonSiblingLocation): string {
  return formatSalonCityForDisplay(location.city) || tidy(location.name) || tidy(location.slug);
}

export function SalonLocationSwitch({ locations }: Props) {
  const t = useLuxuryT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const signature = locations.map((location) => location.slug).join("|");

  useEffect(() => {
    setOpen(false);
  }, [signature]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`luxury-salon-location-switch__button${open ? " luxury-salon-location-switch__button--open" : ""}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="luxury-salon-location-switch__glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
            <path
              d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="11" r="2.15" fill="currentColor" />
          </svg>
        </span>
        {t("salon.locations.switch")}
      </button>
      {open ? (
        <ul id={listId} className="luxury-salon-location-switch__cards" aria-label={t("salon.locations.listAria")}>
          {locations.map((location) => {
            const place = placeLabel(location);
            const address = tidy(location.addressLine);
            const name = tidy(location.name);
            const showName = name.length > 0 && name.toLowerCase() !== place.toLowerCase();
            return (
              <li key={location.slug}>
                <Link
                  className="luxury-salon-location-switch__card"
                  to={`/s/${encodeURIComponent(location.slug)}`}
                  aria-label={t("salon.locations.openAria", { place })}
                >
                  <span className="luxury-salon-location-switch__card-pin" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                      <path
                        d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <circle cx="12" cy="11" r="2.1" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="luxury-salon-location-switch__card-copy">
                    {showName ? <span className="luxury-salon-location-switch__card-name">{name}</span> : null}
                    <span className="luxury-salon-location-switch__card-place">{place}</span>
                    {address ? <span className="luxury-salon-location-switch__card-address">{address}</span> : null}
                  </span>
                  <span className="luxury-salon-location-switch__card-go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
