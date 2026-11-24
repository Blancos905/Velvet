import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";

const LEGACY_STORAGE_KEY = "luxury.savedLogin.v1";
const STORAGE_KEY = "luxury.savedLoginEmail.v1";
const NATIVE_STORAGE_KEY = "luxury.nativeSavedLogin.v1";
const LOGOUT_KIND_KEY = "luxury.logoutLoginKind";

/** Cliente, salone, operatore e super admin non condividono l’email ricordata. */
export type SavedLoginAccountKind = "client" | "salon" | "staff" | "admin";

const SAVED_LOGIN_KINDS: readonly SavedLoginAccountKind[] = ["client", "salon", "staff", "admin"];

export type SavedLoginEmail = {
  email: string;
};

export type SavedLoginCredentials = SavedLoginEmail & {
  password: string;
};

/** Ricorda email solo nel browser web — mai password. */
export function isSavedLoginEmailAllowed(): boolean {
  return !isLuxuryNativeAppShell();
}

/** Salva email + password nella WebView dell'app (storage locale al dispositivo). */
export function isNativeSavedCredentialsAllowed(): boolean {
  return isLuxuryNativeAppShell();
}

export function isSavedLoginPersistenceAllowed(): boolean {
  return isSavedLoginEmailAllowed() || isNativeSavedCredentialsAllowed();
}

function isSavedLoginAccountKind(value: string | null | undefined): value is SavedLoginAccountKind {
  return SAVED_LOGIN_KINDS.some((kind) => kind === value);
}

function emailStorageKey(kind: SavedLoginAccountKind): string {
  return `${STORAGE_KEY}.${kind}`;
}

/** Chi è appena uscito: il login successivo mostra solo la sua email. */
export function rememberLogoutLoginKind(kind: SavedLoginAccountKind): void {
  try {
    sessionStorage.setItem(LOGOUT_KIND_KEY, kind);
  } catch {
    /* ignore */
  }
}

export function readLoginAccountKind(search = ""): SavedLoginAccountKind | null {
  const fromQuery = new URLSearchParams(search).get("account");
  if (isSavedLoginAccountKind(fromQuery)) return fromQuery;
  try {
    const stored = sessionStorage.getItem(LOGOUT_KIND_KEY);
    return isSavedLoginAccountKind(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function readSavedLoginCredentials(kind: SavedLoginAccountKind | null = null): SavedLoginCredentials | null {
  if (isNativeSavedCredentialsAllowed()) {
    return readNativeSavedLoginCredentials();
  }
  if (!kind) return null;
  const saved = readSavedLoginEmail(kind);
  if (!saved) return null;
  return { email: saved.email, password: "" };
}

export function writeSavedLoginCredentials(email: string, password = "", kind: SavedLoginAccountKind | null = null): void {
  if (isNativeSavedCredentialsAllowed()) {
    writeNativeSavedLoginCredentials(email, password);
    return;
  }
  if (!kind) return;
  writeSavedLoginEmail(email, kind);
}

export function clearSavedLoginCredentials(kind: SavedLoginAccountKind | null = null): void {
  if (kind) clearSavedLoginEmail(kind);
  else clearNativeSavedLoginCredentials();
}

export function readSavedLoginEmail(kind: SavedLoginAccountKind): SavedLoginEmail | null {
  if (typeof localStorage === "undefined") return null;
  if (!isSavedLoginEmailAllowed()) {
    purgeSharedSavedLoginStorage();
    return null;
  }
  try {
    purgeSharedSavedLoginStorage();
    const raw = localStorage.getItem(emailStorageKey(kind));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLoginEmail>;
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export function writeSavedLoginEmail(email: string, kind: SavedLoginAccountKind): void {
  if (typeof localStorage === "undefined") return;
  if (!isSavedLoginEmailAllowed()) return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  try {
    purgeSharedSavedLoginStorage();
    localStorage.setItem(
      emailStorageKey(kind),
      JSON.stringify({ email: normalizedEmail } satisfies SavedLoginEmail),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSavedLoginEmail(kind: SavedLoginAccountKind): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(emailStorageKey(kind));
    purgeSharedSavedLoginStorage();
  } catch {
    /* ignore */
  }
}

function readNativeSavedLoginCredentials(): SavedLoginCredentials | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(NATIVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLoginCredentials>;
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    const password = typeof parsed.password === "string" ? parsed.password : "";
    if (!email) return null;
    return { email, password };
  } catch {
    return null;
  }
}

function writeNativeSavedLoginCredentials(email: string, password: string): void {
  if (typeof localStorage === "undefined") return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  try {
    localStorage.setItem(
      NATIVE_STORAGE_KEY,
      JSON.stringify({
        email: normalizedEmail,
        password,
      } satisfies SavedLoginCredentials),
    );
  } catch {
    /* ignore */
  }
}

function clearNativeSavedLoginCredentials(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(NATIVE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function purgeSharedSavedLoginStorage(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
