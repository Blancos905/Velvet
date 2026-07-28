package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Branding Checkout Stripe (colori/logo Saloni Luxury). */
@ConfigurationProperties(prefix = "luxury.billing.checkout")
public record LuxuryStripeCheckoutBrandingProperties(
		String displayName,
		String backgroundColor,
		String buttonColor,
		/** Path logo sul frontend (es. {@code /logo-saloni-luxury.png}). */
		String logoPath,
		/** URL logo assoluto; se vuoto si usa {@code frontendBaseUrl + logoPath} quando raggiungibile da Stripe. */
		String logoUrl,
		String fontFamily) {

	public LuxuryStripeCheckoutBrandingProperties {
		if (displayName == null || displayName.isBlank()) {
			displayName = "Saloni Luxury";
		}
		backgroundColor = normalizeHexColor(backgroundColor, "#0a0a0a");
		buttonColor = normalizeHexColor(buttonColor, "#f97316");
		if (logoPath == null || logoPath.isBlank()) {
			logoPath = "/logo-saloni-luxury.png";
		}
		if (logoUrl != null) {
			logoUrl = logoUrl.trim();
			if (logoUrl.isEmpty()) {
				logoUrl = null;
			}
		}
		if (fontFamily == null || fontFamily.isBlank()) {
			fontFamily = "inter";
		}
	}

	private static String normalizeHexColor(String raw, String fallback) {
		if (raw == null || raw.isBlank()) {
			return fallback;
		}
		String trimmed = raw.trim();
		while (trimmed.length() >= 2
				&& ((trimmed.startsWith("'") && trimmed.endsWith("'"))
						|| (trimmed.startsWith("\"") && trimmed.endsWith("\"")))) {
			trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
		}
		return trimmed.isBlank() ? fallback : trimmed;
	}
}
