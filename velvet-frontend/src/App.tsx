import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useVelvetAuth } from "./auth/VelvetAuthProvider";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { VelvetEntrySplashGate } from "./components/VelvetEntrySplashGate";
import { RootLayout } from "./layout/RootLayout";
import { AccountLayout } from "./pages/account/AccountLayout";
import AccountSalonHomePage from "./pages/account/AccountSalonHomePage";
import AccountOwnerHomePage from "./pages/account/AccountOwnerHomePage";
import SalonBrandPage from "./pages/account/salon/SalonBrandPage";
import SalonBrandLayoutPreviewPage from "./pages/account/salon/SalonBrandLayoutPreviewPage";
import SalonLocationPage from "./pages/account/salon/SalonLocationPage";
import SalonPersonalPageBuilder from "./pages/account/salon/SalonPersonalPageBuilder";
import SalonServicesPage from "./pages/account/salon/SalonServicesPage";
import SalonStatisticsPage from "./pages/account/salon/SalonStatisticsPage";
import StaffMemberHomePage from "./pages/account/StaffMemberHomePage";
import SalonStaffAgendaPage from "./pages/account/salon/SalonStaffAgendaPage";
import SalonStaffPage from "./pages/account/salon/SalonStaffPage";
import SalonClientsPage from "./pages/account/salon/SalonClientsPage";
import SalonStandardToolsPage from "./pages/account/salon/SalonStandardToolsPage";
import AppointmentDetailPage from "./pages/account/AppointmentDetailPage";
import AppointmentsPage from "./pages/account/AppointmentsPage";
import FavoritesPage from "./pages/account/FavoritesPage";
import TrustedSalonsPage from "./pages/account/TrustedSalonsPage";
import ProfilePage from "./pages/account/ProfilePage";
import NotificationsPage from "./pages/account/NotificationsPage";
import SupportPage from "./pages/account/SupportPage";
import AccountInfoPrivacyPage from "./pages/account/AccountInfoPrivacyPage";
import VelvetFeedbackPage from "./pages/account/VelvetFeedbackPage";
import SalonVelvetChatPage from "./pages/account/SalonVelvetChatPage";
import ClientSignupPage from "./pages/ClientSignupPage";
import HomePage from "./pages/HomePage";
import ManageBookingPage from "./pages/ManageBookingPage";
import PartnerPage from "./pages/PartnerPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import SalonPlansPage from "./pages/SalonPlansPage";
import OidcCallbackPage from "./pages/OidcCallbackPage";
import ReviewPage from "./pages/ReviewPage";
import DevSeedSalonShowcasePage from "./pages/dev/DevSeedSalonShowcasePage";
import BugMapPage from "./pages/dev/BugMapPage";
import SalonExplorePage from "./pages/SalonExplorePage";
import SalonPersonalPage from "./pages/SalonPersonalPage";
import SalonPage from "./pages/SalonPage";
import SearchPage from "./pages/SearchPage";
import MonthlyIdeaPage from "./pages/MonthlyIdeaPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminSuperAdminProfilePage from "./pages/admin/AdminSuperAdminProfilePage";
import AdminAssistenzaPage from "./pages/admin/AdminAssistenzaPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminRegisterSuperAdminPage from "./pages/admin/AdminRegisterSuperAdminPage";
import LegalHubPage from "./pages/legal/LegalHubPage";
import CookiePolicyPage from "./pages/legal/CookiePolicyPage";
import AccountDeletionPage from "./pages/legal/AccountDeletionPage";
import PrivacyChoicesPage from "./pages/legal/PrivacyChoicesPage";
import PrivacyPolicyConsumerPage from "./pages/legal/PrivacyPolicyConsumerPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import PrivacyPolicyStaffPage from "./pages/legal/PrivacyPolicyStaffPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";

function AccountIndexRedirect() {
  const { isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  if (isVelvetSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  return <Navigate to={isSalonTitolare ? "/account/home" : "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="/prenotazione/gestisci" element={<ManageBookingPage />} />
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
            <Route path="home" element={<AccountOwnerHomePage />} />
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
    </BrowserRouter>
  );
}
