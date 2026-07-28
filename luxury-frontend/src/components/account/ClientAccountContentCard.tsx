import type { ReactNode } from "react";

export const CLIENT_ACCOUNT_ICONS = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8a4 4 0 014-4h6a4 4 0 014 4v5a4 4 0 01-4 4H9l-4 3v-3.5A3.5 3.5 0 015 13V8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4a4 4 0 00-4 4v2.2c0 .8-.3 1.6-.8 2.2L5 15h14l-2.2-2.6a3.2 3.2 0 01-.8-2.2V8a4 4 0 00-4-4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-6.5-4.2-8.5-8.2C1.8 8.4 3.6 5 6.8 5c1.7 0 3.2.9 4 2.2.8-1.3 2.3-2.2 4-2.2 3.2 0 5 3.4 3.3 6.8C18.5 15.8 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function ClientAccountContentCard({
  title,
  leadIcon,
  leadCopy,
  children,
  ariaLabel,
}: {
  title: string;
  leadIcon?: ReactNode;
  leadCopy?: ReactNode;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <article className="luxury-feedback-client-page__card luxury-surface-card" aria-label={ariaLabel}>
      <div className="luxury-feedback-client-page__card-glow" aria-hidden />
      <header className="luxury-feedback-client-page__card-head">
        <h2 className="luxury-feedback-client-page__card-title">{title}</h2>
        {leadCopy ? (
          <p className="luxury-feedback-client-page__card-lead">
            {leadIcon ? (
              <span className="luxury-feedback-client-page__card-lead-icon" aria-hidden>
                {leadIcon}
              </span>
            ) : null}
            <span className="luxury-feedback-client-page__card-lead-copy">{leadCopy}</span>
          </p>
        ) : null}
      </header>
      <div className="luxury-feedback-client-page__card-body">{children}</div>
    </article>
  );
}

export function ClientAccountOptionalContentCard({
  enabled,
  title,
  leadIcon,
  leadCopy,
  children,
  ariaLabel,
}: {
  enabled: boolean;
  title: string;
  leadIcon?: ReactNode;
  leadCopy?: ReactNode;
  children: ReactNode;
  ariaLabel: string;
}) {
  if (!enabled) {
    return <>{children}</>;
  }
  return (
    <ClientAccountContentCard title={title} leadIcon={leadIcon} leadCopy={leadCopy} ariaLabel={ariaLabel}>
      {children}
    </ClientAccountContentCard>
  );
}
