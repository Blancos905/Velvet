package it.luxury.billing.service;

import it.luxury.config.LuxuryStripeCheckoutBrandingProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class StripeCheckoutBrandingSupportTest {

	@Test
	void skipsLogoOnLocalhostFrontend() {
		var branding = new LuxuryStripeCheckoutBrandingProperties(null, null, null, null, null, null);
		assertNull(StripeCheckoutBrandingSupport.resolveLogoUrl(branding, "http://localhost:5173"));
	}

	@Test
	void buildsLogoFromProductionFrontendBase() {
		var branding = new LuxuryStripeCheckoutBrandingProperties(null, null, null, "/logo-saloni-luxury.png", null, null);
		assertEquals(
				"https://www.saloniluxury.it/logo-saloni-luxury.png",
				StripeCheckoutBrandingSupport.resolveLogoUrl(branding, "https://www.saloniluxury.it"));
	}

	@Test
	void prefersExplicitLogoUrl() {
		var branding = new LuxuryStripeCheckoutBrandingProperties(
				null,
				null,
				null,
				null,
				"https://cdn.example.com/logo.png",
				null);
		assertEquals("https://cdn.example.com/logo.png", StripeCheckoutBrandingSupport.resolveLogoUrl(branding, null));
	}
}
