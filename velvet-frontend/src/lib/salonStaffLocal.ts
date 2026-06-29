export type LocalStaffItem = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  photoDataUrl: string | null;
};

const LOCAL_STAFF_PREFIX = "velvet.staff.fallback.v1:";

export function localStaffKey(slug: string): string {
  return `${LOCAL_STAFF_PREFIX}${slug.trim().toLowerCase()}`;
}

export function readLocalStaff(slug: string): LocalStaffItem[] {
  if (!slug) return [];
  try {
    const raw = localStorage.getItem(localStaffKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalStaffItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.id === "string");
  } catch {
    return [];
  }
}

export function writeLocalStaff(slug: string, rows: LocalStaffItem[]): void {
  if (!slug) return;
  localStorage.setItem(localStaffKey(slug), JSON.stringify(rows));
}

export function localStaffId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
