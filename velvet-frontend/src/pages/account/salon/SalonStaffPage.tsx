import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../../api/client";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { useSalonStaffList, type StaffViewItem, type SalonStaffApiItem } from "../../../hooks/useSalonStaffList";
import {
  defaultStaffWorkHoursFromSalon,
  formatStaffWorkHoursLabel,
  parseStaffWorkHoursForm,
  staffWorkHoursFromMinutes,
  type StaffWorkHoursForm,
  type StaffWorkHoursPayload,
} from "../../../lib/staffWorkHours";
import { readImageFileAsStaffPhotoDataUrl } from "../../../lib/readImageDataUrl";
import { localStaffId, writeLocalStaff, type LocalStaffItem } from "../../../lib/salonStaffLocal";
import { staffFallbackAvatar } from "../../../lib/salonStaffAvatar";
import "../../../styles/velvet-account-page-shell.css";
import "../../../styles/velvet-account-salon-services.css";
import "../../../styles/velvet-account-salon-staff.css";

type AvatarAdjustments = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULT_AVATAR_ADJUSTMENTS: AvatarAdjustments = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function styleFromAdjustments(adjustments: AvatarAdjustments): React.CSSProperties {
  return {
    transform: `translate(${adjustments.offsetX}%, ${adjustments.offsetY}%) scale(${adjustments.zoom})`,
    transformOrigin: "center center",
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function StaffPasswordRevealButton(props: {
  visible: boolean;
  onToggle: () => void;
  disabled?: boolean;
  labelShow: string;
  labelHide: string;
}) {
  const { visible, onToggle, disabled, labelShow, labelHide } = props;
  return (
    <button
      type="button"
      className="velvet-salon-staff-password-toggle"
      onClick={onToggle}
      disabled={disabled}
      aria-label={visible ? labelHide : labelShow}
      aria-pressed={visible}
    >
      {visible ? (
        <svg className="velvet-salon-staff-password-toggle__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M3 3l18 18M10.73 10.73a3 3 0 004.24 4.24M9.88 9.88A10.05 10.05 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-4.13 5.41M6.12 6.12A10.02 10.02 0 003.46 12c.77 3.95 4.26 7 8.54 7 1.05 0 2.05-.18 2.98-.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg className="velvet-salon-staff-password-toggle__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function StaffWorkHoursFields(props: {
  value: StaffWorkHoursForm;
  onChange: (next: StaffWorkHoursForm) => void;
}) {
  const { value, onChange } = props;
  return (
    <fieldset className="velvet-salon-staff-work-hours">
      <legend className="velvet-form-label">Orario di lavoro (agenda prenotazioni)</legend>
      <p className="velvet-text-muted velvet-salon-staff-work-hours__hint">
        Mattina e pomeriggio separati: nella pausa il cliente non può prenotare con questo operatore.
      </p>
      <div className="velvet-personal-builder__row-2">
        <label className="velvet-form-label">
          Apertura mattina
          <input
            className="velvet-soft-field"
            type="time"
            value={value.morningStart}
            onChange={(e) => onChange({ ...value, morningStart: e.target.value })}
            required
          />
        </label>
        <label className="velvet-form-label">
          Chiusura mattina
          <input
            className="velvet-soft-field"
            type="time"
            value={value.morningEnd}
            onChange={(e) => onChange({ ...value, morningEnd: e.target.value })}
            required
          />
        </label>
      </div>
      <div className="velvet-personal-builder__row-2">
        <label className="velvet-form-label">
          Apertura pomeriggio
          <input
            className="velvet-soft-field"
            type="time"
            value={value.afternoonStart}
            onChange={(e) => onChange({ ...value, afternoonStart: e.target.value })}
            required
          />
        </label>
        <label className="velvet-form-label">
          Chiusura pomeriggio
          <input
            className="velvet-soft-field"
            type="time"
            value={value.afternoonEnd}
            onChange={(e) => onChange({ ...value, afternoonEnd: e.target.value })}
            required
          />
        </label>
      </div>
    </fieldset>
  );
}

async function renderAvatarDataUrl(sourceDataUrl: string, adjustments: AvatarAdjustments, size = 320): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossibile elaborare la foto staff."));
    img.src = sourceDataUrl;
  });

  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (!w || !h) return sourceDataUrl;

  const zoom = clamp(adjustments.zoom, 1, 2.6);
  const baseScale = Math.max(size / w, size / h);
  const scale = baseScale * zoom;
  const drawW = w * scale;
  const drawH = h * scale;
  const overflowX = Math.max(0, drawW - size);
  const overflowY = Math.max(0, drawH - size);

  const x = clamp(adjustments.offsetX, -100, 100) / 100;
  const y = clamp(adjustments.offsetY, -100, 100) / 100;
  const drawX = -overflowX / 2 + (overflowX / 2) * x;
  const drawY = -overflowY / 2 + (overflowY / 2) * y;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export default function SalonStaffPage() {
  const qc = useQueryClient();
  const { isSalonTitolare, accessToken } = useVelvetAuth();
  const meSalon = useMeSalonSummaryQuery();
  const {
    mergedStaffMembers,
    staffQuery,
    backendStaffAvailable,
    localMembers,
    setLocalMembers,
    salonSlug,
  } = useSalonStaffList();
  const defaultWorkHours = useMemo(
    () =>
      defaultStaffWorkHoursFromSalon(
        meSalon.data?.primaryLocationOpeningMinuteOfDay,
        meSalon.data?.primaryLocationMorningEndMinuteOfDay,
        meSalon.data?.primaryLocationAfternoonStartMinuteOfDay,
        meSalon.data?.primaryLocationClosingMinuteOfDay,
      ),
    [meSalon.data],
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffPasswordConfirm, setStaffPasswordConfirm] = useState("");
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showStaffPasswordConfirm, setShowStaffPasswordConfirm] = useState(false);
  const [role, setRole] = useState("");
  const [workHours, setWorkHours] = useState<StaffWorkHoursForm>(() => defaultStaffWorkHoursFromSalon());
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoSourceDataUrl, setPhotoSourceDataUrl] = useState<string | null>(null);
  const [photoAdjustments, setPhotoAdjustments] = useState<AvatarAdjustments>(DEFAULT_AVATAR_ADJUSTMENTS);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPhotoDataUrl, setEditPhotoDataUrl] = useState<string | null>(null);
  const [editPhotoSourceDataUrl, setEditPhotoSourceDataUrl] = useState<string | null>(null);
  const [editPhotoAdjustments, setEditPhotoAdjustments] = useState<AvatarAdjustments>(DEFAULT_AVATAR_ADJUSTMENTS);
  const [editWorkHours, setEditWorkHours] = useState<StaffWorkHoursForm>(() => defaultStaffWorkHoursFromSalon());
  const addPhotoRenderSeq = useRef(0);
  const editPhotoRenderSeq = useRef(0);
  const saveMsgTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveMsgTimeoutRef.current !== null) {
        window.clearTimeout(saveMsgTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setWorkHours(defaultWorkHours);
  }, [defaultWorkHours]);

  const showSaveMessage = (msg: string, autoHideMs?: number) => {
    if (saveMsgTimeoutRef.current !== null) {
      window.clearTimeout(saveMsgTimeoutRef.current);
      saveMsgTimeoutRef.current = null;
    }
    setSaveMsg(msg);
    if (autoHideMs && autoHideMs > 0) {
      saveMsgTimeoutRef.current = window.setTimeout(() => {
        setSaveMsg(null);
        saveMsgTimeoutRef.current = null;
      }, autoHideMs);
    }
  };

  useEffect(() => {
    if (!photoSourceDataUrl) return;
    const seq = ++addPhotoRenderSeq.current;
    void renderAvatarDataUrl(photoSourceDataUrl, photoAdjustments)
      .then((dataUrl) => {
        if (seq !== addPhotoRenderSeq.current) return;
        setPhotoDataUrl(dataUrl);
      })
      .catch(() => {
        if (seq !== addPhotoRenderSeq.current) return;
        setPhotoMsg("Impossibile applicare il ritaglio foto.");
      });
  }, [photoAdjustments, photoSourceDataUrl]);

  useEffect(() => {
    if (!editPhotoSourceDataUrl) return;
    const seq = ++editPhotoRenderSeq.current;
    void renderAvatarDataUrl(editPhotoSourceDataUrl, editPhotoAdjustments)
      .then((dataUrl) => {
        if (seq !== editPhotoRenderSeq.current) return;
        setEditPhotoDataUrl(dataUrl);
      })
      .catch(() => {
        if (seq !== editPhotoRenderSeq.current) return;
        setSaveMsg("Impossibile applicare il ritaglio foto.");
      });
  }, [editPhotoAdjustments, editPhotoSourceDataUrl]);

  const createMutation = useMutation({
    mutationFn: (hoursPayload: StaffWorkHoursPayload) =>
      apiJson<SalonStaffApiItem>("/api/v1/me/salon/staff", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: role.trim() || "Staff",
          photoDataUrl,
          email: staffEmail.trim().toLowerCase(),
          password: staffPassword,
          ...hoursPayload,
        }),
      }),
    onSuccess: async () => {
      showSaveMessage("Membro staff aggiunto.", 3000);
      setFirstName("");
      setLastName("");
      setStaffEmail("");
      setStaffPassword("");
      setStaffPasswordConfirm("");
      setShowStaffPassword(false);
      setShowStaffPasswordConfirm(false);
      setRole("");
      setWorkHours(defaultWorkHours);
      setPhotoDataUrl(null);
      setPhotoSourceDataUrl(null);
      setPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
      setPhotoMsg(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "staff"] });
    },
    onError: (e: Error) => {
      showSaveMessage(e.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      photoDataUrl: string | null;
      hoursPayload: StaffWorkHoursPayload;
    }) =>
      apiJson<SalonStaffApiItem>(`/api/v1/me/salon/staff/${encodeURIComponent(payload.id)}`, {
        method: "PUT",
        accessToken,
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role || "Staff",
          photoDataUrl: payload.photoDataUrl,
          email: null,
          password: null,
          ...payload.hoursPayload,
        }),
      }),
    onSuccess: async () => {
      showSaveMessage("Membro staff aggiornato.");
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "staff"] });
    },
    onError: (e: Error) => showSaveMessage(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson<void>(`/api/v1/me/salon/staff/${encodeURIComponent(id)}`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: async () => {
      showSaveMessage("Membro staff eliminato.");
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "staff"] });
    },
    onError: (e: Error) => showSaveMessage(e.message),
  });

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  const onPickPhoto = async (file: File | null) => {
    setPhotoMsg(null);
    if (!file) {
      setPhotoDataUrl(null);
      setPhotoSourceDataUrl(null);
      setPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
      return;
    }
    try {
      const dataUrl = await readImageFileAsStaffPhotoDataUrl(file);
      setPhotoSourceDataUrl(dataUrl);
      setPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
    } catch (e) {
      setPhotoMsg(e instanceof Error ? e.message : "Errore caricamento foto.");
    }
  };

  const onPickEditPhoto = async (file: File | null) => {
    if (!file) {
      setEditPhotoDataUrl(null);
      setEditPhotoSourceDataUrl(null);
      setEditPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
      return;
    }
    try {
      const dataUrl = await readImageFileAsStaffPhotoDataUrl(file);
      setEditPhotoSourceDataUrl(dataUrl);
      setEditPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Errore caricamento foto.");
    }
  };

  const beginEdit = (member: StaffViewItem) => {
    setSaveMsg(null);
    setEditingId(member.id);
    setEditFirstName(member.firstName === "—" ? "" : member.firstName);
    setEditLastName(member.lastName === "—" ? "" : member.lastName);
    setEditRole(member.role);
    setEditPhotoDataUrl(member.photoDataUrl);
    setEditPhotoSourceDataUrl(member.photoDataUrl);
    setEditPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
    setEditWorkHours(
      staffWorkHoursFromMinutes(
        member.workMorningStartMinuteOfDay,
        member.workMorningEndMinuteOfDay,
        member.workAfternoonStartMinuteOfDay,
        member.workAfternoonEndMinuteOfDay,
      ) ?? defaultWorkHours,
    );
  };

  const onDeleteMember = async (member: StaffViewItem) => {
    setSaveMsg(null);
    if (member.source === "local") {
      const next = localMembers.filter((m) => m.id !== member.rawId);
      setLocalMembers(next);
      writeLocalStaff(salonSlug, next);
      if (editingId === member.id) setEditingId(null);
      showSaveMessage("Membro staff eliminato.");
      return;
    }
    await deleteMutation.mutateAsync(member.rawId);
  };

  const onSaveEdit = async (member: StaffViewItem) => {
    setSaveMsg(null);
    const first = editFirstName.trim();
    const last = editLastName.trim();
    const roleValue = editRole.trim() || "Staff";
    if (!first || !last) {
      setSaveMsg("Inserisci nome e cognome.");
      return;
    }
    const parsedHours = parseStaffWorkHoursForm(editWorkHours);
    if (typeof parsedHours === "string") {
      setSaveMsg(parsedHours);
      return;
    }
    if (member.source === "local") {
      const next = localMembers.map((m) =>
        m.id === member.rawId ? { ...m, firstName: first, lastName: last, role: roleValue, photoDataUrl: editPhotoDataUrl } : m,
      );
      setLocalMembers(next);
      writeLocalStaff(salonSlug, next);
      setEditingId(null);
      showSaveMessage("Membro staff aggiornato.");
      return;
    }
    await updateMutation.mutateAsync({
      id: member.rawId,
      firstName: first,
      lastName: last,
      role: roleValue,
      photoDataUrl: editPhotoDataUrl,
      hoursPayload: parsedHours,
    });
  };

  const onAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveMsg(null);
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f || !l) {
      setSaveMsg("Inserisci nome e cognome.");
      return;
    }
    if (backendStaffAvailable) {
      const em = staffEmail.trim().toLowerCase();
      if (!em || !em.includes("@")) {
        setSaveMsg("Inserisci un’email valida per l’accesso dello staff.");
        return;
      }
      if (staffPassword.length < 8) {
        setSaveMsg("La password deve avere almeno 8 caratteri.");
        return;
      }
      const parsedHours = parseStaffWorkHoursForm(workHours);
      if (typeof parsedHours === "string") {
        setSaveMsg(parsedHours);
        return;
      }
      await createMutation.mutateAsync(parsedHours);
      return;
    }
    if (!backendStaffAvailable) {
      const next: LocalStaffItem[] = [
        { id: localStaffId(), firstName: f, lastName: l, role: role.trim() || "Staff", photoDataUrl },
        ...localMembers,
      ];
      setLocalMembers(next);
      writeLocalStaff(salonSlug, next);
      showSaveMessage("Membro staff aggiunto.", 3000);
      setFirstName("");
      setLastName("");
      setRole("");
      setStaffPassword("");
      setStaffPasswordConfirm("");
      setShowStaffPassword(false);
      setShowStaffPasswordConfirm(false);
      setPhotoDataUrl(null);
      setPhotoSourceDataUrl(null);
      setPhotoAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
      setPhotoMsg(null);
      return;
    }
  };

  return (
    <>
      <div className="velvet-account-page-shell velvet-account-page-shell--narrow velvet-account-page-shell--salon-staff">
        <header className="velvet-account-page-shell__hero">
          <div className="velvet-account-page-shell__hero-glow" aria-hidden />
          <div className="velvet-account-page-shell__hero-inner">
            <Link to="/account/salone" className="velvet-link-back">
              ← Panoramica salone
            </Link>
            <h1 className="velvet-salon-staff-hero__headline">
              <span className="velvet-salon-staff-hero__headline-pre">Il tuo </span>
              <span className="velvet-salon-staff-hero__headline-accent">staff</span>
            </h1>
            <p className="velvet-account-page-shell__hero-sub">
              Nome, cognome, ruolo, orario di lavoro e foto; con backend attivo anche email e password per l&apos;accesso all&apos;agenda.
            </p>
          </div>
        </header>
      </div>

      <div className="velvet-salon-services-page velvet-salon-staff-account">
        {!backendStaffAvailable ? (
          <p className="velvet-alert velvet-alert--error velvet-salon-staff-account__alert-spaced" role="status">
            Endpoint staff non disponibile sul backend attivo: salvo in locale su questo browser.
          </p>
        ) : null}

        <div className="velvet-salon-staff-account__stack">
          <div className="velvet-surface-card velvet-salon-services-form-card">
            <h2 className="velvet-card-title">Aggiungi persona</h2>
            <form className="velvet-salon-staff-form" onSubmit={onAddMember}>
          <label className="velvet-form-label">
            Nome
            <input className="velvet-soft-field" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={80} />
          </label>
          <label className="velvet-form-label velvet-salon-staff-form__tight">
            Cognome
            <input className="velvet-soft-field" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={80} />
          </label>
          <label className="velvet-form-label velvet-salon-staff-form__tight">
            Ruolo
            <input className="velvet-soft-field" value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Es. Colorist, Barber, Stylist" />
          </label>
          {backendStaffAvailable ? (
            <>
              <label className="velvet-form-label velvet-salon-staff-form__tight">
                Email (accesso staff)
                <input
                  className="velvet-soft-field"
                  type="email"
                  autoComplete="off"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  maxLength={320}
                  placeholder="nome@esempio.it"
                />
              </label>
              <label className="velvet-form-label velvet-salon-staff-form__tight">
                Password
                <div className="velvet-salon-staff-password-wrap">
                  <input
                    className="velvet-soft-field"
                    type={showStaffPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    disabled={createMutation.isPending}
                    placeholder="Minimo 8 caratteri"
                  />
                  <StaffPasswordRevealButton
                    visible={showStaffPassword}
                    onToggle={() => setShowStaffPassword((v) => !v)}
                    disabled={createMutation.isPending}
                    labelShow="Mostra password"
                    labelHide="Nascondi password"
                  />
                </div>
              </label>
              <label className="velvet-form-label velvet-salon-staff-form__tight">
                Conferma password
                <div className="velvet-salon-staff-password-wrap">
                  <input
                    className="velvet-soft-field"
                    type={showStaffPasswordConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={staffPasswordConfirm}
                    onChange={(e) => setStaffPasswordConfirm(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    disabled={createMutation.isPending}
                    placeholder="Ripeti la password"
                  />
                  <StaffPasswordRevealButton
                    visible={showStaffPasswordConfirm}
                    onToggle={() => setShowStaffPasswordConfirm((v) => !v)}
                    disabled={createMutation.isPending}
                    labelShow="Mostra conferma password"
                    labelHide="Nascondi conferma password"
                  />
                </div>
              </label>
            </>
          ) : null}
          {backendStaffAvailable ? (
            <StaffWorkHoursFields value={workHours} onChange={setWorkHours} />
          ) : null}
          <label className="velvet-form-label velvet-salon-staff-form__tight">
            Foto (opzionale)
            <input
              className="velvet-soft-field"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onPickPhoto(file);
              }}
            />
            <span className="velvet-salon-staff-photo-preview">
              <img
                src={
                  photoSourceDataUrl && photoSourceDataUrl.trim()
                    ? photoSourceDataUrl
                    : photoDataUrl && photoDataUrl.trim()
                      ? photoDataUrl
                      : staffFallbackAvatar(firstName || "S", lastName || "F")
                }
                alt=""
                className="velvet-salon-staff-photo-preview__img"
                style={photoSourceDataUrl ? styleFromAdjustments(photoAdjustments) : undefined}
              />
            </span>
            {photoSourceDataUrl ? (
              <div className="velvet-salon-staff-photo-controls">
                <label className="velvet-form-label">
                  Zoom
                  <input
                    type="range"
                    min={1}
                    max={2.6}
                    step={0.01}
                    value={photoAdjustments.zoom}
                    onChange={(e) =>
                      setPhotoAdjustments((prev) => ({ ...prev, zoom: Number.parseFloat(e.target.value) || prev.zoom }))
                    }
                  />
                </label>
                <label className="velvet-form-label">
                  Posizione orizzontale
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={photoAdjustments.offsetX}
                    onChange={(e) =>
                      setPhotoAdjustments((prev) => ({ ...prev, offsetX: Number.parseInt(e.target.value, 10) || 0 }))
                    }
                  />
                </label>
                <label className="velvet-form-label">
                  Posizione verticale
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={photoAdjustments.offsetY}
                    onChange={(e) =>
                      setPhotoAdjustments((prev) => ({ ...prev, offsetY: Number.parseInt(e.target.value, 10) || 0 }))
                    }
                  />
                </label>
              </div>
            ) : null}
          </label>
          {photoMsg ? (
            <p className="velvet-alert velvet-alert--error" role="alert">
              {photoMsg}
            </p>
          ) : null}
          <button type="submit" className="velvet-btn velvet-btn--primary" disabled={createMutation.isPending}>
            Aggiungi staff
          </button>
          {saveMsg ? (
            <p className={`velvet-alert ${saveMsg.includes("aggiunto") ? "velvet-alert--success" : "velvet-alert--error"}`} role="status">
              {saveMsg}
            </p>
          ) : null}
            </form>
          </div>

          {staffQuery.isPending ? <p className="velvet-text-muted">Caricamento staff…</p> : null}
          {staffQuery.isError ? (
            <p className="velvet-alert velvet-alert--error" role="alert">
              Non siamo riusciti a leggere lo staff del salone.
            </p>
          ) : null}
          {!staffQuery.isPending && !staffQuery.isError && mergedStaffMembers.length === 0 ? (
            <p className="velvet-text-muted">Nessun membro staff disponibile per questa sede.</p>
          ) : null}

          {mergedStaffMembers.length > 0 ? (
            <div className="velvet-salon-staff-list">
          {mergedStaffMembers.map((member) => (
            <div key={member.id} className="velvet-surface-card velvet-surface-card--plan-standard velvet-salon-staff-item">
              <img
                src={member.photoDataUrl && member.photoDataUrl.trim() ? member.photoDataUrl : staffFallbackAvatar(member.firstName, member.lastName)}
                alt=""
                className="velvet-salon-staff-item__avatar"
              />
              <div className="velvet-salon-staff-item__body">
                <strong className="velvet-salon-staff-item__name">
                  {member.firstName} {member.lastName}
                </strong>
                <span className="velvet-text-muted velvet-salon-staff-item__role">Ruolo: {member.role}</span>
                {formatStaffWorkHoursLabel(
                  member.workMorningStartMinuteOfDay,
                  member.workMorningEndMinuteOfDay,
                  member.workAfternoonStartMinuteOfDay,
                  member.workAfternoonEndMinuteOfDay,
                ) ? (
                  <span className="velvet-text-muted velvet-salon-staff-item__role">
                    Orario:{" "}
                    {formatStaffWorkHoursLabel(
                      member.workMorningStartMinuteOfDay,
                      member.workMorningEndMinuteOfDay,
                      member.workAfternoonStartMinuteOfDay,
                      member.workAfternoonEndMinuteOfDay,
                    )}
                  </span>
                ) : null}
                {member.loginEnabled ? (
                  <span className="velvet-salon-staff-item__chip velvet-salon-staff-item__chip--login">Accesso agenda attivo</span>
                ) : (
                  <span className="velvet-salon-staff-item__chip">Profilo staff</span>
                )}
                {editingId === member.id ? (
                  <div className="velvet-salon-staff-item__editor">
                    <input className="velvet-soft-field" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                    <input className="velvet-soft-field" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                    <input className="velvet-soft-field" value={editRole} onChange={(e) => setEditRole(e.target.value)} />
                    {member.source === "api" ? (
                      <StaffWorkHoursFields value={editWorkHours} onChange={setEditWorkHours} />
                    ) : null}
                    <input
                      className="velvet-soft-field"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void onPickEditPhoto(file);
                      }}
                    />
                    <span className="velvet-salon-staff-photo-preview">
                      <img
                        src={
                          editPhotoSourceDataUrl && editPhotoSourceDataUrl.trim()
                            ? editPhotoSourceDataUrl
                            : editPhotoDataUrl && editPhotoDataUrl.trim()
                              ? editPhotoDataUrl
                              : staffFallbackAvatar(editFirstName || member.firstName, editLastName || member.lastName)
                        }
                        alt=""
                        className="velvet-salon-staff-photo-preview__img"
                        style={editPhotoSourceDataUrl ? styleFromAdjustments(editPhotoAdjustments) : undefined}
                      />
                    </span>
                    {editPhotoSourceDataUrl ? (
                      <div className="velvet-salon-staff-photo-controls">
                        <label className="velvet-form-label">
                          Zoom
                          <input
                            type="range"
                            min={1}
                            max={2.6}
                            step={0.01}
                            value={editPhotoAdjustments.zoom}
                            onChange={(e) =>
                              setEditPhotoAdjustments((prev) => ({
                                ...prev,
                                zoom: Number.parseFloat(e.target.value) || prev.zoom,
                              }))
                            }
                          />
                        </label>
                        <label className="velvet-form-label">
                          Posizione orizzontale
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            step={1}
                            value={editPhotoAdjustments.offsetX}
                            onChange={(e) =>
                              setEditPhotoAdjustments((prev) => ({
                                ...prev,
                                offsetX: Number.parseInt(e.target.value, 10) || 0,
                              }))
                            }
                          />
                        </label>
                        <label className="velvet-form-label">
                          Posizione verticale
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            step={1}
                            value={editPhotoAdjustments.offsetY}
                            onChange={(e) =>
                              setEditPhotoAdjustments((prev) => ({
                                ...prev,
                                offsetY: Number.parseInt(e.target.value, 10) || 0,
                              }))
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                    <div className="velvet-salon-staff-item__actions">
                      <button type="button" className="velvet-btn velvet-btn--primary" onClick={() => void onSaveEdit(member)}>
                        Salva
                      </button>
                      <button type="button" className="velvet-btn velvet-btn--secondary" onClick={() => setEditingId(null)}>
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="velvet-salon-staff-item__actions">
                    <button type="button" className="velvet-btn velvet-btn--secondary" onClick={() => beginEdit(member)}>
                      Modifica
                    </button>
                    <button type="button" className="velvet-btn velvet-btn--secondary" onClick={() => void onDeleteMember(member)}>
                      Cancella
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

