package it.luxury.billing.service;

import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonPromotionalTrialServiceTest {

	private SalonPromotionalTrialService service;

	@BeforeEach
	void setUp() {
		service = new SalonPromotionalTrialService();
		ReflectionTestUtils.setField(service, "promotionalTrialDays", 30);
	}

	@Test
	void trialEndsThirtyDaysAfterRegistration() {
		Instant createdAt = Instant.parse("2026-01-15T10:00:00Z");
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		ReflectionTestUtils.setField(group, "createdAt", createdAt);

		Instant endsAt = service.promotionalTrialEndsAt(group);

		assertNotNull(endsAt);
		assertTrue(endsAt.isAfter(createdAt));
		assertTrue(service.isWithinPromotionalTrial(group, createdAt.plusSeconds(29L * 24 * 3600)));
		assertFalse(service.isWithinPromotionalTrial(group, createdAt.plusSeconds(30L * 24 * 3600)));
		assertNotNull(service.deferredStripeChargeEpochSecond(group, createdAt.plusSeconds(24 * 3600)));
		assertTrue(service.deferredStripeChargeEpochSecond(group, createdAt.plusSeconds(29L * 24 * 3600)) == null);
	}
}
