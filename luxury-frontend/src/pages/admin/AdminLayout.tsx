import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SuperAdminOverviewResponseDto } from "../../api/types";
import { useAdminAuth } from "../../auth/AdminAuthProvider";
import { useAdminSupportAlerts } from "../../hooks/useAdminSupportAlerts";
import { useLuxuryInAppSoundPrime } from "../../hooks/useLuxuryInAppSoundPrime";

export function AdminLayout() {
  const { pathname } = useLocation();
  const isProfilePage = pathname === "/admin/profilo" || pathname.endsWith("/admin/profilo");
  const { accessToken, isAdminSession, signOut } = useAdminAuth();
  useAdminSupportAlerts();
  useLuxuryInAppSoundPrime({
    accessToken,
    enabled: Boolean(accessToken && isAdminSession),
    pathname,
  });

  const overviewBadgeQ = useQuery({
    queryKey: ["admin", "overview", accessToken],
    enabled: Boolean(accessToken) && isAdminSession,
    staleTime: 15_000,
    refetchInterval: (q) => {
      const n = q.state.data?.supportInboxSalonUnreadCount ?? 0;
      return n > 0 ? 25_000 : 90_000;
    },
    queryFn: () =>
      apiJson<SuperAdminOverviewResponseDto>("/api/v1/admin/overview", {
        accessToken: accessToken!,
      }),
  });

  const salonUnread = Math.max(0, Math.floor(overviewBadgeQ.data?.supportInboxSalonUnreadCount ?? 0));
  const salonUnreadLabel = salonUnread > 99 ? "99+" : String(salonUnread);

  return (
    <div className="luxury-admin-shell luxury-admin-shell--luxury-plans">
      <header className="luxury-admin-header">
        <div className="luxury-admin-brand-block">
          <div className="luxury-admin-brand-title">Gestione piattaforma</div>
          <div className="luxury-admin-brand-sub">Super admin · Saloni Luxury</div>
        </div>
        {!isProfilePage ? (
          <nav className="luxury-admin-nav" aria-label="Sezioni pannello">
            <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? "is-active" : "")} end>
              Panoramica
            </NavLink>
            <NavLink
              to="/admin/messaggi"
              className={({ isActive }) => `luxury-admin-nav-link ${isActive ? "is-active" : ""}`}
              title="Messaggi inviati da titolari e staff salone dal modulo Assistenza"
              aria-label={
                salonUnread > 0 ? `Messaggi, ${salonUnread} richieste non lette dai saloni` : "Messaggi dai saloni"
              }
            >
              <span className="luxury-admin-nav-link__text">Messaggi</span>
              {salonUnread > 0 ? (
                <span className="luxury-admin-nav-badge" aria-hidden={true}>
                  {salonUnreadLabel}
                </span>
              ) : null}
            </NavLink>
            <NavLink
              to="/admin/assistenza"
              className={({ isActive }) => (isActive ? "is-active" : "")}
              title="Tutte le richieste dal modulo Assistenza (anche clienti)"
            >
              Assistenza
            </NavLink>
            <NavLink
              to="/admin/fatture"
              className={({ isActive }) => (isActive ? "is-active" : "")}
              title="Fatture elettroniche FatturaPA generate dai pagamenti Premium"
            >
              Fatture
            </NavLink>
            <NavLink to="/admin/profilo" className={({ isActive }) => (isActive ? "is-active" : "")}>
              Profilo
            </NavLink>
          </nav>
        ) : null}
        <div className="luxury-admin-header-actions">
          <button type="button" className="luxury-plan-cta luxury-admin-header-cta" onClick={() => signOut()}>
            Esci
          </button>
        </div>
      </header>
      <main className="luxury-admin-main">
        <Outlet />
      </main>
    </div>
  );
}
