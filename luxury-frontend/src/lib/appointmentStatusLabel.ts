import type { MessageKey } from "../i18n/messages";
import type { LuxuryLocaleContextValue } from "../i18n/useLuxuryLocale";

const STATUS_KEYS: Record<string, MessageKey> = {
  BOOKED: "account.booking.status.booked",
  CONFIRMED: "account.booking.status.confirmed",
  COMPLETED: "account.booking.status.completed",
  CANCELLED: "account.booking.status.cancelled",
};

export function appointmentStatusLabel(t: LuxuryLocaleContextValue["t"], status: string): string {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
}
