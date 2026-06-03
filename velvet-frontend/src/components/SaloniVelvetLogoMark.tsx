import "../styles/saloni-velvet-mark.css";

const LOGO = "/logo-saloni-velvet.png";

type Props = {
  /** `default` sotto al back link; `hero` centrato sopra il titolo (pagina piani). */
  variant?: "default" | "hero";
};

export function SaloniVelvetLogoMark({ variant = "default" }: Props) {
  return (
    <div
      className={`saloni-velvet-mark${variant === "hero" ? " saloni-velvet-mark--hero" : ""}`}
      aria-label="Saloni Luxury"
    >
      <img className="saloni-velvet-mark__logo" src={LOGO} alt="" width={96} height={96} decoding="async" />
      <div className="saloni-velvet-mark__text">
        <span className="saloni-velvet-mark__saloni">Saloni</span>
        <span className="saloni-velvet-mark__velvet">Luxury</span>
      </div>
    </div>
  );
}
