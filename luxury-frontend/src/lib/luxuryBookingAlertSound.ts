let sharedContext: AudioContext | null = null;
let unlockListenersInstalled = false;
let pendingRequestSound = false;
let pendingNotificationChime = false;
let chimeFlushInFlight = false;
let lastChimePlayedAt = 0;
let alertSoundSuppressed = false;
/** AudioContext sbloccato da un gesto utente precedente (login, navigazione, tap). */
let operatorAlertSoundWarm = false;
/** True solo mentre il modale alert operatore è aperto. */
let operatorAlertSoundSessionActive = false;
let alertLoopTimer: ReturnType<typeof setInterval> | null = null;
let vibrateLoopTimer: ReturnType<typeof setInterval> | null = null;

const URGENT_ALERT_CYCLE_MS = 2_000;
const CHIME_DEBOUNCE_MS = 700;

type NavigatorWithActivation = Navigator & {
  userActivation?: { isActive?: boolean; hasBeenActive?: boolean };
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasUserActivation(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator as NavigatorWithActivation).userActivation;
  return Boolean(ua?.isActive || ua?.hasBeenActive);
}

function canPlayOperatorAlertSound(): boolean {
  return operatorAlertSoundSessionActive && !alertSoundSuppressed;
}

function disposeContext(): void {
  if (!sharedContext) return;
  try {
    void sharedContext.close();
  } catch {
    /* ignore */
  }
  sharedContext = null;
}

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedContext) return sharedContext;
  const Ctx =
    window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  sharedContext = new Ctx();
  return sharedContext;
}

function getContext(): AudioContext | null {
  return sharedContext;
}

function playSilentPrime(ctx: AudioContext): void {
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

async function ensureContextRunning(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === "closed") return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

async function suspendContext(): Promise<void> {
  const ctx = sharedContext;
  if (!ctx || ctx.state !== "running") return;
  try {
    await ctx.suspend();
  } catch {
    /* ignore */
  }
}

function installGlobalAudioUnlockListeners(): void {
  if (typeof document === "undefined" || unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  const onGesture = () => {
    void warmUpOperatorAlertSound(true).then((ok) => {
      if (!ok) return;
      if (operatorAlertSoundSessionActive && pendingRequestSound && canPlayOperatorAlertSound()) {
        void startBookingRequestAlertSoundInternal();
      }
      void flushPendingNotificationChime();
    });
  };

  document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  document.addEventListener("keydown", onGesture, { capture: true, passive: true });
  document.addEventListener("touchstart", onGesture, { capture: true, passive: true });
}

installGlobalAudioUnlockListeners();

/**
 * Prepara l'AudioContext al primo gesto utente (login, tap, navigazione) così l'alert
 * successivo può suonare subito senza attendere un secondo click sul modale.
 */
export async function warmUpOperatorAlertSound(force = false): Promise<boolean> {
  const mayCreate = force || hasUserActivation() || operatorAlertSoundWarm;

  if (!sharedContext && !mayCreate) {
    return false;
  }

  if (sharedContext?.state === "suspended" && !mayCreate) {
    return false;
  }

  if (sharedContext?.state === "closed") {
    disposeContext();
    operatorAlertSoundWarm = false;
  }

  const ctx = createContext();
  if (!ctx) return false;

  try {
    if (!(await ensureContextRunning(ctx))) {
      if (!mayCreate) return false;
      disposeContext();
      operatorAlertSoundWarm = false;
      return false;
    }
    playSilentPrime(ctx);
    operatorAlertSoundWarm = true;
    void flushPendingNotificationChime();
    return true;
  } catch {
    operatorAlertSoundWarm = false;
    return false;
  }
}

export function isOperatorAlertSoundWarm(): boolean {
  return operatorAlertSoundWarm && sharedContext?.state === "running";
}

/**
 * Sblocca l'audio per la sessione modale corrente e riproduce eventuale suono in coda.
 */
export async function primeBookingAlertSound(force = false): Promise<boolean> {
  if (!operatorAlertSoundSessionActive) return false;

  const warmed = await warmUpOperatorAlertSound(force || hasUserActivation());
  if (!warmed) return false;

  if (pendingRequestSound && canPlayOperatorAlertSound()) {
    pendingRequestSound = false;
    await startBookingRequestAlertSoundInternal();
  }
  return true;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  gainPeak: number,
  waveType: OscillatorType = "square",
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = waveType;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

function playUrgentRequestCycle(ctx: AudioContext): void {
  if (!canPlayOperatorAlertSound()) return;
  const now = ctx.currentTime;
  const pairs: Array<[number, number]> = [
    [1047, 0.02],
    [784, 0.18],
    [1047, 0.34],
    [784, 0.5],
    [1175, 0.72],
    [988, 0.9],
    [1175, 1.08],
    [988, 1.26],
  ];
  for (const [frequency, offset] of pairs) {
    playTone(ctx, frequency, now + offset, 0.12, 0.38, "square");
  }
}

function pulseVibration(pattern: number | number[] = [200, 80, 200, 80, 260]): void {
  if (!canPlayOperatorAlertSound()) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

function clearAlertTimers(): void {
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

async function startBookingRequestAlertSoundInternal(): Promise<void> {
  if (prefersReducedMotion() || !canPlayOperatorAlertSound()) return;

  clearAlertTimers();

  const ctx = getContext();
  if (!ctx || !(await ensureContextRunning(ctx))) {
    if (canPlayOperatorAlertSound()) pendingRequestSound = true;
    return;
  }

  const runCycle = () => {
    if (!canPlayOperatorAlertSound()) {
      clearAlertTimers();
      void suspendContext();
      return;
    }
    void ensureContextRunning(ctx).then((ok) => {
      if (ok && canPlayOperatorAlertSound()) playUrgentRequestCycle(ctx);
    });
  };

  runCycle();
  pulseVibration();
  alertLoopTimer = setInterval(runCycle, URGENT_ALERT_CYCLE_MS);
  vibrateLoopTimer = setInterval(pulseVibration, URGENT_ALERT_CYCLE_MS);
}

/** Apre la sessione suono legata al modale alert operatore. */
export function beginOperatorAlertSoundSession(): void {
  operatorAlertSoundSessionActive = true;
  alertSoundSuppressed = false;
  pendingRequestSound = false;
}

/** Chiude la sessione e ferma subito suono/vibrazione. */
export function endOperatorAlertSoundSession(): void {
  operatorAlertSoundSessionActive = false;
  stopBookingRequestAlertSound();
}

/** Avvia suono ripetuto per richieste prenotazione (fermalo con stopBookingRequestAlertSound). */
export async function startBookingRequestAlertSound(): Promise<void> {
  if (prefersReducedMotion() || !canPlayOperatorAlertSound()) return;

  await warmUpOperatorAlertSound(hasUserActivation() || operatorAlertSoundWarm);

  if (!canPlayOperatorAlertSound()) return;

  if (!getContext() || !(await ensureContextRunning(getContext()!))) {
    pendingRequestSound = true;
    return;
  }

  await startBookingRequestAlertSoundInternal();
}

/** @deprecated Usa beginOperatorAlertSoundSession */
export function armBookingRequestAlertSound(): void {
  beginOperatorAlertSoundSession();
}

export function isBookingRequestAlertSoundPlaying(): boolean {
  return alertLoopTimer !== null;
}

export function isOperatorAlertSoundSessionActive(): boolean {
  return operatorAlertSoundSessionActive;
}

/** Ferma suono e vibrazione dell'alert (senza chiudere la sessione). */
export function stopBookingRequestAlertSound(): void {
  pendingRequestSound = false;
  alertSoundSuppressed = true;
  clearAlertTimers();
  void suspendContext();
}

/** Segnale alert breve per notifiche salone informative (disdetta, avvisi titolare). */
async function playChimeWithContext(ctx: AudioContext): Promise<void> {
  const now = ctx.currentTime;
  const tones = [988, 988, 784, 1047];
  tones.forEach((frequency, index) => {
    playTone(ctx, frequency, now + 0.02 + index * 0.17, 0.1, 0.34, "square");
  });
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([160, 70, 160]);
  }
  lastChimePlayedAt = Date.now();
}

async function flushPendingNotificationChime(): Promise<void> {
  if (!pendingNotificationChime || chimeFlushInFlight || prefersReducedMotion()) return;
  chimeFlushInFlight = true;
  try {
    const ctx = getContext();
    if (!ctx || !(await ensureContextRunning(ctx))) return;
    if (Date.now() - lastChimePlayedAt < CHIME_DEBOUNCE_MS) {
      pendingNotificationChime = false;
      return;
    }
    pendingNotificationChime = false;
    await playChimeWithContext(ctx);
  } finally {
    chimeFlushInFlight = false;
  }
}

export async function playNotificationChime(): Promise<void> {
  if (prefersReducedMotion()) return;
  if (Date.now() - lastChimePlayedAt < CHIME_DEBOUNCE_MS) return;

  await warmUpOperatorAlertSound(hasUserActivation() || operatorAlertSoundWarm || pendingNotificationChime);

  const ctx = getContext();
  if (!ctx || !(await ensureContextRunning(ctx))) {
    pendingNotificationChime = true;
    return;
  }

  pendingNotificationChime = false;
  await playChimeWithContext(ctx);
}

/** Sblocca audio in-app e riproduce eventuale chime in coda (dopo login o tap). */
export async function primeInAppAlertSound(force = false): Promise<boolean> {
  const warmed = await warmUpOperatorAlertSound(force || hasUserActivation() || operatorAlertSoundWarm);
  if (!warmed) return false;
  await flushPendingNotificationChime();
  return true;
}

/** Stesso segnale acustico per messaggi chat in-app (cliente, titolare, staff). */
export async function playChatMessageChime(): Promise<void> {
  await playNotificationChime();
}

/** @deprecated Usa startBookingRequestAlertSound / stopBookingRequestAlertSound */
export async function playBookingRequestAlertSound(): Promise<void> {
  await startBookingRequestAlertSound();
}
