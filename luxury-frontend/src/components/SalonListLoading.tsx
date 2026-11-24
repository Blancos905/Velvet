type SalonListLoadingProps = {
  label: string;
};

/** Pannello di attesa nel vuoto tra il titolo e l'elenco saloni. */
export function SalonListLoading({ label }: SalonListLoadingProps) {
  return (
    <div className="luxury-salon-list-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="luxury-route-loading__panel">
        <div className="luxury-route-loading__glow luxury-route-loading__glow--a" aria-hidden />
        <div className="luxury-route-loading__glow luxury-route-loading__glow--b" aria-hidden />
        <div className="luxury-route-loading__logo-wrap">
          <div className="luxury-route-loading__ring" aria-hidden />
          <img
            className="luxury-route-loading__logo"
            src="/logo-saloni-luxury.png"
            alt=""
            width={76}
            height={76}
            decoding="async"
          />
        </div>
        <div className="luxury-route-loading__brand" aria-hidden>
          <span className="luxury-route-loading__brand-saloni">Saloni</span>
          <span className="luxury-route-loading__brand-luxury">Luxury</span>
        </div>
        <p className="luxury-route-loading__label">{label}</p>
        <div className="luxury-route-loading__progress" aria-hidden>
          <span className="luxury-route-loading__progress-fill" />
        </div>
      </div>
    </div>
  );
}
