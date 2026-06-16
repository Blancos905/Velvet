import type { SalonPlanTier } from "../data/salonPlans";

export type AppHeaderProfileMenuItem = {
  label: string;
  to?: string;
  logout?: boolean;
};

export const CONSUMER_PROFILE_MENU_ITEMS: AppHeaderProfileMenuItem[] = [
  { label: "Il tuo account", to: "/account/home" },
  { label: "Informazioni", to: "/account/profilo" },
  { label: "Prenotazioni", to: "/account/prenotazioni" },
  { label: "Chat", to: "/account/chat" },
  { label: "Notifiche", to: "/account/notifiche" },
  { label: "Saloni di fiducia", to: "/account/saloni-di-fiducia" },
  { label: "Recensioni", to: "/recensione" },
  { label: "Logout", logout: true },
];

export const SUPER_ADMIN_PROFILE_MENU_ITEMS: AppHeaderProfileMenuItem[] = [
  { label: "Gestione piattaforma", to: "/admin/dashboard" },
  { label: "Profilo e sicurezza", to: "/account/profilo" },
  { label: "Notifiche", to: "/account/notifiche" },
  { label: "Info e privacy", to: "/account/info-privacy" },
  { label: "Assistenza", to: "/account/assistenza" },
  { label: "Logout", logout: true },
];

export const STAFF_PROFILE_MENU_ITEMS: AppHeaderProfileMenuItem[] = [
  { label: "La mia agenda", to: "/account/staff" },
  { label: "Profilo", to: "/account/profilo" },
  { label: "Recensioni", to: "/account/feedback-velvet" },
  { label: "Notifiche", to: "/account/notifiche" },
  { label: "Assistenza", to: "/account/assistenza" },
  { label: "Logout", logout: true },
];

export function ownerProfileMenuItems(planTier: SalonPlanTier): AppHeaderProfileMenuItem[] {
  if (planTier === "PREMIUM") {
    return [
      { label: "Il mio salone", to: "/account/salone" },
      { label: "Agenda", to: "/account/prenotazioni" },
      { label: "Notifiche", to: "/account/notifiche" },
      { label: "Profilo", to: "/account/profilo" },
      { label: "Chat", to: "/account/chat" },
      { label: "Clienti", to: "/account/salone/clienti" },
      { label: "Staff", to: "/account/salone/staff" },
      { label: "Statistiche", to: "/account/salone/statistiche" },
      { label: "Assistenza", to: "/account/assistenza" },
      { label: "Logout", logout: true },
    ];
  }

  return [
    { label: "Il mio salone", to: "/account/salone" },
    { label: "Agenda", to: "/account/prenotazioni" },
    { label: "Notifiche", to: "/account/notifiche" },
    { label: "Posizione salone", to: "/account/salone/posizione" },
    { label: "Profilo", to: "/account/profilo" },
    { label: "Info e privacy", to: "/account/info-privacy" },
    { label: "Assistenza", to: "/account/assistenza" },
    { label: "Logout", logout: true },
  ];
}
