import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import "../styles/velvet-login-splash.css";

const LOGO = "/logo-saloni-luxury.png";
const SPLASH_VISIBLE_MS = 1800;
const SPLASH_EXIT_S = 0.2;
const LOGO_ROTATION_MS = SPLASH_VISIBLE_MS;

type VelvetLoginSplashProps = {
  onDismiss: () => void;
};

export function VelvetLoginSplash({ onDismiss }: VelvetLoginSplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), SPLASH_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible ? (
        <motion.div
          key="velvet-login-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: SPLASH_EXIT_S, ease: "easeInOut" }}
          aria-hidden
          className="velvet-login-splash"
        >
          <div className="velvet-login-splash__scene" aria-hidden>
            <div className="velvet-login-splash__bg-shift" />
            <div className="velvet-login-splash__bg-mesh" />
            <div className="velvet-login-splash__bg-orb velvet-login-splash__bg-orb--a" />
            <div className="velvet-login-splash__bg-orb velvet-login-splash__bg-orb--b" />
            <div className="velvet-login-splash__bg-orb velvet-login-splash__bg-orb--c" />
            <div className="velvet-login-splash__bg-ring" />
            <div className="velvet-login-splash__bg-line velvet-login-splash__bg-line--left" />
            <div className="velvet-login-splash__bg-line velvet-login-splash__bg-line--right" />
            <div className="velvet-login-splash__bg-vignette" />
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{
              scale: { duration: 0.45, ease: [0.34, 1.2, 0.64, 1] },
              opacity: { duration: 0.45, ease: "easeOut" },
              rotate: { duration: LOGO_ROTATION_MS / 1000, ease: "linear" },
            }}
            className="velvet-login-splash__badge"
          >
            <div className="velvet-login-splash__badge-halo" aria-hidden />
            <div className="velvet-login-splash__badge-content">
              <div className="velvet-login-splash__logo-shell">
                <img className="velvet-login-splash__logo" src={LOGO} alt="" width={160} height={160} decoding="async" />
              </div>
              <div className="velvet-login-splash__text">
                <span className="velvet-login-splash__saloni">Saloni</span>
                <span className="velvet-login-splash__velvet">Luxury</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
