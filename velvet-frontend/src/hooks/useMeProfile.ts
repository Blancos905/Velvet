import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { ProfileDto } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";

/**
 * Solo il nome di battesimo per il saluto: prima parola di `displayName` dal profilo.
 * Nessun fallback sull’email. Senza nome → `null` (la UI usa un saluto generico).
 */
export function resolveVelvetAccountGreetingName(profileDisplayName: string | null | undefined): string | null {
  const raw = profileDisplayName?.trim();
  if (!raw) return null;
  const first = raw.split(/\s+/)[0]?.trim();
  return first?.length ? first : null;
}

/** Allineato a `ProfilePage`: stessa `queryKey` così il saluto e il form profilo condividono la cache. */
export function useMeProfileQuery() {
  const { accessToken } = useVelvetAuth();
  return useQuery({
    queryKey: ["me", "profile", accessToken],
    queryFn: () => apiJson<ProfileDto>("/api/v1/me/profile", { accessToken }),
    enabled: Boolean(accessToken),
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
