import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HEADER_SPONSOR_PATH_SECONDS,
  HEADER_SPONSORS,
  type HeaderSponsor,
} from "../data/headerSponsors";
import { useLuxuryT } from "../i18n/useLuxuryLocale";

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function SponsorMark({ sponsor }: { sponsor: HeaderSponsor }) {
  const t = useLuxuryT();
  const img = (
    <span className="luxury-header-sponsor__mark">
      <span className="luxury-header-sponsor__mark-ring" aria-hidden />
      <span className="luxury-header-sponsor__mark-shine" aria-hidden />
      <img
        src={sponsor.logoSrc}
        alt=""
        className="luxury-header-sponsor__logo"
        width={320}
        height={72}
        decoding="async"
        draggable={false}
      />
    </span>
  );

  const className = "luxury-header-sponsor__item";
  const label = t("header.sponsor.partnerSite", { name: sponsor.name });

  const body = (
    <>
      {img}
      <span className="luxury-header-sponsor__name">{sponsor.name}</span>
    </>
  );

  if (!sponsor.href) {
    return <span className={className}>{body}</span>;
  }

  if (isExternalHref(sponsor.href)) {
    return (
      <a
        className={className}
        href={sponsor.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={label}
      >
        {body}
      </a>
    );
  }

  return (
    <Link className={className} to={sponsor.href} aria-label={label}>
      {body}
    </Link>
  );
}

type SponsorPass = {
  key: number;
  sponsorIndex: number;
};

/**
 * Un marchio alla volta lungo il percorso header:
 * entra da destra, attraversa, esce a sinistra.
 * Il successivo parte mentre il precedente sta uscendo, così la barra non resta vuota.
 * Label «In collaborazione» fissa sopra.
 */
export function HeaderSponsorRotator({
  sponsors = HEADER_SPONSORS,
  pathSeconds = HEADER_SPONSOR_PATH_SECONDS,
}: {
  sponsors?: readonly HeaderSponsor[];
  pathSeconds?: number;
}) {
  const t = useLuxuryT();
  const list = sponsors.filter((s) => s.logoSrc && s.name);
  const [passes, setPasses] = useState<SponsorPass[]>([{ key: 1, sponsorIndex: 0 }]);
  const nextKey = useRef(2);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (list.length <= 1) return;
    const handoffMs = Math.round(pathSeconds * (reducedMotion ? 1 : 0.62) * 1000);
    const id = window.setInterval(() => {
      setPasses((current) => {
        const last = current[current.length - 1] ?? { sponsorIndex: 0 };
        const next = {
          key: nextKey.current++,
          sponsorIndex: (last.sponsorIndex + 1) % list.length,
        };
        return reducedMotion ? [next] : [...current, next].slice(-2);
      });
    }, handoffMs);
    return () => window.clearInterval(id);
  }, [list.length, pathSeconds, reducedMotion]);

  if (list.length === 0) return null;

  return (
    <div
      className={`luxury-header-sponsor${reducedMotion ? " is-reduced-motion" : ""}`}
      style={{ ["--luxury-header-sponsor-path" as string]: `${pathSeconds}s` }}
      aria-label={t("header.sponsor.aria")}
    >
      <div className="luxury-header-sponsor__label-row">
        <span className="luxury-header-sponsor__label-rule" aria-hidden />
        <span className="luxury-header-sponsor__label-diamond" aria-hidden />
        <span className="luxury-header-sponsor__label">{t("header.sponsor.label")}</span>
        <span className="luxury-header-sponsor__label-diamond" aria-hidden />
        <span className="luxury-header-sponsor__label-rule" aria-hidden />
      </div>

      <div className="luxury-header-sponsor__path" aria-live="polite" aria-atomic="true">
        <span className="luxury-header-sponsor__path-edge luxury-header-sponsor__path-edge--left" aria-hidden />
        <span className="luxury-header-sponsor__path-edge luxury-header-sponsor__path-edge--right" aria-hidden />
        <span className="luxury-header-sponsor__path-rail" aria-hidden />
        <span className="luxury-header-sponsor__path-glow" aria-hidden />
        <span className="luxury-header-sponsor__path-sheen" aria-hidden />
        {passes.map((pass) => {
          const sponsor = list[pass.sponsorIndex];
          if (!sponsor) return null;
          return (
            <div key={pass.key} className="luxury-header-sponsor__traveler">
              <SponsorMark sponsor={sponsor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
