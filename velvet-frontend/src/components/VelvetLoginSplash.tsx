import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import "../styles/luxury-login-splash.css";

const LOGO = "/logo-saloni-luxury.png";
const SPLASH_VISIBLE_MS = 1800;
const SPLASH_EXIT_S = 0.2;
const LOGO_ROTATION_MS = SPLASH_VISIBLE_MS;

type VelvetLoginSplashProps = {
  onDismiss?: () => void;
  /** Se impostato, lo splash è controllato dal parent (es. cambio sezione account). */
  active?: boolean;
};

export function VelvetLoginSplash({ onDismiss, active }: VelvetLoginSplashProps) {
  const isControlled = active !== undefined;
  const [entryVisible, setEntryVisible] = useState(true);
  const show = isControlled ? active : entryVisible;

  useEffect(() => {
    if (isControlled) return undefined;
    const timer = window.setTimeout(() => setEntryVisible(false), SPLASH_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [isControlled]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!show) onDismiss?.();
      }}
    >
      {show ? (
        <motion.div
          key="luxury-login-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: SPLASH_EXIT_S, ease: "easeInOut" }}
          aria-hidden
          className={["luxury-login-splash", isControlled ? "luxury-login-splash--elevated" : null]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="luxury-login-splash__scene" aria-hidden>
            <div className="luxury-login-splash__bg-shift" />
            <div className="luxury-login-splash__bg-mesh" />
            <div className="luxury-login-splash__bg-orb luxury-login-splash__bg-orb--a" />
            <div className="luxury-login-splash__bg-orb luxury-login-splash__bg-orb--b" />
            <div className="luxury-login-splash__bg-orb luxury-login-splash__bg-orb--c" />
            <div className="luxury-login-splash__bg-ring" />
            <div className="luxury-login-splash__bg-line luxury-login-splash__bg-line--left" />
            <div className="luxury-login-splash__bg-line luxury-login-splash__bg-line--right" />
            <div className="luxury-login-splash__bg-vignette" />
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{
              scale: { duration: 0.45, ease: [0.34, 1.2, 0.64, 1] },
              opacity: { duration: 0.45, ease: "easeOut" },
              rotate: { duration: LOGO_ROTATION_MS / 1000, ease: "linear" },
            }}
            className="luxury-login-splash__badge"
          >
            <div className="luxury-login-splash__badge-halo" aria-hidden />
            <div className="luxury-login-splash__badge-content">
              <div className="luxury-login-splash__logo-shell">
                <img className="luxury-login-splash__logo" src={LOGO} alt="" width={160} height={160} decoding="async" />
              </div>
              <div className="luxury-login-splash__text">
                <span className="luxury-login-splash__saloni">Saloni</span>
                <span className="luxury-login-splash__velvet">Luxury</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
