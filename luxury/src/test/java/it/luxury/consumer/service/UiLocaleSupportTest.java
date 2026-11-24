package it.luxury.consumer.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class UiLocaleSupportTest {

	@Test
	void normalizePreferredLocale_acceptsSupportedCodes() {
		assertEquals("en", UiLocaleSupport.normalizePreferredLocale("EN"));
		assertEquals("it", UiLocaleSupport.normalizePreferredLocale("it"));
		assertNull(UiLocaleSupport.normalizePreferredLocale("ja"));
	}

	@Test
	void resolvePreferredLocale_usesCountryFallback() {
		assertEquals("fr", UiLocaleSupport.resolvePreferredLocale(null, "FR"));
		assertEquals("de", UiLocaleSupport.resolvePreferredLocale("", "DE"));
	}
}
