import { useState, type ReactNode } from "react";
import { VelvetLoginSplash } from "./VelvetLoginSplash";

export function VelvetEntrySplashGate({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <VelvetLoginSplash onDismiss={() => setShowSplash(false)} />;
  }

  return <>{children}</>;
}
