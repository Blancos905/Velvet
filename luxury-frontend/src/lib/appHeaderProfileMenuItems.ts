import { STAFF_MEMBER_AGENDA_PATH } from "./staffMemberAgendaPath";

export type AppHeaderProfileMenuItem = {
  label: string;
  to?: string;
  logout?: boolean;
};

export const CONSUMER_PROFILE_MENU_ITEMS: AppHeaderProfileMenuItem[] = [
  { label: "Il tuo account", to: "/account" },
  { label: "Informazioni", to: "/account/profilo" },
  { label: "Prenotazioni", to: "/account/prenotazioni" },
  { label: "Chat", to: "/account/chat" },
  { label: "Notifiche", to: "/account/notifiche" },
  { label: "Saloni di fiducia", to: "/account/saloni-di-fiducia" },
  { label: "Recensioni", to: "/account/feedback-luxury" },
  { label: "Logout", logout: true },
];

export const SUPER_ADMIN_PROFILE_MENU_ITEMS: AppHeaderProfileMenuItem[] = [
  { label: "Gestione piattaforma", to: "/admin/dashboard" },
  { label: "Profilo e sicurezza", to: "/admin/profilo" },
  { label: "Messaggi", to: "/admin/messaggi" },
  { label: "Assistenza", to: "/admin/assistenza" },
  { label: "Logout", logout: true },
];

export const STAFF_PROFILE_MENU_ITEMS: AppHeaderProfileMenuItem[] = [
  { label: "La mia agenda", to: STAFF_MEMBER_AGENDA_PATH },
  { label: "Profilo", to: "/account/profilo" },
  { label: "Recensioni", to: "/account/feedback-luxury" },
  { label: "Notifiche", to: "/account/notifiche" },
  { label: "Assistenza", to: "/account/assistenza" },
  { label: "Logout", logout: true },
];

export function ownerProfileMenuItems(showcasePreviewLabel: string): AppHeaderProfileMenuItem[] {
  return [
    { label: "Il mio salone", to: "/salone" },
    { label: "Crea il tuo sito", to: "/salone/tuo-salone" },
    { label: "Brand e vetrina", to: "/salone/brand" },
    { label: showcasePreviewLabel, to: "/salone/anteprima" },
    { label: "Agenda", to: "/account/prenotazioni" },
    { label: "Notifiche", to: "/account/notifiche" },
    { label: "Profilo", to: "/account/profilo" },
    { label: "Chat", to: "/account/chat" },
    { label: "Clienti", to: "/salone/clienti" },
    { label: "Staff", to: "/salone/staff" },
    { label: "Statistiche", to: "/salone/statistiche" },
    { label: "Assistenza", to: "/account/assistenza" },
    { label: "Logout", logout: true },
  ];
}
