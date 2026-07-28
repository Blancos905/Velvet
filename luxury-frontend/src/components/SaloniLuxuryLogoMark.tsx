import "../styles/saloni-luxury-mark.css";

const LOGO = "/logo-saloni-luxury.png";

type Props = {
  /** `default` sotto al back link; `hero` centrato sopra il titolo (pagina piani). */
  variant?: "default" | "hero";
};

export function SaloniLuxuryLogoMark({ variant = "default" }: Props) {
  return (
    <div
      className={`saloni-luxury-mark${variant === "hero" ? " saloni-luxury-mark--hero" : ""}`}
      aria-label="Saloni Luxury"
    >
      <img className="saloni-luxury-mark__logo" src={LOGO} alt="" width={96} height={96} decoding="async" />
      <div className="saloni-luxury-mark__text">
        <span className="saloni-luxury-mark__saloni">Saloni</span>
        <span className="saloni-luxury-mark__luxury">Luxury</span>
      </div>
    </div>
  );
}
