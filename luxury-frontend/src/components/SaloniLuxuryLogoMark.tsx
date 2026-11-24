import "../styles/saloni-luxury-mark.css";

const LOGO = "/logo-saloni-luxury.png";

type Props = {
  /** `default` sotto al back link; `hero` centrato sopra il titolo (pagina piani). */
  variant?: "default" | "hero";
  /**
   * Hub account in WebView: logo + wordmark ridotti.
   * Non usa `html.luxury-native-app` (può arrivare dopo il primo paint).
   */
  compact?: boolean;
};

export function SaloniLuxuryLogoMark({ variant = "default", compact = false }: Props) {
  const logoPx = compact ? 42 : 96;
  return (
    <div
      className={[
        "saloni-luxury-mark",
        variant === "hero" ? "saloni-luxury-mark--hero" : null,
        compact ? "saloni-luxury-mark--compact" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Saloni Luxury"
    >
      <img
        className="saloni-luxury-mark__logo"
        src={LOGO}
        alt=""
        width={logoPx}
        height={logoPx}
        decoding="async"
        style={compact ? { width: logoPx, height: logoPx } : undefined}
      />
      <div className="saloni-luxury-mark__text">
        <span className="saloni-luxury-mark__saloni">Saloni</span>
        <span className="saloni-luxury-mark__luxury">Luxury</span>
      </div>
    </div>
  );
}
