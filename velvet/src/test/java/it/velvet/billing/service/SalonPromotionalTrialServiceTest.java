package it.velvet.billing.service;

import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonPromotionalTrialServiceTest {

	private SalonPromotionalTrialService service;

	@BeforeEach
	void setUp() {
		service = new SalonPromotionalTrialService();
		ReflectionTestUtils.setField(service, "promotionalTrialMonths", 6);
	}

	@Test
	void trialEndsSixMonthsAfterRegistration() {
		Instant createdAt = Instant.parse("2026-01-15T10:00:00Z");
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		ReflectionTestUtils.setField(group, "createdAt", createdAt);

		Instant endsAt = service.promotionalTrialEndsAt(group);

		assertNotNull(endsAt);
		assertTrue(endsAt.isAfter(createdAt));
		assertTrue(service.isWithinPromotionalTrial(group, createdAt.atZone(java.time.ZoneId.systemDefault()).plusMonths(5).toInstant()));
		assertFalse(service.isWithinPromotionalTrial(group, createdAt.atZone(java.time.ZoneId.systemDefault()).plusMonths(6).toInstant()));
	}
}
