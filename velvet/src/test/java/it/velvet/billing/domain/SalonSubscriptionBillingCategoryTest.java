package it.velvet.billing.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SalonSubscriptionBillingCategoryTest {

	@Test
	void activeWithoutCancelIsPaying() {
		assertEquals(SalonSubscriptionBillingCategory.PAYING, SalonSubscriptionBillingCategory.fromFields("active", false));
	}

	@Test
	void trialingWithoutCancelIsTrial() {
		assertEquals(SalonSubscriptionBillingCategory.TRIAL, SalonSubscriptionBillingCategory.fromFields("trialing", false));
	}

	@Test
	void cancelAtPeriodEndIsCancelledEvenWhenTrialing() {
		assertEquals(SalonSubscriptionBillingCategory.CANCELLED, SalonSubscriptionBillingCategory.fromFields("trialing", true));
	}

	@Test
	void canceledStatusIsCancelled() {
		assertEquals(SalonSubscriptionBillingCategory.CANCELLED, SalonSubscriptionBillingCategory.fromFields("canceled", false));
	}

	@Test
	void nullAccountIsNullCategory() {
		assertNull(SalonSubscriptionBillingCategory.fromBillingAccount(null));
	}

	@Test
	void parseFilterAcceptsCaseInsensitive() {
		assertEquals(SalonSubscriptionBillingCategory.PAYING, SalonSubscriptionBillingCategory.parseFilter("paying"));
	}
}
