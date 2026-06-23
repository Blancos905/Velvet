import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import { SalonPublicShowcase } from "../components/salon/SalonPublicShowcase";
import { SalonLocationMapCard } from "../components/salon/SalonLocationMapCard";
import { SalonPublicReviewsBlock } from "../components/salon/SalonPublicReviewsBlock";
import { LegalSiteFootnote } from "../components/LegalSiteFootnote";
import type {
  AppointmentDto,
  DayAvailability,
  OperatorPublic,
  PublicSalonReview,
  ServicePublic,
  MeSalonSummary,
  SalonClientMembershipDto,
} from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { canBookOnlineAsConsumer } from "../lib/velvetConsumerBooking";
import { savePendingBooking } from "../components/PendingBookingResume";
import { BookingConfirmedModal } from "../components/BookingConfirmedModal";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { notifySalonCatalogClientsChanged } from "../lib/salonCatalogClientsSync";
import {
  formatAvailabilitySlotInTimeZone,
  formatSalonOpeningHours,
  formatSalonSplitOpeningHours,
  isSlotWithinBookingWindow,
  resolveBookingHoursWindow,
} from "../lib/salonOpeningHours";
import { usePublicOrganizationDetail } from "../lib/publicOrganizationDetail";
import { salonShowcaseFullQueryKey } from "../lib/prefetchSalonPublicPage";
import { emptySalonShowcase, readSalonShowcaseAsync } from "../lib/salonShowcaseStorage";
import "../styles/velvet-salon-showcase.css";
import "../styles/velvet-salon-page.css";
import "../styles/velvet-salon-booking-native-app.css";

/** Ruolo come in anagrafica staff (es. Parrucchiere); assente se non impostato in DB. */
function trimmedPublicOperatorRole(op: OperatorPublic): string | undefined {
  const r = op.role?.trim();
  return r || undefined;
}

/** Media voti operatore da API pubblica: dati per stelle + testo. */
function publicOperatorStaffReviewMeta(op: OperatorPublic): {
  filledStars: number;
  avgLabel: string;
  countBlurb: string;
} | null {
  const avg = op.averageStaffRating;
  const n = op.staffReviewCount;
  if (avg == null || n == null || n < 1) return null;
  const filledStars = Math.max(0, Math.min(5, Math.round(avg)));
  const avgLabel = avg.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rec = n === 1 ? "recensione" : "recensioni";
  return { filledStars, avgLabel, countBlurb: `${n} ${rec} con voto operatore` };
}

function OperatorStaffReviewStarsRow({ filledStars }: { filledStars: number }) {
  const f = Math.max(0, Math.min(5, filledStars));
  return (
    <span className="velvet-booking-operator-stars" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < f ? "velvet-booking-operator-stars__on" : "velvet-booking-operator-stars__off"}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatAvailabilityDayLabel(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatAvailabilitySlotTimeOnly(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isPublicReviewsEndpointUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("404") || msg.includes("not found") || msg.includes("failed to fetch");
}

function sanitizeMailtoHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return `mailto:${encodeURIComponent(value)}`;
}

function sanitizeTelHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const normalized = value.replace(/[^\d+]/g, "");
  if (!normalized || (normalized.match(/\+/g)?.length ?? 0) > 1) return null;
  if (normalized.includes("+") && !normalized.startsWith("+")) return null;
  return `tel:${normalized}`;
}

function MetaContactIconEmail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6zm0 2 8 5.25L20 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaContactIconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.35 1.78.67 2.63a2 2 0 01-.5 2.13L8.09 9.9a16 16 0 006 6l1.42-1.42a2 2 0 012.13-.5c.85.32 1.73.55 2.63.67A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaContactIconWhatsapp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function MetaContactIconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M6 18l-2 2 .5-3.5A8 8 0 1118 10a8 8 0 01-12 8z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Data locale `YYYY-MM-DD` — non usare `toISOString()` per il calendario (UTC sposta il giorno). */
function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthStartYmd(d: Date): string {
  return formatLocalYmd(new Date(d.getFullYear(), d.getMonth(), 1));
}

function monthEndYmd(d: Date): string {
  return formatLocalYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function mondayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Primo giorno del mese (mezzanotte locale). */
function calendarMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Primo giorno del mese corrente — usato per non prenotare/agende nel passato. */
function calendarCurrentMonthStart(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}

export default function SalonPage() {
  const { slug } = useParams<{ slug: string }>();
  const s = slug ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  /** Solo account cliente B2C: titolare e staff salone gestiscono l'agenda, non prenotano come clienti. */
  const canBookAsClient = canBookOnlineAsConsumer(isSalonTitolare, isSalonStaff);
  const showConsumerBookingFlow = !isAuthenticated || canBookAsClient;
  const isNativeApp = isVelvetNativeAppShell();
  const bookingSlotsModalTitleId = useId();
  const bookingLoginModalTitleId = useId();
  const bookingConfirmModalTitleId = useId();
  const qc = useQueryClient();

  const [serviceId, setServiceId] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [bookingMonth, setBookingMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showBookingAgenda, setShowBookingAgenda] = useState(false);
  /** Con operatori a staff: prima scelta operatore, poi agenda. Senza operatori: solo agenda. */
  const [bookingFlowStep, setBookingFlowStep] = useState<"operators" | "slots">("operators");
  const [from, setFrom] = useState(() => monthStartYmd(new Date()));
  const [to, setTo] = useState(() => monthEndYmd(new Date()));
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState("");
  const [bookingSlotsModalOpen, setBookingSlotsModalOpen] = useState(false);
  const [bookingLoginModalOpen, setBookingLoginModalOpen] = useState(false);
  const [bookingConfirmSlot, setBookingConfirmSlot] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{ appointmentId: string; startIso: string } | null>(null);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [salonClientFeedback, setSalonClientFeedback] = useState<string | null>(null);
  const [salonClientFeedbackIsError, setSalonClientFeedbackIsError] = useState(false);
  const userPickedAvailabilityDayRef = useRef(false);
  const bookingResumeHandledRef = useRef(false);
  const skipSingleOperatorAutoAdvanceRef = useRef(false);

  useEffect(() => {
    setBookingMsg(null);
  }, [serviceId, operatorId, from, to]);

  useEffect(() => {
    setFrom(monthStartYmd(bookingMonth));
    setTo(monthEndYmd(bookingMonth));
  }, [bookingMonth]);

  const detailQ = usePublicOrganizationDetail(s);
  const detail = detailQ.data;
  const bookingWindow = useMemo(
    () =>
      resolveBookingHoursWindow(
        detail?.bookingOpeningMinuteOfDay,
        detail?.bookingClosingMinuteOfDay,
        detail?.timeZone,
        detail?.bookingMorningEndMinuteOfDay,
        detail?.bookingAfternoonStartMinuteOfDay,
      ),
    [
      detail?.bookingOpeningMinuteOfDay,
      detail?.bookingClosingMinuteOfDay,
      detail?.bookingMorningEndMinuteOfDay,
      detail?.bookingAfternoonStartMinuteOfDay,
      detail?.timeZone,
    ],
  );
  const bookingHoursLabel = useMemo(() => {
    if (!bookingWindow) return null;
    if (bookingWindow.morningEndMinute != null && bookingWindow.afternoonStartMinute != null) {
      return formatSalonSplitOpeningHours(
        bookingWindow.openMinute,
        bookingWindow.morningEndMinute,
        bookingWindow.afternoonStartMinute,
        bookingWindow.closeMinute,
      );
    }
    return formatSalonOpeningHours(bookingWindow.openMinute, bookingWindow.closeMinute);
  }, [bookingWindow]);
  const salonTimeZone = bookingWindow?.timeZone ?? detail?.timeZone ?? "Europe/Rome";

  const showcaseQ = useQuery({
    queryKey: salonShowcaseFullQueryKey(s),
    queryFn: () => readSalonShowcaseAsync(s),
    enabled: Boolean(s),
    staleTime: 5 * 60_000,
  });

  const membershipsQ = useQuery({
    queryKey: ["me", "salon-clients", accessToken],
    queryFn: () => apiJson<SalonClientMembershipDto[]>("/api/v1/me/salon-clients", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const becomeSalonClientM = useMutation({
    mutationFn: (organizationId: string) =>
      apiJson<SalonClientMembershipDto>(`/api/v1/me/salon-clients/${organizationId}`, {
        method: "PUT",
        accessToken,
      }),
    onSuccess: (membership) => {
      setSalonClientFeedbackIsError(false);
      setSalonClientFeedback("Perfetto: ora risulti cliente di questo salone.");
      qc.setQueryData<SalonClientMembershipDto[]>(["me", "salon-clients", accessToken], (current) => {
        const list = current ?? [];
        if (list.some((item) => item.organizationId === membership.organizationId)) return list;
        return [membership, ...list];
      });
      void qc.invalidateQueries({ queryKey: ["catalog", "clients"] });
      notifySalonCatalogClientsChanged();
    },
    onError: (error) => {
      setSalonClientFeedbackIsError(true);
      setSalonClientFeedback(error instanceof Error ? error.message : "Impossibile completare la richiesta.");
    },
  });

  const leaveSalonClientM = useMutation({
    mutationFn: (organizationId: string) =>
      apiJson<void>(`/api/v1/me/salon-clients/${encodeURIComponent(organizationId)}/leave`, {
        method: "POST",
        accessToken,
      }),
    onSuccess: (_, organizationId) => {
      setSalonClientFeedbackIsError(false);
      setSalonClientFeedback("Hai scollegato il tuo profilo da questo salone.");
      qc.setQueryData<SalonClientMembershipDto[]>(["me", "salon-clients", accessToken], (current) =>
        (current ?? []).filter((item) => item.organizationId !== organizationId),
      );
      void qc.invalidateQueries({ queryKey: ["catalog", "clients"] });
      notifySalonCatalogClientsChanged();
    },
    onError: (error) => {
      setSalonClientFeedbackIsError(true);
      setSalonClientFeedback(error instanceof Error ? error.message : "Impossibile completare la richiesta.");
    },
  });

  useEffect(() => {
    if (!salonClientFeedback || salonClientFeedbackIsError) return;
    const t = window.setTimeout(() => setSalonClientFeedback(null), 3000);
    return () => window.clearTimeout(t);
  }, [salonClientFeedback, salonClientFeedbackIsError]);

  const servicesQ = useQuery({
    queryKey: ["org", "services", s],
    queryFn: () =>
      apiJson<ServicePublic[]>(`/api/v1/public/organizations/${encodeURIComponent(s)}/services`),
    enabled: Boolean(s),
  });
  const selectedService = useMemo(
    () => (serviceId.trim() ? (servicesQ.data ?? []).find((x) => x.id === serviceId) : undefined),
    [serviceId, servicesQ.data],
  );

  const buildSalonBookingLoginReturnPath = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    if (serviceId.trim()) params.set("service", serviceId.trim());
    params.set("prenota", "1");
    const qs = params.toString();
    return `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  }, [serviceId]);

  useEffect(() => {
    bookingResumeHandledRef.current = false;
    skipSingleOperatorAutoAdvanceRef.current = false;
  }, [s]);

  useEffect(() => {
    const sid = searchParams.get("service")?.trim();
    if (!sid || !servicesQ.data?.length) return;
    if (!servicesQ.data.some((x) => x.id === sid)) return;
    setServiceId(sid);
    if (searchParams.get("prenota") !== "1" || bookingResumeHandledRef.current) return;
    if (isAuthenticated && !canBookAsClient) {
      bookingResumeHandledRef.current = true;
      const params = new URLSearchParams(window.location.search);
      params.delete("prenota");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
      return;
    }
    bookingResumeHandledRef.current = true;
    skipSingleOperatorAutoAdvanceRef.current = true;
    setOperatorId("");
    setSelectedAvailabilityDate("");
    setBookingFlowStep("operators");
    setShowBookingAgenda(true);
    setBookingMonth(calendarCurrentMonthStart());
    window.requestAnimationFrame(() => {
      document.getElementById("velvet-salon-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const params = new URLSearchParams(window.location.search);
    params.delete("prenota");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [searchParams, servicesQ.data, isAuthenticated, canBookAsClient]);

  const operatorsQ = useQuery({
    queryKey: ["org", "operators", s, serviceId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (serviceId.trim()) p.set("serviceId", serviceId);
      const qs = p.toString();
      return apiJson<OperatorPublic[]>(
        `/api/v1/public/organizations/${encodeURIComponent(s)}/operators${qs ? `?${qs}` : ""}`,
      );
    },
    enabled: Boolean(s) && Boolean(serviceId.trim()) && showBookingAgenda,
  });

  const reviewsQ = useQuery({
    queryKey: ["org", "reviews", s],
    queryFn: async () => {
      try {
        return await apiJson<PublicSalonReview[]>(`/api/v1/public/organizations/${encodeURIComponent(s)}/reviews`);
      } catch (error) {
        if (isPublicReviewsEndpointUnavailable(error)) return [];
        throw error;
      }
    },
    enabled: Boolean(s),
  });

  const publicReviewStats = useMemo(() => {
    const list = reviewsQ.data ?? [];
    if (!list.length) return null;
    const salonSum = list.reduce((acc, r) => acc + r.rating, 0);
    return { count: list.length, salonAvg: salonSum / list.length };
  }, [reviewsQ.data]);

  const publicReviewAvgLabel = useMemo(() => {
    if (!publicReviewStats) return null;
    return publicReviewStats.salonAvg.toLocaleString("it-IT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }, [publicReviewStats]);

  const openBookingLoginModal = useCallback(() => {
    setPostLoginReturnPath(buildSalonBookingLoginReturnPath());
    setBookingLoginModalOpen(true);
  }, [buildSalonBookingLoginReturnPath]);

  const onBookServiceFromShowcase = useCallback((id: string) => {
    if (!showConsumerBookingFlow) return;
    setServiceId(id);
    setOperatorId("");
    setSelectedAvailabilityDate("");
    setBookingFlowStep("operators");
    setShowBookingAgenda(true);
    setBookingMonth(calendarCurrentMonthStart());
    window.requestAnimationFrame(() => {
      const bookingSection = document.getElementById("velvet-salon-booking");
      if (!bookingSection) return;
      bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [showConsumerBookingFlow]);

  const onSelectServiceForBooking = useCallback(
    (id: string) => {
      if (!showConsumerBookingFlow) return;
      if (!id.trim()) {
        setServiceId("");
        setShowBookingAgenda(false);
        return;
      }
      onBookServiceFromShowcase(id);
    },
    [onBookServiceFromShowcase, showConsumerBookingFlow],
  );

  useEffect(() => {
    if (!showBookingAgenda) return;
    setBookingFlowStep("operators");
    setOperatorId("");
    setSelectedAvailabilityDate("");
  }, [serviceId, showBookingAgenda]);

  useEffect(() => {
    if (!showBookingAgenda || operatorsQ.isLoading) return;
    const ops = operatorsQ.data ?? [];
    if (ops.length === 0) {
      setBookingFlowStep("slots");
      return;
    }
    if (ops.length === 1 && !operatorId.trim()) {
      if (!isAuthenticated || skipSingleOperatorAutoAdvanceRef.current) {
        setBookingFlowStep("operators");
        return;
      }
      setOperatorId(ops[0].id);
      setBookingFlowStep("slots");
    }
  }, [showBookingAgenda, operatorsQ.isLoading, operatorsQ.data, operatorId, isAuthenticated]);

  const operatorsList = operatorsQ.data ?? [];
  const selectedOperator = useMemo(
    () => (operatorId.trim() ? operatorsList.find((o) => o.id === operatorId) : undefined),
    [operatorsList, operatorId],
  );
  const selectedOperatorRoleLabel = useMemo(
    () => (selectedOperator ? trimmedPublicOperatorRole(selectedOperator) : undefined),
    [selectedOperator],
  );
  const selectedOperatorStaffReviewMeta = useMemo(
    () => (selectedOperator ? publicOperatorStaffReviewMeta(selectedOperator) : null),
    [selectedOperator],
  );
  const hasStaffOperators = operatorsList.length > 0;
  const operatorsFetchDone = !operatorsQ.isLoading;
  /** Evita 400: non chiamare availability finché non sappiamo se servono operatori e, se sì, quale id inviare. */
  const availabilityQueryReady =
    operatorsFetchDone && (!hasStaffOperators || Boolean(operatorId.trim()));

  const availabilityQ = useQuery({
    queryKey: ["org", "availability", s, serviceId, operatorId, from, to],
    queryFn: () => {
      const p = new URLSearchParams({
        serviceId,
        from,
        to,
      });
      const effectiveOperatorId = operatorId.trim();
      if (effectiveOperatorId) p.set("operatorId", effectiveOperatorId);
      return apiJson<DayAvailability[]>(
        `/api/v1/public/organizations/${encodeURIComponent(s)}/availability?${p}`,
      );
    },
    enabled: Boolean(
      showBookingAgenda && s && serviceId.trim().length > 0 && from && to && availabilityQueryReady,
    ),
    retry: false,
  });

  const availabilityDays = useMemo(() => {
    const days = availabilityQ.data ?? [];
    const duration = selectedService?.durationMinutes ?? 0;
    const minBookableMs = Date.now() - 90_000;
    if (!bookingWindow || duration <= 0) {
      return days.map((day) => ({
        ...day,
        slotsIso: day.slotsIso.filter((iso) => new Date(iso).getTime() > minBookableMs),
      }));
    }
    return days.map((day) => ({
      ...day,
      slotsIso: day.slotsIso.filter(
        (iso) =>
          new Date(iso).getTime() > minBookableMs &&
          isSlotWithinBookingWindow(iso, bookingWindow, duration),
      ),
    }));
  }, [availabilityQ.data, bookingWindow, selectedService?.durationMinutes]);
  const selectedDayAvailability = useMemo(
    () => availabilityDays.find((d) => d.date === selectedAvailabilityDate) ?? null,
    [availabilityDays, selectedAvailabilityDate],
  );
  const selectedDaySlots = selectedDayAvailability?.slotsIso ?? [];
  const availabilityByDate = useMemo(() => {
    const m = new Map<string, { free: number; total: number }>();
    for (const d of availabilityDays) {
      const free = d.slotsIso.length;
      const raw = d.totalSlots;
      const total =
        typeof raw === "number" && raw > 0 && Number.isFinite(raw)
          ? raw
          : free > 0
            ? free
            : 0;
      m.set(d.date, { free, total });
    }
    return m;
  }, [availabilityDays]);
  const selectedDayAvailInfo = useMemo(
    () => (selectedAvailabilityDate ? availabilityByDate.get(selectedAvailabilityDate) ?? null : null),
    [availabilityByDate, selectedAvailabilityDate],
  );
  const monthGridDays = useMemo(() => {
    const first = new Date(bookingMonth.getFullYear(), bookingMonth.getMonth(), 1);
    const last = new Date(bookingMonth.getFullYear(), bookingMonth.getMonth() + 1, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - mondayIndex(first.getDay()));
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - mondayIndex(last.getDay())));
    const out: { ymd: string; day: number; inMonth: boolean }[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ymd = formatLocalYmd(d);
      out.push({ ymd, day: d.getDate(), inMonth: d.getMonth() === bookingMonth.getMonth() });
    }
    return out;
  }, [bookingMonth]);

  useEffect(() => {
    if (!isNativeApp) return;
    setBookingSlotsModalOpen(false);
  }, [isNativeApp, serviceId, operatorId, bookingMonth]);

  useEffect(() => {
    if (availabilityDays.length === 0) {
      setSelectedAvailabilityDate("");
      if (isNativeApp) setBookingSlotsModalOpen(false);
      return;
    }
    if (isNativeApp) return;
    const hasCurrent = availabilityDays.some((d) => d.date === selectedAvailabilityDate);
    if (hasCurrent) return;
    const todayYmd = formatLocalYmd(new Date());
    const withSlots = availabilityDays.filter((d) => d.slotsIso.length > 0);
    const preferred =
      withSlots.find((d) => d.date === todayYmd)?.date ??
      withSlots[0]?.date ??
      availabilityDays.find((d) => d.date === todayYmd)?.date ??
      availabilityDays[0]?.date ??
      "";
    setSelectedAvailabilityDate(preferred);
  }, [availabilityDays, isNativeApp, selectedAvailabilityDate]);

  useEffect(() => {
    if (isNativeApp) return;
    if (!showBookingAgenda || !selectedAvailabilityDate || selectedDaySlots.length === 0) return;
    if (!userPickedAvailabilityDayRef.current) return;
    userPickedAvailabilityDayRef.current = false;
    requestAnimationFrame(() => {
      document.getElementById("velvet-booking-slots")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [isNativeApp, showBookingAgenda, selectedAvailabilityDate, selectedDaySlots.length]);

  useEffect(() => {
    if (!bookingSlotsModalOpen && !bookingLoginModalOpen && !bookingConfirmSlot) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bookingSlotsModalOpen, bookingLoginModalOpen, bookingConfirmSlot]);

  const requestPickSlot = useCallback((startIso: string) => {
    setBookingConfirmSlot(startIso);
  }, []);

  const onPickSlot = async (startIso: string) => {
    setBookingMsg(null);
    if (new Date(startIso).getTime() < Date.now() - 90_000) {
      setBookingMsg(
        "Questo orario risulta già passato. Apri il mese corrente (non mesi passati) e scegli un orario futuro: così la prenotazione comparirà in «In arrivo».",
      );
      return;
    }
    if (!isAuthenticated) {
      savePendingBooking({
        organizationSlug: s,
        serviceId,
        operatorId,
        start: startIso,
      });
      if (isNativeApp) setBookingSlotsModalOpen(false);
      navigate("/account");
      return;
    }
    if (!canBookAsClient) {
      setBookingMsg(
        "Con un account salone non puoi prenotare online. Registrati o accedi come cliente per prenotare un appuntamento.",
      );
      return;
    }
    if (!accessToken) {
      setBookingMsg("Token non disponibile. Riprova ad accedere.");
      return;
    }
    try {
      const res = await apiJson<AppointmentDto>("/api/v1/me/appointments", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          organizationSlug: s,
          serviceId,
          ...(operatorId ? { operatorId } : {}),
          start: startIso,
        }),
      });
      try {
        await qc.fetchQuery({
          queryKey: ["me", "appointments", true],
          queryFn: () =>
            apiJson<AppointmentDto[]>(`/api/v1/me/appointments?upcoming=${true}`, {
              accessToken,
            }),
        });
        await qc.fetchQuery({
          queryKey: ["me", "appointments", "upcoming", "home"],
          queryFn: () =>
            apiJson<AppointmentDto[]>(`/api/v1/me/appointments?upcoming=${true}`, {
              accessToken,
            }),
        });
      } catch {
        await qc.invalidateQueries({ queryKey: ["me", "appointments"] });
      }
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await qc.invalidateQueries({ queryKey: ["me", "salon-clients"] });
      void qc.invalidateQueries({ queryKey: ["catalog", "clients"] });
      notifySalonCatalogClientsChanged();
      void qc.invalidateQueries({ queryKey: ["me", "notifications"] });
      if (isNativeApp) setBookingSlotsModalOpen(false);
      setBookingSuccess({ appointmentId: res.id, startIso });
    } catch (e) {
      setBookingMsg(e instanceof Error ? e.message : "Errore");
    }
  };

  const alreadySalonClient = useMemo(() => {
    if (!detail?.id) return false;
    return (membershipsQ.data ?? []).some((item) => item.organizationId === detail.id);
  }, [detail?.id, membershipsQ.data]);

  /** Stesso id usato da `GET/POST .../salon-clients/chat/messages` (vedi TrustedSalonsPage, SalonClientsPage). */
  const salonVelvetChatMembershipId = useMemo(() => {
    if (!detail?.id) return null;
    return (membershipsQ.data ?? []).find((item) => item.organizationId === detail.id)?.id ?? null;
  }, [detail?.id, membershipsQ.data]);

  const telForDisplay =
    detail?.contactPhone?.trim() || detail?.phoneE164?.trim() || "";
  const contactEmailHref = sanitizeMailtoHref(detail?.contactEmail);
  const telHref = sanitizeTelHref(telForDisplay);
  const waFromWhatsapp = detail?.whatsappE164?.replace(/\D/g, "") ?? "";
  const waFromTel = telForDisplay.replace(/\D/g, "");
  const waDigits = waFromWhatsapp.length > 0 ? waFromWhatsapp : waFromTel;

  const showcase = showcaseQ.data ?? emptySalonShowcase();

  const exploreCardBrandInitial = useMemo(() => {
    const t = (detail?.name ?? "").trim();
    if (!t) return "?";
    return t.charAt(0).toLocaleUpperCase("it-IT");
  }, [detail?.name]);

  const atEarliestBookingMonth =
    calendarMonthStart(bookingMonth).getTime() === calendarCurrentMonthStart().getTime();

  return (
    <main className="velvet-page-main velvet-page-main--salon-showcase-immersive velvet-salon-public-page">
      <div className="velvet-salon-public-page__topbar">
        <Link to="/" className="velvet-header-cta-pill">
          <span className="velvet-header-cta-pill__glyph" aria-hidden="true">
            ←
          </span>
          <span className="velvet-header-partner-label">Cerca saloni</span>
        </Link>
      </div>

      {detailQ.error && !detail ? (
        <p className="velvet-salon-public-page__status velvet-alert velvet-alert--error" role="alert">
          {detailQ.error instanceof Error ? detailQ.error.message : "Sede non trovata"}
        </p>
      ) : null}

      {detail && (
        <>
          <SalonPublicShowcase
            salonName={detail.name}
            city={detail.city}
            showcase={showcase}
            services={(servicesQ.data ?? []).map((x) => ({
              id: x.id,
              name: x.name,
              description: x.description ?? null,
              priceCents: x.priceCents,
              durationMinutes: x.durationMinutes,
              photoDataUrl: showcase.servicePhotoDataUrls[x.id] ?? null,
              photoObjectPosition: showcase.servicePhotoObjectPositions[x.id] ?? "50% 50%",
            }))}
            selectedServiceId={serviceId || null}
            onSelectService={showConsumerBookingFlow ? onSelectServiceForBooking : undefined}
            detachedPublicLayout
            serviceListVariant="cards"
            onBookService={showConsumerBookingFlow ? onBookServiceFromShowcase : undefined}
            themeClass="velvet-salon-showcase--t-brand-hero"
            siteFullscreenBleed
            allowEmptyPreview
            embedHeading
          />

          <div className="velvet-salon-public-page__content">
            <section className="velvet-salon-public-meta" aria-label="Informazioni salone">
            <div className="velvet-salon-public-meta__grid">
              <Link
                to={`/s/${encodeURIComponent(detail.slug)}/esplora`}
                className="velvet-salon-public-meta__card velvet-salon-public-meta__card--wide velvet-salon-public-meta__card--clickable velvet-salon-public-meta__card--description velvet-salon-public-meta__card--explore-cta velvet-salon-public-meta__card--explore-warm"
              >
                <div className="velvet-salon-public-meta__explore-inner">
                  <div className="velvet-salon-public-meta__explore-aside">
                    {showcase.logoDataUrl ? (
                      <img
                        className="velvet-salon-public-meta__explore-logo"
                        src={showcase.logoDataUrl}
                        alt=""
                        width={104}
                        height={104}
                        decoding="async"
                        loading="lazy"
                      />
                    ) : (
                      <span className="velvet-salon-public-meta__explore-logo-fallback" aria-hidden="true">
                        {exploreCardBrandInitial}
                      </span>
                    )}
                  </div>
                  <div className="velvet-salon-public-meta__explore-main">
                    <div className="velvet-salon-public-meta__explore-head">
                      <h2 className="velvet-salon-public-meta__title velvet-salon-public-meta__title--explore">
                        Esplora il nostro salone
                      </h2>
                    </div>
                    <span className="velvet-salon-public-meta__explore-pill">
                      Apri la vetrina
                      <span className="velvet-salon-public-meta__explore-pill-arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>

              <div
                className="velvet-salon-public-meta__card velvet-salon-public-meta__card--wide velvet-salon-public-meta__card--reviews-cta velvet-salon-public-meta__card--reviews-band velvet-salon-public-meta__card--reviews-warm"
                aria-label="Recensioni"
              >
                <div className="velvet-salon-public-meta__reviews-inner">
                  <div className="velvet-salon-public-meta__reviews-aside">
                    <div className="velvet-salon-public-meta__reviews-aside-stack" aria-hidden="true">
                      <div className="velvet-salon-public-meta__reviews-aside-stars">
                        {Array.from({ length: 5 }, (_, index) => (
                          <span key={index} className="velvet-salon-public-meta__reviews-star">
                            ★
                          </span>
                        ))}
                      </div>
                      {publicReviewAvgLabel != null ? (
                        <span className="velvet-salon-public-meta__reviews-aside-avg">{publicReviewAvgLabel}</span>
                      ) : reviewsQ.isLoading ? (
                        <span className="velvet-salon-public-meta__reviews-aside-avg velvet-salon-public-meta__reviews-aside-avg--muted">
                          …
                        </span>
                      ) : (
                        <span className="velvet-salon-public-meta__reviews-aside-avg velvet-salon-public-meta__reviews-aside-avg--muted">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="velvet-salon-public-meta__reviews-main">
                    <div className="velvet-salon-public-meta__reviews-head">
                      <h2 className="velvet-salon-public-meta__title velvet-salon-public-meta__title--reviews">Recensioni</h2>
                    </div>
                    <SalonPublicReviewsBlock
                      isLoading={reviewsQ.isLoading}
                      isError={Boolean(reviewsQ.error)}
                      reviews={reviewsQ.data}
                    />
                  </div>
                </div>
              </div>

              <div className="velvet-salon-public-meta__card velvet-salon-public-meta__card--wide velvet-salon-public-meta__card--location velvet-salon-public-meta__card--map-warm">
                <SalonLocationMapCard
                  meSalon={
                    {
                      provisioned: true,
                      planTier: null,
                      primaryLocationName: detail.name,
                      primaryLocationSlug: detail.slug,
                      primaryLocationId: detail.id,
                      primaryLocationCity: detail.city,
                      primaryLocationPostalCode: null,
                      primaryLocationAddressLine: detail.addressLine,
                    } satisfies MeSalonSummary
                  }
                  isPending={false}
                  compact
                  publicWarmHeader
                  eyebrow="Posizione"
                  heading="Posizione del salone"
                />
              </div>

              <div className="velvet-salon-public-meta__card velvet-salon-public-meta__card--wide velvet-salon-public-meta__card--contacts velvet-salon-public-meta__card--contacts-warm">
                <div className="velvet-salon-public-meta__contacts-head">
                  <p className="velvet-salon-public-meta__eyebrow">Contatti</p>
                  <h2 className="velvet-salon-public-meta__title">Parla con noi</h2>
                </div>
                <div className="velvet-salon-public-meta__contact-lines" aria-label="Contatti del salone">
                  {detail.contactEmail?.trim() && contactEmailHref ? (
                    <p className="velvet-salon-public-meta__contact-line velvet-salon-public-meta__contact-line--with-icon">
                      <span className="velvet-salon-public-meta__contact-icon-wrap" aria-hidden>
                        <MetaContactIconEmail className="velvet-salon-public-meta__contact-icon" />
                      </span>
                      <span className="velvet-salon-public-meta__contact-line-body">
                        <span className="velvet-salon-public-meta__contact-label">Email</span>
                        <a href={contactEmailHref}>{detail.contactEmail.trim()}</a>
                      </span>
                    </p>
                  ) : null}
                  {telForDisplay && telHref ? (
                    <p className="velvet-salon-public-meta__contact-line velvet-salon-public-meta__contact-line--with-icon">
                      <span className="velvet-salon-public-meta__contact-icon-wrap" aria-hidden>
                        <MetaContactIconPhone className="velvet-salon-public-meta__contact-icon" />
                      </span>
                      <span className="velvet-salon-public-meta__contact-line-body">
                        <span className="velvet-salon-public-meta__contact-label">Telefono</span>
                        <a href={telHref}>{telForDisplay}</a>
                      </span>
                    </p>
                  ) : null}
                  {waDigits.length > 0 ? (
                    <p className="velvet-salon-public-meta__contact-line velvet-salon-public-meta__contact-line--with-icon">
                      <span
                        className="velvet-salon-public-meta__contact-icon-wrap velvet-salon-public-meta__contact-icon-wrap--whatsapp"
                        aria-hidden
                      >
                        <MetaContactIconWhatsapp className="velvet-salon-public-meta__contact-icon velvet-salon-public-meta__contact-icon--whatsapp" />
                      </span>
                      <span className="velvet-salon-public-meta__contact-line-body">
                        <span className="velvet-salon-public-meta__contact-label">WhatsApp</span>
                        <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                          Apri chat WhatsApp
                        </a>
                      </span>
                    </p>
                  ) : null}
                </div>
                {!detail.contactEmail?.trim() && !telForDisplay && waDigits.length === 0 ? (
                  <p className="velvet-salon-public-meta__hint">
                    Contatti non ancora impostati dal salone. Torna più tardi o usa la mappa qui sopra.
                  </p>
                ) : null}
                <div className="velvet-salon-public-meta__actions" aria-label="Azioni rapide">
                  {telForDisplay && telHref ? (
                    <a className="velvet-salon-public-meta__btn velvet-salon-public-meta__btn--call" href={telHref}>
                      <MetaContactIconPhone className="velvet-salon-public-meta__btn-icon" />
                      <span>Chiama</span>
                    </a>
                  ) : null}
                  {waDigits.length > 0 ? (
                    <a
                      className="velvet-salon-public-meta__btn velvet-salon-public-meta__btn--whatsapp"
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MetaContactIconWhatsapp className="velvet-salon-public-meta__btn-icon velvet-salon-public-meta__btn-icon--whatsapp" />
                      <span>WhatsApp</span>
                    </a>
                  ) : null}
                  {salonVelvetChatMembershipId ? (
                    <Link
                      className="velvet-salon-public-meta__btn velvet-salon-public-meta__btn--chat"
                      to={`/account/chat?salonClientId=${encodeURIComponent(salonVelvetChatMembershipId)}`}
                    >
                      <MetaContactIconChat className="velvet-salon-public-meta__btn-icon" />
                      <span>Chat salone</span>
                    </Link>
                  ) : isAuthenticated ? (
                    <Link
                      className="velvet-salon-public-meta__btn velvet-salon-public-meta__btn--chat"
                      to="/account/chat"
                      title="Diventa cliente di questo salone (sezione sotto) per aprire la chat con il titolare."
                    >
                      <MetaContactIconChat className="velvet-salon-public-meta__btn-icon" />
                      <span>Chat salone</span>
                    </Link>
                  ) : (
                    <Link
                      className="velvet-salon-public-meta__btn velvet-salon-public-meta__btn--chat"
                      to="/account"
                      onClick={() =>
                        setPostLoginReturnPath(`${window.location.pathname}${window.location.search}`)
                      }
                    >
                      <MetaContactIconChat className="velvet-salon-public-meta__btn-icon" />
                      <span>Chat salone</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
            </section>

            <div id="velvet-salon-booking" className="velvet-salon-public-page__booking">
            {!showConsumerBookingFlow ? (
              <div className="velvet-salon-booking-warm-card">
                <p className="velvet-salon-booking-warm-card__text" role="status">
                  Sei connesso con un account salone: la prenotazione online è riservata ai clienti registrati. Per fissare
                  un appuntamento usa l&apos;agenda in area account oppure registrati come cliente con un&apos;altra email.
                </p>
                <div className="velvet-salon-public-meta__actions" style={{ marginTop: 12 }}>
                  <Link to="/account/prenotazioni" className="velvet-salon-public-meta__btn">
                    Vai all&apos;agenda salone
                  </Link>
                </div>
              </div>
            ) : showBookingAgenda ? (
              <div className="velvet-booking-agenda-full velvet-booking-agenda-full--warm">
                {bookingFlowStep === "operators" ? (
                  <div className="velvet-booking-operator-step velvet-booking-operator-step--warm">
                    <div className="velvet-booking-operator-step__head">
                      <h2 className="velvet-booking-operator-step__title">Scegli l&apos;operatore</h2>
                    </div>
                    {operatorsQ.isLoading ? (
                      <p className="velvet-text-muted">Carico gli operatori…</p>
                    ) : (operatorsQ.data ?? []).length === 0 ? (
                      <p className="velvet-text-muted">
                        Nessun operatore disponibile per questo servizio. Il salone deve associare lo staff al servizio dal
                        listino in account.
                      </p>
                    ) : (
                      <ul className="velvet-radio-row velvet-radio-row--operators" aria-label="Elenco operatori">
                        {(operatorsQ.data ?? []).map((op) => {
                          const roleLabel = trimmedPublicOperatorRole(op);
                          const staffRev = publicOperatorStaffReviewMeta(op);
                          return (
                            <li key={op.id}>
                              <label>
                                <input
                                  type="radio"
                                  name="op"
                                  checked={operatorId === op.id}
                                  onChange={() => {
                                    if (!isAuthenticated) {
                                      openBookingLoginModal();
                                      return;
                                    }
                                    skipSingleOperatorAutoAdvanceRef.current = false;
                                    setOperatorId(op.id);
                                    setSelectedAvailabilityDate("");
                                    setBookingFlowStep("slots");
                                  }}
                                />
                                <span className="velvet-booking-operator-label">
                                  <span className="velvet-booking-operator-label__name">{op.displayName}</span>
                                  {roleLabel ? (
                                    <span className="velvet-booking-operator-label__role">{roleLabel}</span>
                                  ) : null}
                                  {staffRev ? (
                                    <span
                                      className="velvet-booking-operator-label__rating"
                                      title="Calcolata sulle recensioni post-visita che includono un voto verso l'operatore."
                                    >
                                      <OperatorStaffReviewStarsRow filledStars={staffRev.filledStars} />
                                      <span className="velvet-booking-operator-label__rating-text">
                                        Media {staffRev.avgLabel}/5 · {staffRev.countBlurb}
                                      </span>
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <>
                    {hasStaffOperators ? (
                      <div className="velvet-booking-agenda-full__operator-bar">
                        <p className="velvet-text-muted" style={{ margin: "0 0 0.5rem" }}>
                          Operatore:{" "}
                          <strong className="velvet-booking-operator-label velvet-booking-operator-label--compact">
                            {selectedOperator ? (
                              <>
                                <span className="velvet-booking-operator-label__name">
                                  {selectedOperator.displayName}
                                </span>
                                {selectedOperatorRoleLabel ? (
                                  <span className="velvet-booking-operator-label__role">
                                    {selectedOperatorRoleLabel}
                                  </span>
                                ) : null}
                                {selectedOperatorStaffReviewMeta ? (
                                  <span className="velvet-booking-operator-label__rating velvet-booking-operator-label__rating--inline">
                                    <OperatorStaffReviewStarsRow
                                      filledStars={selectedOperatorStaffReviewMeta.filledStars}
                                    />
                                    <span className="velvet-booking-operator-label__rating-text">
                                      Media {selectedOperatorStaffReviewMeta.avgLabel}/5 ·{" "}
                                      {selectedOperatorStaffReviewMeta.countBlurb}
                                    </span>
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              "—"
                            )}
                          </strong>
                        </p>
                        <button
                          type="button"
                          className="velvet-btn velvet-btn--secondary"
                          onClick={() => {
                            setBookingFlowStep("operators");
                            setOperatorId("");
                            setSelectedAvailabilityDate("");
                          }}
                        >
                          Cambia operatore
                        </button>
                      </div>
                    ) : (
                      <p className="velvet-text-muted" style={{ margin: "0 0 1rem" }}>
                        Nessun operatore configurato: la prenotazione verrà assegnata automaticamente.
                      </p>
                    )}

                    <div className="velvet-booking-agenda-full__schedule-header">
                      <div className="velvet-booking-agenda-full__schedule-head">
                        <h2 className="velvet-booking-agenda-full__schedule-title">Agenda disponibile</h2>
                      </div>
                      {bookingHoursLabel ? (
                        <div className="velvet-booking-agenda-full__schedule-meta">
                          <span className="velvet-booking-agenda-full__schedule-meta-label">
                            Orari prenotazione
                          </span>
                          <span className="velvet-booking-agenda-full__schedule-meta-hours">
                            {bookingHoursLabel}
                          </span>
                          {selectedService?.durationMinutes ? (
                            <span className="velvet-booking-agenda-full__schedule-meta-duration">
                              durata {selectedService.durationMinutes} min
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                {availabilityQ.isLoading ? (
                  <p className="velvet-text-muted">Carico agenda…</p>
                ) : availabilityQ.error ? (
                  <p className="velvet-alert velvet-alert--error" role="alert">
                    {availabilityQ.error instanceof Error ? availabilityQ.error.message : "Errore slot"}
                  </p>
                ) : (
                  <>
                    <div className="velvet-booking-agenda-full__monthbar">
                      <button
                        type="button"
                        className="velvet-btn velvet-btn--secondary"
                        disabled={atEarliestBookingMonth}
                        title={atEarliestBookingMonth ? "Non è possibile prenotare nei mesi passati" : undefined}
                        onClick={() =>
                          setBookingMonth((m) => {
                            const prev = new Date(m.getFullYear(), m.getMonth() - 1, 1);
                            const min = calendarCurrentMonthStart();
                            return prev < min ? m : prev;
                          })
                        }
                      >
                        ← Mese
                      </button>
                      <strong>
                        {bookingMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
                      </strong>
                      <button
                        type="button"
                        className="velvet-btn velvet-btn--secondary"
                        onClick={() =>
                          setBookingMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                        }
                      >
                        Mese →
                      </button>
                    </div>

                    <div className="velvet-booking-agenda-full__weekdays">
                      <span>Lun</span>
                      <span>Mar</span>
                      <span>Mer</span>
                      <span>Gio</span>
                      <span>Ven</span>
                      <span>Sab</span>
                      <span>Dom</span>
                    </div>
                    <div className="velvet-booking-agenda-full__grid">
                      {monthGridDays.map((cell) => {
                        const info = availabilityByDate.get(cell.ymd);
                        const free = info?.free ?? 0;
                        const total = info?.total ?? 0;
                        const hasBookableWindow = total > 0;
                        const fillLevel =
                          !cell.inMonth || !hasBookableWindow
                            ? ""
                            : free === 0
                              ? " fill-level--full"
                              : free >= total
                                ? " fill-level--free"
                                : " fill-level--partial";
                        const isActive = selectedAvailabilityDate === cell.ymd;
                        const canInteract = cell.inMonth && hasBookableWindow;
                        const slotLabel = !cell.inMonth
                          ? "—"
                          : !hasBookableWindow
                            ? "—"
                            : free === 0
                              ? "Pieno"
                              : total > free
                                ? `${free}/${total}`
                                : `${free} orari`;
                        return (
                          <button
                            key={cell.ymd}
                            type="button"
                            className={
                              `velvet-booking-agenda-full__day${cell.inMonth ? "" : " is-outside"}` +
                              `${canInteract && free > 0 ? " has-slots" : ""}` +
                              `${fillLevel}` +
                              `${isActive ? " is-active" : ""}`
                            }
                            disabled={!canInteract}
                            onClick={() => {
                              if (!isAuthenticated) {
                                openBookingLoginModal();
                                return;
                              }
                              userPickedAvailabilityDayRef.current = true;
                              setSelectedAvailabilityDate(cell.ymd);
                              if (isNativeApp) setBookingSlotsModalOpen(true);
                            }}
                          >
                            <span>{cell.day}</span>
                            <small>{slotLabel}</small>
                          </button>
                        );
                      })}
                    </div>

                    {isNativeApp ? null : selectedDaySlots.length === 0 &&
                      selectedDayAvailInfo &&
                      selectedDayAvailInfo.free === 0 &&
                      selectedDayAvailInfo.total > 0 ? (
                      <p className="velvet-text-muted">Non ci sono orari liberi in questo giorno per l&apos;operatore scelto.</p>
                    ) : selectedDaySlots.length === 0 ? (
                      <p className="velvet-text-muted">Clicca un giorno disponibile per vedere gli orari.</p>
                    ) : (
                      <div id="velvet-booking-slots" className="velvet-booking-agenda-full__slots">
                        <p className="velvet-text-muted" style={{ marginBottom: 8 }}>
                          Orari disponibili per {formatAvailabilityDayLabel(selectedAvailabilityDate)}
                        </p>
                        <ul className="velvet-slot-grid">
                          {selectedDaySlots.map((slot) => (
                            <li key={slot}>
                              <button
                                type="button"
                                className="velvet-slot-btn"
                                disabled={isAuthenticated && !canBookAsClient}
                                onClick={() => requestPickSlot(slot)}
                              >
                                {formatAvailabilitySlotInTimeZone(slot, salonTimeZone)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                  </>
                )}
              </div>
            ) : null}

            {bookingMsg && showConsumerBookingFlow && !bookingMsg.includes("confermata") && (
              <p
                className="velvet-alert velvet-alert--error"
                style={{ marginTop: 16 }}
                role="alert"
              >
                {bookingMsg}
              </p>
            )}
          </div>

          {isAuthenticated && accessToken && canBookAsClient && (
            <div
              className="velvet-salon-public-meta__card velvet-salon-public-meta__card--wide velvet-salon-public-meta__card--contacts-warm velvet-salon-public-meta__card--salon-membership"
              aria-label="Legame cliente con il salone"
            >
              <p className="velvet-salon-public-meta__eyebrow">Il tuo account</p>
              <h2 className="velvet-salon-public-meta__title">Cliente di questo salone</h2>
              {!alreadySalonClient ? (
                <p className="velvet-salon-public-meta__hint">
                  Collega il tuo account come cliente per semplificare prenotazioni e messaggi con il salone.
                </p>
              ) : null}
              <div className="velvet-salon-public-meta__actions">
                <button
                  type="button"
                  className={
                    alreadySalonClient
                      ? "velvet-salon-public-meta__btn velvet-salon-public-meta__btn--ghost"
                      : "velvet-salon-public-meta__btn"
                  }
                  disabled={
                    !detail?.id ||
                    (alreadySalonClient ? leaveSalonClientM.isPending : becomeSalonClientM.isPending)
                  }
                  onClick={() => {
                    if (!detail?.id || !accessToken) return;
                    setSalonClientFeedback(null);
                    setSalonClientFeedbackIsError(false);
                    if (alreadySalonClient) {
                      const ok = window.confirm(
                        "Vuoi smettere di risultare cliente di questo salone sul tuo account? Lo storico delle prenotazioni resta lato salone dove necessario.",
                      );
                      if (!ok) return;
                      leaveSalonClientM.mutate(detail.id);
                      return;
                    }
                    becomeSalonClientM.mutate(detail.id);
                  }}
                >
                  {alreadySalonClient
                    ? leaveSalonClientM.isPending
                      ? "Scollegamento…"
                      : "Non essere più cliente di questo salone"
                    : becomeSalonClientM.isPending
                      ? "Collegamento…"
                      : "Diventa cliente di questo salone"}
                </button>
              </div>
              {salonClientFeedback ? (
                <p
                  className={`velvet-salon-public-meta__membership-feedback ${salonClientFeedbackIsError ? "velvet-salon-public-meta__membership-feedback--err" : "velvet-salon-public-meta__membership-feedback--ok"}`}
                  role={salonClientFeedbackIsError ? "alert" : "status"}
                >
                  {salonClientFeedback}
                </p>
              ) : null}
            </div>
          )}

          </div>
        </>
      )}
      {bookingConfirmSlot &&
        createPortal(
          <div
            className="velvet-booking-slots-modal__backdrop velvet-booking-confirm-modal__backdrop"
            role="presentation"
            onClick={() => setBookingConfirmSlot(null)}
          >
            <div
              className="velvet-booking-slots-modal__dialog velvet-booking-login-modal__dialog velvet-booking-confirm-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={bookingConfirmModalTitleId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="velvet-booking-slots-modal__glow" aria-hidden="true" />
              <div className="velvet-booking-slots-modal__head">
                <button
                  type="button"
                  className="velvet-booking-slots-modal__close"
                  onClick={() => setBookingConfirmSlot(null)}
                  aria-label="Chiudi"
                >
                  <span className="velvet-booking-slots-modal__close-icon" aria-hidden="true">
                    ×
                  </span>
                </button>
                <p className="velvet-booking-slots-modal__eyebrow">Conferma</p>
                <h2 id={bookingConfirmModalTitleId} className="velvet-booking-confirm-modal__title">
                  Confermi questo orario?
                </h2>
              </div>
              <div className="velvet-booking-confirm-modal__panel">
                <p className="velvet-booking-confirm-modal__slot-label">
                  {formatAvailabilitySlotInTimeZone(bookingConfirmSlot, salonTimeZone)}
                </p>
                <p className="velvet-booking-confirm-modal__hint">
                  Sei sicuro di voler prenotare questo orario?
                </p>
                <div className="velvet-booking-confirm-modal__actions">
                  <button
                    type="button"
                    className="velvet-booking-confirm-modal__btn velvet-booking-confirm-modal__btn--cancel"
                    onClick={() => setBookingConfirmSlot(null)}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="velvet-header-cta-pill velvet-header-btn-primary velvet-booking-confirm-modal__btn velvet-booking-confirm-modal__btn--confirm"
                    onClick={() => {
                      const startIso = bookingConfirmSlot;
                      setBookingConfirmSlot(null);
                      void onPickSlot(startIso);
                    }}
                  >
                    Conferma
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {bookingSuccess ? (
        <BookingConfirmedModal
          startIso={bookingSuccess.startIso}
          timeZone={salonTimeZone}
          serviceName={selectedService?.name}
          pendingApproval
          onClose={() => setBookingSuccess(null)}
          onViewAppointment={() => {
            const id = bookingSuccess.appointmentId;
            setBookingSuccess(null);
            navigate(`/account/prenotazioni/${id}`);
          }}
        />
      ) : null}
      {bookingLoginModalOpen &&
        createPortal(
          <div
            className="velvet-booking-slots-modal__backdrop"
            role="presentation"
            onClick={() => setBookingLoginModalOpen(false)}
          >
            <div
              className="velvet-booking-slots-modal__dialog velvet-booking-login-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={bookingLoginModalTitleId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="velvet-booking-slots-modal__glow" aria-hidden="true" />
              <div className="velvet-booking-slots-modal__handle" aria-hidden="true" />
              <div className="velvet-booking-slots-modal__head">
                <button
                  type="button"
                  className="velvet-booking-slots-modal__close"
                  onClick={() => setBookingLoginModalOpen(false)}
                  aria-label="Chiudi"
                >
                  <span className="velvet-booking-slots-modal__close-icon" aria-hidden="true">
                    ×
                  </span>
                </button>
                <p className="velvet-booking-slots-modal__eyebrow">Prenotazione</p>
                <h2 id={bookingLoginModalTitleId} className="velvet-booking-login-modal__title">
                  accedi per prenotare
                </h2>
              </div>
              <div className="velvet-booking-login-modal__panel">
                <Link
                  to="/account"
                  className="velvet-header-cta-pill velvet-header-btn-primary velvet-booking-login-modal__cta"
                  onClick={() => {
                    setPostLoginReturnPath(buildSalonBookingLoginReturnPath());
                    setBookingLoginModalOpen(false);
                  }}
                >
                  accedi per prenotare
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {isNativeApp &&
        bookingSlotsModalOpen &&
        selectedAvailabilityDate &&
        createPortal(
          <div
            className="velvet-booking-slots-modal__backdrop"
            role="presentation"
            onClick={() => setBookingSlotsModalOpen(false)}
          >
            <div
              className="velvet-booking-slots-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={bookingSlotsModalTitleId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="velvet-booking-slots-modal__glow" aria-hidden="true" />
              <div className="velvet-booking-slots-modal__handle" aria-hidden="true" />
              <div className="velvet-booking-slots-modal__head">
                <button
                  type="button"
                  className="velvet-booking-slots-modal__close"
                  onClick={() => setBookingSlotsModalOpen(false)}
                  aria-label="Chiudi"
                >
                  <span className="velvet-booking-slots-modal__close-icon" aria-hidden="true">
                    ×
                  </span>
                </button>
                <p className="velvet-booking-slots-modal__eyebrow">Scegli l&apos;orario</p>
                <h2 id={bookingSlotsModalTitleId} className="velvet-booking-slots-modal__title">
                  Orari per {formatAvailabilityDayLabel(selectedAvailabilityDate)}
                </h2>
                {selectedDaySlots.length > 0 ? (
                  <p className="velvet-booking-slots-modal__meta">
                    <span className="velvet-booking-slots-modal__meta-count">{selectedDaySlots.length}</span>
                    {selectedDaySlots.length === 1 ? " slot libero" : " slot liberi"}
                  </p>
                ) : null}
              </div>
              <div className="velvet-booking-slots-modal__panel">
                {selectedDaySlots.length === 0 ? (
                  <p className="velvet-booking-slots-modal__empty">
                    Non ci sono orari liberi in questo giorno per l&apos;operatore scelto.
                  </p>
                ) : (
                  <ul className="velvet-booking-slots-modal__grid">
                    {selectedDaySlots.map((slot) => (
                      <li key={slot}>
                        <button
                          type="button"
                          className="velvet-booking-slots-modal__slot"
                          disabled={isAuthenticated && !canBookAsClient}
                          onClick={() => requestPickSlot(slot)}
                        >
                          <span className="velvet-booking-slots-modal__slot-face" aria-hidden="true" />
                          <span className="velvet-booking-slots-modal__slot-time">
                            {formatAvailabilitySlotTimeOnly(slot, salonTimeZone)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
      <LegalSiteFootnote className="velvet-legal-site-footnote--salon-page" />
    </main>
  );
}
