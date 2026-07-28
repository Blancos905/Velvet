import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";

const LEGACY_STORAGE_KEY = "luxury.savedLogin.v1";
const STORAGE_KEY = "luxury.savedLoginEmail.v1";
const NATIVE_STORAGE_KEY = "luxury.nativeSavedLogin.v1";

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

export function readSavedLoginCredentials(): SavedLoginCredentials | null {
  if (isNativeSavedCredentialsAllowed()) {
    return readNativeSavedLoginCredentials();
  }
  const saved = readSavedLoginEmail();
  if (!saved) return null;
  return { email: saved.email, password: "" };
}

export function writeSavedLoginCredentials(email: string, password = ""): void {
  if (isNativeSavedCredentialsAllowed()) {
    writeNativeSavedLoginCredentials(email, password);
    return;
  }
  writeSavedLoginEmail(email);
}

export function clearSavedLoginCredentials(): void {
  clearSavedLoginEmail();
  clearNativeSavedLoginCredentials();
}

export function readSavedLoginEmail(): SavedLoginEmail | null {
  if (typeof localStorage === "undefined") return null;
  if (!isSavedLoginEmailAllowed()) {
    purgeLegacySavedLoginStorage();
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedLoginEmail>;
      const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
      return email ? { email } : null;
    }
    return migrateLegacySavedLoginEmail();
  } catch {
    return null;
  }
}

export function writeSavedLoginEmail(email: string): void {
  if (typeof localStorage === "undefined") return;
  if (!isSavedLoginEmailAllowed()) return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  try {
    purgeLegacySavedLoginStorage();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ email: normalizedEmail } satisfies SavedLoginEmail),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSavedLoginEmail(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    purgeLegacySavedLoginStorage();
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

function migrateLegacySavedLoginEmail(): SavedLoginEmail | null {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return null;
    const parsed = JSON.parse(legacyRaw) as { email?: string; password?: string };
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    purgeLegacySavedLoginStorage();
    if (!email) return null;
    writeSavedLoginEmail(email);
    return { email };
  } catch {
    purgeLegacySavedLoginStorage();
    return null;
  }
}

function purgeLegacySavedLoginStorage(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
