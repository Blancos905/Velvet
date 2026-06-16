/** Allineati ai DTO backend (UUID come stringa JSON). */

/** `GET /api/v1/me/salon` — piano persistito alla registrazione titolare. */
/** `GET /api/v1/me/salon/notifications` — conteggi email/notifiche per tipo. */
export type MeSalonNotificationTypeStat = {
  type: string;
  label: string;
  sent: number;
  pending: number;
};

export type MeSalonNotificationInbox = {
  types: MeSalonNotificationTypeStat[];
};

/** `GET /api/v1/me/salon/notifications/messages?bucket=...` */
export type MeSalonNotificationMessage = {
  id: string;
  notificationType: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  appointmentId: string | null;
  clientName: string;
  previewLine: string;
};

/** `GET /api/v1/me/staff/salon` — contesto salone per operatore (sede, piano). */
export type MeStaffSalon = {
  salonDisplayName: string | null;
  /** Id operatore collegato — identifica il thread chat staff. */
  staffOperatorId: string | null;
  primaryLocationId: string | null;
  planTier: string | null;
};

/** `GET/PATCH /api/v1/me/staff/operator-profile` — anagrafica e foto operatore (agenda / team salone). */
export type MeStaffOperatorSelf = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  photoDataUrl: string | null;
};

export type MeSalonSummary = {
  provisioned: boolean;
  planTier: string | null;
  primaryLocationName: string | null;
  primaryLocationSlug: string | null;
  /** UUID sede principale — stesso valore di `X-Location-Id` per `GET /api/v1/clients`. */
  primaryLocationId: string | null;
  primaryLocationCity: string | null;
  primaryLocationPostalCode: string | null;
  primaryLocationAddressLine: string | null;
  /** Pubblico di riferimento prima sede (`MALE` / `FEMALE`). */
  primaryLocationSalonClientGenders?: string[] | null;
  /** Apertura sede (minuti da mezzanotte locale) — agenda prenotazioni. */
  primaryLocationOpeningMinuteOfDay?: number | null;
  /** Chiusura sede (minuti da mezzanotte locale). */
  primaryLocationClosingMinuteOfDay?: number | null;
  /** Fine fascia mattutina (pausa pranzo). */
  primaryLocationMorningEndMinuteOfDay?: number | null;
  /** Inizio fascia pomeridiana (pausa pranzo). */
  primaryLocationAfternoonStartMinuteOfDay?: number | null;
  /** Premium con PIN statistiche configurato in registrazione. */
  statisticsPinRequired?: boolean;
};

/** `GET /api/v1/me/salon/reviews` — recensioni ricevute dal salone. */
export type MeSalonReview = {
  id: string;
  rating: number;
  /** Voto verso l'operatore; assente su recensioni legacy. */
  staffRating?: number | null;
  /** Nome in anagrafica dell'operatore prenotato; assente se non disponibile. */
  operatorName?: string | null;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  appointmentId: string | null;
  appointmentStart: string | null;
  serviceName: string | null;
  locationName: string | null;
};

export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  /** Media recensioni post-appuntamento per questa sede; assente se nessuna recensione. */
  averageRating?: number | null;
  /** Conteggio recensioni per questa sede; assente se zero. */
  reviewCount?: number | null;
  /** Pubblico dichiarato ({@code MALE} / {@code FEMALE}). */
  salonClientGenders?: string[] | null;
  /** Tipologie attività dichiarate ({@code HAIR} / {@code BEAUTY} / {@code MASSAGE}). */
  salonBusinessTypes?: string[] | null;
};

export type OrganizationDetail = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  addressLine: string | null;
  phoneE164: string | null;
  whatsappE164: string | null;
  timeZone: string;
  welcomeMessage: string | null;
  /** Email profilo titolare (`/account` profilo) — vetrina pubblica. */
  contactEmail: string | null;
  /** Telefono profilo titolare — vetrina pubblica. */
  contactPhone: string | null;
  /** Fascia oraria prenotabile (minuti da mezzanotte locale sede). */
  bookingOpeningMinuteOfDay?: number;
  bookingClosingMinuteOfDay?: number;
  bookingMorningEndMinuteOfDay?: number | null;
  bookingAfternoonStartMinuteOfDay?: number | null;
};

/** `GET /api/v1/clients` con header `X-Location-Id` — anagrafica clienti della sede (stessa base di «Diventa cliente»). */
export type SalonCatalogClientRow = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  /** Account cliente Velvet collegato: abilita email di conferma/promemoria. */
  velvetConsumerLinked?: boolean;
};

export type ServicePublic = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  /** Opzionale: testo in vetrina e listino titolare. */
  description?: string | null;
};

/** `GET/POST/PUT /api/v1/me/salon/services` — include operatori abilitati. */
export type MeSalonService = ServicePublic & {
  operatorIds: string[];
};

/** `GET /api/v1/public/organizations/{slug}/reviews` */
export type PublicSalonReview = {
  id: string;
  rating: number;
  staffRating?: number | null;
  comment: string | null;
  reviewerName: string;
  serviceName: string | null;
  /** Nome operatore dell'appuntamento, se disponibile. */
  staffDisplayName?: string | null;
  createdAt: string;
};

export type OperatorPublic = {
  id: string;
  displayName: string;
  /** Ruolo lato salone (es. Staff, Parrucchiere), se impostato. */
  role?: string | null;
  /** Media voti verso l'operatore (1–5) su recensioni con voto operatore; assente se non calcolabile. */
  averageStaffRating?: number | null;
  /** Numero di recensioni con voto operatore usate per la media. */
  staffReviewCount?: number | null;
};

export type DayAvailability = {
  date: string;
  slotsIso: string[];
  /** Slot teorici nella finestra oraria (stesso servizio/operatore); per colorare il calendario. */
  totalSlots?: number;
};

export type AppointmentDto = {
  id: string;
  locationId: string;
  locationSlug: string;
  locationName: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  operatorId: string;
  operatorName: string;
  start: string;
  end: string;
  status: string;
  salonClientId: string;
  salonClientDisplayName: string;
  /** Istante ultimo consentito per disdetta autonoma (politica sede). */
  consumerCancelDeadline: string;
  /** Istante ultimo consentito per cambio orario autonomo (politica sede). */
  consumerRescheduleDeadline: string;
  canConsumerCancel: boolean;
  canConsumerReschedule: boolean;
};

export type ProfileDto = {
  id: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  /** ISO 3166-1 alpha-2 (es. IT). */
  country: string | null;
  preferredLocale: string | null;
};

/** Profilo super admin incluso in `GET /api/v1/admin/overview` (campo `superAdminProfile`). */
export type SuperAdminMeProfileDto = {
  profileId: string | null;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  preferredLocale: string | null;
  securityRoles: string | null;
  persistedProfile: boolean;
};

/** `counts` in `GET /api/v1/admin/overview` (allineato a `SuperAdminCounts` backend). */
export type SuperAdminCountsDto = {
  consumerProfilesTotal: number;
  consumerProfilesActive: number;
  consumerOwners: number;
  studioGroups: number;
  locations: number;
  salonClients: number;
  appointmentsTotal: number;
  appointmentsUpcoming: number;
  salonServices: number;
  staffOperators: number;
  reviews: number;
  platformReviews: number;
  favorites: number;
  studioGroupsProvider: number;
  /** Saloni non provider (con pagamento abbonamento potenziale). */
  studioGroupsPaying: number;
  studioGroupsPayingPremium: number;
  studioGroupsPayingBase: number;
};

export type SuperAdminRecentUserRowDto = {
  id: string;
  email: string | null;
  displayName: string | null;
  securityRoles: string | null;
  planTier: string | null;
  createdAt: string | null;
  deletedAt: string | null;
};

export type SuperAdminSalonStaffRowDto = {
  operatorId: string;
  displayName: string;
  role: string;
  locationName: string;
  staffEmail: string | null;
  accountLinked: boolean;
};

export type SuperAdminRecentSalonRowDto = {
  studioGroupId: string;
  name: string;
  ownerEmail: string | null;
  planTier: string | null;
  primaryLocationSlug: string | null;
  primaryLocationName: string | null;
  primaryLocationCity: string | null;
  createdAt: string | null;
  provider?: boolean;
  staff?: SuperAdminSalonStaffRowDto[];
};

export type SuperAdminRecentSalonClientRowDto = {
  id: string;
  displayName: string | null;
  locationName: string | null;
  studioName: string | null;
  slug: string | null;
  createdAt: string | null;
};

/** `GET /api/v1/admin/overview` — corpo principale. */
export type SuperAdminOverviewResponseDto = {
  generatedAt: string | null;
  counts: SuperAdminCountsDto;
  recentUsers: SuperAdminRecentUserRowDto[];
  recentSalons: SuperAdminRecentSalonRowDto[];
  recentSalonClients: SuperAdminRecentSalonClientRowDto[];
  superAdminProfile: SuperAdminMeProfileDto;
  /** Richieste dai saloni non ancora aperte in «Messaggi» (badge). Backend ≥ campo su overview. */
  supportInboxSalonUnreadCount?: number;
  /** Presente se `includeSupportInbox=true` (inbox assistenza verso Velvet). */
  supportInboxMessages?: MeSalonNotificationMessage[];
  platformInsights?: SuperAdminPlatformInsightsDto;
};

export type SuperAdminStarCountRowDto = { stars: number; count: number };

export type SuperAdminPlatformInsightsDto = {
  support: { unreadFromSalons: number; totalRequestsFromSalons: number };
  appointments: {
    thisMonth: number;
    cancelled: number;
    completed: number;
    noShow: number;
    upcomingNonCancelled: number;
  };
  salonActivation: {
    salonsTotal: number;
    withCatalogService: number;
    withStaff: number;
    withBooking: number;
    fullyActive: number;
  };
  reviews: {
    postVisitAverageRating: number | null;
    postVisitCount: number;
    postVisitThisMonth: number;
    platformAverageRating: number | null;
    platformCount: number;
    platformThisMonth: number;
    postVisitStars: SuperAdminStarCountRowDto[];
  };
  topCities: { city: string; salonCount: number }[];
  topSalons: {
    studioGroupId: string;
    name: string;
    provider: boolean;
    primaryCity: string;
    appointmentCount: number;
    reviewCount: number;
    salonClientCount: number;
  }[];
  b2c: { consumersRegisteredThisMonth: number; salonClientsCreatedThisMonth: number };
  revenue: {
    paymentsIntegrated: boolean;
    estimatedMrrCents: number;
    premiumMonthlyPriceCents: number;
    payingSalonsInactive90Days: number;
  };
  engagement: { adminPlatformMessagesSent: number; locationsPublished: number };
};

export type FavoriteDto = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  city: string | null;
};

export type SalonClientMembershipDto = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  city: string | null;
  createdAt: string;
};

/** `GET/POST /api/v1/me/salon-clients/chat/messages` — conversazione B2C per `salonClientId` (stesso id di `SalonClientMembershipDto.id`). */
export type SalonVelvetChatMessageDto = {
  id: string;
  sender: "CLIENT" | "OWNER";
  body: string;
  createdAt: string;
  /** True se l’interlocutore ha aperto il thread dopo l’invio di questo messaggio (lettura approssimata come nelle app di messaggistica). */
  readByRecipient?: boolean;
};

/** `GET /api/v1/me/salon-clients/chat/unread-count` */
export type SalonVelvetChatUnreadDto = {
  clientUnread: number;
  ownerUnread: number;
};

/** `GET /api/v1/me/salon-clients/chat/inbox-summaries` — non letti + anteprima ultimo messaggio per conversazione. */
export type SalonVelvetChatInboxSummaryDto = {
  salonClientId: string;
  /** {@code null} = thread titolare; valorizzato = thread operatore staff. */
  staffOperatorId?: string | null;
  counterpartyLabel?: string | null;
  unreadCount: number;
  lastPreview: string;
  lastMessageAt: string | null;
  lastSender: "CLIENT" | "OWNER" | null;
};

export type SupportInfo = {
  faqUrl: string;
  contactUrl: string;
  message: string;
  supportEmail: string;
  supportPhone: string | null;
};

export type ReviewIntent = {
  salonName: string;
  serviceName: string;
  appointmentStart: string;
  alreadySubmitted: boolean;
};

/** Risposta `POST /api/v1/me/reviews` (JWT). */
export type ReviewSubmitResponse = {
  id: string;
  rating: number;
  staffRating: number | null;
  comment: string | null;
};

/** `GET /api/v1/me/reviews` — storico recensioni inviate dal cliente. */
export type MeReviewHistoryItem = {
  id: string;
  rating: number;
  staffRating?: number | null;
  comment: string | null;
  createdAt: string;
  appointmentId: string | null;
  appointmentStart: string | null;
  salonName: string | null;
  serviceName: string | null;
};

/** `GET /api/v1/me/reviews/pending` — recensioni da inviare (dopo fine appuntamento + offset backend, default 2 h). */
export type MePendingReviewInviteItem = {
  appointmentId: string;
  salonName: string;
  serviceName: string | null;
  /** Nome operatore prenotato (se presente in anagrafica). */
  operatorName?: string | null;
  /** Istante di fine appuntamento (`endsAt`). */
  completedAt: string | null;
};
