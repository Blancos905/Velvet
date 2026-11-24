import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LuxuryNotificationPopupHost } from "./components/LuxuryNotificationPopupHost";
import { ConsumerNotificationAlertPoller } from "./components/ConsumerNotificationAlertPoller";
import { SalonBookingAlertPoller } from "./components/SalonBookingAlertPoller";
import { SalonTrialRenewalPrompt } from "./components/salon/SalonTrialRenewalPrompt";
import { PremiumRegistrationStripeReturnRedirect } from "./components/PremiumRegistrationStripeReturnRedirect";
import { useLuxuryAuth } from "./auth/LuxuryAuthProvider";
import { isLuxuryNativeAppShell } from "./hooks/useLuxuryNativeAppShell";
import { bootstrapNativeDevOrigin } from "./lib/nativeAppDevHost";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";
import { LuxuryEntrySplashGate } from "./components/LuxuryEntrySplashGate";
import { RootLayout } from "./layout/RootLayout";
import HomePage from "./pages/HomePage";
import AuthCallbackRedirectPage from "./pages/AuthCallbackRedirectPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import PremiumRegistrationCheckoutPage from "./pages/PremiumRegistrationCheckoutPage";
import PremiumRegistrationSuccessPage from "./pages/PremiumRegistrationSuccessPage";
import {
  AccountBillingCheckoutPage,
  AccountBillingSuccessPage,
  AccountHomePage,
  AccountInfoPrivacyPage,
  AccountSalonHomePage,
  AdminAssistenzaPage,
  AdminDashboardPage,
  AdminFiscalInvoicesPage,
  AdminPlacementSponsorsPage,
  AdminLayout,
  AdminRegisterSuperAdminPage,
  AdminSuperAdminProfilePage,
  AppointmentDetailPage,
  AppointmentsPage,
  BugMapPage,
  ClientSignupPage,
  CookiePolicyPage,
  DataProcessingAgreementPage,
  FreeUseLicensePage,
  AccountDeletionPage,
  DevSeedSalonShowcasePage,
  FavoritesPage,
  LegalHubPage,
  MonthlyIdeaPage,
  SponsoredSalonsPage,
  TopOperatorsPage,
  NationsCupPage,
  NotificationsPage,
  PartnerPage,
  PrivacyChoicesPage,
  PrivacyPolicyConsumerPage,
  PrivacyPolicyPage,
  PrivacyPolicyStaffPage,
  ProfilePage,
  ReviewPage,
  SalonBrandLayoutPreviewPage,
  SalonBrandPage,
  SalonVetrinaPreviewPage,
  SalonClientsPage,
  SalonExplorePage,
  SalonLocationPage,
  SalonPage,
  SalonPersonalPage,
  SalonPersonalPageBuilder,
  SalonPlansPage,
  SalonServicesPage,
  SalonStaffAgendaPage,
  SalonStudioAgendaPage,
  SalonStaffPage,
  SalonStandardToolsPage,
  SalonStatisticsPage,
  SalonLuxuryChatPage,
  SearchPage,
  StaffMemberHomePage,
  StaffMemberAgendaPage,
  SupportPage,
  TermsOfServicePage,
  TrustedSalonsPage,
  LuxuryFeedbackPage,
} from "./routes/lazyPages";

import { AccountLayout } from "./pages/account/AccountLayout";
import { SurfaceBoundary } from "./components/SurfaceBoundary";
import { currentSurface, readSurfaceLocation } from "./lib/luxurySurfaces";
import "./styles/luxury-route-loading.css";

/** Super admin: niente hub `/account` — solo pannello `/admin`. */
function AccountAreaLayout() {
  const { isLuxurySuperAdmin } = useLuxuryAuth();
  if (isLuxurySuperAdmin && currentSurface(readSurfaceLocation()) !== "public") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <AccountLayout />;
}

function AccountIndexRedirect() {
  const { isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  const onClientHome = currentSurface(readSurfaceLocation()) === "public";
  if (onClientHome && (isLuxurySuperAdmin || isSalonStaff || isSalonTitolare)) {
    return <Navigate to="/" replace />;
  }
  if (isLuxurySuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/salone" replace />;
  }
  // Cliente: resta sull’hub `/account`. Prenotazioni, chat e le altre voci si aprono in overlay.
  return null;
}

/** I vecchi indirizzi `/account/salone` restano validi e atterrano sull'admin salone. */
function LegacyAccountSalonRedirect() {
  const { pathname, search, hash } = useLocation();
  const stripped = pathname.replace(/\/+$/, "") || "/";
  const next = stripped.replace(/^\/account\/salone(?=\/|$)/, "/salone");
  return <Navigate to={`${next}${search}${hash}`} replace />;
}

export default function App() {
  useEffect(() => {
    if (isLuxuryNativeAppShell()) {
      bootstrapNativeDevOrigin();
    }
  }, []);

  return (
    <BrowserRouter>
      <SurfaceBoundary>
      <PremiumRegistrationStripeReturnRedirect />
      <LuxuryNotificationPopupHost />
      <SalonBookingAlertPoller />
      <ConsumerNotificationAlertPoller />
      <SalonTrialRenewalPrompt />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/admin/login" element={<Navigate to="/account" replace />} />
            <Route path="/admin/register" element={<AdminRegisterSuperAdminPage />} />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="assistenza" element={<AdminAssistenzaPage />} />
              <Route path="messaggi" element={<AdminAssistenzaPage />} />
              <Route path="fatture" element={<AdminFiscalInvoicesPage />} />
              <Route path="sponsor" element={<AdminPlacementSponsorsPage />} />
              <Route path="profilo" element={<AdminSuperAdminProfilePage />} />
            </Route>
            <Route path="/auth/callback" element={<AuthCallbackRedirectPage />} />
            <Route path="/reimposta-password" element={<PasswordResetPage />} />
            <Route path="/conferma-email" element={<EmailVerificationPage />} />
            <Route path="/registrazione/premium/checkout" element={<PremiumRegistrationCheckoutPage />} />
            <Route path="/registrazione/premium/success" element={<PremiumRegistrationSuccessPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/partner" element={<LuxuryEntrySplashGate><PartnerPage /></LuxuryEntrySplashGate>} />
            <Route path="/registrati" element={<LuxuryEntrySplashGate><ClientSignupPage /></LuxuryEntrySplashGate>} />
            <Route path="/piani/premium-prova" element={<Navigate to="/piani?plan=PREMIUM" replace />} />
            <Route path="/piani" element={<SalonPlansPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/idee/:groupId/:itemId" element={<MonthlyIdeaPage />} />
            <Route path="/operatori/migliori" element={<Navigate to="/operatori/migliori/parrucchieri" replace />} />
            <Route path="/operatori/migliori/:kind" element={<TopOperatorsPage />} />
            <Route path="/saloni/sponsorizzati" element={<SponsoredSalonsPage />} />
            <Route path="/nations-cup" element={<NationsCupPage />} />
            <Route path="/s/:slug/il-tuo-salone" element={<SalonPersonalPage />} />
            <Route path="/s/:slug/esplora" element={<SalonExplorePage />} />
            {import.meta.env.DEV ? <Route path="/dev/seed-salone-showcase" element={<DevSeedSalonShowcasePage />} /> : null}
            {import.meta.env.DEV ? <Route path="/dev/bug-map" element={<BugMapPage />} /> : null}
            <Route path="/s/:slug" element={<SalonPage />} />
            <Route path="/recensione" element={<ReviewPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/privacy/clienti" element={<PrivacyPolicyConsumerPage />} />
            <Route path="/privacy/staff" element={<PrivacyPolicyStaffPage />} />
            <Route path="/privacy/cookie" element={<CookiePolicyPage />} />
            <Route path="/privacy/scelte" element={<PrivacyChoicesPage />} />
            <Route path="/privacy/elimina-account" element={<AccountDeletionPage />} />
            <Route path="/termini" element={<TermsOfServicePage />} />
            <Route path="/licenza" element={<FreeUseLicensePage />} />
            <Route path="/legale/accordo-trattamento" element={<DataProcessingAgreementPage />} />
            <Route path="/legale" element={<LegalHubPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountAreaLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AccountIndexRedirect />} />
              <Route path="home" element={<AccountHomePage />} />
              <Route path="staff" element={<StaffMemberHomePage />} />
              <Route path="staff/agenda" element={<StaffMemberAgendaPage />} />
              <Route path="prenotazioni/studio/agenda" element={<SalonStudioAgendaPage />} />
              <Route path="prenotazioni/staff/:staffId/agenda" element={<SalonStaffAgendaPage />} />
              <Route path="prenotazioni" element={<AppointmentsPage />} />
              <Route path="prenotazioni/:id" element={<AppointmentDetailPage />} />
              <Route path="profilo" element={<ProfilePage />} />
              <Route path="billing/checkout" element={<AccountBillingCheckoutPage />} />
              <Route path="billing/success" element={<AccountBillingSuccessPage />} />
              <Route path="notifiche" element={<NotificationsPage />} />
              <Route path="preferiti" element={<FavoritesPage />} />
              <Route path="saloni-di-fiducia" element={<TrustedSalonsPage />} />
              <Route path="assistenza" element={<SupportPage />} />
              <Route path="info-privacy" element={<AccountInfoPrivacyPage />} />
              <Route path="chat" element={<SalonLuxuryChatPage />} />
              <Route path="feedback-luxury" element={<LuxuryFeedbackPage />} />
            </Route>
            <Route path="/account/salone" element={<LegacyAccountSalonRedirect />} />
            <Route path="/account/salone/*" element={<LegacyAccountSalonRedirect />} />
            <Route
              path="/salone"
              element={
                <ProtectedRoute>
                  <AccountAreaLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AccountSalonHomePage />} />
              <Route path="panoramica" element={<AccountSalonHomePage />} />
              <Route path="servizi" element={<SalonServicesPage />} />
              <Route path="staff" element={<SalonStaffPage />} />
              <Route path="clienti" element={<SalonClientsPage />} />
              <Route path="brand/anteprima-layout" element={<SalonBrandLayoutPreviewPage />} />
              <Route path="brand" element={<SalonBrandPage />} />
              <Route path="anteprima" element={<SalonVetrinaPreviewPage />} />
              <Route path="tuo-salone" element={<SalonPersonalPageBuilder />} />
              <Route path="layout" element={<Navigate to="/salone/brand/anteprima-layout" replace />} />
              <Route path="strumenti" element={<SalonStandardToolsPage />} />
              <Route path="statistiche" element={<SalonStatisticsPage />} />
              <Route path="posizione" element={<SalonLocationPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
      </SurfaceBoundary>
    </BrowserRouter>
  );
}
