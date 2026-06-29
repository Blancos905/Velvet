import type { MeSalonNotificationInbox, MeSalonNotificationMessage } from "../api/types";

export function inboxAttentionTotal(inbox: MeSalonNotificationInbox | undefined): number {
  const rows = inbox?.types;
  if (!rows?.length) return 0;
  return rows.reduce((acc, r) => {
    const p = Number(r.pending);
    const s = Number(r.sent);
    const pN = Number.isFinite(p) && p > 0 ? Math.floor(p) : 0;
    const sN = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
    return acc + pN + sN;
  }, 0);
}

export function sortMessagesNewestFirst(messages: MeSalonNotificationMessage[]): MeSalonNotificationMessage[] {
  return [...messages].sort((a, b) => {
    const aTs = Date.parse(a.sentAt ?? a.scheduledAt ?? "");
    const bTs = Date.parse(b.sentAt ?? b.scheduledAt ?? "");
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
}
