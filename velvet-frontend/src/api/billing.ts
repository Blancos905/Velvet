import { apiJson } from "./client";

export type BillingStatus = {
  billingEnabled: boolean;
  configured: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  premiumAccess: boolean;
  billingProfileComplete: boolean;
};

export type SalonBillingProfile = {
  legalName: string | null;
  billingEmail: string | null;
  vatNumber: string | null;
  fiscalCode: string | null;
  subjectType: "COMPANY" | "INDIVIDUAL" | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  sdiCode: string | null;
  pecEmail: string | null;
  complete: boolean;
  /** true se salvati in `salon_billing_profiles` (non solo prefill). */
  persisted: boolean;
  /** ISO-8601 — per sincronizzare il form dopo salvataggio. */
  updatedAt: string | null;
};

export type SalonBillingProfilePayload = {
  legalName: string;
  billingEmail: string;
  vatNumber?: string;
  fiscalCode?: string;
  subjectType?: "COMPANY" | "INDIVIDUAL";
  addressLine1: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  sdiCode?: string;
  pecEmail?: string;
};

export async function fetchBillingStatus(accessToken: string | null | undefined): Promise<BillingStatus> {
  return apiJson<BillingStatus>("/api/v1/me/billing/status", { accessToken });
}

export async function fetchBillingProfile(accessToken: string | null | undefined): Promise<SalonBillingProfile> {
  return apiJson<SalonBillingProfile>("/api/v1/me/billing/profile", { accessToken });
}

export async function saveBillingProfile(
  accessToken: string | null | undefined,
  payload: SalonBillingProfilePayload,
): Promise<SalonBillingProfile> {
  return apiJson<SalonBillingProfile>("/api/v1/me/billing/profile", {
    method: "PUT",
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function createCheckoutSession(accessToken: string | null | undefined): Promise<{ checkoutUrl: string }> {
  return apiJson<{ checkoutUrl: string }>("/api/v1/me/billing/checkout-session", {
    method: "POST",
    accessToken,
  });
}

/** Conferma pagamento al ritorno da Stripe (sync abbonamento se il webhook è in ritardo). */
export async function confirmPremiumCheckoutSession(
  accessToken: string | null | undefined,
  sessionId: string,
): Promise<BillingStatus> {
  const params = new URLSearchParams({ session_id: sessionId.trim() });
  return apiJson<BillingStatus>(`/api/v1/me/billing/checkout-session/confirm?${params.toString()}`, {
    method: "POST",
    accessToken,
  });
}

export async function createBillingPortalSession(accessToken: string | null | undefined): Promise<{ portalUrl: string }> {
  return apiJson<{ portalUrl: string }>("/api/v1/me/billing/portal-session", {
    method: "POST",
    accessToken,
  });
}

export async function createCancelSubscriptionPortalSession(
  accessToken: string | null | undefined,
): Promise<{ portalUrl: string }> {
  return apiJson<{ portalUrl: string }>("/api/v1/me/billing/cancel-subscription-session", {
    method: "POST",
    accessToken,
  });
}

/** Redirect completo a Stripe Checkout (PSD2/SCA hosted). */
export async function startPremiumCheckout(accessToken: string | null | undefined): Promise<void> {
  const { checkoutUrl } = await createCheckoutSession(accessToken);
  window.location.assign(checkoutUrl);
}

/** Redirect al Customer Portal Stripe (fatture e metodo di pagamento). */
export async function openBillingPortal(accessToken: string | null | undefined): Promise<void> {
  const { portalUrl } = await createBillingPortalSession(accessToken);
  window.location.assign(portalUrl);
}

/** Redirect diretto alla pagina di disdetta abbonamento nel Customer Portal Stripe. */
export async function openCancelSubscriptionPortal(accessToken: string | null | undefined): Promise<void> {
  const { portalUrl } = await createCancelSubscriptionPortalSession(accessToken);
  window.location.assign(portalUrl);
}
