let sharedContext: AudioContext | null = null;
let primed = false;
let alertLoopTimer: ReturnType<typeof setInterval> | null = null;
let vibrateLoopTimer: ReturnType<typeof setInterval> | null = null;

const ALERT_CYCLE_MS = 2_400;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedContext) return sharedContext;
  const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  sharedContext = new Ctx();
  return sharedContext;
}

/** Sblocca l'audio dopo un gesto utente (policy browser). */
export async function primeBookingAlertSound(): Promise<void> {
  const ctx = getContext();
  if (!ctx || primed) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  primed = ctx.state === "running";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playTone(ctx: AudioContext, frequency: number, startAt: number, durationSec: number, gainPeak: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.03);
}

/** Sequenza campanello (~1.8s) ripetuta fino a {@link stopBookingRequestAlertSound}. */
function playAlertCycle(ctx: AudioContext): void {
  const now = ctx.currentTime;
  playTone(ctx, 880, now + 0.02, 0.22, 0.24);
  playTone(ctx, 1175, now + 0.24, 0.26, 0.28);
  playTone(ctx, 988, now + 0.54, 0.22, 0.24);
  playTone(ctx, 1319, now + 0.8, 0.3, 0.26);
  playTone(ctx, 880, now + 1.16, 0.2, 0.2);
  playTone(ctx, 1175, now + 1.4, 0.24, 0.22);
}

function pulseVibration(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate([180, 90, 180, 90, 220]);
}

async function ensureContextRunning(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

/** Avvia suono ripetuto per alert salone/operatore (fermalo con stopBookingRequestAlertSound). */
export async function startBookingRequestAlertSound(): Promise<void> {
  if (prefersReducedMotion()) return;

  stopBookingRequestAlertSound();

  const ctx = getContext();
  if (!ctx) return;
  if (!(await ensureContextRunning(ctx))) return;

  const runCycle = () => {
    void ensureContextRunning(ctx).then((ok) => {
      if (ok) playAlertCycle(ctx);
    });
  };

  runCycle();
  pulseVibration();
  alertLoopTimer = setInterval(runCycle, ALERT_CYCLE_MS);
  vibrateLoopTimer = setInterval(pulseVibration, ALERT_CYCLE_MS);
}

/** Ferma suono e vibrazione dell'alert. */
export function stopBookingRequestAlertSound(): void {
  if (alertLoopTimer) {
    clearInterval(alertLoopTimer);
    alertLoopTimer = null;
  }
  if (vibrateLoopTimer) {
    clearInterval(vibrateLoopTimer);
    vibrateLoopTimer = null;
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(0);
  }
}

/** Segnale breve (~0.7s) per notifiche standard (cliente, admin, messaggi non urgenti). */
export async function playNotificationChime(): Promise<void> {
  if (prefersReducedMotion()) return;

  const ctx = getContext();
  if (!ctx) return;
  if (!(await ensureContextRunning(ctx))) return;

  const now = ctx.currentTime;
  playTone(ctx, 660, now + 0.02, 0.18, 0.18);
  playTone(ctx, 880, now + 0.2, 0.22, 0.2);
  playTone(ctx, 988, now + 0.44, 0.24, 0.16);
}

/** @deprecated Usa startBookingRequestAlertSound / stopBookingRequestAlertSound */
export async function playBookingRequestAlertSound(): Promise<void> {
  await startBookingRequestAlertSound();
}
