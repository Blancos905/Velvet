package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccount;
import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonSubscriptionLifecycleServiceTest {

	private final SalonSubscriptionLifecycleService service = new SalonSubscriptionLifecycleService();

	@Test
	void recordsCancelRequestedAtWhenCancelAtPeriodEndBecomesTrue() {
		StudioGroup group = new StudioGroup("Salone");
		BillingAccount account = new BillingAccount(group, "cus_test");
		account.setCancelAtPeriodEnd(true);

		service.onSubscriptionSynced(account, false);

		assertNotNull(account.getSubscriptionCancelRequestedAt());
	}

	@Test
	void doesNotOverwriteExistingCancelRequestedAt() {
		StudioGroup group = new StudioGroup("Salone");
		BillingAccount account = new BillingAccount(group, "cus_test");
		Instant existing = Instant.parse("2026-01-01T10:00:00Z");
		account.setSubscriptionCancelRequestedAt(existing);
		account.setCancelAtPeriodEnd(true);

		service.onSubscriptionSynced(account, false);

		assertEquals(existing, account.getSubscriptionCancelRequestedAt());
	}

	@Test
	void clearsCancelRequestedAtOnReactivation() {
		StudioGroup group = new StudioGroup("Salone");
		BillingAccount account = new BillingAccount(group, "cus_test");
		account.setSubscriptionCancelRequestedAt(Instant.now());
		account.setCancelAtPeriodEnd(false);
		account.setSubscriptionStatus("active");

		service.onSubscriptionSynced(account, true);

		assertNull(account.getSubscriptionCancelRequestedAt());
	}

	@Test
	void accountDeletionScheduledAtIsPeriodEndPlusGraceDays() {
		StudioGroup group = new StudioGroup("Salone");
		BillingAccount account = new BillingAccount(group, "cus_test");
		Instant periodEnd = Instant.parse("2026-06-01T00:00:00Z");
		account.setSubscriptionCancelRequestedAt(Instant.parse("2026-05-01T00:00:00Z"));
		account.setCurrentPeriodEnd(periodEnd);

		Instant scheduled = service.accountDeletionScheduledAt(account, 30);

		assertEquals(periodEnd.plus(30, ChronoUnit.DAYS), scheduled);
	}

	@Test
	void isEligibleForAutomaticDeletionAfterGraceWindow() {
		StudioGroup group = new StudioGroup("Salone");
		BillingAccount account = new BillingAccount(group, "cus_test");
		Instant periodEnd = Instant.now().minus(31, ChronoUnit.DAYS);
		account.setSubscriptionCancelRequestedAt(periodEnd.minus(5, ChronoUnit.DAYS));
		account.setCurrentPeriodEnd(periodEnd);

		assertTrue(service.isEligibleForAutomaticDeletion(account, 30, Instant.now()));
	}

	@Test
	void isNotEligibleBeforeGraceWindowEnds() {
		StudioGroup group = new StudioGroup("Salone");
		BillingAccount account = new BillingAccount(group, "cus_test");
		Instant periodEnd = Instant.now().minus(10, ChronoUnit.DAYS);
		account.setSubscriptionCancelRequestedAt(periodEnd.minus(5, ChronoUnit.DAYS));
		account.setCurrentPeriodEnd(periodEnd);

		assertFalse(service.isEligibleForAutomaticDeletion(account, 30, Instant.now()));
	}
}
