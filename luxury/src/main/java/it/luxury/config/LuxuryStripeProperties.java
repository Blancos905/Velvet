package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.billing")
public record LuxuryStripeProperties(
		/** Abilita Checkout, Portal e webhook Stripe (richiede chiavi test/live). */
		boolean enabled,
		/** Chiave segreta Stripe ({@code sk_test_...} o {@code sk_live_...}). */
		String secretKey,
		/** Segreto endpoint webhook ({@code whsec_...}). */
		String webhookSecret,
		/** Price ID ricorrente Premium ({@code price_...}). */
		String premiumPriceId,
		/** Path relativo success redirect (prefisso = luxury.notifications.frontend-base-url). */
		String checkoutSuccessPath,
		/** Path relativo cancel redirect. */
		String checkoutCancelPath,
		/** Path relativo ritorno Customer Portal. */
		String portalReturnPath) {

	public LuxuryStripeProperties {
		if (secretKey == null) {
			secretKey = "";
		}
		else {
			secretKey = secretKey.trim();
		}
		if (webhookSecret == null) {
			webhookSecret = "";
		}
		else {
			webhookSecret = webhookSecret.trim();
		}
		if (premiumPriceId == null) {
			premiumPriceId = "";
		}
		else {
			premiumPriceId = premiumPriceId.trim();
		}
		if (checkoutSuccessPath == null || checkoutSuccessPath.isBlank()) {
			checkoutSuccessPath = "/account/billing/success";
		}
		if (checkoutCancelPath == null || checkoutCancelPath.isBlank()) {
			checkoutCancelPath = "/piani/premium-prova";
		}
		if (portalReturnPath == null || portalReturnPath.isBlank()) {
			portalReturnPath = "/account/profilo";
		}
	}

	public boolean configured() {
		return enabled && hasOperationalSecretKey() && premiumPriceId != null && !premiumPriceId.isBlank();
	}

	private boolean hasOperationalSecretKey() {
		return secretKey != null
				&& (secretKey.startsWith("sk_test_")
						|| secretKey.startsWith("sk_live_")
						|| secretKey.startsWith("rkcs_test_"));
	}
}
