import type { ReactNode } from "react";

export type InfoPrivacyHeroMetaItem = {
  icon: ReactNode;
  label: string;
};

export type InfoPrivacyAccountHeroHeaderProps = {
  badgePrimary: string;
  badgeSecondary: string;
  kickerLabel: string;
  kickerChip: string;
  subtitle: ReactNode;
  metaItems: readonly InfoPrivacyHeroMetaItem[];
};

export function InfoPrivacyAccountHeroHeader({
  badgePrimary,
  badgeSecondary,
  kickerLabel,
  kickerChip,
  subtitle,
  metaItems,
}: InfoPrivacyAccountHeroHeaderProps) {
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
          <span className="luxury-consumer-bookings-dash__headline-pre">Info e </span>
          <span className="luxury-consumer-bookings-dash__headline-accent">privacy</span>
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

export const INFO_PRIVACY_HERO_ICONS = {
  shield: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 4v5c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V7l7-4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};
