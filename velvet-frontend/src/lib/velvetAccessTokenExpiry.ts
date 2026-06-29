function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return null;
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Epoch ms da claim `exp` (secondi UNIX); null se assente o non decodificabile. */
export function readJwtExpirationEpochMs(accessToken: string | undefined): number | null {
  if (accessToken == null || accessToken.length === 0) return null;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp === "number" && Number.isFinite(exp)) return exp * 1000;
  if (typeof exp === "string") {
    const n = Number(exp);
    if (Number.isFinite(n)) return n * 1000;
  }
  return null;
}

export function isVelvetAccessTokenExpired(accessToken: string | undefined, nowMs = Date.now()): boolean {
  const expMs = readJwtExpirationEpochMs(accessToken);
  if (expMs == null) return false;
  return nowMs >= expMs;
}
