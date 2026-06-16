import { apiJson } from "./client";

export type BillingStatus = {
  billingEnabled: boolean;
  configured: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  premiumAccess: boolean;
};

export async function fetchBillingStatus(accessToken: string | null | undefined): Promise<BillingStatus> {
  return apiJson<BillingStatus>("/api/v1/me/billing/status", { accessToken });
}

export async function createCheckoutSession(accessToken: string | null | undefined): Promise<{ checkoutUrl: string }> {
  return apiJson<{ checkoutUrl: string }>("/api/v1/me/billing/checkout-session", {
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
