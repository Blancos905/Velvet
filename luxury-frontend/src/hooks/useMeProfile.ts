import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { ProfileDto } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";

/**
 * Solo il nome di battesimo per il saluto: prima parola di `displayName` dal profilo.
 * Nessun fallback sull’email. Senza nome → `null` (la UI usa un saluto generico).
 */
export function resolveLuxuryAccountGreetingName(profileDisplayName: string | null | undefined): string | null {
  const raw = profileDisplayName?.trim();
  if (!raw) return null;
  const first = raw.split(/\s+/)[0]?.trim();
  if (!first?.length) return null;
  return first.charAt(0).toLocaleUpperCase("it-IT") + first.slice(1);
}

/** Allineato a `ProfilePage`: stessa `queryKey` così il saluto e il form profilo condividono la cache. */
export function useMeProfileQuery() {
  const { accessToken } = useLuxuryAuth();
  return useQuery({
    queryKey: ["me", "profile", accessToken],
    queryFn: () => apiJson<ProfileDto>("/api/v1/me/profile", { accessToken }),
    enabled: Boolean(accessToken),
    // Un tentativo in più: dopo registrazione/login il primo GET può arrivare mentre la sessione si assesta.
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}
