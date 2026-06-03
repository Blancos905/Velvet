import { useEffect, useState } from "react";
import { apiUrl } from "../config/env";
import { fetchWithTimeout, isLikelyNetworkFetchError } from "../api/fetchWithTimeout";
import "../styles/velvet-dev-backend-banner.css";

type BackendReachability = "checking" | "ok" | "down";

/**
 * In dev, avvisa se le API non passano dal proxy Vite → Spring (:8080).
 * Tipico quando l'app WebView è avviata senza `./mvnw spring-boot:run`.
 */
export function VelvetDevBackendBanner() {
  const [status, setStatus] = useState<BackendReachability>(() =>
    import.meta.env.DEV ? "checking" : "ok",
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    let cancelled = false;

    const probe = async () => {
      try {
        const r = await fetchWithTimeout(apiUrl("/api/v1/public/organizations?limit=1"));
        if (!cancelled) {
          setStatus(r.ok ? "ok" : "down");
        }
      } catch {
        if (!cancelled) {
          setStatus("down");
        }
      }
    };

    void probe();
    const id = window.setInterval(() => {
      void probe();
    }, 25_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!import.meta.env.DEV || status !== "down") {
    return null;
  }

  return (
    <div className="velvet-dev-backend-banner" role="alert">
      <strong>Backend non raggiungibile.</strong> Le API su{" "}
      <code>http://127.0.0.1:8080</code> non rispondono: l&apos;app resta lenta finché Spring Boot non è
      avviato. In un altro terminale:{" "}
      <code>cd velvet &amp;&amp; ./mvnw spring-boot:run</code>
    </div>
  );
}
