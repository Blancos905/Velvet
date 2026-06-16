import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../config/env";
import { fetchWithTimeout } from "../api/fetchWithTimeout";
import { isVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import "../styles/velvet-dev-backend-banner.css";

type BackendReachability = "checking" | "ok" | "down";

/** Probe leggera; fallback su organizations se il backend non ha ancora /public/health. */
const BACKEND_PROBE_PATHS = [
  "/api/v1/public/health",
  "/api/v1/public/organizations?limit=1",
] as const;
const POLL_WHEN_OK_MS = 30_000;
const POLL_WHEN_DOWN_MS = 3_000;
/** Ritarda la prima probe: la WebView iOS può non essere pronta subito dopo load. */
const INITIAL_PROBE_DELAY_MS = 1_500;
/** Evita banner «down» per un singolo timeout durante l'avvio di Spring. */
const FAILURES_BEFORE_DOWN = 2;

async function probeBackendOnce(): Promise<boolean> {
  for (const path of BACKEND_PROBE_PATHS) {
    try {
      const r = await fetchWithTimeout(apiUrl(path), { cache: "no-store" });
      if (r.ok) {
        return true;
      }
      if (r.status === 404 && path.endsWith("/health")) {
        continue;
      }
    } catch {
      /* prova path successivo */
    }
  }
  return false;
}

/**
 * In dev browser, avvisa se le API non passano dal proxy Vite → Spring (:8080).
 * Nell'app mobile (WebView) è nascosto: lo script dev verifica già backend + proxy.
 */
export function VelvetDevBackendBanner() {
  const [status, setStatus] = useState<BackendReachability>(() =>
    import.meta.env.DEV && !isVelvetNativeAppShell() ? "checking" : "ok",
  );
  const timerRef = useRef<number | null>(null);
  const failureStreakRef = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV || isVelvetNativeAppShell()) {
      return;
    }

    let cancelled = false;

    const scheduleNext = (down: boolean, delayMs?: number) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(
        () => {
          void runProbe();
        },
        delayMs ?? (down ? POLL_WHEN_DOWN_MS : POLL_WHEN_OK_MS),
      );
    };

    const runProbe = async () => {
      const ok = await probeBackendOnce();
      if (cancelled) {
        return;
      }
      if (ok) {
        failureStreakRef.current = 0;
        setStatus("ok");
        scheduleNext(false);
        return;
      }
      failureStreakRef.current += 1;
      if (failureStreakRef.current >= FAILURES_BEFORE_DOWN) {
        setStatus("down");
      }
      scheduleNext(true);
    };

    timerRef.current = window.setTimeout(() => {
      void runProbe();
    }, INITIAL_PROBE_DELAY_MS);

    return () => {
      cancelled = true;
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!import.meta.env.DEV || isVelvetNativeAppShell() || status === "ok") {
    return null;
  }

  if (status === "checking") {
    return (
      <div className="velvet-dev-backend-banner velvet-dev-backend-banner--checking" role="status">
        Connessione al backend in corso…
      </div>
    );
  }

  return (
    <div className="velvet-dev-backend-banner" role="alert">
      <strong>Backend non raggiungibile.</strong> Le API via proxy Vite (
      <code>/api</code> → <code>http://127.0.0.1:8080</code>) non rispondono: l&apos;app resta lenta
      finché Spring Boot non è avviato. In un altro terminale:{" "}
      <code>cd velvet &amp;&amp; ./mvnw spring-boot:run</code>
      <span className="velvet-dev-backend-banner__hint"> — oppure usa </span>
      <code>./scripts/dev-app-ios.sh</code>
      <span className="velvet-dev-backend-banner__hint"> (avvio automatico).</span>
    </div>
  );
}
