import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LuxuryNotificationPopupHost } from "./components/LuxuryNotificationPopupHost";
import { SalonBookingAlertPoller } from "./components/SalonBookingAlertPoller";
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
  AdminLayout,
  AdminRegisterSuperAdminPage,
  AdminSuperAdminProfilePage,
  AppointmentDetailPage,
  AppointmentsPage,
  BugMapPage,
  ClientSignupPage,
  CookiePolicyPage,
  DataProcessingAgreementPage,
  AccountDeletionPage,
  DevSeedSalonShowcasePage,
  FavoritesPage,
  LegalHubPage,
  MonthlyIdeaPage,
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
  SalonClientsPage,
  SalonExplorePage,
  SalonLocationPage,
  SalonPage,
  SalonPersonalPage,
  SalonPersonalPageBuilder,
  SalonPlansPage,
  SalonFreePremiumUpgradePage,
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
import "./styles/luxury-route-loading.css";

/** Super admin: niente hub `/account` — solo pannello `/admin`. */
function AccountAreaLayout() {
  const { isLuxurySuperAdmin } = useLuxuryAuth();
  if (isLuxurySuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <AccountLayout />;
}

function AccountIndexRedirect() {
  const { isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  if (isLuxurySuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }
  return <Navigate to="/account/prenotazioni" replace />;
}

export default function App() {
  useEffect(() => {
    if (isLuxuryNativeAppShell()) {
      bootstrapNativeDevOrigin();
    }
  }, []);

  return (
    <BrowserRouter>
      <PremiumRegistrationStripeReturnRedirect />
      <LuxuryNotificationPopupHost />
      <SalonBookingAlertPoller />
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
            <Route path="/piani/premium-prova" element={<SalonFreePremiumUpgradePage />} />
            <Route path="/piani" element={<SalonPlansPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/idee/:groupId/:itemId" element={<MonthlyIdeaPage />} />
            <Route path="/operatori/migliori" element={<Navigate to="/operatori/migliori/parrucchieri" replace />} />
            <Route path="/operatori/migliori/:kind" element={<TopOperatorsPage />} />
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
              <Route path="salone/panoramica" element={<AccountSalonHomePage />} />
              <Route path="salone" element={<AccountSalonHomePage />} />
              <Route path="salone/servizi" element={<SalonServicesPage />} />
              <Route path="salone/staff" element={<SalonStaffPage />} />
              <Route path="salone/clienti" element={<SalonClientsPage />} />
              <Route path="salone/brand/anteprima-layout" element={<SalonBrandLayoutPreviewPage />} />
              <Route path="salone/brand" element={<SalonBrandPage />} />
              <Route path="salone/tuo-salone" element={<SalonPersonalPageBuilder />} />
              <Route
                path="salone/layout"
                element={<Navigate to="/account/salone/brand/anteprima-layout" replace />}
              />
              <Route path="salone/strumenti" element={<SalonStandardToolsPage />} />
              <Route path="salone/statistiche" element={<SalonStatisticsPage />} />
              <Route path="salone/posizione" element={<SalonLocationPage />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
