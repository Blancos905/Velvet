import { useEffect, useId, type ReactNode } from "react";
import "../styles/luxury-native-account-overlay.css";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Finestra account sopra la pagina corrente — solo app mobile (WebView). */
export function LuxuryNativeAccountOverlay({ title, onClose, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("luxury-native-account-overlay-open");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      root.classList.remove("luxury-native-account-overlay-open");
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="luxury-native-account-overlay" role="presentation">
      <button
        type="button"
        className="luxury-native-account-overlay__backdrop"
        aria-label="Chiudi pannello account"
        onClick={onClose}
      />
      <section
        className="luxury-native-account-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="luxury-native-account-overlay__bar">
          <button type="button" className="luxury-native-account-overlay__back" onClick={onClose}>
            <span className="luxury-native-account-overlay__back-icon" aria-hidden>
              ←
            </span>
            <span className="luxury-native-account-overlay__back-label">Indietro</span>
          </button>
          <h2 id={titleId} className="luxury-native-account-overlay__title">
            <span className="luxury-native-account-overlay__title-text">{title}</span>
          </h2>
          <button
            type="button"
            className="luxury-native-account-overlay__close"
            aria-label="Chiudi"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="luxury-native-account-overlay__body">{children}</div>
      </section>
    </div>
  );
}
