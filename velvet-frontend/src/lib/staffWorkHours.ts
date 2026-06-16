import { formatSalonSplitOpeningHours, minuteOfDayToTimeValue, timeValueToMinuteOfDay } from "./salonOpeningHours";

export type StaffWorkHoursForm = {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
};

export type StaffWorkHoursPayload = {
  workMorningStartMinuteOfDay: number;
  workMorningEndMinuteOfDay: number;
  workAfternoonStartMinuteOfDay: number;
  workAfternoonEndMinuteOfDay: number;
};

export function defaultStaffWorkHoursFromSalon(
  openMinute?: number | null,
  morningEndMinute?: number | null,
  afternoonStartMinute?: number | null,
  closeMinute?: number | null,
): StaffWorkHoursForm {
  const open = openMinute ?? 510;
  const close = closeMinute ?? 1140;
  const morningEnd = morningEndMinute ?? Math.min(open + 270, close - 60);
  const afternoonStart = afternoonStartMinute ?? Math.min(morningEnd + 90, close - 30);
  return {
    morningStart: minuteOfDayToTimeValue(open),
    morningEnd: minuteOfDayToTimeValue(morningEnd),
    afternoonStart: minuteOfDayToTimeValue(afternoonStart),
    afternoonEnd: minuteOfDayToTimeValue(close),
  };
}

export function staffWorkHoursFromMinutes(
  morningStart?: number | null,
  morningEnd?: number | null,
  afternoonStart?: number | null,
  afternoonEnd?: number | null,
): StaffWorkHoursForm | null {
  if (
    morningStart == null ||
    morningEnd == null ||
    afternoonStart == null ||
    afternoonEnd == null
  ) {
    return null;
  }
  return {
    morningStart: minuteOfDayToTimeValue(morningStart),
    morningEnd: minuteOfDayToTimeValue(morningEnd),
    afternoonStart: minuteOfDayToTimeValue(afternoonStart),
    afternoonEnd: minuteOfDayToTimeValue(afternoonEnd),
  };
}

export function parseStaffWorkHoursForm(form: StaffWorkHoursForm): StaffWorkHoursPayload | string {
  const morningStart = timeValueToMinuteOfDay(form.morningStart);
  const morningEnd = timeValueToMinuteOfDay(form.morningEnd);
  const afternoonStart = timeValueToMinuteOfDay(form.afternoonStart);
  const afternoonEnd = timeValueToMinuteOfDay(form.afternoonEnd);
  if (morningStart == null || morningEnd == null || afternoonStart == null || afternoonEnd == null) {
    return "Inserisci tutti e quattro gli orari di lavoro dell'operatore.";
  }
  if (morningStart >= morningEnd || afternoonStart >= afternoonEnd || morningEnd >= afternoonStart) {
    return "Gli orari operatore devono essere: mattina apertura < chiusura < pomeriggio apertura < chiusura.";
  }
  return {
    workMorningStartMinuteOfDay: morningStart,
    workMorningEndMinuteOfDay: morningEnd,
    workAfternoonStartMinuteOfDay: afternoonStart,
    workAfternoonEndMinuteOfDay: afternoonEnd,
  };
}

export function formatStaffWorkHoursLabel(
  morningStart?: number | null,
  morningEnd?: number | null,
  afternoonStart?: number | null,
  afternoonEnd?: number | null,
): string | null {
  if (
    morningStart == null ||
    morningEnd == null ||
    afternoonStart == null ||
    afternoonEnd == null
  ) {
    return null;
  }
  return formatSalonSplitOpeningHours(morningStart, morningEnd, afternoonStart, afternoonEnd);
}
