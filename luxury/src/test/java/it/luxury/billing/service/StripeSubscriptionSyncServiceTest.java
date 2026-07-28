package it.luxury.billing.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StripeSubscriptionSyncServiceTest {

	@Test
	void planTierForStatus_grantsPremiumForActiveStates() {
		assertEquals("PREMIUM", StripeSubscriptionSyncService.planTierForStatus("active"));
		assertEquals("PREMIUM", StripeSubscriptionSyncService.planTierForStatus("trialing"));
		assertEquals("PREMIUM", StripeSubscriptionSyncService.planTierForStatus("past_due"));
	}

	@Test
	void planTierForStatus_downgradesOnCanceledOrIncomplete() {
		assertEquals("BASE", StripeSubscriptionSyncService.planTierForStatus("canceled"));
		assertEquals("BASE", StripeSubscriptionSyncService.planTierForStatus("incomplete"));
		assertEquals("BASE", StripeSubscriptionSyncService.planTierForStatus("unpaid"));
	}
}
