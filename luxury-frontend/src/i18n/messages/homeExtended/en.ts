import type { MessageCatalog } from "../it";

/** Solo chiavi home estese (carousel, partner, …) — non l'intero catalogo. */
export type HomeExtendedCatalog = Pick<MessageCatalog, keyof typeof import("./it").itHomeExtended>;

export const enHomeExtended = {
  "home.carousel.brand.eyebrow": "Saloni Luxury",
  "home.carousel.brand.titleLine1": "Break the routine.",
  "home.carousel.brand.titleHighlight": "Book",
  "home.carousel.brand.titleLine2": " your moment of relaxation.",
  "home.carousel.brand.body":
    "Hair, beauty and wellness: find the right salon and book with confidence.",

  "home.carousel.web.hair.eyebrow": "Hairdressers & barbers",
  "home.carousel.web.hair.titleBefore": "Style that ",
  "home.carousel.web.hair.titleHighlight": "inspires",
  "home.carousel.web.hair.titleAfter": " you.",
  "home.carousel.web.hair.body":
    "Cut, colour and beard: professionals near you, clear and fast booking.",
  "home.carousel.web.hair.alt": "Hair salon",

  "home.carousel.web.beauty.eyebrow": "Beauty & skincare",
  "home.carousel.web.beauty.titleBefore": "Care you can ",
  "home.carousel.web.beauty.titleHighlight": "see",
  "home.carousel.web.beauty.titleAfter": ".",
  "home.carousel.web.beauty.body":
    "Facials, nails and beauty rituals: pick the location and time that suits you.",
  "home.carousel.web.beauty.alt": "Facial beauty treatment",

  "home.carousel.web.wellness.eyebrow": "Wellness & massage",
  "home.carousel.web.wellness.titleBefore": "Body and mind in ",
  "home.carousel.web.wellness.titleHighlight": "balance",
  "home.carousel.web.wellness.titleAfter": ".",
  "home.carousel.web.wellness.body":
    "Massages and holistic therapies: take a break and book in a few clicks.",
  "home.carousel.web.wellness.alt": "Therapeutic massage",

  "home.carousel.app.saloni.eyebrow": "Salons",
  "home.carousel.app.saloni.titleBefore": "Find the ",
  "home.carousel.app.saloni.titleHighlight": "salon",
  "home.carousel.app.saloni.titleAfter": " for you.",
  "home.carousel.app.saloni.body":
    "Hair, beauty and wellness: discover venues near you and book in a few taps.",
  "home.carousel.app.saloni.alt": "Welcoming salon interior",

  "home.carousel.app.hair.eyebrow": "Hairdressers",
  "home.carousel.app.hair.titleBefore": "Cut and colour that ",
  "home.carousel.app.hair.titleHighlight": "inspire",
  "home.carousel.app.hair.titleAfter": ".",
  "home.carousel.app.hair.body":
    "Blow-dry, beard and styling: professionals ready for your next visit.",
  "home.carousel.app.hair.alt": "Hairdresser working in salon",

  "home.carousel.app.beauty.eyebrow": "Beauty therapists",
  "home.carousel.app.beauty.titleBefore": "Beauty you can ",
  "home.carousel.app.beauty.titleHighlight": "see",
  "home.carousel.app.beauty.titleAfter": ".",
  "home.carousel.app.beauty.body":
    "Face, nails and make-up: care rituals to feel your best every day.",
  "home.carousel.app.beauty.alt": "Facial treatment at a beauty institute",

  "home.carousel.app.massage.eyebrow": "Massage therapists",
  "home.carousel.app.massage.titleBefore": "Relax and ",
  "home.carousel.app.massage.titleHighlight": "wellness",
  "home.carousel.app.massage.titleAfter": ".",
  "home.carousel.app.massage.body":
    "Relaxing and deep tissue massages: take the break you deserve.",
  "home.carousel.app.massage.alt": "Relaxing massage in a wellness studio",

  "home.carousel.app.nails.eyebrow": "Beauty & nails",
  "home.carousel.app.nails.titleBefore": "Details that make the ",
  "home.carousel.app.nails.titleHighlight": "difference",
  "home.carousel.app.nails.titleAfter": ".",
  "home.carousel.app.nails.body":
    "Manicure, nail art and small gestures of care for a polished look.",
  "home.carousel.app.nails.alt": "Manicure and nail art",

  "home.nationsCup.title": "Nations Cup",
  "home.nationsCup.subtitle": "Discover Italy's top salons and operators",
  "home.nationsCup.badge": "Coming soon",
  "home.nationsCup.alt": "Trophy and victory celebration",
  "home.nationsCup.eyebrow": "Saloni Luxury · Italy",
  "home.nationsCup.leadPart1": "Soon on Saloni Luxury you'll discover Italy's best ",
  "home.nationsCup.leadSalons": "salons",
  "home.nationsCup.leadPart2": " and ",
  "home.nationsCup.leadOperators": "operators",
  "home.nationsCup.leadPart3": ".",
  "home.nationsCup.backHome": "Back to home",
  "home.nationsCup.backHomeAria": "Back to home",
  "home.nationsCup.backSearch": "Back to salon search",

  "home.trending.title": "Ideas for your next visit",
  "home.trending.featured": "Featured",
  "home.topOperators.title": "Top operators",
  "home.topOperators.subtitle": "The most appreciated professionals in Italy",
  "home.topOperators.alt": "Hairdresser working in salon",
  "home.topOperators.leadBeforeCount": "The ",
  "home.topOperators.leadCount": "10 professionals",
  "home.topOperators.leadMid": " most appreciated at ",
  "home.topOperators.leadNational": "national",
  "home.topOperators.leadAfter": " level, based on client reviews.",
  "home.topOperators.kindPickerAria": "Operator category",
  "home.topOperators.loadError": "We couldn't load the ranking. Try again shortly.",
  "home.topOperators.resultsLive": "{count} {kind} in the national ranking.",
  "home.topOperators.emptyTitle": "No operators ranked for {kind}",
  "home.topOperators.backHome": "Back to home",
  "home.topOperators.loading": "Preparing the ranking…",

  "home.sponsoredSalons.title": "Sponsored salons",
  "home.sponsoredSalons.subtitle": "In the spotlight because they chose it",
  "home.sponsoredSalons.alt": "Interior of a beauty salon",
  "home.sponsoredSalons.badge": "Sponsored",
  "home.sponsoredSalons.resultsLive": "{count} sponsored salons.",
  "home.sponsoredSalons.emptyTitle": "No sponsored salons right now",
  "home.sponsoredSalons.loadError": "We couldn't load the list. Try again shortly.",
  "home.sponsoredSalons.backHome": "Back to home",
  "home.sponsoredSalons.adminLabel": "Sponsored",
  "home.sponsoredSalons.adminOn": "Add to sponsored",
  "home.sponsoredSalons.adminOff": "Remove from sponsored",
  "home.sponsoredSalons.adminWorking": "Updating…",
  "home.sponsoredSalons.adminError": "We couldn't update the featured placement.",

  "home.monthlyIdea.title": "Top salons of the month",
  "home.monthlyIdea.loadError": "We couldn't load the list. Try again shortly.",
  "home.monthlyIdea.resultsLive": "{count} salons ranked for this idea.",
  "home.monthlyIdea.reviewsPending": "Reviews coming soon",
  "home.monthlyIdea.emptyTitle": "No featured salons for this idea",
  "home.monthlyIdea.backHome": "Back to home",
  "home.salonResults.loading": "Preparing the salons…",

  "home.reviews.one": "1 review",
  "home.reviews.many": "{n} reviews",

  "home.quick.nearLabel": "Services nearest to you",
  "home.quick.nearRadius": "within ~{km} km",
  "home.quick.loading": "Detecting location and nearby services…",
  "home.quick.empty": "No services found near you. Widen the area or search by postcode.",
  "home.quick.retry": "Retry with location",
  "home.quick.needLocation":
    "Location is required to show nearby services (same as on the web). Allow access and try again.",

  "home.partner.title": "Own a salon? Join the professionals on Saloni Luxury.",
  "home.partner.lead":
    "Increase visibility, manage appointments and get booked online by clients looking for hairdressers, wellness and beauty in their area — with a clear experience for you and your guests.",
  "home.partner.ctaClient": "Sign up as a client",
  "home.partner.ctaSalon": "Become a partner (salon)",
  "home.partner.toastTitle": "New booking",
  "home.partner.toastMeta": "Today · 3:00 PM",

  "home.trend.estetisti.heading": "Beauty salons",
  "home.trend.parrucchieri.heading": "Hairdressers",
  "home.trend.massaggi.heading": "Massage & wellness",
} satisfies HomeExtendedCatalog;
