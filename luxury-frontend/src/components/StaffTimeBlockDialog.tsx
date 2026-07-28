import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "../api/client";
import type { OperatorTimeBlockDto } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";

type StaffTimeBlockDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Giorno preselezionato dall'agenda (`YYYY-MM-DD` locale). */
  dateYmd: string;
  /** Se impostato, apre il modale in modifica su questo blocco. */
  editingBlockId?: string | null;
};

function todayLocalYmd(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localYmdHmToIso(ymd: string, hm: string): string {
  const [h, m] = hm.split(":").map((v) => Number(v));
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!parts || !Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error("Orario non valido.");
  }
  const dt = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), h, m, 0, 0);
  return dt.toISOString();
}

function isoToLocalHm(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToLocalYmd(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatHm(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY_FORM = { startHm: "10:00", endHm: "12:00", note: "" };

export function StaffTimeBlockDialog({ open, onClose, dateYmd, editingBlockId }: StaffTimeBlockDialogProps) {
  const { accessToken } = useLuxuryAuth();
  const qc = useQueryClient();
  const [blockDateYmd, setBlockDateYmd] = useState(dateYmd);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [startHm, setStartHm] = useState(EMPTY_FORM.startHm);
  const [endHm, setEndHm] = useState(EMPTY_FORM.endHm);
  const [note, setNote] = useState(EMPTY_FORM.note);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pendingDeleteBlockId, setPendingDeleteBlockId] = useState<string | null>(null);

  const isEditMode = Boolean(activeBlockId);

  const blocksQ = useQuery({
    queryKey: ["me", "staff", "time-blocks", "day", blockDateYmd],
    queryFn: () =>
      apiJson<OperatorTimeBlockDto[]>(
        `/api/v1/me/staff/time-blocks?from=${blockDateYmd}&to=${blockDateYmd}`,
        { accessToken },
      ),
    enabled: Boolean(open && accessToken && blockDateYmd),
  });

  const dayBlocks = useMemo(() => {
    const rows = blocksQ.data ?? [];
    return rows
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [blocksQ.data]);

  const loadBlockIntoForm = useCallback((block: OperatorTimeBlockDto) => {
    setActiveBlockId(block.id);
    setBlockDateYmd(isoToLocalYmd(block.start));
    setStartHm(isoToLocalHm(block.start));
    setEndHm(isoToLocalHm(block.end));
    setNote(block.note ?? "");
    setErr(null);
    setOkMsg(null);
  }, []);

  const resetCreateForm = useCallback(() => {
    setActiveBlockId(null);
    setStartHm(EMPTY_FORM.startHm);
    setEndHm(EMPTY_FORM.endHm);
    setNote(EMPTY_FORM.note);
    setErr(null);
    setOkMsg(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setOkMsg(null);
    setPendingDeleteBlockId(null);
    setBlockDateYmd(dateYmd);
    setActiveBlockId(editingBlockId ?? null);
    if (!editingBlockId) {
      setStartHm(EMPTY_FORM.startHm);
      setEndHm(EMPTY_FORM.endHm);
      setNote(EMPTY_FORM.note);
    }
  }, [open, dateYmd, editingBlockId]);

  useEffect(() => {
    if (!open || !editingBlockId || !blocksQ.data) return;
    const block = blocksQ.data.find((b) => b.id === editingBlockId);
    if (block) loadBlockIntoForm(block);
  }, [open, editingBlockId, blocksQ.data, loadBlockIntoForm]);

  const invalidateBlocks = async () => {
    await qc.invalidateQueries({ queryKey: ["me", "staff", "time-blocks"] });
  };

  const saveM = useMutation({
    mutationFn: async () => {
      const start = localYmdHmToIso(blockDateYmd, startHm);
      const end = localYmdHmToIso(blockDateYmd, endHm);
      const body = JSON.stringify({ start, end, note: note.trim() || null });
      if (activeBlockId) {
        return apiJson<OperatorTimeBlockDto>(`/api/v1/me/staff/time-blocks/${activeBlockId}`, {
          method: "PATCH",
          accessToken,
          body,
        });
      }
      return apiJson<OperatorTimeBlockDto>("/api/v1/me/staff/time-blocks", {
        method: "POST",
        accessToken,
        body,
      });
    },
    onSuccess: async () => {
      await invalidateBlocks();
      setOkMsg(isEditMode ? "Blocco aggiornato." : "Orario bloccato.");
      resetCreateForm();
    },
    onError: (e) => {
      setOkMsg(null);
      setErr(e instanceof Error ? e.message : "Impossibile salvare il blocco.");
    },
  });

  const deleteM = useMutation({
    mutationFn: async (blockId: string) =>
      apiJson(`/api/v1/me/staff/time-blocks/${blockId}`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: async () => {
      await invalidateBlocks();
      resetCreateForm();
      setPendingDeleteBlockId(null);
      setOkMsg("Blocco rimosso.");
    },
    onError: (e) => {
      setOkMsg(null);
      setErr(e instanceof Error ? e.message : "Impossibile rimuovere il blocco.");
    },
  });

  if (!open) return null;

  return (
    <div className="luxury-booking-confirm-modal" role="presentation" onClick={onClose}>
      <div
        className="luxury-booking-confirm-modal__panel luxury-staff-time-block-dialog"
        role="dialog"
        aria-labelledby="staff-time-block-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="staff-time-block-title" className="luxury-booking-confirm-modal__title">
          {isEditMode ? "Modifica blocco" : "Blocca orario"}
        </h2>
        <p className="luxury-booking-confirm-modal__lead">
          Segna un impegno personale: in questa fascia non saranno prenotabili nuovi appuntamenti a tuo nome.
          Se hai già clienti in agenda, spostali prima di bloccare.
        </p>

        {err ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {err}
          </p>
        ) : null}
        {okMsg ? (
          <p className="luxury-alert luxury-alert--success" role="status">
            {okMsg}
          </p>
        ) : null}

        <section className="luxury-staff-time-block-dialog__list" aria-labelledby="staff-time-block-list-title">
          <div className="luxury-staff-time-block-dialog__list-head">
            <h3 id="staff-time-block-list-title" className="luxury-staff-time-block-dialog__list-title">
              Orari bloccati
            </h3>
            {isEditMode ? (
              <button type="button" className="luxury-btn luxury-btn--ghost luxury-btn--compact" onClick={resetCreateForm}>
                Nuovo blocco
              </button>
            ) : null}
          </div>
          {blocksQ.isLoading ? (
            <p className="luxury-text-muted luxury-staff-time-block-dialog__list-empty">Carico blocchi…</p>
          ) : dayBlocks.length === 0 ? (
            <p className="luxury-text-muted luxury-staff-time-block-dialog__list-empty">
              Nessun blocco in questo giorno.
            </p>
          ) : (
            <ul className="luxury-staff-time-block-dialog__items">
              {dayBlocks.map((block) => (
                <li key={block.id} className="luxury-staff-time-block-dialog__item">
                  <button
                    type="button"
                    className={
                      "luxury-staff-time-block-dialog__item-main" +
                      (activeBlockId === block.id ? " luxury-staff-time-block-dialog__item-main--active" : "")
                    }
                    onClick={() => loadBlockIntoForm(block)}
                  >
                    <span className="luxury-staff-time-block-dialog__item-time">
                      {formatHm(block.start)} – {formatHm(block.end)}
                    </span>
                    <span className="luxury-staff-time-block-dialog__item-note">
                      {block.note?.trim() ? block.note : "Impegno personale"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="luxury-btn luxury-btn--ghost luxury-btn--compact"
                    disabled={deleteM.isPending}
                    onClick={() => {
                      setErr(null);
                      setOkMsg(null);
                      setPendingDeleteBlockId(block.id);
                    }}
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="luxury-staff-time-block-dialog__fields">
          <label className="luxury-form-label luxury-staff-time-block-dialog__date-field">
            Giorno
            <input
              type="date"
              className="luxury-soft-field"
              value={blockDateYmd}
              min={todayLocalYmd()}
              onChange={(e) => {
                setBlockDateYmd(e.target.value);
                resetCreateForm();
              }}
              required
            />
          </label>
          <p className="luxury-staff-time-block-dialog__date-hint">
            {blockDateYmd
              ? new Date(`${blockDateYmd}T12:00:00`).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Scegli il giorno da bloccare"}
          </p>
          <label className="luxury-form-label">
            Dalle
            <input
              type="time"
              className="luxury-soft-field"
              value={startHm}
              onChange={(e) => setStartHm(e.target.value)}
              required
            />
          </label>
          <label className="luxury-form-label">
            Alle
            <input
              type="time"
              className="luxury-soft-field"
              value={endHm}
              onChange={(e) => setEndHm(e.target.value)}
              required
            />
          </label>
          <label className="luxury-form-label luxury-staff-time-block-dialog__note">
            Nota (opzionale)
            <input
              type="text"
              className="luxury-soft-field"
              value={note}
              maxLength={500}
              placeholder="Es. visita medica, permesso…"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>

        {pendingDeleteBlockId ? (
          <div className="luxury-staff-time-block-dialog__confirm-delete" role="status">
            <p>Confermi la rimozione di questo blocco orario?</p>
            <div className="luxury-staff-time-block-dialog__confirm-delete-actions">
              <button
                type="button"
                className="luxury-btn luxury-btn--secondary luxury-btn--compact"
                onClick={() => setPendingDeleteBlockId(null)}
                disabled={deleteM.isPending}
              >
                Annulla
              </button>
              <button
                type="button"
                className="luxury-btn luxury-btn--primary luxury-btn--compact"
                disabled={deleteM.isPending}
                onClick={() => {
                  setErr(null);
                  setOkMsg(null);
                  deleteM.mutate(pendingDeleteBlockId);
                }}
              >
                {deleteM.isPending ? "Rimuovo…" : "Conferma rimozione"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="luxury-booking-confirm-modal__actions">
          <button type="button" className="luxury-btn luxury-btn--secondary" onClick={onClose} disabled={saveM.isPending || deleteM.isPending}>
            Chiudi
          </button>
          <button
            type="button"
            className="luxury-btn luxury-btn--primary"
            disabled={saveM.isPending || deleteM.isPending || !startHm || !endHm || !blockDateYmd}
            onClick={() => {
              setErr(null);
              setOkMsg(null);
              setPendingDeleteBlockId(null);
              saveM.mutate();
            }}
          >
            {saveM.isPending ? "Salvo…" : isEditMode ? "Salva modifica" : "Blocca fascia"}
          </button>
        </div>
      </div>
    </div>
  );
}
