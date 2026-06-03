/** Prefisso precompilato nei form telefono (Italia). */
export const DEFAULT_IT_PHONE_PREFIX = "+39";

/** Campo opzionale: solo prefisso o vuoto ⇒ nessun numero reale. */
export function isPlaceholderItPhoneOnly(value: string): boolean {
  const t = value.trim();
  return t === "" || /^\+39\s*$/i.test(t);
}

/** Registrazioni: ometti `phone` se l’utente non ha digitato cifre oltre +39. */
export function optionalPhoneForRegisterApi(raw: string): string | undefined {
  const t = raw.trim();
  if (isPlaceholderItPhoneOnly(t)) return undefined;
  return t;
}

/** PATCH profilo: stringa vuota = nessun telefono salvato. */
export function phoneForProfilePatchApi(raw: string): string {
  const t = raw.trim();
  if (isPlaceholderItPhoneOnly(t)) return "";
  return t;
}
