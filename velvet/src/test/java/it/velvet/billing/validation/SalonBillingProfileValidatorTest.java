package it.velvet.billing.validation;

import it.velvet.billing.domain.SalonBillingProfile;
import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonBillingProfileValidatorTest {

	@Test
	void completeItalianCompanyProfilePasses() {
		SalonBillingProfile profile = validItalianProfile();
		assertDoesNotThrow(() -> SalonBillingProfileValidator.validateForSave(profile));
		assertTrue(SalonBillingProfileValidator.isComplete(profile));
		assertEqualsStripeVat("IT12345678901", profile);
	}

	@Test
	void requiresVatOrFiscalCode() {
		SalonBillingProfile profile = validItalianProfile();
		profile.setVatNumber(null);
		profile.setFiscalCode(null);
		assertThrows(Exception.class, () -> SalonBillingProfileValidator.validateForSave(profile));
		assertFalse(SalonBillingProfileValidator.isComplete(profile));
	}

	@Test
	void requiresSdiOrPecForItaly() {
		SalonBillingProfile profile = validItalianProfile();
		profile.setSdiCode(null);
		profile.setPecEmail(null);
		assertThrows(Exception.class, () -> SalonBillingProfileValidator.validateForSave(profile));
	}

	@Test
	void normalizesItalianVatPrefix() {
		assertEquals("12345678901", SalonBillingProfileValidator.normalizeItalianVatDigits("IT12345678901"));
	}

	private static SalonBillingProfile validItalianProfile() {
		StudioGroup group = new StudioGroup("Salone Demo", "owner@example.com", "BASE");
		SalonBillingProfile profile = new SalonBillingProfile(group);
		profile.setLegalName("Salone Demo S.r.l.");
		profile.setBillingEmail("fatture@example.com");
		profile.setVatNumber("12345678901");
		profile.setAddressLine1("Via Roma 1");
		profile.setPostalCode("20100");
		profile.setCity("Milano");
		profile.setProvince("MI");
		profile.setCountry("IT");
		profile.setSdiCode("ABCDEFG");
		return profile;
	}

	private static void assertEqualsStripeVat(String expected, SalonBillingProfile profile) {
		assertEquals(expected, SalonBillingProfileValidator.stripeEuVatValue(profile));
	}
}
