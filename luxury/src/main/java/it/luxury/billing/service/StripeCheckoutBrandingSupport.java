package it.luxury.billing.service;

import com.stripe.param.checkout.SessionCreateParams;
import it.luxury.config.LuxuryStripeCheckoutBrandingProperties;

import java.net.URI;
import java.util.Locale;

/** Branding e testi italiani per Stripe Checkout (allineati al sito Saloni Luxury). */
final class StripeCheckoutBrandingSupport {

	private static final long PREMIUM_TRIAL_DAYS = 60L;

	private StripeCheckoutBrandingSupport() {
	}

	static SessionCreateParams.BrandingSettings brandingSettings(
			LuxuryStripeCheckoutBrandingProperties branding,
			String frontendBaseUrl) {
		SessionCreateParams.BrandingSettings.Builder builder = SessionCreateParams.BrandingSettings.builder()
				.setDisplayName(branding.displayName())
				.setBackgroundColor(branding.backgroundColor())
				.setButtonColor(branding.buttonColor())
				.setBorderStyle(SessionCreateParams.BrandingSettings.BorderStyle.ROUNDED)
				.setFontFamily(resolveFontFamily(branding.fontFamily()));

		String logoUrl = resolveLogoUrl(branding, frontendBaseUrl);
		if (logoUrl != null) {
			builder.setLogo(
					SessionCreateParams.BrandingSettings.Logo.builder()
							.setType(SessionCreateParams.BrandingSettings.Logo.Type.URL)
							.setUrl(logoUrl)
							.build());
		}
		return builder.build();
	}

	static SessionCreateParams.CustomText customText() {
		return SessionCreateParams.CustomText.builder()
				.setSubmit(
						SessionCreateParams.CustomText.Submit.builder()
								.setMessage(
										"Avvia %d giorni di prova Premium Saloni Luxury: oggi non paghi nulla."
												.formatted(PREMIUM_TRIAL_DAYS))
								.build())
				.setAfterSubmit(
						SessionCreateParams.CustomText.AfterSubmit.builder()
								.setMessage(
										"Dopo la prova l'abbonamento prosegue a 20 €/mese salvo disdetta dal portale Stripe.")
								.build())
				.build();
	}

	static String resolveLogoUrl(LuxuryStripeCheckoutBrandingProperties branding, String frontendBaseUrl) {
		if (branding.logoUrl() != null && isPubliclyFetchableUrl(branding.logoUrl())) {
			return branding.logoUrl();
		}
		if (frontendBaseUrl == null || frontendBaseUrl.isBlank()) {
			return null;
		}
		String base = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
		if (!isPubliclyFetchableUrl(base)) {
			return null;
		}
		String path = branding.logoPath().startsWith("/") ? branding.logoPath() : "/" + branding.logoPath();
		return base + path;
	}

	private static boolean isPubliclyFetchableUrl(String url) {
		try {
			URI uri = URI.create(url.trim());
			String host = uri.getHost();
			if (host == null || host.isBlank()) {
				return false;
			}
			String lower = host.toLowerCase(Locale.ROOT);
			return !"localhost".equals(lower)
					&& !"127.0.0.1".equals(lower)
					&& !lower.endsWith(".local");
		}
		catch (IllegalArgumentException ex) {
			return false;
		}
	}

	private static SessionCreateParams.BrandingSettings.FontFamily resolveFontFamily(String raw) {
		String normalized = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT).replace('-', '_');
		return switch (normalized) {
			case "inter" -> SessionCreateParams.BrandingSettings.FontFamily.INTER;
			case "lato" -> SessionCreateParams.BrandingSettings.FontFamily.LATO;
			case "open_sans", "opensans" -> SessionCreateParams.BrandingSettings.FontFamily.OPEN_SANS;
			case "roboto" -> SessionCreateParams.BrandingSettings.FontFamily.ROBOTO;
			case "montserrat" -> SessionCreateParams.BrandingSettings.FontFamily.MONTSERRAT;
			default -> SessionCreateParams.BrandingSettings.FontFamily.INTER;
		};
	}
}
