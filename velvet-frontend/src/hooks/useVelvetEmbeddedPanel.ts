import { useSearchParams } from "react-router-dom";

/** Pannello legale/info in WebView app: stesso contenuto web senza header/footer account. */
export function useVelvetEmbeddedPanel(): boolean {
  const [params] = useSearchParams();
  return params.get("embed") === "1";
}
