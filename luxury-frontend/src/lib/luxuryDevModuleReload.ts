const STALE_MODULE_RELOAD_KEY = "luxury_dev_stale_module_reload";

function shouldReloadForModuleError(reason: unknown): boolean {
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  return (
    msg.includes("Importing a module script failed") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Outdated Optimize Dep")
  );
}

/**
 * Dev / WebView: dopo 504 Vite «Outdated Optimize Dep» o import dinamico fallito,
 * ricarica la pagina una sola volta (Safari WebKit spesso non segue il full reload di @vite/client).
 */
export function installLuxuryDevModuleReload(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(STALE_MODULE_RELOAD_KEY) === "1") {
      sessionStorage.removeItem(STALE_MODULE_RELOAD_KEY);
      return;
    }
  } catch {
    /* ignore */
  }

  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(STALE_MODULE_RELOAD_KEY)) return;
      sessionStorage.setItem(STALE_MODULE_RELOAD_KEY, "1");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!shouldReloadForModuleError(event.reason)) return;
    event.preventDefault();
    reloadOnce();
  });
}
