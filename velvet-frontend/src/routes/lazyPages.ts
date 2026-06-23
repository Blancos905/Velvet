import { lazy, type ComponentType } from "react";

/** Adatta export named a `React.lazy` (default export atteso). */
function lazyNamed<T extends ComponentType<unknown>>(
  factory: () => Promise<Record<string, T>>,
  exportName: string,
) {
  return lazy(() => factory().then((module) => ({ default: module[exportName] })));
}

// —— Area account (dashboard titolare, vetrina, impostazioni) ——
// AccountLayout importato eager in App.tsx (shell account sempre pronta).
export const AccountHomePage = lazy(() => import("../pages/account/AccountHomePage"));
export const AccountSalonHomePage = lazy(() => import("../pages/account/AccountSalonHomePage"));
export const StaffMemberHomePage = lazy(() => import("../pages/account/StaffMemberHomePage"));
export const SalonServicesPage = lazy(() => import("../pages/account/salon/SalonServicesPage"));
export const SalonStaffPage = lazy(() => import("../pages/account/salon/SalonStaffPage"));
export const SalonClientsPage = lazy(() => import("../pages/account/salon/SalonClientsPage"));
export const SalonBrandPage = lazy(() => import("../pages/account/salon/SalonBrandPage"));
export const SalonBrandLayoutPreviewPage = lazy(
  () => import("../pages/account/salon/SalonBrandLayoutPreviewPage"),
);
export const SalonPersonalPageBuilder = lazy(
  () => import("../pages/account/salon/SalonPersonalPageBuilder"),
);
export const SalonStandardToolsPage = lazy(
  () => import("../pages/account/salon/SalonStandardToolsPage"),
);
export const SalonStatisticsPage = lazy(() => import("../pages/account/salon/SalonStatisticsPage"));
export const SalonLocationPage = lazy(() => import("../pages/account/salon/SalonLocationPage"));
export const SalonStaffAgendaPage = lazy(() => import("../pages/account/salon/SalonStaffAgendaPage"));
export const AppointmentsPage = lazy(() => import("../pages/account/AppointmentsPage"));
export const AppointmentDetailPage = lazy(() => import("../pages/account/AppointmentDetailPage"));
export const ProfilePage = lazy(() => import("../pages/account/ProfilePage"));
export const NotificationsPage = lazy(() => import("../pages/account/NotificationsPage"));
export const FavoritesPage = lazy(() => import("../pages/account/FavoritesPage"));
export const TrustedSalonsPage = lazy(() => import("../pages/account/TrustedSalonsPage"));
export const SupportPage = lazy(() => import("../pages/account/SupportPage"));
export const AccountInfoPrivacyPage = lazy(() => import("../pages/account/AccountInfoPrivacyPage"));
export const AccountBillingCheckoutPage = lazy(
  () => import("../pages/account/AccountBillingCheckoutPage"),
);
export const AccountBillingSuccessPage = lazy(
  () => import("../pages/account/AccountBillingSuccessPage"),
);
export const VelvetFeedbackPage = lazy(() => import("../pages/account/VelvetFeedbackPage"));
export const SalonVelvetChatPage = lazy(() => import("../pages/account/SalonVelvetChatPage"));

// —— Admin ——
export const AdminLayout = lazyNamed(() => import("../pages/admin/AdminLayout"), "AdminLayout");
export const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
export const AdminAssistenzaPage = lazy(() => import("../pages/admin/AdminAssistenzaPage"));
export const AdminSuperAdminProfilePage = lazy(
  () => import("../pages/admin/AdminSuperAdminProfilePage"),
);
export const AdminRegisterSuperAdminPage = lazy(
  () => import("../pages/admin/AdminRegisterSuperAdminPage"),
);

// —— Vetrina / ricerca / piani ——
export const SalonPlansPage = lazy(() => import("../pages/SalonPlansPage"));
export const SalonFreePremiumUpgradePage = lazy(() => import("../pages/SalonFreePremiumUpgradePage"));
export const SearchPage = lazy(() => import("../pages/SearchPage"));
export const SalonPage = lazy(() => import("../pages/SalonPage"));
export const SalonExplorePage = lazy(() => import("../pages/SalonExplorePage"));
export const SalonPersonalPage = lazy(() => import("../pages/SalonPersonalPage"));
export const MonthlyIdeaPage = lazy(() => import("../pages/MonthlyIdeaPage"));
export const ReviewPage = lazy(() => import("../pages/ReviewPage"));
export const PartnerPage = lazy(() => import("../pages/PartnerPage"));
export const ClientSignupPage = lazy(() => import("../pages/ClientSignupPage"));

// —— Legale ——
export const LegalHubPage = lazy(() => import("../pages/legal/LegalHubPage"));
export const PrivacyPolicyPage = lazy(() => import("../pages/legal/PrivacyPolicyPage"));
export const PrivacyPolicyConsumerPage = lazy(
  () => import("../pages/legal/PrivacyPolicyConsumerPage"),
);
export const PrivacyPolicyStaffPage = lazy(() => import("../pages/legal/PrivacyPolicyStaffPage"));
export const CookiePolicyPage = lazy(() => import("../pages/legal/CookiePolicyPage"));
export const PrivacyChoicesPage = lazy(() => import("../pages/legal/PrivacyChoicesPage"));
export const AccountDeletionPage = lazy(() => import("../pages/legal/AccountDeletionPage"));
export const TermsOfServicePage = lazy(() => import("../pages/legal/TermsOfServicePage"));

// —— Dev ——
export const DevSeedSalonShowcasePage = lazy(() => import("../pages/dev/DevSeedSalonShowcasePage"));
export const BugMapPage = lazy(() => import("../pages/dev/BugMapPage"));
