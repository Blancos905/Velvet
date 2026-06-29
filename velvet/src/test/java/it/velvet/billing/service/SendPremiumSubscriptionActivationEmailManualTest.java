package it.velvet.billing.service;

import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.Instant;

/** Invio manuale: {@code source spring-dev.local.env && ./mvnw test -Dtest=SendPremiumSubscriptionActivationEmailManualTest} */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "VELVET_MAIL_ENABLED", matches = "true")
class SendPremiumSubscriptionActivationEmailManualTest {

	@DynamicPropertySource
	static void disableBillingForManualEmail(DynamicPropertyRegistry registry) {
		registry.add("velvet.billing.enabled", () -> "false");
	}

	@Autowired
	private SalonBillingEmailDispatchService emailDispatchService;

	@Test
	void sendActivationEmail() {
		String to = System.getenv().getOrDefault("VELVET_TEST_EMAIL_TO", "reviewer@example.org");
		StudioGroup group = new StudioGroup("Salone Demo Premium");
		group.setOwnerEmail(to);
		emailDispatchService.dispatchPaymentThankYou(group, 0L, "eur", Instant.parse("2026-07-23T22:00:00Z"));
	}
}
