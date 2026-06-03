import { jsPDF } from "jspdf";
import type { AppointmentDto } from "../api/types";
import { formatPriceEUR } from "./format";

export type SalonSemesterPdfInput = {
  salonName: string;
  addressLine: string | null;
  cityLine: string | null;
  periodLabel: string;
  fromYmd: string;
  toYmd: string;
  fileSlug: string;
  appointments: AppointmentDto[];
};

function ymRangeInclusive(fromYmd: string, toYmd: string): string[] {
  const from = new Date(`${fromYmd.slice(0, 7)}-01T12:00:00`);
  const to = new Date(`${toYmd.slice(0, 7)}-01T12:00:00`);
  const out: string[] = [];
  let y = from.getFullYear();
  let m = from.getMonth();
  const endY = to.getFullYear();
  const endM = to.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

function monthTitleIt(ym: string): string {
  const [ys, ms] = ym.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 1);
  return d.toLocaleString("it-IT", { month: "long", year: "numeric" });
}

function aggregateServices(appointments: AppointmentDto[]): { name: string; count: number; cents: number }[] {
  const map = new Map<string, { count: number; cents: number }>();
  for (const a of appointments) {
    const cur = map.get(a.serviceName) ?? { count: 0, cents: 0 };
    cur.count += 1;
    if (a.status !== "CANCELLED") cur.cents += a.priceCents ?? 0;
    map.set(a.serviceName, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cents - a.cents);
}

function aggregateDaily(appointments: AppointmentDto[]): { day: string; count: number; cents: number }[] {
  const map = new Map<string, { count: number; cents: number }>();
  for (const a of appointments) {
    const day = a.start.slice(0, 10);
    const cur = map.get(day) ?? { count: 0, cents: 0 };
    cur.count += 1;
    if (a.status !== "CANCELLED") cur.cents += a.priceCents ?? 0;
    map.set(day, cur);
  }
  return [...map.entries()]
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** PDF riepilogativo (supporto informativo; non documento fiscale ufficiale). */
function renderSalonAccountantPdf(input: SalonSemesterPdfInput, downloadFileBase: string): void {
  const { salonName, addressLine, cityLine, periodLabel, fromYmd, toYmd, appointments } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxW = pageW - 2 * margin;
  let y = 16;

  const ensureSpace = (h: number) => {
    if (y + h > 285) {
      doc.addPage();
      y = 16;
    }
  };

  const paragraph = (text: string, fontSize = 9) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const ln of lines) {
      ensureSpace(fontSize * 0.55);
      doc.text(ln, margin, y);
      y += fontSize * 0.45 + 0.8;
    }
  };

  const heading = (text: string, fontSize = 12) => {
    ensureSpace(fontSize * 0.7 + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.text(text, margin, y);
    y += fontSize * 0.5 + 3;
    doc.setFont("helvetica", "normal");
  };

  const subheading = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    ensureSpace(6);
    doc.text(text, margin, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Report sintetico ricavi (Luxury)", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(salonName, margin, y);
  y += 5.5;
  if (addressLine || cityLine) {
    doc.setFontSize(9);
    const addr = [addressLine, cityLine].filter(Boolean).join(" — ");
    doc.text(addr, margin, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 90);
  doc.text(`Periodo: ${periodLabel}`, margin, y);
  y += 4.5;
  doc.text(`Intervallo dati: ${fromYmd} — ${toYmd}`, margin, y);
  y += 4.5;
  doc.text(`Generato il ${new Date().toLocaleString("it-IT")}`, margin, y);
  y += 2;
  doc.setTextColor(0, 0, 0);

  y += 4;
  heading("Nota importante", 11);
  paragraph(
    "Questo documento riassume gli importi associati alle prenotazioni gestite in Luxury " +
      "(stato appuntamenti e prezzi servizio registrati in app). Non sostituisce il registro dei corrispettivi, " +
      "la contabilità obbligatoria, la fatturazione elettronica né le trasmissioni verso l'Agenzia delle Entrate. " +
      "Per gli adempimenti fiscali valgono i documenti ufficiali della vostra attività; questo PDF è solo un allegato " +
      "informativo o per confronti interni.",
    8.5,
  );
  y += 3;

  const total = appointments.length;
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const billable = appointments.filter((a) => a.status !== "CANCELLED");
  const revenueCents = billable.reduce((acc, a) => acc + (a.priceCents ?? 0), 0);

  heading("Riepilogo periodo", 11);
  paragraph(`Prenotazioni nel periodo: ${total}`, 9);
  paragraph(`Completate: ${completed} · Annullate: ${cancelled}`, 9);
  paragraph(`Ricavo stimato (importi servizio, esclusi annullamenti): ${formatPriceEUR(revenueCents)}`, 9);
  y += 2;

  const ymKeys = ymRangeInclusive(fromYmd, toYmd);
  const monthly = ymKeys.map((ym) => {
    let count = 0;
    let comp = 0;
    let cents = 0;
    for (const a of appointments) {
      if (!a.start.startsWith(ym)) continue;
      count += 1;
      if (a.status === "COMPLETED") comp += 1;
      if (a.status !== "CANCELLED") cents += a.priceCents ?? 0;
    }
    return { ym, label: monthTitleIt(ym), count, comp, cents };
  });

  heading("Dettaglio mensile", 11);
  doc.setFontSize(8.5);
  for (const row of monthly) {
    ensureSpace(5);
    doc.text(
      `${row.label} — prenotazioni ${row.count}, completate ${row.comp}, ricavo stimato ${formatPriceEUR(row.cents)}`,
      margin,
      y,
    );
    y += 4.5;
  }
  y += 3;

  const services = aggregateServices(appointments);
  const servicesShow = services.slice(0, 40);
  heading("Servizi (per ricavo stimato)", 11);
  if (servicesShow.length === 0) {
    paragraph("Nessun dato nel periodo.", 9);
  } else {
    doc.setFontSize(8);
    subheading("Servizio — prenotazioni — ricavo stimato");
    for (const s of servicesShow) {
      const name = s.name.length > 52 ? `${s.name.slice(0, 49)}...` : s.name;
      ensureSpace(5);
      doc.text(`${name}  ·  ${s.count}  ·  ${formatPriceEUR(s.cents)}`, margin, y);
      y += 4.2;
    }
    if (services.length > servicesShow.length) {
      paragraph(`… e altri ${services.length - servicesShow.length} servizi (omessi per spazio).`, 8);
    }
  }
  y += 4;

  const daily = aggregateDaily(appointments);
  heading("Riepilogo giornaliero (importo stimato)", 11);
  paragraph(
    "Totale giornaliero delle prenotazioni non annullate (promemoria interno; i totali ufficiali restano in contabilità e nei documenti fiscali).",
    8,
  );
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  for (const d of daily) {
    ensureSpace(4.5);
    const txt = `${d.day}   ${String(d.count).padStart(4)} pren.   ${formatPriceEUR(d.cents)}`;
    doc.text(txt, margin, y);
    y += 3.8;
  }
  doc.setFont("helvetica", "normal");
  y += 4;
  paragraph(`Totale periodo: ${formatPriceEUR(revenueCents)}`, 10);

  const safeBase = downloadFileBase.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 120) || "velvet-report-ricavi";
  doc.save(`${safeBase}.pdf`);
}

/** PDF sul periodo selezionato (es. semestre solare). */
export function downloadSalonSemesterAccountantPdf(input: SalonSemesterPdfInput): void {
  const safe = input.fileSlug.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "salone";
  const yPart = input.fromYmd.slice(0, 4);
  const semTag = Number(input.fromYmd.slice(5, 7)) <= 6 ? "S1" : "S2";
  renderSalonAccountantPdf(input, `velvet-report-ricavi_${safe}_${yPart}-${semTag}`);
}

/** PDF sul mese solare (stessi contenuti del report semestrale, ristretto al mese). */
export function downloadSalonMonthlyAccountantPdf(input: SalonSemesterPdfInput): void {
  const safe = input.fileSlug.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "salone";
  const ym = input.fromYmd.slice(0, 7);
  renderSalonAccountantPdf(input, `velvet-report-ricavi_${safe}_mese-${ym}`);
}
