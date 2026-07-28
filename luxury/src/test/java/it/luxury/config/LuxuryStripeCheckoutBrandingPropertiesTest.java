package it.luxury.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LuxuryStripeCheckoutBrandingPropertiesTest {

	@Test
	void stripsQuotedHexColorsFromApplicationProperties() {
		var props = new LuxuryStripeCheckoutBrandingProperties(
				"Saloni Luxury", "'#0a0a0a'", "'#f97316'", "/logo.png", null, "inter");

		assertThat(props.backgroundColor()).isEqualTo("#0a0a0a");
		assertThat(props.buttonColor()).isEqualTo("#f97316");
	}
}
