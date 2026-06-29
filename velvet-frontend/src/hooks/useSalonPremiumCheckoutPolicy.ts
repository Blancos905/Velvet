import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { SalonPremiumCheckoutPolicy } from "../lib/salonPremiumCheckoutPolicy";

export function useSalonPremiumCheckoutPolicyQuery() {
  return useQuery({
    queryKey: ["public", "salon-billing-registration-policy"],
    queryFn: () =>
      apiJson<SalonPremiumCheckoutPolicy>("/api/v1/public/consumer-registration/billing-policy"),
    staleTime: 5 * 60_000,
  });
}
