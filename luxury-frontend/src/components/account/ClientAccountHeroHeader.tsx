import type { ReactNode } from "react";

export type ClientAccountHeroMeta = {
  icon: ReactNode;
  label: string;
};

export type ClientAccountHeroHeaderProps = {
  headlinePre: string;
  headlineAccent: string;
  badgePrimary?: string;
  badgeSecondary: string;
  kickerLabel: string;
  kickerChip: string;
  subtitle: ReactNode;
  metaItems: ClientAccountHeroMeta[];
};

export function ClientAccountHeroHeader({
  headlinePre,
  headlineAccent,
  badgePrimary = "Area cliente",
  badgeSecondary,
  kickerLabel,
  kickerChip,
  subtitle,
  metaItems,
}: ClientAccountHeroHeaderProps) {
  return (
    <header className="luxury-info-privacy-hero__header">
      <div className="luxury-info-privacy-hero__aurora" aria-hidden />
      <div className="luxury-info-privacy-hero__shine" aria-hidden />
      <div className="luxury-info-privacy-hero__grid">
        <div className="luxury-info-privacy-hero__badges">
          <span className="luxury-info-privacy-hero__badge">
            <span className="luxury-info-privacy-hero__badge-dot" aria-hidden />
            {badgePrimary}
          </span>
          <span className="luxury-info-privacy-hero__badge luxury-info-privacy-hero__badge--muted">{badgeSecondary}</span>
        </div>
        <h1 className="luxury-consumer-bookings-dash__headline">
          <span className="luxury-consumer-bookings-dash__headline-pre">{headlinePre}</span>
          <span className="luxury-consumer-bookings-dash__headline-accent">{headlineAccent}</span>
        </h1>
        <div className="luxury-info-privacy-hero__subtitle-card">
          <div className="luxury-info-privacy-hero__subtitle-kicker">
            <p className="luxury-info-privacy-hero__subtitle-label">{kickerLabel}</p>
            <span className="luxury-info-privacy-hero__subtitle-chip">{kickerChip}</span>
          </div>
          <p className="luxury-info-privacy-hero__subtitle">{subtitle}</p>
          <div className="luxury-info-privacy-hero__subtitle-foot">
            {metaItems.map((item) => (
              <span key={item.label} className="luxury-info-privacy-hero__subtitle-meta">
                {item.icon}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
