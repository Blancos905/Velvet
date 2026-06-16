import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useVelvetAuth } from "./auth/VelvetAuthProvider";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";
import { VelvetEntrySplashGate } from "./components/VelvetEntrySplashGate";
import { RootLayout } from "./layout/RootLayout";
import HomePage from "./pages/HomePage";
import OidcCallbackPage from "./pages/OidcCallbackPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import {
  AccountBillingCheckoutPage,
  AccountBillingSuccessPage,
  AccountHomePage,
  AccountInfoPrivacyPage,
  AccountLayout,
  AccountSalonHomePage,
  AdminAssistenzaPage,
  AdminDashboardPage,
  AdminLayout,
  AdminLoginPage,
  AdminRegisterSuperAdminPage,
  AdminSuperAdminProfilePage,
  AppointmentDetailPage,
  AppointmentsPage,
  BugMapPage,
  ClientSignupPage,
  CookiePolicyPage,
  AccountDeletionPage,
  DevSeedSalonShowcasePage,
  FavoritesPage,
  LegalHubPage,
  MonthlyIdeaPage,
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
  SalonServicesPage,
  SalonStaffAgendaPage,
  SalonStaffPage,
  SalonStandardToolsPage,
  SalonStatisticsPage,
  SalonVelvetChatPage,
  SearchPage,
  StaffMemberHomePage,
  SupportPage,
  TermsOfServicePage,
  TrustedSalonsPage,
  VelvetFeedbackPage,
} from "./routes/lazyPages";

import { useEffectiveSalonPlanTier } from "./hooks/useEffectiveSalonPlanTier";
import { isVelvetNativeAppShell } from "./hooks/useVelvetNativeAppShell";
import { nativeSalonOwnerHubPath } from "./lib/nativeAccountHubPaths";
import "./styles/velvet-route-loading.css";

function AccountIndexRedirect() {
  const { isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  const salonPlanTier = useEffectiveSalonPlanTier();
  if (isVelvetSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isVelvetNativeAppShell()) {
    if (isSalonStaff) {
      return <Navigate to="/account/staff" replace />;
    }
    if (isSalonTitolare) {
      return <Navigate to={nativeSalonOwnerHubPath(salonPlanTier)} replace />;
    }
    return <Navigate to="/account/home" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  return <Navigate to={isSalonTitolare ? "/account/home" : "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
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
              <Route path="profilo" element={<AdminSuperAdminProfilePage />} />
            </Route>
            <Route path="/auth/callback" element={<OidcCallbackPage />} />
            <Route path="/reimposta-password" element={<PasswordResetPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/partner" element={<VelvetEntrySplashGate><PartnerPage /></VelvetEntrySplashGate>} />
            <Route path="/registrati" element={<VelvetEntrySplashGate><ClientSignupPage /></VelvetEntrySplashGate>} />
            <Route path="/piani" element={<SalonPlansPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/idee/:groupId/:itemId" element={<MonthlyIdeaPage />} />
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
            <Route path="/legale" element={<LegalHubPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AccountIndexRedirect />} />
              <Route path="home" element={<AccountHomePage />} />
              <Route path="staff" element={<StaffMemberHomePage />} />
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
              <Route path="chat" element={<SalonVelvetChatPage />} />
              <Route path="feedback-velvet" element={<VelvetFeedbackPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
