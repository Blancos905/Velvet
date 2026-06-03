import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { SalonAgendaBookClientDialog } from "./SalonAgendaBookClientDialog";
import { Link, useNavigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { formatPriceEUR } from "../../lib/format";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Data locale `YYYY-MM-DD` (non UTC) per allinearsi al backend agenda. */
export function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Lunedì della settimana che contiene `ref` (calendario locale). */
export function mondayOfWeekContaining(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function sameLocalDay(iso: string, day: Date): boolean {
  const t = new Date(iso);
  return (
    t.getFullYear() === day.getFullYear() && t.getMonth() === day.getMonth() && t.getDate() === day.getDate()
  );
}

/** Etichette brevi: la settimana agenda inizia da lunedì → indice 0 = lun. */
const weekdayAgendaShort = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function formatHm(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function agendaWeekdayLabel(d: Date): string {
  const sun = d.getDay();
  const idx = sun === 0 ? 6 : sun - 1;
  return weekdayAgendaShort[idx];
}

function initialSelectedYmdForWeek(weekStartDate: Date): string {
  const ds = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const ymds = ds.map(formatLocalYmd);
  const t = formatLocalYmd(new Date());
  if (ymds.includes(t)) return t;
  return ymds[0]!;
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function formatDalAlRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const a = from.toLocaleDateString("it-IT", opts);
  const b = to.toLocaleDateString("it-IT", opts);
  return `Dal ${a} al ${b}`;
}

function agendaStatusTone(status: string): "confirmed" | "cancelled" | "pending" | "completed" | "default" {
  const s = status.trim().toUpperCase();
  if (s.includes("CONFERM") || s.includes("CONFIRM")) return "confirmed";
  if (s.includes("ANNULL") || s.includes("CANCEL")) return "cancelled";
  if (s.includes("ATTES") || s.includes("PEND")) return "pending";
  if (s.includes("COMPLET")) return "completed";
  return "default";
}

export type SalonAgendaBoardProps = {
  /** Se impostato, mostra solo le prenotazioni assegnate a questo operatore (UUID backend). */
  operatorId?: string;
  /** Nome operatore per la prenotazione manuale (senza menu a tendina). */
  operatorLabel?: string;
  /** Usa GET `/api/v1/me/staff/agenda` (token con ruolo STAFF). */
  staffMode?: boolean;
  weekKicker?: string;
  weekSub?: string;
  /** Layout più ampio (celle settimana e tabella più leggibili). */
  size?: "default" | "large";
};

export function SalonAgendaBoard({
  operatorId,
  operatorLabel,
  staffMode,
  weekKicker,
  weekSub,
  size = "default",
}: SalonAgendaBoardProps = {}) {
  const navigate = useNavigate();
  const { accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const weekStart = useMemo(() => mondayOfWeekContaining(weekAnchor), [weekAnchor]);
  const [selectedYmd, setSelectedYmd] = useState<string>(() => initialSelectedYmdForWeek(weekStart));
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [rangePickerDraft, setRangePickerDraft] = useState(() => formatLocalYmd(new Date()));
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const rangeFilterRef = useRef<HTMLDivElement | null>(null);
  const bookOperatorId = operatorId?.trim() ?? "";
  const showOwnerBookClient = isSalonTitolare && !staffMode && Boolean(bookOperatorId);

  const todayYmd = formatLocalYmd(new Date());

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const fromStr = formatLocalYmd(weekStart);
  const toStr = formatLocalYmd(weekEnd);

  const q = useQuery({
    queryKey: staffMode
      ? ["me", "staff", "agenda", fromStr, toStr]
      : ["me", "salon", "agenda", fromStr, toStr],
    queryFn: () =>
      apiJson<AppointmentDto[]>(
        staffMode
          ? `/api/v1/me/staff/agenda?from=${fromStr}&to=${toStr}`
          : `/api/v1/me/salon/agenda?from=${fromStr}&to=${toStr}`,
        {
          accessToken,
        },
      ),
    enabled: Boolean(
      accessToken && (staffMode ? isSalonStaff : isSalonTitolare),
    ),
  });

  useEffect(() => {
    const ymds = days.map(formatLocalYmd);
    const t = formatLocalYmd(new Date());
    setSelectedYmd((prev) => {
      if (prev && ymds.includes(prev)) return prev;
      if (ymds.includes(t)) return t;
      return ymds[0]!;
    });
  }, [days]);

  useEffect(() => {
    if (!rangePickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = rangeFilterRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setRangePickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRangePickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [rangePickerOpen]);

  const selectedDay = useMemo(
    () => (selectedYmd ? days.find((d) => formatLocalYmd(d) === selectedYmd) ?? null : null),
    [days, selectedYmd],
  );

  const agendaRows = useMemo(() => {
    if (!q.data) return [];
    if (staffMode) return q.data;
    if (!operatorId?.trim()) return q.data;
    return q.data.filter((a) => a.operatorId === operatorId.trim());
  }, [q.data, operatorId, staffMode]);

  const selectedItems = useMemo(() => {
    if (!selectedDay || !q.data) return [];
    return agendaRows
      .filter((a) => sameLocalDay(a.start, selectedDay))
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [agendaRows, q.data, selectedDay]);

  const singleOperator = Boolean(staffMode || operatorId?.trim());

  return (
    <div className={"velvet-salon-agenda" + (size === "large" ? " velvet-salon-agenda--large" : "")}>
      <div className="velvet-salon-agenda__ambient" aria-hidden />
      <div className="velvet-salon-agenda__panel">
        <div className="velvet-salon-agenda__toolbar">
          <button
            type="button"
            className="velvet-btn velvet-btn--secondary"
            onClick={() => setWeekAnchor(addDays(weekStart, -7))}
          >
            ← Settimana
          </button>
          <button
            type="button"
            className="velvet-btn velvet-btn--secondary"
            onClick={() => setWeekAnchor(addDays(weekStart, 7))}
          >
            Settimana →
          </button>
          <button type="button" className="velvet-btn velvet-btn--ghost" onClick={() => setWeekAnchor(new Date())}>
            Oggi
          </button>
          {showOwnerBookClient ? (
            <div className="velvet-salon-agenda__toolbar-book">
              <button
                type="button"
                className="velvet-btn velvet-btn--primary"
                onClick={() => setBookDialogOpen(true)}
              >
                Prenota cliente
              </button>
            </div>
          ) : null}
        </div>

        <div className="velvet-salon-agenda__range-filter" ref={rangeFilterRef}>
          <span className="velvet-salon-agenda__range-filter-label" id="velvet-agenda-range-label">
            Periodo
          </span>
          <button
            type="button"
            className="velvet-salon-agenda__range-filter-trigger"
            aria-expanded={rangePickerOpen}
            aria-haspopup="dialog"
            aria-controls="velvet-agenda-range-popover"
            aria-labelledby="velvet-agenda-range-label"
            onClick={() => {
              setRangePickerDraft(selectedYmd);
              setRangePickerOpen((o) => !o);
            }}
          >
            {formatDalAlRange(weekStart, weekEnd)}
          </button>
          {rangePickerOpen ? (
            <div
              id="velvet-agenda-range-popover"
              className="velvet-salon-agenda__range-popover"
              role="dialog"
              aria-label="Cerca giorno nella settimana"
            >
              <p className="velvet-salon-agenda__range-popover-hint">
                Scegli un giorno: l&apos;agenda mostra la settimana (lun–dom) che lo contiene.
              </p>
              <label className="velvet-salon-agenda__range-popover-field">
                <span className="velvet-salon-agenda__range-popover-field-label">Giorno</span>
                <input
                  type="date"
                  className="velvet-salon-agenda__range-date-input"
                  value={rangePickerDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRangePickerDraft(v);
                    const picked = parseYmdLocal(v);
                    if (!picked) return;
                    setWeekAnchor(picked);
                    setSelectedYmd(formatLocalYmd(picked));
                    setRangePickerOpen(false);
                  }}
                />
              </label>
              <button type="button" className="velvet-btn velvet-btn--ghost velvet-salon-agenda__range-popover-close" onClick={() => setRangePickerOpen(false)}>
                Chiudi
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {q.isLoading && (
        <p className="velvet-salon-agenda__loading velvet-text-muted">
          <span className="velvet-salon-agenda__loading-dot" aria-hidden />
          Caricamento agenda…
        </p>
      )}
      {q.error && (
        <p className="velvet-salon-agenda__error velvet-alert velvet-alert--error" role="alert">
          {q.error instanceof Error ? q.error.message : "Errore"}
        </p>
      )}

      {q.data !== undefined && (
        <div className="velvet-salon-agenda__body">
          <div className="velvet-salon-agenda__week-shell">
            <div className="velvet-salon-agenda__week-head">
              <span className="velvet-salon-agenda__week-kicker">{weekKicker ?? "Calendario"}</span>
              <span className="velvet-salon-agenda__week-sub">
                {weekSub ?? "Tocca un giorno per vedere le prenotazioni"}
              </span>
            </div>
            <div className="velvet-salon-agenda__week" role="group" aria-label="Scegli il giorno della settimana">
            {days.map((day) => {
              const ymd = formatLocalYmd(day);
              const count = agendaRows.filter((a) => sameLocalDay(a.start, day)).length;
              const isToday = ymd === todayYmd;
              const isSelected = ymd === selectedYmd;
              const label = `${agendaWeekdayLabel(day)} ${day.getDate()}, ${count} prenotazioni`;

              return (
                <button
                  key={ymd}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={label}
                  className={
                    "velvet-salon-agenda__day-cell" +
                    (isToday ? " velvet-salon-agenda__day-cell--today" : "") +
                    (isSelected ? " velvet-salon-agenda__day-cell--selected" : "")
                  }
                  onClick={() => setSelectedYmd(ymd)}
                >
                  <span className="velvet-salon-agenda__day-cell-dow">{agendaWeekdayLabel(day)}</span>
                  <span className="velvet-salon-agenda__day-cell-dom">{day.getDate()}</span>
                  <span
                    className={
                      "velvet-salon-agenda__day-cell-count" +
                      (count === 0 ? " velvet-salon-agenda__day-cell-count--zero" : "")
                    }
                    aria-hidden
                  >
                    {count === 0 ? "—" : String(count)}
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          {selectedDay && (
            <section className="velvet-salon-agenda__day-block velvet-salon-agenda__detail" aria-live="polite">
              <header
                className={
                  "velvet-salon-agenda__dayhead" +
                  (formatLocalYmd(selectedDay) === todayYmd ? " velvet-salon-agenda__dayhead--today" : "")
                }
              >
                <span className="velvet-salon-agenda__dayhead-accent" aria-hidden />
                <div className="velvet-salon-agenda__dayhead-main">
                  <span className="velvet-salon-agenda__dow">{agendaWeekdayLabel(selectedDay)}</span>
                  <span className="velvet-salon-agenda__dom">{selectedDay.getDate()}</span>
                  <span className="velvet-salon-agenda__date-long">
                    {selectedDay.toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <span className="velvet-salon-agenda__day-count">
                  {selectedItems.length === 0
                    ? "Nessuna prenotazione"
                    : selectedItems.length === 1
                      ? "1 prenotazione"
                      : `${selectedItems.length} prenotazioni`}
                </span>
              </header>

              <div className="velvet-salon-agenda__table-wrap">
                <table className="velvet-salon-agenda__table">
                  <caption className="velvet-salon-agenda__caption">
                    Agenda del{" "}
                    {selectedDay.toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Orario</th>
                      <th scope="col">Servizio</th>
                      <th scope="col">Cliente</th>
                      {!singleOperator ? <th scope="col">Operatore</th> : null}
                      <th scope="col">Sede</th>
                      <th scope="col">Prezzo</th>
                      <th scope="col">Stato</th>
                      <th scope="col" className="velvet-salon-agenda__th-action">
                        Dettaglio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.length === 0 ? (
                      <tr>
                        <td colSpan={singleOperator ? 7 : 8} className="velvet-salon-agenda__table-empty">
                          Nessuna prenotazione in questo giorno. Scegli un altro giorno nella settimana sopra.
                        </td>
                      </tr>
                    ) : (
                      selectedItems.map((a) => (
                        <tr
                          key={a.id}
                          className={
                            "velvet-salon-agenda__data-row" +
                            (staffMode ? "" : " velvet-salon-agenda__data-row--openable")
                          }
                          onClick={
                            staffMode
                              ? undefined
                              : (e) => {
                                  const el = e.target as HTMLElement | null;
                                  if (el?.closest("a, button")) return;
                                  navigate(`/account/prenotazioni/${a.id}`);
                                }
                          }
                        >
                          <td className="velvet-salon-agenda__cell-time">
                            <span className="velvet-salon-agenda__time-range">
                              {formatHm(a.start)} – {formatHm(a.end)}
                            </span>
                          </td>
                          <td className="velvet-salon-agenda__cell-strong">{a.serviceName}</td>
                          <td>{a.salonClientDisplayName}</td>
                          {!singleOperator ? <td>{a.operatorName}</td> : null}
                          <td className="velvet-salon-agenda__cell-muted">{a.locationName}</td>
                          <td className="velvet-salon-agenda__cell-num">{formatPriceEUR(a.priceCents)}</td>
                          <td>
                            <span
                              className="velvet-salon-agenda__status"
                              data-agenda-status={agendaStatusTone(a.status)}
                              title={a.status}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="velvet-salon-agenda__cell-action">
                            {staffMode ? (
                              <span className="velvet-salon-agenda__row-muted">—</span>
                            ) : (
                              <Link to={`/account/prenotazioni/${a.id}`} className="velvet-salon-agenda__row-link">
                                Apri
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {showOwnerBookClient ? (
        <SalonAgendaBookClientDialog
          open={bookDialogOpen}
          onClose={() => setBookDialogOpen(false)}
          presetOperatorId={bookOperatorId}
          presetOperatorLabel={operatorLabel}
          presetDateYmd={selectedYmd}
        />
      ) : null}
    </div>
  );
}
