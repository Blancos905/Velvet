import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { OrganizationDetail, SalonCatalogClientRow, SalonClientMembershipDto } from "../../api/types";
import { useOptionalAdminAuth } from "../../auth/AdminAuthProvider";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { SaloniLuxuryLogoMark } from "../../components/SaloniLuxuryLogoMark";
import { VelvetNativeAccountOverlay } from "../../components/VelvetNativeAccountOverlay";
import { planDisplayName, parseSalonPlanTier } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useMeNotificationInboxQuery } from "../../hooks/useMeNotificationInbox";
import { useMePendingReviewInvitesQuery } from "../../hooks/useMePendingReviewInvites";
import { useMeSalonNotificationInboxQuery } from "../../hooks/useMeSalonNotificationInbox";
import { useMeSalonReviewsQuery } from "../../hooks/useMeSalonReviews";
import { useMeProfileQuery, resolveVelvetAccountGreetingName } from "../../hooks/useMeProfile";
import { useMeSalonChatUnreadQuery } from "../../hooks/useMeSalonChatUnread";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { useSalonShowcaseOwnerMigration } from "../../hooks/useSalonShowcaseOwnerMigration";
import { useMeStaffSalonQuery } from "../../hooks/useMeStaffSalon";
import { useVelvetEmbeddedPanel } from "../../hooks/useVelvetEmbeddedPanel";
import { isVelvetNativeAppShell } from "../../hooks/useVelvetNativeAppShell";
import { nativeAccountOverlayTitle } from "../../lib/nativeAccountOverlayTitle";
import {
  isNativeAccountHubPath,
  nativeAccountHubFallbackPath,
  normalizeAccountPath,
} from "../../lib/nativeAccountHubPaths";
import { readSalonClientsNavDebugEnabled } from "../../lib/salonClientsNavDebug";
import { subscribeSalonCatalogClientsInvalidate } from "../../lib/salonCatalogClientsSync";
import {
  computeNewSalonClientsBadge,
  readSalonClientsLastSeenCount,
  writeSalonClientsLastSeenCount,
} from "../../lib/salonClientsNavBadge";
import {
  computeNewTrustedSalonsBadge,
  readTrustedSalonsLastSeenCount,
  trustedSalonsAccountKey,
  writeTrustedSalonsLastSeenCount,
} from "../../lib/trustedSalonsNavBadge";
import {
  countUnseenClientReviewPending,
  markClientReviewPendingSeen,
} from "../../lib/clientReviewNotifications";
import {
  countUnreadSalonReviews,
  latestSalonReviewCreatedAt,
  readSalonReviewLastSeenAt,
  writeSalonReviewLastSeenAt,
} from "../../lib/salonReviewNotifications";
import { isSalonFreeOwnerBlockedOnWeb } from "../../lib/subscription-guards";
import { readSalonBrandingNameFromAccessToken } from "../../lib/velvetJwtHintsFromAccessToken";
import "../../styles/account-hub.css";
import "../../styles/account-hub-native-app.css";
import "../../styles/salon-notifications.css";
import { AccountHubNavOwnerConsumerLinks } from "./AccountHubNavOwnerConsumerLinks";
import { AccountHubNavPremiumSalonLinks } from "./AccountHubNavPremiumSalonLinks";
import { SalonFreeWebPanelGate } from "./SalonFreeWebPanelGate";
import { accountHubNavBtn as navBtn } from "./accountHubNavBtn";

export function AccountLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const embedded = useVelvetEmbeddedPanel();
  const isNativeApp = isVelvetNativeAppShell();
  const queryClient = useQueryClient();
  const { isSalonTitolare, isSalonStaff, isVelvetSuperAdmin, accessToken, userDisplayLabel, userEmail } = useVelvetAuth();
  const isAdminSession = useOptionalAdminAuth()?.isAdminSession ?? false;
  /** Sessione titolare emessa dal pannello super admin: JWT app senza ADMIN, token admin ancora in `sessionStorage`. */
  const isSuperAdminViewingAsSalonOwner = isAdminSession && isSalonTitolare && !isVelvetSuperAdmin;
  const salonTier = useEffectiveSalonPlanTier();
  const showPremiumSalonNav = isSalonTitolare && salonTier === "PREMIUM";
  const meSalon = useMeSalonSummaryQuery();
  useSalonShowcaseOwnerMigration();
  const slugForClientsBadgeFallback = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const orgForClientsBadgeFallbackQ = useQuery({
    queryKey: ["public", "organization", slugForClientsBadgeFallback],
    queryFn: () =>
      apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(slugForClientsBadgeFallback)}`),
    enabled: Boolean(
      showPremiumSalonNav && accessToken && slugForClientsBadgeFallback && !meSalon.data?.primaryLocationId,
    ),
  });
  const resolvedLocationIdForClientsBadge =
    meSalon.data?.primaryLocationId?.trim() || orgForClientsBadgeFallbackQ.data?.id || "";
  const clientsForBadgeQ = useQuery({
    queryKey: ["catalog", "clients", resolvedLocationIdForClientsBadge, accessToken],
    queryFn: () =>
      apiJson<SalonCatalogClientRow[]>("/api/v1/clients", {
        accessToken,
        headers: { "X-Location-Id": resolvedLocationIdForClientsBadge },
      }),
    enabled: Boolean(showPremiumSalonNav && accessToken && resolvedLocationIdForClientsBadge),
    refetchInterval: showPremiumSalonNav ? 3_000 : false,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    return subscribeSalonCatalogClientsInvalidate(() => {
      void queryClient.invalidateQueries({ queryKey: ["catalog", "clients"] });
    });
  }, [queryClient]);
  const [salonClientsBadgeLsTick, setSalonClientsBadgeLsTick] = useState(0);
  useEffect(() => {
    const locId = resolvedLocationIdForClientsBadge;
    const rows = clientsForBadgeQ.data;
    if (!locId || !Array.isArray(rows)) return;
    if (readSalonClientsLastSeenCount(locId) !== null) return;
    writeSalonClientsLastSeenCount(locId, rows.length);
    setSalonClientsBadgeLsTick((n) => n + 1);
  }, [resolvedLocationIdForClientsBadge, clientsForBadgeQ.data]);
  const salonClientsNavBadge = useMemo(() => {
    const locId = resolvedLocationIdForClientsBadge;
    const rows = clientsForBadgeQ.data;
    if (!locId || !Array.isArray(rows)) return 0;
    const last = readSalonClientsLastSeenCount(locId);
    return computeNewSalonClientsBadge(rows.length, last);
  }, [resolvedLocationIdForClientsBadge, clientsForBadgeQ.data, location.pathname, salonClientsBadgeLsTick]);
  const showSalonClientsNavPill =
    salonClientsNavBadge > 0 && location.pathname !== "/account/salone/clienti";
  const meProfile = useMeProfileQuery();
  const staffSalon = useMeStaffSalonQuery();
  const staffSalonMenuLabel = isSalonStaff
    ? staffSalon.isPending
      ? "…"
      : staffSalon.data?.salonDisplayName?.trim() || "Staff salone"
    : "";
  const staffSalonChatEligible =
    isSalonStaff &&
    Boolean(staffSalon.data?.primaryLocationId?.trim()) &&
    parseSalonPlanTier(staffSalon.data?.planTier) === "PREMIUM";
  const staffPrimaryLocationIdForBadge = staffSalon.data?.primaryLocationId?.trim() ?? "";
  const staffClientsForBadgeQ = useQuery({
    queryKey: ["catalog", "clients", staffPrimaryLocationIdForBadge, accessToken, "staff-nav-badge"],
    queryFn: () =>
      apiJson<SalonCatalogClientRow[]>("/api/v1/clients", {
        accessToken,
        headers: { "X-Location-Id": staffPrimaryLocationIdForBadge },
      }),
    enabled: Boolean(staffSalonChatEligible && accessToken && staffPrimaryLocationIdForBadge),
    refetchInterval: staffSalonChatEligible ? 3_000 : false,
    refetchIntervalInBackground: false,
  });
  const [staffSalonClientsBadgeLsTick, setStaffSalonClientsBadgeLsTick] = useState(0);
  useEffect(() => {
    const locId = staffPrimaryLocationIdForBadge;
    const rows = staffClientsForBadgeQ.data;
    if (!staffSalonChatEligible || !locId || !Array.isArray(rows)) return;
    if (readSalonClientsLastSeenCount(locId) !== null) return;
    writeSalonClientsLastSeenCount(locId, rows.length);
    setStaffSalonClientsBadgeLsTick((n) => n + 1);
  }, [staffSalonChatEligible, staffPrimaryLocationIdForBadge, staffClientsForBadgeQ.data]);
  const staffSalonClientsNavBadge = useMemo(() => {
    if (!staffSalonChatEligible || !staffPrimaryLocationIdForBadge) return 0;
    const rows = staffClientsForBadgeQ.data;
    if (!Array.isArray(rows)) return 0;
    const last = readSalonClientsLastSeenCount(staffPrimaryLocationIdForBadge);
    return computeNewSalonClientsBadge(rows.length, last);
  }, [
    staffSalonChatEligible,
    staffPrimaryLocationIdForBadge,
    staffClientsForBadgeQ.data,
    location.pathname,
    staffSalonClientsBadgeLsTick,
  ]);
  const showStaffSalonClientsNavPill =
    staffSalonClientsNavBadge > 0 && location.pathname !== "/account/salone/clienti";
  const salonReviews = useMeSalonReviewsQuery(
    !isVelvetSuperAdmin && ((isSalonTitolare && !isSalonStaff) || isSalonStaff),
  );
  const notifInbox = useMeSalonNotificationInboxQuery(isSalonTitolare || isSalonStaff);
  const consumerNotifInbox = useMeNotificationInboxQuery(!isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin);
  const pendingClientReviews = useMePendingReviewInvitesQuery(!isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin);
  /** In coda + inviate in evidenza (stesso totale mostrato nel centro notifiche). */
  const notifInboxAttentionTotal = useMemo(() => {
    const rows = notifInbox.data?.types;
    if (!rows?.length) return 0;
    return rows.reduce((acc, r) => {
      const p = Number(r.pending);
      const s = Number(r.sent);
      const pN = Number.isFinite(p) && p > 0 ? Math.floor(p) : 0;
      const sN = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
      return acc + pN + sN;
    }, 0);
  }, [notifInbox.data?.types]);

  /** Sul centro notifiche il numerino si nasconde: stai già guardando l’elenco; la lista resta com’è. */
  const showSalonNotificheNavPill =
    notifInboxAttentionTotal > 0
    && location.pathname !== "/account/salone/strumenti"
    && location.pathname !== "/account/notifiche";
  const lastAttentionTotalRef = useRef(0);
  const consumerNotifAttentionTotal = useMemo(() => {
    const rows = consumerNotifInbox.data?.types;
    if (!rows?.length) return 0;
    return rows.reduce((acc, r) => {
      const p = Number(r.pending);
      const s = Number(r.sent);
      const pN = Number.isFinite(p) && p > 0 ? Math.floor(p) : 0;
      const sN = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
      return acc + pN + sN;
    }, 0);
  }, [consumerNotifInbox.data?.types]);
  const showConsumerNotificheNavPill =
    consumerNotifAttentionTotal > 0 && location.pathname !== "/account/notifiche";
  const lastConsumerAttentionTotalRef = useRef(0);
  const salonReviewsNavEligible =
    !isVelvetSuperAdmin && ((isSalonTitolare && !isSalonStaff) || isSalonStaff);
  const [salonReviewBadgeLsTick, setSalonReviewBadgeLsTick] = useState(0);
  useEffect(() => {
    if (!salonReviewsNavEligible) return;
    const createdAts = salonReviews.data?.map((r) => r.createdAt).filter(Boolean) ?? [];
    const latest = latestSalonReviewCreatedAt(createdAts);
    if (!latest) return;
    if (location.pathname === "/account/feedback-velvet") {
      writeSalonReviewLastSeenAt(latest);
      setSalonReviewBadgeLsTick((n) => n + 1);
    }
  }, [salonReviewsNavEligible, salonReviews.data, location.pathname]);
  const salonReviewUnreadCount = useMemo(() => {
    const createdAts = salonReviews.data?.map((r) => r.createdAt).filter(Boolean) ?? [];
    return countUnreadSalonReviews(createdAts, readSalonReviewLastSeenAt());
  }, [salonReviews.data, salonReviewBadgeLsTick]);
  const showSalonReviewsNavPill =
    salonReviewsNavEligible && location.pathname !== "/account/feedback-velvet" && salonReviewUnreadCount > 0;

  const clientReviewsNavEligible = !isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin;
  const [clientReviewBadgeLsTick, setClientReviewBadgeLsTick] = useState(0);
  useEffect(() => {
    if (!clientReviewsNavEligible) return;
    const ids = pendingClientReviews.data?.map((r) => r.appointmentId).filter(Boolean) ?? [];
    if (!ids.length) return;
    if (location.pathname === "/account/feedback-velvet") {
      markClientReviewPendingSeen(ids);
      setClientReviewBadgeLsTick((n) => n + 1);
    }
  }, [clientReviewsNavEligible, pendingClientReviews.data, location.pathname]);
  const clientReviewPendingCount = useMemo(() => {
    const ids = pendingClientReviews.data?.map((r) => r.appointmentId).filter(Boolean) ?? [];
    return countUnseenClientReviewPending(ids);
  }, [pendingClientReviews.data, clientReviewBadgeLsTick]);
  const showClientReviewsNavPill =
    clientReviewsNavEligible && location.pathname !== "/account/feedback-velvet" && clientReviewPendingCount > 0;

  const chatUnreadQueryEnabled =
    !isVelvetSuperAdmin &&
    Boolean(accessToken) &&
    ((!isSalonTitolare && !isSalonStaff) || (isSalonTitolare && showPremiumSalonNav) || isSalonStaff);
  const chatUnreadSalonLocationId =
    isSalonTitolare && showPremiumSalonNav
      ? resolvedLocationIdForClientsBadge
      : isSalonStaff
        ? staffPrimaryLocationIdForBadge
        : null;
  const chatUnreadQ = useMeSalonChatUnreadQuery(chatUnreadQueryEnabled, chatUnreadSalonLocationId);
  const ownerChatUnread = chatUnreadQ.data?.ownerUnread ?? 0;
  const clientChatUnread = chatUnreadQ.data?.clientUnread ?? 0;
  const showClientChatNavPill =
    clientChatUnread > 0 &&
    location.pathname !== "/account/chat" &&
    !isVelvetSuperAdmin &&
    !isSalonStaff &&
    !isSalonTitolare;
  const showOwnerChatNavPill =
    ownerChatUnread > 0 &&
    location.pathname !== "/account/chat" &&
    !isVelvetSuperAdmin &&
    !isSalonStaff &&
    showPremiumSalonNav;
  const showStaffChatNavPill =
    staffSalonChatEligible &&
    ownerChatUnread > 0 &&
    location.pathname !== "/account/chat" &&
    !isVelvetSuperAdmin;

  const isConsumerAccountNav = !isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin;
  const trustedAccountKey = useMemo(
    () => trustedSalonsAccountKey(accessToken, userEmail),
    [accessToken, userEmail],
  );
  const trustedSalonMembershipsQ = useQuery({
    queryKey: ["me", "salon-clients", accessToken],
    queryFn: () => apiJson<SalonClientMembershipDto[]>("/api/v1/me/salon-clients", { accessToken }),
    enabled: Boolean(accessToken && isConsumerAccountNav),
  });
  const [trustedSalonsBadgeLsTick, setTrustedSalonsBadgeLsTick] = useState(0);
  useEffect(() => {
    if (!isConsumerAccountNav) return;
    const key = trustedAccountKey;
    const rows = trustedSalonMembershipsQ.data;
    if (!key || !Array.isArray(rows)) return;
    if (readTrustedSalonsLastSeenCount(key) === null) {
      writeTrustedSalonsLastSeenCount(key, rows.length);
      setTrustedSalonsBadgeLsTick((n) => n + 1);
      return;
    }
    if (location.pathname === "/account/saloni-di-fiducia") {
      writeTrustedSalonsLastSeenCount(key, rows.length);
      setTrustedSalonsBadgeLsTick((n) => n + 1);
    }
  }, [isConsumerAccountNav, trustedAccountKey, trustedSalonMembershipsQ.data, location.pathname]);
  const trustedSalonsNavBadge = useMemo(() => {
    const key = trustedAccountKey;
    const rows = trustedSalonMembershipsQ.data;
    if (!key || !Array.isArray(rows)) return 0;
    const last = readTrustedSalonsLastSeenCount(key);
    return computeNewTrustedSalonsBadge(rows.length, last);
  }, [trustedAccountKey, trustedSalonMembershipsQ.data, location.pathname, trustedSalonsBadgeLsTick]);
  const showTrustedSalonsNavPill =
    isConsumerAccountNav &&
    trustedSalonsNavBadge > 0 &&
    location.pathname !== "/account/saloni-di-fiducia";

  useEffect(() => {
    const prev = lastAttentionTotalRef.current;
    lastAttentionTotalRef.current = notifInboxAttentionTotal;
    const salonNotifEligible = showPremiumSalonNav || isSalonStaff;
    if (!salonNotifEligible) return;
    if (!isSalonStaff && location.pathname === "/account/salone/strumenti") return;
    if (isSalonStaff && location.pathname === "/account/notifiche") return;
    if (notifInboxAttentionTotal <= prev || notifInboxAttentionTotal <= 0) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    /** Il browser consente il prompt solo su gesture utente: qui notifichiamo solo se già autorizzato. */
    if (Notification.permission !== "granted") return;
    const delta = notifInboxAttentionTotal - prev;
    const qty = delta > 1 ? `${delta} nuove notifiche` : "Nuova notifica";
    void new Notification("Saloni Luxury — Notifiche", {
      body: `${qty} nel centro notifiche del salone.`,
      tag: "velvet-salon-notifications",
    });
  }, [isSalonStaff, location.pathname, notifInboxAttentionTotal, showPremiumSalonNav]);

  useEffect(() => {
    const prev = lastConsumerAttentionTotalRef.current;
    lastConsumerAttentionTotalRef.current = consumerNotifAttentionTotal;
    if (isSalonTitolare || isSalonStaff || isVelvetSuperAdmin || location.pathname === "/account/notifiche") return;
    if (consumerNotifAttentionTotal <= prev || consumerNotifAttentionTotal <= 0) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const delta = consumerNotifAttentionTotal - prev;
    const qty = delta > 1 ? `${delta} nuove notifiche` : "Nuova notifica";
    void new Notification("Saloni Luxury — Notifiche", {
      body: `${qty} nel tuo centro notifiche.`,
      tag: "velvet-consumer-notifications",
    });
  }, [consumerNotifAttentionTotal, isSalonStaff, isSalonTitolare, isVelvetSuperAdmin, location.pathname]);

  /** Nome salone da DB/JWT (mai profilo utente); `hasNamedSalon` false → copy breve senza nome commerciale. */
  const titolareSalonGreeting = useMemo(() => {
    const fromDb = meSalon.data?.primaryLocationName?.trim();
    if (fromDb) {
      return { salonName: fromDb, hasNamedSalon: true as const };
    }

    if (meSalon.isError) {
      return { salonName: "", hasNamedSalon: false as const, salonHint: "error" as const };
    }
    if (meSalon.isSuccess && meSalon.data?.provisioned === false) {
      return { salonName: "", hasNamedSalon: false as const, salonHint: "not_provisioned" as const };
    }

    const sameAsUserIdentity = (s: string) => {
      const t = s.trim().toLowerCase();
      const profileDn = meProfile.data?.displayName?.trim().toLowerCase();
      if (profileDn && t === profileDn) return true;
      const lab = userDisplayLabel?.trim().toLowerCase();
      if (lab && t === lab) return true;
      const em = userEmail?.trim();
      if (em?.includes("@")) {
        const local = em.split("@")[0]?.trim().toLowerCase();
        if (local && t === local) return true;
      }
      return false;
    };

    if (meSalon.isPending) {
      return { salonName: "", hasNamedSalon: false as const, salonHint: "pending" as const };
    }

    const fromToken = readSalonBrandingNameFromAccessToken(accessToken);
    if (fromToken && !sameAsUserIdentity(fromToken)) {
      return { salonName: fromToken, hasNamedSalon: true as const };
    }

    return { salonName: "", hasNamedSalon: false as const, salonHint: "unknown" as const };
  }, [
    accessToken,
    meProfile.data?.displayName,
    userDisplayLabel,
    userEmail,
    meSalon.data?.primaryLocationName,
    meSalon.data?.provisioned,
    meSalon.isPending,
    meSalon.isSuccess,
    meSalon.isError,
  ]);

  const consumerGreeting = useMemo(
    () => resolveVelvetAccountGreetingName(meProfile.data?.displayName),
    [meProfile.data?.displayName],
  );
  const meSalonErrorText = meSalon.error instanceof Error ? meSalon.error.message : "errore";
  const meSalonForbidden = /403|forbidden/i.test(meSalonErrorText);
  const accountHubUsesVelvetPlansTheme =
    isSalonTitolare || isSalonStaff || (!isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin);
  const isNativeHubScreen =
    isNativeApp && isNativeAccountHubPath(location.pathname);
  const accountHubClassName = [
    accountHubUsesVelvetPlansTheme ? "velvet-account-hub velvet-account-hub--velvet-plans" : "velvet-account-hub",
    isNativeHubScreen ? "velvet-account-hub--native-hub" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const isAccountSubRoute =
    location.pathname !== "/account" && location.pathname.startsWith("/account/");

  const hideNativeHubOutlet =
    isNativeHubScreen && normalizeAccountPath(location.pathname) === "/account/home";

  const closeNativeAccountOverlay = useCallback(() => {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate(
      nativeAccountHubFallbackPath({ isSalonTitolare, isSalonStaff, salonPlanTier: salonTier }),
      { replace: true },
    );
  }, [isSalonStaff, isSalonTitolare, location.key, navigate, salonTier]);

  if (embedded) {
    return (
      <div className="velvet-account-hub velvet-account-hub--embedded" aria-label="Pannello account incorporato">
        <Outlet />
      </div>
    );
  }

  const billingCheckoutPaths = ["/account/billing/checkout", "/account/billing/success"];
  const isBillingCheckoutRoute = billingCheckoutPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  const blockFreeOwnerWebPanel =
    isSalonTitolare && !isNativeApp && !isSuperAdminViewingAsSalonOwner && !isBillingCheckoutRoute;
  if (blockFreeOwnerWebPanel) {
    if (meSalon.isPending) {
      return (
        <main className="velvet-auth-page">
          <div className="velvet-auth-card">
            <p className="velvet-auth-loading">Caricamento account salone…</p>
          </div>
        </main>
      );
    }
    if (isSalonFreeOwnerBlockedOnWeb(meSalon.data)) {
      return <SalonFreeWebPanelGate />;
    }
  }

  if (isNativeApp && isAccountSubRoute && !isNativeHubScreen) {
    return (
      <VelvetNativeAccountOverlay
        title={nativeAccountOverlayTitle(location.pathname)}
        onClose={closeNativeAccountOverlay}
      >
        <Outlet />
      </VelvetNativeAccountOverlay>
    );
  }

  return (
    <div className={accountHubClassName} aria-label="Area account Luxury">
      <div className="velvet-account-hub__masthead">
        <div className="velvet-account-hub__masthead-inner">
          <div className="velvet-account-hub__top">
            {isSalonStaff ? (
              <span className="velvet-account-hub__plan velvet-account-hub__plan--staff">Staff salone</span>
            ) : isSalonTitolare ? (
              <span className="velvet-account-hub__plan">Piano {planDisplayName(salonTier)}</span>
            ) : isVelvetSuperAdmin ? (
              <span className="velvet-account-hub__plan velvet-account-hub__plan--admin">Amministratore</span>
            ) : (
              <span className="velvet-account-hub__plan velvet-account-hub__plan--client">Account cliente</span>
            )}
          </div>

          <header className="velvet-account-hub__welcome">
            <div className="velvet-account-hub__mark-wrap">
              <SaloniLuxuryLogoMark variant="default" />
            </div>
            <div className="velvet-account-hub__welcome-copy">
              <p className="velvet-account-hub__welcome-line">Benvenuto in Saloni Luxury</p>
              {isSalonStaff ? (
                <>
                  <p className="velvet-account-hub__reg">Accesso operatore</p>
                  <p
                    className="velvet-account-hub__welcome-line"
                    style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: "0.2rem", letterSpacing: "0.01em" }}
                  >
                    {staffSalon.isPending ? (
                      "Salone…"
                    ) : staffSalon.data?.salonDisplayName?.trim() ? (
                      <>
                        Salone <strong>{staffSalon.data.salonDisplayName.trim()}</strong>
                      </>
                    ) : staffSalon.isError ? (
                      <span style={{ fontWeight: 500, opacity: 0.88 }}>Nome salone non disponibile</span>
                    ) : (
                      <span style={{ fontWeight: 500, opacity: 0.88 }}>Salone non collegato al profilo</span>
                    )}
                  </p>
                  <p className="velvet-account-hub__greeting">
                    {consumerGreeting ? (
                      <>
                        Ciao <strong>{consumerGreeting}</strong>
                      </>
                    ) : (
                      "Ciao"
                    )}
                  </p>
                </>
              ) : isSalonTitolare ? (
                <>
                  <p className="velvet-account-hub__reg">Account titolare</p>
                  <p className="velvet-account-hub__greeting">
                    {consumerGreeting ? (
                      <>
                        Ciao <strong>{consumerGreeting}</strong>
                      </>
                    ) : (
                      "Ciao"
                    )}
                  </p>
                  {titolareSalonGreeting.hasNamedSalon ? (
                    <p className="velvet-account-hub__salon-name">
                      Salone <strong>{titolareSalonGreeting.salonName}</strong>
                    </p>
                  ) : "salonHint" in titolareSalonGreeting && titolareSalonGreeting.salonHint === "pending" ? (
                    <p className="velvet-text-muted" style={{ marginTop: "0.2rem", fontSize: "0.88rem" }}>
                      Caricamento nome commerciale…
                    </p>
                  ) : (
                    <p className="velvet-text-muted" style={{ marginTop: "0.2rem", fontSize: "0.88rem" }}>
                      Completa i dati pubblicati da «Il mio salone» quando sei pronto.
                    </p>
                  )}
                  {"salonHint" in titolareSalonGreeting && titolareSalonGreeting.salonHint === "error" ? (
                    <p className="velvet-account-hub__welcome-line" style={{ fontSize: "0.88rem", opacity: 0.85, marginTop: "0.35rem" }}>
                      {meSalonForbidden ? (
                        <>
                          Accesso negato su <code>/api/v1/me/salon</code> (403): il token attuale non ha ruolo titolare
                          (<code>OWNER</code>) o non e&apos; associato a un salone. Accedi con un account titolare (es.
                          <code>dev-owner@velvet.local</code>) e riprova.
                        </>
                      ) : (
                        <>
                          Non riusciamo a leggere i dati dal server (API <code>/api/v1/me/salon</code>). Controlla che Spring sia
                          attivo sulla porta configurata nel proxy Vite e che il token sessione sia valido; dettaglio:{" "}
                          {meSalonErrorText}
                        </>
                      )}
                    </p>
                  ) : null}
                  {"salonHint" in titolareSalonGreeting && titolareSalonGreeting.salonHint === "not_provisioned" ? (
                    <p className="velvet-account-hub__welcome-line" style={{ fontSize: "0.88rem", opacity: 0.85, marginTop: "0.35rem" }}>
                      Il database non ha un salone collegato a questo account (email di login ≠ <code>owner_email</code> oppure
                      registrazione <code>/piani</code> non ha creato la riga). Verifica email di login e che la registrazione sia
                      completata; con dati di test vecchi può servire riallineare il profilo titolare o creare un nuovo utente.
                    </p>
                  ) : null}
                </>
              ) : isVelvetSuperAdmin ? (
                <>
                  <p className="velvet-account-hub__welcome-line">Area account</p>
                  <p className="velvet-account-hub__reg">Super admin Saloni Luxury</p>
                  <p className="velvet-account-hub__greeting">
                    {consumerGreeting ? (
                      <>
                        Ciao <strong>{consumerGreeting}</strong>
                      </>
                    ) : (
                      "Ciao"
                    )}
                  </p>
                  <p className="velvet-account-hub__super-admin-lead">
                    Il lavoro quotidiano avviene nel <strong>pannello di gestione</strong> (metriche, utenti, stato
                    piattaforma). Qui sotto trovi l&apos;accesso rapido e, se serve, email e password in «Profilo e
                    sicurezza».
                  </p>
                </>
              ) : (
                <p className="velvet-account-hub__greeting">
                  {consumerGreeting ? (
                    <>
                      Ciao <strong>{consumerGreeting}</strong>
                    </>
                  ) : (
                    "Ciao"
                  )}
                </p>
              )}
            </div>
          </header>
        </div>
      </div>

      <nav className="velvet-account-hub__nav velvet-account-hub__nav--deck" aria-label="Navigazione area account">
        {isSuperAdminViewingAsSalonOwner ? (
          <>
            <span className="velvet-account-hub__nav-label">Super admin</span>
            <div className="velvet-account-hub__nav-scroll">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  "velvet-account-hub__btn velvet-account-hub__btn--admin" +
                  (isActive ? " velvet-account-hub__btn--active" : "")
                }
              >
                Torna al pannello super admin
              </NavLink>
            </div>
          </>
        ) : null}
        {isVelvetSuperAdmin ? (
          <>
            <span className="velvet-account-hub__nav-label">Super admin</span>
            <div className="velvet-account-hub__nav-scroll">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  "velvet-account-hub__btn velvet-account-hub__btn--admin" +
                  (isActive ? " velvet-account-hub__btn--active" : "")
                }
              >
                Pannello di gestione
              </NavLink>
              <NavLink to="/account/profilo" className={navBtn()}>
                Profilo e sicurezza
              </NavLink>
              <NavLink to="/account/notifiche" className={navBtn()}>
                Notifiche
              </NavLink>
              <NavLink to="/" className={navBtn("velvet-account-hub__btn--ghost")}>
                Sito pubblico
              </NavLink>
              <NavLink to="/account/info-privacy" className={navBtn()} title="Informazioni sul trattamento dati e privacy.">
                Info e privacy
              </NavLink>
              <NavLink to="/account/assistenza" className={navBtn()}>
                Assistenza
              </NavLink>
            </div>
          </>
        ) : null}
        {!isVelvetSuperAdmin && isSalonStaff ? (
          <>
            <span className="velvet-account-hub__nav-label" title="Salone per cui lavori come operatore">
              {staffSalonMenuLabel}
            </span>
            <div className="velvet-account-hub__nav-scroll velvet-account-hub__nav-scroll--consumer-grid">
              <NavLink to="/account/staff" end className={navBtn("velvet-account-hub__btn--sky")}>
                La mia agenda
              </NavLink>
              <NavLink to="/account/profilo" className={navBtn()}>
                Profilo
              </NavLink>
              <NavLink to="/account/feedback-velvet" className={navBtn()}>
                <span className="velvet-account-hub__btn-notif">
                  Recensioni
                  {showSalonReviewsNavPill ? (
                    <span className="velvet-account-hub__notif-pill" title="Nuove recensioni da consultare">
                      {salonReviewUnreadCount > 99 ? "99+" : salonReviewUnreadCount}
                    </span>
                  ) : null}
                </span>
              </NavLink>
              <NavLink to="/account/info-privacy" className={navBtn()} title="Informazioni sul trattamento dati e privacy.">
                Info e privacy
              </NavLink>
              <NavLink to="/account/notifiche" className={navBtn()}>
                <span className="velvet-account-hub__btn-notif">
                  Notifiche
                  {showSalonNotificheNavPill ? (
                    <span
                      className="velvet-account-hub__notif-pill"
                      title={`Da gestire in notifiche: ${notifInboxAttentionTotal} (in coda + inviate in evidenza)`}
                    >
                      {notifInboxAttentionTotal > 99 ? "99+" : notifInboxAttentionTotal}
                    </span>
                  ) : null}
                </span>
              </NavLink>
              {staffSalonChatEligible ? (
                <NavLink
                  to="/account/salone/clienti"
                  className={navBtn()}
                  title="Elenco clienti della tua sede; da ogni scheda apri la chat Luxury."
                >
                  <span className="velvet-account-hub__btn-notif">
                    Clienti
                    {showStaffSalonClientsNavPill ? (
                      <span
                        className="velvet-account-hub__notif-pill"
                        title={`Nuovi clienti da vedere: ${staffSalonClientsNavBadge}`}
                      >
                        {staffSalonClientsNavBadge > 99 ? "99+" : staffSalonClientsNavBadge}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              ) : null}
              <NavLink
                to="/account/chat"
                className={navBtn()}
                title="Messaggi con i clienti della sede (con piano Premium dello studio vedi le conversazioni; altrimenti una breve spiegazione in pagina)."
              >
                <span className="velvet-account-hub__btn-notif">
                  Chat
                  {showStaffChatNavPill ? (
                    <span className="velvet-account-hub__notif-pill" title={`Messaggi dai clienti: ${ownerChatUnread}`}>
                      {ownerChatUnread > 99 ? "99+" : ownerChatUnread}
                    </span>
                  ) : null}
                </span>
              </NavLink>
              <NavLink to="/account/assistenza" className={navBtn()}>
                Assistenza
              </NavLink>
            </div>
          </>
        ) : null}
        {!isVelvetSuperAdmin && !isSalonStaff && showPremiumSalonNav ? (
          <span className="velvet-account-hub__nav-label">Account Premium</span>
        ) : null}
        {!isVelvetSuperAdmin && !isSalonStaff ? (
          <>
            <AccountHubNavOwnerConsumerLinks
              isSalonTitolare={isSalonTitolare}
              showPremiumSalonNav={showPremiumSalonNav}
              notifInboxAttentionTotal={notifInboxAttentionTotal}
              showSalonNotificheNavPill={showSalonNotificheNavPill}
              consumerNotifAttentionTotal={consumerNotifAttentionTotal}
              showConsumerNotificheNavPill={showConsumerNotificheNavPill}
              clientChatUnread={clientChatUnread}
              showClientChatNavPill={showClientChatNavPill}
              salonReviewUnreadCount={salonReviewUnreadCount}
              clientReviewPendingCount={clientReviewPendingCount}
              showSalonReviewsNavPill={showSalonReviewsNavPill}
              showClientReviewsNavPill={showClientReviewsNavPill}
              salonClientsNavBadge={salonClientsNavBadge}
              showSalonClientsNavPill={showSalonClientsNavPill}
              ownerChatUnread={ownerChatUnread}
              showOwnerChatNavPill={showOwnerChatNavPill}
              trustedSalonsNavBadge={trustedSalonsNavBadge}
              showTrustedSalonsNavPill={showTrustedSalonsNavPill}
            />
            {showPremiumSalonNav ? <AccountHubNavPremiumSalonLinks /> : null}
          </>
        ) : null}
      </nav>

      <div className="velvet-account-hub__body">
        {!hideNativeHubOutlet ? <Outlet /> : null}
      </div>

      {readSalonClientsNavDebugEnabled() && isSalonTitolare && !isSalonStaff ? (
        <div
          role="status"
          aria-label="Debug badge clienti"
          className="velvet-debug-salon-clienti-nav"
          style={{
            position: "fixed",
            bottom: "0.75rem",
            left: "0.75rem",
            zIndex: 9999,
            maxWidth: "min(26rem, 94vw)",
            padding: "0.65rem 0.8rem",
            borderRadius: "12px",
            fontSize: "0.72rem",
            lineHeight: 1.45,
            color: "#ecfdf5",
            background: "rgba(15, 23, 42, 0.96)",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontWeight: 800, color: "#7dd3fc", marginBottom: "0.35rem" }}>velvet.debug.clienti</div>
          <div>resolvedLocationId: {resolvedLocationIdForClientsBadge || "—"}</div>
          <div>meSalon.primaryLocationId: {meSalon.data?.primaryLocationId ?? "—"}</div>
          <div>API count: {clientsForBadgeQ.data ? clientsForBadgeQ.data.length : "no data"}</div>
          <div>
            lastSeen (localStorage):{" "}
            {resolvedLocationIdForClientsBadge
              ? String(readSalonClientsLastSeenCount(resolvedLocationIdForClientsBadge))
              : "—"}
          </div>
          <div>badge computed: {salonClientsNavBadge}</div>
          <div>show pill: {showSalonClientsNavPill ? "yes" : "no"}</div>
          <div>
            path: {location.pathname} {location.pathname === "/account/salone/clienti" ? "(pill nascosto qui)" : ""}
          </div>
          <div>
            query: {clientsForBadgeQ.status} / fetch {clientsForBadgeQ.fetchStatus}
          </div>
          {clientsForBadgeQ.error ? (
            <div style={{ color: "#fca5a5", marginTop: "0.35rem" }}>
              error: {clientsForBadgeQ.error instanceof Error ? clientsForBadgeQ.error.message : String(clientsForBadgeQ.error)}
            </div>
          ) : null}
          <div style={{ marginTop: "0.45rem", opacity: 0.85, fontSize: "0.68rem" }}>
            Attiva: localStorage.setItem(&quot;velvet.debug.clienti&quot;, &quot;1&quot;) — disattiva: removeItem stessa chiave.
          </div>
        </div>
      ) : null}
    </div>
  );
}
