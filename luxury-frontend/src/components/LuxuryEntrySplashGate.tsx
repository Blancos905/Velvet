import { useState, type ReactNode } from "react";
import { LuxuryLoginSplash } from "./LuxuryLoginSplash";

export function LuxuryEntrySplashGate({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <LuxuryLoginSplash onDismiss={() => setShowSplash(false)} />;
  }

  return <>{children}</>;
}
