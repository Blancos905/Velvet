package it.luxury.dev;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Invio manuale anteprima email: {@code cd luxury && set -a && source spring-dev.local.env && set +a && LUXURY_TEST_EMAIL_TO=... ./mvnw test -Dtest=SendAllLuxuryEmailsManualTest} */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "LUXURY_MAIL_ENABLED", matches = "true")
class SendAllLuxuryEmailsManualTest {

	@DynamicPropertySource
	static void disableBillingForManualEmail(DynamicPropertyRegistry registry) {
		registry.add("luxury.billing.enabled", () -> "false");
	}

	@Autowired
	private LocalDevEmailPreviewService emailPreviewService;

	@Test
	void sendAllTransactionalEmailSamples() throws InterruptedException {
		String to = System.getenv().getOrDefault("LUXURY_TEST_EMAIL_TO", "costantinomichele358@gmail.com");
		var sent = emailPreviewService.sendAllSamples(to);
		System.out.println("Inviate " + sent.size() + " email di anteprima → " + to);
		sent.forEach(line -> System.out.println("  • " + line));
		Thread.sleep(2000L);
	}
}
