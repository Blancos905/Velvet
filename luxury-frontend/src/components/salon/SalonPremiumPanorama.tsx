import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart2,
  Bell,
  CheckCircle2,
  ChevronRight,
  Circle,
  Crown,
  Globe,
  PartyPopper,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  SALON_PREMIUM_PANORAMA_FEATURES,
  SALON_PREMIUM_PANORAMA_PLAN_SUBLINE,
  SALON_PREMIUM_PANORAMA_STEPS,
} from "../../data/salonPremiumPanoramaContent";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import { SaloniLuxuryLogoMark } from "../SaloniLuxuryLogoMark";
import "../../styles/salon-premium-panorama.css";

const HUB_BODY_PAD_X = "clamp(0.35rem, 1.2vw, 0.65rem)";
const HUB_BODY_PAD_TOP = "clamp(0.35rem, 1.5vh, 1rem)";

const CHECKLIST_STORAGE_KEY = "luxury.salon.panorama.checklist.v2";

/** Checklist su `/partner` (non mescolare con i dati dell’area account titolare). */
export const SALON_PREMIUM_PANORAMA_PARTNER_CHECKLIST_KEY = "luxury.salon.panorama.checklist.partner-public";

const pageShell: CSSProperties = {
  background: "#ea580c",
  marginLeft: `calc(-1 * ${HUB_BODY_PAD_X})`,
  marginRight: `calc(-1 * ${HUB_BODY_PAD_X})`,
  marginTop: `calc(-1 * ${HUB_BODY_PAD_TOP})`,
  paddingLeft: HUB_BODY_PAD_X,
  paddingRight: HUB_BODY_PAD_X,
  paddingTop: "clamp(1rem, 3vw, 1.75rem)",
  paddingBottom: "clamp(1.25rem, 3vw, 2rem)",
};

/** Area account con hero condiviso: niente full-bleed arancio. */
const pageShellSalonSide: CSSProperties = {
  background: "transparent",
  margin: 0,
  padding: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

/** Pagina pubblica (es. `/partner`): stesso arancio senza margini negativi dell’hub account. */
const pageShellPublic: CSSProperties = {
  background: "#ea580c",
  margin: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  paddingLeft: "clamp(0.5rem, 2vw, 1rem)",
  paddingRight: "clamp(0.5rem, 2vw, 1rem)",
  paddingTop: "clamp(0.25rem, 1.5vh, 0.75rem)",
  paddingBottom: "clamp(1rem, 3vw, 2rem)",
};

type FeatureDef = {
  text: string;
  detail: string;
  icon: LucideIcon;
  /** Card CTA nell’accordion: stessi token/hover delle card link. */
  cta?: { title: string; to: string; desc?: string };
};

const FEATURE_ICONS: LucideIcon[] = [Globe, Bell, Users, BarChart2];

/** Allineato a `salonPremiumPanoramaContent` e alle schermate reali. */
const features: FeatureDef[] = SALON_PREMIUM_PANORAMA_FEATURES.map((f, i) => ({
  ...f,
  icon: FEATURE_ICONS[i] ?? Globe,
}));

type StepDef = { id: string; text: string; actionLabel: string; to: string };

const steps: StepDef[] = [...SALON_PREMIUM_PANORAMA_STEPS];

function readStoredChecklist(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeStoredChecklist(storageKey: string, done: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...done]));
  } catch {
    /* ignore quota */
  }
}

function FeatureAccordion({
  f,
  i,
  isOpen,
  onToggle,
}: {
  f: FeatureDef;
  i: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = f.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="border-b border-white/[0.06] last:border-b-0"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`salon-premium-panorama__feature${isOpen ? " salon-premium-panorama__feature--open" : ""}`}
      >
        <span className="salon-premium-panorama__feature-icon">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="salon-premium-panorama__feature-body">
          <span className="salon-premium-panorama__feature-text">{f.text}</span>
        </span>
        <ChevronRight className="salon-premium-panorama__feature-chevron h-4 w-4 shrink-0" aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {f.cta ? (
              <Link
                to={f.cta.to}
                className="salon-premium-panorama__qlink salon-premium-panorama__feature-cta-card"
                aria-label={`${f.cta.title}: ${f.cta.desc ?? f.detail}`}
              >
                <div className="salon-premium-panorama__qlink-card">
                  <span className="salon-premium-panorama__qlink-icon">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="salon-premium-panorama__qlink-title">{f.cta.title}</p>
                  <p className="salon-premium-panorama__qlink-desc">{f.cta.desc ?? f.detail}</p>
                  <span className="salon-premium-panorama__qlink-cta">Apri →</span>
                </div>
              </Link>
            ) : (
              <div className="salon-premium-panorama__feature-detail-card">
                <p className="salon-premium-panorama__feature-detail">{f.detail}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StepRow({
  s,
  i,
  isDone,
  onToggle,
}: {
  s: StepDef;
  i: number;
  isDone: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="salon-premium-panorama__step"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isDone}
        title={isDone ? "Segna come da fare" : "Segna come fatto"}
        className={`salon-premium-panorama__check${isDone ? " salon-premium-panorama__check--done" : ""}`}
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 salon-premium-panorama__check-icon--done" />
        ) : (
          <Circle className="h-5 w-5 text-white/30" />
        )}
      </button>
      <p className={`salon-premium-panorama__step-text${isDone ? " salon-premium-panorama__step-text--done" : ""}`}>{s.text}</p>
      {isDone ? (
        <span className="salon-premium-panorama__step-done-label">Fatto</span>
      ) : (
        <Link to={s.to} className="salon-premium-panorama__step-link">
          {s.actionLabel}
        </Link>
      )}
    </motion.div>
  );
}

export type SalonPremiumPanoramaProps = {
  salonName: string;
  planLabel: string;
  planTagline: string;
  planPriceLine?: string | null;
  showProvisionWarning: boolean;
  /** Default `hub`: margini negativi per corpo account. `public` per `/partner`. */
  layoutVariant?: "hub" | "public";
  /** Tema azzurro account (hero esterno); disattiva shell arancio e saluto duplicato. */
  salonSide?: boolean;
  /** Chiave localStorage checklist (default checklist titolare in app). */
  checklistStorageKey?: string;
};

function planCardSubtitle(planLabel: string, planTagline: string): string {
  if (planLabel.toLowerCase().includes("premium")) {
    return SALON_PREMIUM_PANORAMA_PLAN_SUBLINE;
  }
  const t = planTagline.trim();
  if (t.length <= 90) return t;
  return `${t.slice(0, 87)}…`;
}

export function SalonPremiumPanorama({
  salonName,
  planLabel,
  planTagline,
  planPriceLine,
  showProvisionWarning,
  layoutVariant = "hub",
  salonSide = false,
  checklistStorageKey = CHECKLIST_STORAGE_KEY,
}: SalonPremiumPanoramaProps) {
  const t = useLuxuryT();
  const [done, setDone] = useState<Set<string>>(() => readStoredChecklist(checklistStorageKey));
  const [celebrated, setCelebrated] = useState(false);
  const [openFeature, setOpenFeature] = useState<number | null>(null);

  const shellStyle: CSSProperties = salonSide
    ? pageShellSalonSide
    : layoutVariant === "public"
      ? pageShellPublic
      : pageShell;

  const toggle = useCallback(
    (id: string) => {
      setDone((p) => {
        const n = new Set(p);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        writeStoredChecklist(checklistStorageKey, n);
        return n;
      });
    },
    [checklistStorageKey],
  );

  useEffect(() => {
    if (done.size < steps.length) {
      setCelebrated(false);
      return;
    }
    setCelebrated(true);
    const t = window.setTimeout(() => setCelebrated(false), 4000);
    return () => window.clearTimeout(t);
  }, [done.size]);

  const progress = (done.size / steps.length) * 100;
  const displayName = salonName.trim() || "Il tuo salone";
  const planSub = planCardSubtitle(planLabel, planTagline);

  const toggleFeature = (index: number) => {
    setOpenFeature((prev) => (prev === index ? null : index));
  };

  return (
    <div
      className={`salon-premium-tw-scope salon-premium-panorama relative isolate font-inter text-white antialiased${
        salonSide ? " salon-premium-panorama--salon-side" : ""
      }`}
      style={shellStyle}
    >
      <div className="salon-premium-panorama__shell relative min-h-[min(100vh,920px)]">
        <div className="salon-premium-panorama__inner relative z-[1] mx-auto w-full px-2 sm:px-4">
          <div
            className={`salon-premium-panorama__card-glow${
              layoutVariant === "public" ? " salon-premium-panorama__card-glow--public" : ""
            }`}
          >
            <motion.article
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`salon-premium-panorama__card salon-premium-panorama__card--rich overflow-hidden rounded-[1.42rem] px-5 pb-6 pt-6 sm:rounded-[1.48rem] sm:px-8 sm:pb-9 sm:pt-8${
                layoutVariant === "public" ? " salon-premium-panorama__card--public" : ""
              }`}
            >
            <header className="space-y-4">
              <div className="salon-premium-panorama__brand-head flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="salon-premium-panorama__brand-mark min-w-0">
                  <SaloniLuxuryLogoMark />
                </div>
                {layoutVariant !== "public" ? (
                  <span className="salon-premium-panorama__plan-badge shrink-0 self-start sm:mt-2">{planLabel}</span>
                ) : null}
              </div>
              {!salonSide ? (
                <h1
                  className={`salon-premium-panorama__title text-2xl sm:text-3xl${
                    layoutVariant === "public" ? " salon-premium-panorama__title--public-headline" : ""
                  }`}
                >
                  {layoutVariant === "public" ? displayName : <>Ciao {displayName}</>}
                </h1>
              ) : null}
            </header>

            {layoutVariant === "public" ? (
              <section className="salon-premium-panorama__well salon-premium-panorama__well--public mt-7 p-4">
                <Link
                  to="/piani"
                  className="salon-premium-panorama__cta salon-premium-panorama__cta--plan-pick inline-flex w-full justify-center py-3 text-sm font-extrabold sm:py-3.5 sm:text-base"
                >
                  {t("header.partnerProceed")}
                  <ArrowRight className="relative z-[1] h-3.5 w-3.5 shrink-0" aria-hidden />
                </Link>
              </section>
            ) : (
              <section className="salon-premium-panorama__well mt-7 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Il tuo piano</p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="salon-premium-panorama__plan-icon">
                      <Crown className="h-5 w-5 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black text-white sm:text-xl">{planLabel}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/55 sm:text-sm">{planSub}</p>
                      {planPriceLine ? <p className="mt-2 text-xs text-white/40">{planPriceLine}</p> : null}
                      {showProvisionWarning ? (
                        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/50 px-2.5 py-2 text-xs leading-snug text-amber-100/95">
                          Piano in sincronizzazione: controlla da{" "}
                          <Link to="/piani" className="font-semibold text-amber-50 underline underline-offset-2">
                            Piani
                          </Link>
                          .
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Link to="/piani" className="salon-premium-panorama__cta self-start sm:self-center">
                    Gestisci
                    <ArrowRight className="relative z-[1] h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </section>
            )}

            <section className="mt-7" aria-label="Quattro aree funzionali">
              <div className="salon-premium-panorama__section-head">
                <span className="salon-premium-panorama__chip">4 aree</span>
              </div>
              <div className="salon-premium-panorama__feature-list">
                {features.map((f, i) => (
                  <FeatureAccordion
                    key={f.text}
                    f={f}
                    i={i}
                    isOpen={openFeature === i}
                    onToggle={() => toggleFeature(i)}
                  />
                ))}
              </div>
            </section>

            <section className="mt-7" aria-label="Checklist attivazione salone">
              <AnimatePresence>
                {celebrated && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className="salon-premium-panorama__toast"
                  >
                    <PartyPopper className="h-4 w-4 shrink-0 salon-premium-panorama__toast-icon" aria-hidden />
                    <span className="text-xs font-semibold salon-premium-panorama__toast-text">
                      Ottimo lavoro! Checklist completata.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="salon-premium-panorama__progress-track mb-4 mt-1">
                <motion.div
                  className="salon-premium-panorama__progress-fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>

              <div className="salon-premium-panorama__step-wrap">
                {steps.map((s, i) => (
                  <StepRow key={s.id} s={s} i={i} isDone={done.has(s.id)} onToggle={() => toggle(s.id)} />
                ))}
              </div>
            </section>
            </motion.article>
          </div>
        </div>
      </div>
    </div>
  );
}
