import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { apiJson } from "../api/client";
import type { OrganizationDetail, OrganizationSummary } from "../api/types";

export type SalonOrgNavState = {
  orgPreview?: OrganizationSummary;
};

export function organizationSummaryToDetailPlaceholder(summary: OrganizationSummary): OrganizationDetail {
  return {
    id: summary.id,
    slug: summary.slug,
    name: summary.name,
    city: summary.city,
    addressLine: null,
    phoneE164: null,
    whatsappE164: null,
    timeZone: "Europe/Rome",
    welcomeMessage: null,
    contactEmail: null,
    contactPhone: null,
    bookingOpeningMinuteOfDay: 510,
    bookingClosingMinuteOfDay: 1140,
  };
}

export function findOrganizationSummaryInQueryCache(
  queryClient: QueryClient,
  slug: string,
): OrganizationSummary | undefined {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;
  const queries = queryClient.getQueriesData<OrganizationSummary[]>({ queryKey: ["orgs"] });
  for (const [, data] of queries) {
    const hit = data?.find((o) => o.slug.trim().toLowerCase() === normalized);
    if (hit) return hit;
  }
  return undefined;
}

export function resolveOrganizationDetailPlaceholder(
  queryClient: QueryClient,
  slug: string,
  navPreview?: OrganizationSummary | null,
): OrganizationDetail | undefined {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;
  if (navPreview?.slug.trim().toLowerCase() === normalized) {
    return organizationSummaryToDetailPlaceholder(navPreview);
  }
  const cached = findOrganizationSummaryInQueryCache(queryClient, slug);
  return cached ? organizationSummaryToDetailPlaceholder(cached) : undefined;
}

export function prefetchPublicOrganizationDetail(queryClient: QueryClient, slug: string): void {
  const s = slug.trim();
  if (!s) return;
  void queryClient.prefetchQuery({
    queryKey: ["org", "detail", s],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(s)}`),
    staleTime: 60_000,
  });
}

export function usePublicOrganizationDetail(slug: string) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const navPreview = (location.state as SalonOrgNavState | null)?.orgPreview;

  const placeholderData = useMemo(
    () => resolveOrganizationDetailPlaceholder(queryClient, slug, navPreview),
    [queryClient, slug, navPreview],
  );

  return useQuery({
    queryKey: ["org", "detail", slug],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
    placeholderData,
    staleTime: 60_000,
  });
}
