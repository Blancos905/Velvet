import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { PublicPanelHandoff } from "./PublicPanelHandoff";
import {
  currentSurface,
  isPublicSalonRegistrationPath,
  panelHomePath,
  panelKindForRoles,
  publicSurfaceDeniesPanelPath,
  readSurfaceLocation,
  surfaceForPath,
  surfaceRedirectUrl,
  urlForSurface,
} from "../lib/luxurySurfaces";

const PANEL_GUEST_PATHS = new Set(["/account", "/reimposta-password", "/conferma-email", "/auth/callback"]);

function barePath(pathname: string): string {
  return pathname.split("?")[0]?.split("#")[0]?.replace(/\/+$/, "") || "/";
}

/**
 * Home di ricerca: solo clienti.
 * Salone, dipendente e super admin vedono l'avviso e, se proseguono, il pannello si apre sull'altro indirizzo.
 * Cliente e ospite che chiedono il pannello dalla home tornano alla home.
 * Sugli host dei pannelli non c'è la home di ricerca.
 * L'app nativa resta una sola WebView: lì i ruoli non cambiano origine.
 */
export function SurfaceBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  const loc = {
    ...readSurfaceLocation(),
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  };

  if (isLuxuryNativeAppShell()) {
    return <>{children}</>;
  }

  const surface = currentSurface(loc);
  const roles = isAuthenticated
    ? { admin: isLuxurySuperAdmin, owner: isSalonTitolare, staff: isSalonStaff }
    : null;
  const roleKind = roles ? panelKindForRoles(roles) : null;
  const registrationOpen = isPublicSalonRegistrationPath(location.pathname);

  if (surface !== "public") {
    if (isAuthenticated && !roleKind) {
      window.location.replace(urlForSurface("public", "/", "", "", loc));
      return null;
    }
    if (surface === "admin" && (roleKind === "salon" || roleKind === "staff")) {
      window.location.replace(urlForSurface("salon", panelHomePath(roleKind), "", "", loc));
      return null;
    }
    if (surface === "salon" && roleKind === "admin") {
      window.location.replace(urlForSurface("admin", panelHomePath("admin"), "", "", loc));
      return null;
    }
    if (!isAuthenticated && !PANEL_GUEST_PATHS.has(barePath(location.pathname))) {
      return <Navigate to="/account" replace />;
    }
    if (isAuthenticated && roleKind && surfaceForPath(location.pathname) === "public") {
      return <Navigate to={panelHomePath(roleKind)} replace />;
    }
  }

  if (surface === "public" && !isLoading && roleKind && !registrationOpen) {
    const panel = roleKind === "admin" ? "admin" : "salon";
    return (
      <PublicPanelHandoff
        href={urlForSurface(panel, panelHomePath(roleKind), "", "", loc)}
        kind={roleKind}
      />
    );
  }

  if (surface === "public" && !isLoading && publicSurfaceDeniesPanelPath(location.pathname, roles)) {
    return <Navigate to="/" replace />;
  }

  const next = surfaceRedirectUrl(loc);
  if (next) {
    window.location.replace(next);
    return null;
  }
  return children;
}
