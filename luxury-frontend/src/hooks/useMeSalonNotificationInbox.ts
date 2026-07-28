import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeSalonNotificationInbox } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";

export function useMeSalonNotificationInboxQuery(enabled = true) {
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const salonSide = isSalonTitolare || isSalonStaff;
  return useQuery({
    queryKey: ["me", "salon", "notifications"],
    queryFn: () => apiJson<MeSalonNotificationInbox>("/api/v1/me/salon/notifications", { accessToken }),
    enabled: Boolean(enabled && salonSide && accessToken),
    /** Cache breve: i conteggi “in coda” cambiano spesso; senza refetch al focus serve aggiornamento frequente. */
    staleTime: 45_000,
    /** All’ingresso in area account / pagina Notifiche i numeri devono allinearsi al server. */
    refetchOnMount: "always",
    /** Evita che un refetch al focus faccia “saltare” i conteggi proprio mentre apri il dettaglio. */
    refetchOnWindowFocus: false,
    /** Aggiornamento automatico per badge menu e centro notifiche senza pulsanti manuali. */
    refetchInterval: 20_000,
  });
}
