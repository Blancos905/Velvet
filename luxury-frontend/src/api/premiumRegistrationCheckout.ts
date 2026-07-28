import { apiJson } from "./client";

export type PremiumRegistrationCheckoutResponse = {
  checkoutUrl: string;
};

export type PremiumRegistrationConfirmResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  nextPath: string;
};

export const PREMIUM_REGISTRATION_CHECKOUT_PATH = "/registrazione/premium/checkout";

export function premiumRegistrationCheckoutPath(checkoutToken: string, autostart = true): string {
  const params = new URLSearchParams({
    token: checkoutToken.trim().toLowerCase(),
  });
  if (autostart) {
    params.set("start", "1");
  }
  return `${PREMIUM_REGISTRATION_CHECKOUT_PATH}?${params.toString()}`;
}

export async function startPremiumRegistrationCheckout(checkoutToken: string): Promise<string> {
  const body = await apiJson<PremiumRegistrationCheckoutResponse>(
    "/api/v1/public/consumer-registration/premium-checkout/session",
    {
      method: "POST",
      body: JSON.stringify({ checkoutToken: checkoutToken.trim().toLowerCase() }),
    },
  );
  if (!body.checkoutUrl?.trim()) {
    throw new Error("Impossibile avviare il pagamento. Riprova tra qualche minuto.");
  }
  window.location.assign(body.checkoutUrl);
  return body.checkoutUrl;
}

export async function confirmPremiumRegistrationCheckout(
  sessionId: string,
  checkoutToken: string,
): Promise<PremiumRegistrationConfirmResponse> {
  const params = new URLSearchParams({ session_id: sessionId.trim() });
  return apiJson<PremiumRegistrationConfirmResponse>(
    `/api/v1/public/consumer-registration/premium-checkout/confirm?${params.toString()}`,
    {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ checkoutToken: checkoutToken.trim().toLowerCase() }),
    },
  );
}
