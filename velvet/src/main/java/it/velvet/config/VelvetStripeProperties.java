package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.billing")
public record VelvetStripeProperties(
		/** Abilita Checkout, Portal e webhook Stripe (richiede chiavi test/live). */
		boolean enabled,
		/** Chiave segreta Stripe ({@code sk_test_...} o {@code sk_live_...}). */
		String secretKey,
		/** Segreto endpoint webhook ({@code whsec_...}). */
		String webhookSecret,
		/** Price ID ricorrente Premium ({@code price_...}). */
		String premiumPriceId,
		/** Path relativo success redirect (prefisso = velvet.notifications.frontend-base-url). */
		String checkoutSuccessPath,
		/** Path relativo cancel redirect. */
		String checkoutCancelPath,
		/** Path relativo ritorno Customer Portal. */
		String portalReturnPath) {

	public VelvetStripeProperties {
		if (secretKey == null) {
			secretKey = "";
		}
		if (webhookSecret == null) {
			webhookSecret = "";
		}
		if (premiumPriceId == null) {
			premiumPriceId = "";
		}
		if (checkoutSuccessPath == null || checkoutSuccessPath.isBlank()) {
			checkoutSuccessPath = "/account/billing/success";
		}
		if (checkoutCancelPath == null || checkoutCancelPath.isBlank()) {
			checkoutCancelPath = "/piani";
		}
		if (portalReturnPath == null || portalReturnPath.isBlank()) {
			portalReturnPath = "/account/profilo";
		}
	}

	public boolean configured() {
		return enabled && secretKey != null && !secretKey.isBlank()
				&& premiumPriceId != null && !premiumPriceId.isBlank();
	}
}
