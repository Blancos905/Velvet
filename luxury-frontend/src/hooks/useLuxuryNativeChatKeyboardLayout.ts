import { useEffect } from "react";
import { isLuxuryNativeAppShell } from "./useLuxuryNativeAppShell";

/**
 * WebView mobile — thread chat: il pannello overlay segue il visualViewport così
 * header, messaggi e composer restano nel flex layout (niente position:fixed sul composer).
 */
export function useLuxuryNativeChatKeyboardLayout(active: boolean): void {
  useEffect(() => {
    if (!active || !isLuxuryNativeAppShell()) return;

    const root = document.documentElement;
    root.classList.add("luxury-native-chat-thread-active");

    const vv = window.visualViewport;

    const sync = () => {
      const height = Math.round(vv?.height ?? window.innerHeight);
      const top = Math.round(vv?.offsetTop ?? 0);
      const inset = Math.max(0, Math.round(window.innerHeight - height - top));

      root.style.setProperty("--luxury-vv-height", `${height}px`);
      root.style.setProperty("--luxury-vv-top", `${top}px`);
      root.style.setProperty("--luxury-keyboard-inset", `${inset}px`);
      root.classList.toggle("luxury-native-chat-keyboard-open", inset > 40);

      if (window.scrollY !== 0 || root.scrollTop !== 0 || document.body.scrollTop !== 0) {
        window.scrollTo(0, 0);
        root.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      root.classList.remove("luxury-native-chat-thread-active", "luxury-native-chat-keyboard-open");
      root.style.removeProperty("--luxury-vv-height");
      root.style.removeProperty("--luxury-vv-top");
      root.style.removeProperty("--luxury-keyboard-inset");
    };
  }, [active]);
}
