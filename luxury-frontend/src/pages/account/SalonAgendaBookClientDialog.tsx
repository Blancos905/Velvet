import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto, DayAvailability, MeSalonService, SalonCatalogClientRow } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { notifySalonCatalogClientsChanged } from "../../lib/salonCatalogClientsSync";
import { refreshOrgAvailabilityAfterBooking } from "../../lib/orgAvailabilityRefresh";
import { isSlotWithinBookingWindow, resolveBookingHoursWindow } from "../../lib/salonOpeningHours";
import { isSalonOpenOnYmd, salonClosedMessageForYmd } from "../../lib/salonOpenDays";
import { formatLocalYmd } from "./SalonAgendaBoard";
import "../../styles/luxury-salon-agenda-book.css";

function normalizeApiDateYmd(date: string): string {
  return date.trim().slice(0, 10);
}

function formatSlotHm(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export type SalonAgendaBookClientDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Operatore dell'agenda corrente (scelto prima di aprire il modulo). */
  presetOperatorId: string;
  presetOperatorLabel?: string;
  /** Giorno pre-selezionato (`YYYY-MM-DD`). */
  presetDateYmd?: string;
};

function serviceAllowsOperator(service: MeSalonService, operatorId: string): boolean {
  const ids = service.operatorIds ?? [];
  return ids.length === 0 || ids.includes(operatorId);
}

export function SalonAgendaBookClientDialog({
  open,
  onClose,
  presetOperatorId,
  presetOperatorLabel,
  presetDateYmd,
}: SalonAgendaBookClientDialogProps) {
  const { accessToken } = useLuxuryAuth();
  const qc = useQueryClient();
  const meSalon = useMeSalonSummaryQuery();

  const operatorId = presetOperatorId.trim();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const locationId = meSalon.data?.primaryLocationId?.trim() ?? "";

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [salonClientId, setSalonClientId] = useState("");
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [dateYmd, setDateYmd] = useState(presetDateYmd?.trim() || formatLocalYmd(new Date()));
  const [slotIso, setSlotIso] = useState("");
  const [formMsg, setFormMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientMode("existing");
    setSalonClientId("");
    setNewClientFirstName("");
    setNewClientLastName("");
    setNewClientEmail("");
    setNewClientPhone("");
    setServiceId("");
    setDateYmd(presetDateYmd?.trim() || formatLocalYmd(new Date()));
    setSlotIso("");
    setFormMsg(null);
  }, [open, presetDateYmd]);

  const clientsQ = useQuery({
    queryKey: ["catalog", "clients", locationId, accessToken],
    queryFn: () =>
      apiJson<SalonCatalogClientRow[]>("/api/v1/clients", {
        accessToken,
        headers: { "X-Location-Id": locationId },
      }),
    enabled: Boolean(open && accessToken && locationId),
  });

  const servicesQ = useQuery({
    queryKey: ["me", "salon", "services", accessToken],
    queryFn: () => apiJson<MeSalonService[]>("/api/v1/me/salon/services", { accessToken }),
    enabled: Boolean(open && accessToken),
  });

  const servicesForOperator = useMemo(() => {
    if (!operatorId) return [];
    return (servicesQ.data ?? []).filter((s) => serviceAllowsOperator(s, operatorId));
  }, [servicesQ.data, operatorId]);

  const selectedClient = useMemo(
    () => (clientsQ.data ?? []).find((c) => c.id === salonClientId),
    [clientsQ.data, salonClientId],
  );

  const selectedService = useMemo(
    () => servicesForOperator.find((s) => s.id === serviceId),
    [servicesForOperator, serviceId],
  );

  const bookingWindow = useMemo(
    () =>
      resolveBookingHoursWindow(
        meSalon.data?.primaryLocationOpeningMinuteOfDay,
        meSalon.data?.primaryLocationClosingMinuteOfDay,
        "Europe/Rome",
        meSalon.data?.primaryLocationMorningEndMinuteOfDay,
        meSalon.data?.primaryLocationAfternoonStartMinuteOfDay,
      ),
    [meSalon.data],
  );

  const availabilityReady = Boolean(open && slug && serviceId.trim() && operatorId && dateYmd);

  const availabilityQ = useQuery({
    queryKey: ["org", "availability", slug, serviceId, operatorId, dateYmd],
    queryFn: () => {
      const p = new URLSearchParams({
        serviceId,
        from: dateYmd,
        to: dateYmd,
        operatorId,
      });
      return apiJson<DayAvailability[]>(
        `/api/v1/public/organizations/${encodeURIComponent(slug)}/availability?${p}`,
      );
    },
    enabled: availabilityReady,
    retry: false,
  });

  const daySlots = useMemo(() => {
    const day = availabilityQ.data?.find((d) => normalizeApiDateYmd(d.date) === dateYmd);
    if (day?.closed || !isSalonOpenOnYmd(dateYmd, meSalon.data?.primaryLocationOpenDays)) {
      return [];
    }
    const duration = selectedService?.durationMinutes ?? 0;
    const minMs = Date.now() - 90_000;
    let slots = (day?.slotsIso ?? []).filter((iso) => new Date(iso).getTime() > minMs);
    if (bookingWindow && duration > 0) {
      slots = slots.filter((iso) => isSlotWithinBookingWindow(iso, bookingWindow, duration));
    }
    return slots.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [availabilityQ.data, dateYmd, bookingWindow, selectedService?.durationMinutes, meSalon.data?.primaryLocationOpenDays]);

  const selectedDayClosed = useMemo(() => {
    const day = availabilityQ.data?.find((d) => normalizeApiDateYmd(d.date) === dateYmd);
    if (day?.closed) return true;
    return !isSalonOpenOnYmd(dateYmd, meSalon.data?.primaryLocationOpenDays);
  }, [availabilityQ.data, dateYmd, meSalon.data?.primaryLocationOpenDays]);

  useEffect(() => {
    if (!slotIso || !daySlots.includes(slotIso)) setSlotIso("");
  }, [daySlots, slotIso]);

  useEffect(() => {
    if (!serviceId.trim()) return;
    if (!servicesForOperator.some((s) => s.id === serviceId)) {
      setServiceId("");
      setSlotIso("");
    }
  }, [serviceId, servicesForOperator]);

  const createClientM = useMutation({
    mutationFn: async () => {
      const firstName = newClientFirstName.trim();
      const lastName = newClientLastName.trim();
      if (!firstName) throw new Error("Inserisci il nome del cliente.");
      if (!lastName) throw new Error("Inserisci il cognome del cliente.");
      const displayName = `${firstName} ${lastName}`.trim();
      const payload: { displayName: string; email?: string; phone?: string } = { displayName };
      const email = newClientEmail.trim();
      const phone = newClientPhone.trim();
      if (email) payload.email = email;
      if (phone) payload.phone = phone;
      return apiJson<SalonCatalogClientRow>("/api/v1/clients", {
        method: "POST",
        accessToken,
        headers: { "X-Location-Id": locationId },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (row) => {
      setSalonClientId(row.id);
      setClientMode("existing");
      notifySalonCatalogClientsChanged();
      void qc.invalidateQueries({ queryKey: ["catalog", "clients", locationId] });
    },
  });

  const bookM = useMutation({
    mutationFn: async (body: {
      salonClientId: string;
      serviceId: string;
      operatorId: string;
      start: string;
    }) =>
      apiJson<AppointmentDto>("/api/v1/me/salon/appointments", {
        method: "POST",
        accessToken,
        body: JSON.stringify(body),
      }),
    onSuccess: async (_row, vars) => {
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      void qc.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      void qc.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
      if (slug) {
        refreshOrgAvailabilityAfterBooking(qc, slug, vars.start, selectedService?.durationMinutes);
      }
      onClose();
    },
  });

  const onSubmit = async () => {
    setFormMsg(null);
    let clientId = salonClientId.trim();
    if (clientMode === "new") {
      try {
        const created = await createClientM.mutateAsync();
        clientId = created.id;
      } catch (e) {
        setFormMsg(e instanceof Error ? e.message : "Cliente non creato.");
        return;
      }
    }
    if (!clientId) {
      setFormMsg("Seleziona un cliente o creane uno nuovo.");
      return;
    }
    if (!serviceId.trim()) {
      setFormMsg("Seleziona un servizio.");
      return;
    }
    if (!slotIso) {
      setFormMsg("Scegli un orario disponibile.");
      return;
    }
    try {
      await bookM.mutateAsync({
        salonClientId: clientId,
        serviceId: serviceId.trim(),
        operatorId,
        start: slotIso,
      });
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : "Prenotazione non riuscita.");
    }
  };

  const busy = createClientM.isPending || bookM.isPending;
  const operatorDisplay = presetOperatorLabel?.trim() || "Operatore agenda";

  const notificationHint = (() => {
    if (clientMode === "new") {
      return "Cliente nuovo senza account Saloni Luxury: nessuna email di conferma verrà inviata.";
    }
    if (selectedClient?.luxuryConsumerLinked) {
      return "Cliente registrato su Saloni Luxury: riceverà conferma e promemoria via email.";
    }
    if (selectedClient) {
      return "Cliente non registrato su Saloni Luxury: nessuna notifica email al cliente.";
    }
    return null;
  })();

  const canPickTime = Boolean(serviceId.trim());

  if (!open || typeof document === "undefined") return null;

  if (!operatorId) {
    return null;
  }

  return createPortal(
    <div
      className="luxury-salon-agenda-book-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="luxury-salon-agenda-book"
        role="dialog"
        aria-modal="true"
        aria-labelledby="luxury-salon-agenda-book-title"
      >
        <header className="luxury-salon-agenda-book__head">
          <h2 id="luxury-salon-agenda-book-title" className="luxury-salon-agenda-book__title">
            Prenota un cliente
          </h2>
          <button type="button" className="luxury-salon-agenda-book__close" onClick={onClose} disabled={busy}>
            Chiudi
          </button>
        </header>

        {!locationId || !slug ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            Sede del salone non disponibile. Attendi il caricamento o verifica la registrazione.
          </p>
        ) : (
          <div className="luxury-salon-agenda-book__body">
            <p className="luxury-salon-agenda-book__operator-line">
              <span className="luxury-salon-agenda-book__label">Operatore</span>
              <strong>{operatorDisplay}</strong>
            </p>

            <fieldset className="luxury-salon-agenda-book__fieldset">
              <legend className="luxury-salon-agenda-book__legend">Cliente</legend>
              <div className="luxury-salon-agenda-book__mode-row">
                <label className="luxury-salon-agenda-book__radio">
                  <input
                    type="radio"
                    name="client-mode"
                    checked={clientMode === "existing"}
                    onChange={() => setClientMode("existing")}
                  />
                  Anagrafica
                </label>
                <label className="luxury-salon-agenda-book__radio">
                  <input
                    type="radio"
                    name="client-mode"
                    checked={clientMode === "new"}
                    onChange={() => setClientMode("new")}
                  />
                  Nuovo cliente
                </label>
              </div>
              {clientMode === "existing" ? (
                <label className="luxury-salon-agenda-book__field">
                  <span className="luxury-salon-agenda-book__label">Cliente *</span>
                  <select
                    className="luxury-salon-agenda-book__select"
                    value={salonClientId}
                    onChange={(e) => setSalonClientId(e.target.value)}
                    disabled={clientsQ.isLoading}
                  >
                    <option value="">— Seleziona —</option>
                    {(clientsQ.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                        {c.luxuryConsumerLinked ? " · account Saloni Luxury" : ""}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>
                  {clientsQ.data?.length === 0 && !clientsQ.isLoading ? (
                    <span className="luxury-text-muted luxury-salon-agenda-book__hint">
                      Nessun cliente in anagrafica: usa «Nuovo cliente».
                    </span>
                  ) : null}
                </label>
              ) : (
                <>
                  <label className="luxury-salon-agenda-book__field">
                    <span className="luxury-salon-agenda-book__label">Nome *</span>
                    <input
                      className="luxury-salon-agenda-book__input"
                      value={newClientFirstName}
                      onChange={(e) => setNewClientFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="luxury-salon-agenda-book__field">
                    <span className="luxury-salon-agenda-book__label">Cognome *</span>
                    <input
                      className="luxury-salon-agenda-book__input"
                      value={newClientLastName}
                      onChange={(e) => setNewClientLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </label>
                  <p className="luxury-text-muted luxury-salon-agenda-book__hint">
                    Email e telefono sono facoltativi. Senza account Saloni Luxury il cliente non riceve email.
                  </p>
                  <label className="luxury-salon-agenda-book__field">
                    <span className="luxury-salon-agenda-book__label">Email (opzionale)</span>
                    <input
                      className="luxury-salon-agenda-book__input"
                      type="text"
                      inputMode="email"
                      autoCapitalize="off"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="es. maria@email.it"
                    />
                  </label>
                  <label className="luxury-salon-agenda-book__field">
                    <span className="luxury-salon-agenda-book__label">Telefono (opzionale)</span>
                    <input
                      className="luxury-salon-agenda-book__input"
                      type="tel"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      autoComplete="tel"
                      placeholder="es. 333 1234567"
                    />
                  </label>
                </>
              )}
              {notificationHint ? (
                <p className="luxury-salon-agenda-book__notify-hint luxury-text-muted">{notificationHint}</p>
              ) : null}
            </fieldset>

            <label className="luxury-salon-agenda-book__field">
              <span className="luxury-salon-agenda-book__label">Servizio *</span>
              <select
                className="luxury-salon-agenda-book__select"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setSlotIso("");
                  setFormMsg(null);
                }}
                disabled={servicesQ.isLoading}
              >
                <option value="">— Seleziona —</option>
                {servicesForOperator.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
              {servicesForOperator.length === 0 && !servicesQ.isLoading ? (
                <span className="luxury-text-muted luxury-salon-agenda-book__hint">
                  Nessun servizio abilitato per {operatorDisplay}. Collega i servizi allo staff in Aggiungi servizi.
                </span>
              ) : null}
            </label>

            <label className="luxury-salon-agenda-book__field">
              <span className="luxury-salon-agenda-book__label">Giorno *</span>
              <input
                type="date"
                className="luxury-salon-agenda-book__input"
                value={dateYmd}
                onChange={(e) => {
                  setDateYmd(e.target.value);
                  setSlotIso("");
                }}
              />
            </label>

            {canPickTime ? (
              <label className="luxury-salon-agenda-book__field">
                <span className="luxury-salon-agenda-book__label">Orario *</span>
                {availabilityQ.isLoading || availabilityQ.isFetching ? (
                  <p className="luxury-text-muted" style={{ margin: 0 }}>
                    Caricamento orari disponibili…
                  </p>
                ) : availabilityQ.isError ? (
                  <p className="luxury-alert luxury-alert--error" role="alert">
                    {availabilityQ.error instanceof Error
                      ? availabilityQ.error.message
                      : "Impossibile leggere gli orari liberi."}
                  </p>
                ) : selectedDayClosed ? (
                  <p className="luxury-text-muted" style={{ margin: 0 }} role="status">
                    {salonClosedMessageForYmd(dateYmd)}
                  </p>
                ) : daySlots.length === 0 ? (
                  <p className="luxury-text-muted" style={{ margin: 0 }}>
                    Nessun orario libero in questo giorno. Scegli un altro giorno o un altro servizio.
                  </p>
                ) : (
                  <select
                    className="luxury-salon-agenda-book__select"
                    value={slotIso}
                    onChange={(e) => setSlotIso(e.target.value)}
                    aria-label="Orario disponibile"
                  >
                    <option value="">— Seleziona orario —</option>
                    {daySlots.map((iso) => (
                      <option key={iso} value={iso}>
                        {formatSlotHm(iso)}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ) : null}

            {formMsg ? (
              <p className="luxury-alert luxury-alert--error" role="alert">
                {formMsg}
              </p>
            ) : null}

            <div className="luxury-salon-agenda-book__actions">
              <button type="button" className="luxury-btn luxury-btn--ghost" onClick={onClose} disabled={busy}>
                Annulla
              </button>
              <button type="button" className="luxury-btn luxury-btn--primary" onClick={() => void onSubmit()} disabled={busy}>
                {busy ? "Salvataggio…" : "Conferma appuntamento"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
