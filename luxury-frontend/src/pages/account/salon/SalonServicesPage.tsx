import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../../api/client";
import type { MeSalonService } from "../../../api/types";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { useSalonStaffList } from "../../../hooks/useSalonStaffList";
import { readImageFileAsServicePhotoDataUrl } from "../../../lib/readImageDataUrl";
import { invalidateSalonShowcaseHitVisualQueries } from "../../../lib/salonShowcaseHitVisualQuery";
import {
  emptySalonShowcase,
  readSalonShowcaseAsync,
  writeSalonShowcaseAsync,
  type SalonShowcaseStored,
} from "../../../lib/salonShowcaseStorage";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import "../../../styles/luxury-account-page-shell.css";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-account-salon-services.css";
import "../../../styles/luxury-salon-showcase.css";
import "../../../styles/luxury-salon-services-salon.css";

function formatItPrice(priceCents: number): string {
  return (priceCents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Accetta "35", "35,5", "35,50" → centesimi. */
function parseEuroToCents(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Minuti da testo libero: "15", "15 min", "15 minuti", "30 m" (evita type=number che svuota
 * il valore se l’utente incolla testo con unità).
 */
function parseDurationMinutesFromInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/\d{1,4}/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function parseObjectPosition(raw: string | null | undefined): { x: number; y: number } {
  const t = raw?.trim() ?? "";
  const m = t.match(/^([0-9]{1,3})%\s+([0-9]{1,3})%$/);
  if (!m) return { x: 50, y: 50 };
  return { x: clampPercent(Number(m[1])), y: clampPercent(Number(m[2])) };
}

function buildObjectPosition(x: number, y: number): string {
  return `${clampPercent(x)}% ${clampPercent(y)}%`;
}

export default function SalonServicesPage() {
  const { accessToken, isSalonTitolare } = useLuxuryAuth();
  const qc = useQueryClient();
  const meSalon = useMeSalonSummaryQuery();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";

  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [priceEuro, setPriceEuro] = useState("");
  const [description, setDescription] = useState("");
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [showcase, setShowcase] = useState<SalonShowcaseStored>(() => emptySalonShowcase());
  const newServicePhotoRef = useRef<File | null>(null);
  const newServicePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [newServicePhotoPreview, setNewServicePhotoPreview] = useState<string | null>(null);
  const [newServicePhotoObjectPos, setNewServicePhotoObjectPos] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [editPriceEuro, setEditPriceEuro] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [createOperatorIds, setCreateOperatorIds] = useState<string[]>([]);
  const [editOperatorIds, setEditOperatorIds] = useState<string[]>([]);
  const { mergedStaffMembers, staffQuery } = useSalonStaffList();
  const apiStaff = useMemo(
    () => mergedStaffMembers.filter((m) => m.source === "api"),
    [mergedStaffMembers],
  );

  const listQ = useQuery({
    queryKey: ["me", "salon", "services"],
    queryFn: () => apiJson<MeSalonService[]>("/api/v1/me/salon/services", { accessToken }),
    enabled: Boolean(accessToken) && isSalonTitolare,
  });

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    void readSalonShowcaseAsync(slug, accessToken).then((data) => {
      if (alive) setShowcase(data ?? emptySalonShowcase());
    });
    return () => {
      alive = false;
    };
  }, [slug, accessToken]);

  const persistShowcase = useCallback(
    (build: (prev: SalonShowcaseStored) => SalonShowcaseStored) => {
      if (!slug) return;
      setShowcase((prev) => {
        const next = build(prev);
        void writeSalonShowcaseAsync(slug, next, accessToken).then((res) => {
          if (!res.ok) {
            setPhotoMsg(res.error);
            void readSalonShowcaseAsync(slug).then((restored) => {
              setShowcase(restored ?? emptySalonShowcase());
            });
          } else {
            setPhotoMsg(null);
            invalidateSalonShowcaseHitVisualQueries(qc, slug);
          }
        });
        return next;
      });
    },
    [slug, qc, accessToken],
  );

  const clearNewServicePhotoPick = () => {
    newServicePhotoRef.current = null;
    if (newServicePhotoInputRef.current) newServicePhotoInputRef.current.value = "";
    setNewServicePhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNewServicePhotoObjectPos({ x: 50, y: 50 });
  };

  const onNewServicePhotoPick = (file: File | null) => {
    setPhotoMsg(null);
    setNewServicePhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!file) {
      newServicePhotoRef.current = null;
      return;
    }
    newServicePhotoRef.current = file;
    setNewServicePhotoObjectPos({ x: 50, y: 50 });
    setNewServicePhotoPreview(URL.createObjectURL(file));
  };

  const onListServicePhoto = async (serviceId: string, file: File | null) => {
    if (!slug || !file) return;
    setPhotoMsg(null);
    setIsPhotoProcessing(true);
    try {
      const dataUrl = await readImageFileAsServicePhotoDataUrl(file);
      persistShowcase((prev) => ({
        ...prev,
        servicePhotoDataUrls: { ...prev.servicePhotoDataUrls, [serviceId]: dataUrl },
        servicePhotoObjectPositions: { ...prev.servicePhotoObjectPositions, [serviceId]: "50% 50%" },
      }));
    } catch (e) {
      setPhotoMsg(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  const clearListServicePhoto = (serviceId: string) => {
    persistShowcase((prev) => {
      const copy = { ...prev.servicePhotoDataUrls };
      const positions = { ...prev.servicePhotoObjectPositions };
      delete copy[serviceId];
      delete positions[serviceId];
      return { ...prev, servicePhotoDataUrls: copy, servicePhotoObjectPositions: positions };
    });
  };

  const cancelServiceEdit = () => {
    setEditingServiceId(null);
    setEditName("");
    setEditDurationMinutes("");
    setEditPriceEuro("");
    setEditDescription("");
    setEditOperatorIds([]);
    setEditMsg(null);
  };

  const beginServiceEdit = (service: MeSalonService) => {
    setEditingServiceId(service.id);
    setEditName(service.name);
    setEditDurationMinutes(String(service.durationMinutes));
    setEditPriceEuro(formatItPrice(service.priceCents));
    setEditDescription(service.description ?? "");
    setEditOperatorIds(service.operatorIds ?? []);
    setEditMsg(null);
  };

  const toggleOperatorId = (ids: string[], id: string, checked: boolean): string[] => {
    if (checked) return ids.includes(id) ? ids : [...ids, id];
    return ids.filter((x) => x !== id);
  };

  const renderOperatorPicker = (selectedIds: string[], onChange: (next: string[]) => void, idPrefix: string) => {
    if (staffQuery.isLoading) {
      return <p className="luxury-text-muted">Carico operatori…</p>;
    }
    if (apiStaff.length === 0) {
      return null;
    }
    return (
      <ul className="luxury-salon-services-operator-pick" aria-label="Operatori per questo servizio">
        {apiStaff.map((member) => {
          const inputId = `${idPrefix}-op-${member.rawId}`;
          const checked = selectedIds.includes(member.rawId);
          const label = `${member.firstName} ${member.lastName}`.trim();
          return (
            <li key={member.id}>
              <label htmlFor={inputId} className="luxury-salon-services-operator-pick__label">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(toggleOperatorId(selectedIds, member.rawId, e.target.checked))}
                />
                <span className="luxury-salon-services-operator-pick__identity">
                  <span className="luxury-salon-services-operator-pick__name">{label || "Operatore"}</span>
                  {member.role ? (
                    <span className="luxury-salon-services-operator-pick__role"> · {member.role}</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  const buildServicePayload = (values: {
    name: string;
    durationMinutes: string;
    priceEuro: string;
    description: string;
    operatorIds: string[];
  }) => {
    const priceCents = parseEuroToCents(values.priceEuro);
    const durationValue = parseDurationMinutesFromInput(values.durationMinutes);
    if (!values.name.trim()) throw new Error("Inserisci il nome del servizio.");
    if (durationValue === null || durationValue < 5 || durationValue > 24 * 60) {
      throw new Error("La durata deve essere tra 5 minuti e 24 ore (es. 15 o 15 minuti).");
    }
    if (priceCents === null) throw new Error("Inserisci un costo valido (es. 25 o 25,50).");
    const descTrim = values.description.trim();
    return {
      name: values.name.trim(),
      durationMinutes: durationValue,
      priceCents,
      description: descTrim.length > 0 ? descTrim : null,
      operatorIds: values.operatorIds,
    };
  };

  const createM = useMutation({
    mutationFn: async () => {
      const payload = buildServicePayload({
        name,
        durationMinutes,
        priceEuro,
        description,
        operatorIds: createOperatorIds,
      });
      return apiJson<MeSalonService>("/api/v1/me/salon/services", {
        method: "POST",
        accessToken,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (newService: MeSalonService) => {
      setFormMsg("Servizio aggiunto al listino.");
      setName("");
      setPriceEuro("");
      setDescription("");
      setDurationMinutes("");
      setCreateOperatorIds([]);
      const file = newServicePhotoRef.current;
      clearNewServicePhotoPick();
      if (file && slug) {
        setIsPhotoProcessing(true);
        try {
          const dataUrl = await readImageFileAsServicePhotoDataUrl(file);
          const cur = await readSalonShowcaseAsync(slug);
          const base = cur ?? emptySalonShowcase();
          const next: SalonShowcaseStored = {
            ...base,
            servicePhotoDataUrls: { ...base.servicePhotoDataUrls, [newService.id]: dataUrl },
            servicePhotoObjectPositions: {
              ...base.servicePhotoObjectPositions,
              [newService.id]: buildObjectPosition(newServicePhotoObjectPos.x, newServicePhotoObjectPos.y),
            },
          };
          const w = await writeSalonShowcaseAsync(slug, next, accessToken);
          if (!w.ok) {
            setPhotoMsg(w.error);
          } else {
            setShowcase(next);
            invalidateSalonShowcaseHitVisualQueries(qc, slug);
          }
        } catch (e) {
          setPhotoMsg(e instanceof Error ? e.message : "Foto non salvata");
        } finally {
          setIsPhotoProcessing(false);
        }
      }
      await qc.invalidateQueries({ queryKey: ["me", "salon", "services"] });
    },
    onError: (e: Error) => setFormMsg(e.message),
  });

  const updateM = useMutation({
    mutationFn: async (serviceId: string) => {
      const payload = buildServicePayload({
        name: editName,
        durationMinutes: editDurationMinutes,
        priceEuro: editPriceEuro,
        description: editDescription,
        operatorIds: editOperatorIds,
      });
      return apiJson<MeSalonService>(`/api/v1/me/salon/services/${encodeURIComponent(serviceId)}`, {
        method: "PUT",
        accessToken,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setEditMsg("Servizio aggiornato.");
      cancelServiceEdit();
      await qc.invalidateQueries({ queryKey: ["me", "salon", "services"] });
    },
    onError: (e: Error) => setEditMsg(e.message),
  });

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  return (
    <div
      className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-services-account luxury-salon-services-account--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientAccountHeroHeader
          headlinePre="Aggiungi "
          headlineAccent="servizi"
          badgePrimary="Area salone"
          badgeSecondary="Listino"
          kickerLabel="Servizi"
          kickerChip="Vetrina & prenotazioni"
          subtitle={
            <>
              Crea il tuo <strong>listino</strong>: nome, costo, durata e foto. I clienti li prenotano dalla tua
              vetrina.
            </>
          }
          metaItems={[
            { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Prenotabili dai clienti" },
            { icon: CLIENT_ACCOUNT_ICONS.user, label: "Assegnabili agli operatori" },
          ]}
        />
      <div className="luxury-salon-services-page luxury-salon-services-page--salon-side">
      {meSalon.isSuccess && meSalon.data?.provisioned && !meSalon.data.primaryLocationSlug ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          Il salone è collegato all&apos;account ma manca la sede in anagrafica. Riprova a salvare: il sistema la
          ricrea automaticamente. Se l&apos;errore persiste, contatta l&apos;assistenza Saloni Luxury.
        </p>
      ) : null}
      {meSalon.isSuccess && meSalon.data && !meSalon.data.provisioned ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          Nessun salone collegato all&apos;account. Se hai già usato questa email su Piani, invia di nuovo il modulo (crea la
          riga salone anche se il profilo consumatore esisteva già) oppure accedi con la stessa email usata in registrazione.{" "}
          <Link className="luxury-link-inline" to="/piani">
            Piani
          </Link>
        </p>
      ) : null}
      {meSalon.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          Impossibile caricare il salone ({meSalon.error instanceof Error ? meSalon.error.message : "errore"}). Verifica backend e
          accesso.
        </p>
      ) : null}

      {photoMsg ? (
        <p className="luxury-alert luxury-alert--error luxury-salon-services-page__alert-spaced" role="alert">
          {photoMsg}
        </p>
      ) : null}
      {isPhotoProcessing ? (
        <p className="luxury-text-muted luxury-salon-services-page__alert-spaced" role="status">
          Caricamento foto in corso…
        </p>
      ) : null}

      <div className="luxury-surface-card luxury-salon-services-form-card">
        <h2 className="luxury-card-title">Aggiungi servizio</h2>
        <form
          className="luxury-salon-services-form"
          onSubmit={(e) => {
            e.preventDefault();
            setFormMsg(null);
            createM.mutate();
          }}
        >
          <label className="luxury-form-label">
            Nome servizio
            <input className="luxury-soft-field" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="off" />
          </label>
          <label className="luxury-form-label luxury-salon-services-form__label-tight">
            Costo
            <input
              className="luxury-soft-field"
              value={priceEuro}
              onChange={(e) => setPriceEuro(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              autoComplete="off"
            />
          </label>
          <label className="luxury-form-label luxury-salon-services-form__label-tight">
            Durata del servizio (minuti)
            <input
              className="luxury-soft-field"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="es. 15 o 15 minuti"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </label>
          <label className="luxury-form-label luxury-salon-services-form__label-tight">
            Descrizione (massimo 2000 caratteri)
            <textarea
              className="luxury-soft-field luxury-salon-services-form__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder=""
            />
          </label>
          <div className="luxury-form-label luxury-salon-services-form__label-tight">
            Operatori per questo servizio
            {renderOperatorPicker(createOperatorIds, setCreateOperatorIds, "create")}
          </div>
          <div className="luxury-salon-services-photo-panel" aria-label="Foto opzionale per il nuovo servizio">
            <span className="luxury-salon-services-photo-panel__legend">
              Aggiungi foto
            </span>
            <div className="luxury-salon-services-photo-panel__row luxury-brand-service-photo-row">
              <div className="luxury-brand-service-thumb">
                {newServicePhotoPreview ? (
                  <img
                    src={newServicePhotoPreview}
                    alt=""
                    style={{ objectPosition: buildObjectPosition(newServicePhotoObjectPos.x, newServicePhotoObjectPos.y) }}
                  />
                ) : (
                  <div className="luxury-brand-upload-zone luxury-salon-services-photo-panel__thumb-placeholder">
                    Anteprima
                  </div>
                )}
              </div>
              <div className="luxury-salon-services-photo-panel__actions">
                <label className="luxury-btn luxury-btn--secondary">
                  <input
                    ref={newServicePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="luxury-salon-services-hidden-file"
                    disabled={!slug || createM.isPending || isPhotoProcessing}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      onNewServicePhotoPick(f);
                    }}
                  />
                  Scegli foto…
                </label>
                {newServicePhotoPreview ? (
                  <button type="button" className="luxury-btn luxury-btn--secondary" onClick={clearNewServicePhotoPick}>
                    Rimuovi foto
                  </button>
                ) : null}
              </div>
            </div>
            {newServicePhotoPreview ? (
              <div className="luxury-salon-services-list__crop-controls" aria-label="Inquadratura foto nuovo servizio">
                <label className="luxury-form-label luxury-salon-services-list__crop-label">
                  Centra orizzontale ({newServicePhotoObjectPos.x}%)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={newServicePhotoObjectPos.x}
                    onChange={(e) =>
                      setNewServicePhotoObjectPos((prev) => ({
                        ...prev,
                        x: Number.parseInt(e.target.value, 10),
                      }))
                    }
                  />
                </label>
                <label className="luxury-form-label luxury-salon-services-list__crop-label">
                  Centra verticale ({newServicePhotoObjectPos.y}%)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={newServicePhotoObjectPos.y}
                    onChange={(e) =>
                      setNewServicePhotoObjectPos((prev) => ({
                        ...prev,
                        y: Number.parseInt(e.target.value, 10),
                      }))
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
          {formMsg ? (
            <p
              className={`luxury-alert luxury-salon-services-form__alert ${formMsg.includes("aggiunto") ? "luxury-alert--success" : "luxury-alert--error"}`}
              role="status"
            >
              {formMsg}
            </p>
          ) : null}
          <button type="submit" className="luxury-btn luxury-btn--primary" disabled={createM.isPending}>
            {createM.isPending ? "Salvataggio…" : "Aggiungi servizio"}
          </button>
        </form>
      </div>

      <div className="luxury-surface-card luxury-salon-services-form-card luxury-salon-services-list-card">
        <h2 className="luxury-card-title">Servizi attuali</h2>
        {listQ.isLoading ? <p className="luxury-text-muted">Caricamento…</p> : null}
        {listQ.error ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {listQ.error instanceof Error ? listQ.error.message : "Errore"}
          </p>
        ) : null}
        {listQ.data && listQ.data.length === 0 ? (
          <p className="luxury-text-muted luxury-salon-services-empty">
            Ancora nessun servizio: aggiungine uno qui sopra così i clienti possono prenotarlo dalla tua vetrina.
          </p>
        ) : null}
        {listQ.data && listQ.data.length > 0 ? (
          <ul className="luxury-salon-services-list">
            {listQ.data.map((s) => {
              const photoObjectPos = parseObjectPosition(showcase.servicePhotoObjectPositions[s.id]);
              return (
                <li key={s.id} className="luxury-salon-services-list__item">
                <div className="luxury-brand-service-photo-row">
                  <div className="luxury-brand-service-thumb">
                    {showcase.servicePhotoDataUrls[s.id] ? (
                      <img
                        src={showcase.servicePhotoDataUrls[s.id]}
                        alt=""
                        style={{ objectPosition: buildObjectPosition(photoObjectPos.x, photoObjectPos.y) }}
                      />
                    ) : (
                      <div className="luxury-brand-upload-zone luxury-salon-services-list__thumb-label">Foto</div>
                    )}
                  </div>
                  <div className="luxury-salon-services-list__body">
                    {editingServiceId === s.id ? (
                      <div className="luxury-salon-services-list__editor">
                        <label className="luxury-form-label">
                          Nome servizio
                          <input
                            className="luxury-soft-field"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={200}
                            autoComplete="off"
                          />
                        </label>
                        <label className="luxury-form-label luxury-salon-services-form__label-tight">
                          Costo
                          <input
                            className="luxury-soft-field"
                            value={editPriceEuro}
                            onChange={(e) => setEditPriceEuro(e.target.value)}
                            inputMode="decimal"
                            placeholder="0,00"
                            autoComplete="off"
                          />
                        </label>
                        <label className="luxury-form-label luxury-salon-services-form__label-tight">
                          Durata del servizio (minuti)
                          <input
                            className="luxury-soft-field"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="es. 15 o 15 minuti"
                            value={editDurationMinutes}
                            onChange={(e) => setEditDurationMinutes(e.target.value)}
                          />
                        </label>
                        <label className="luxury-form-label luxury-salon-services-form__label-tight">
                          Descrizione (massimo 2000 caratteri)
                          <textarea
                            className="luxury-soft-field luxury-salon-services-form__textarea"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            maxLength={2000}
                            rows={4}
                          />
                        </label>
                        <div className="luxury-form-label luxury-salon-services-form__label-tight">
                          Operatori per questo servizio
                          {renderOperatorPicker(editOperatorIds, setEditOperatorIds, "edit")}
                        </div>
                        {editMsg ? (
                          <p
                            className={`luxury-alert luxury-salon-services-form__alert ${editMsg.includes("aggiornato") ? "luxury-alert--success" : "luxury-alert--error"}`}
                            role="status"
                          >
                            {editMsg}
                          </p>
                        ) : null}
                        <div className="luxury-salon-services-list__toolbar">
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--primary"
                            disabled={updateM.isPending}
                            onClick={() => updateM.mutate(s.id)}
                          >
                            {updateM.isPending ? "Salvataggio…" : "Salva"}
                          </button>
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--secondary"
                            disabled={updateM.isPending}
                            onClick={cancelServiceEdit}
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="luxury-salon-services-list__head">
                          <span className="luxury-salon-services-list__name">{s.name}</span>
                          <span className="luxury-salon-services-list__meta">
                            <span>Costo {formatItPrice(s.priceCents)} €</span>
                            <span>Durata {s.durationMinutes} min</span>
                          </span>
                        </div>
                        {s.description ? <p className="luxury-salon-services-list__desc">{s.description}</p> : null}
                        {s.operatorIds?.length ? (
                          <p className="luxury-salon-services-list__operators luxury-text-muted">
                            Operatori:{" "}
                            {s.operatorIds
                              .map((id) => {
                                const m = apiStaff.find((x) => x.rawId === id);
                                return m ? `${m.firstName} ${m.lastName}`.trim() : "—";
                              })
                              .join(", ")}
                          </p>
                        ) : (
                          <p className="luxury-salon-services-list__operators luxury-text-muted">Operatori: tutti</p>
                        )}
                      </>
                    )}
                    <div className="luxury-salon-services-list__toolbar">
                      {editingServiceId !== s.id ? (
                        <button
                          type="button"
                          className="luxury-btn luxury-btn--secondary"
                          onClick={() => beginServiceEdit(s)}
                        >
                          Modifica
                        </button>
                      ) : null}
                      <label className="luxury-btn luxury-btn--secondary">
                        <input
                          type="file"
                          accept="image/*"
                          className="luxury-salon-services-hidden-file"
                          disabled={!slug || isPhotoProcessing}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void onListServicePhoto(s.id, f);
                          }}
                        />
                        Carica foto
                      </label>
                      {showcase.servicePhotoDataUrls[s.id] ? (
                        <button type="button" className="luxury-btn luxury-btn--secondary" onClick={() => clearListServicePhoto(s.id)}>
                          Rimuovi foto
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      </div>
      </div>
    </div>
  );
}
