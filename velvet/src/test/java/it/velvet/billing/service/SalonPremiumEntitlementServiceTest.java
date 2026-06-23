package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccount;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SalonPremiumEntitlementServiceTest {

	@Test
	void premiumPlanWithoutSubscriptionIsNotEntitledWhenStripeConfigured() {
		var props = new VelvetStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		group.applyPlanTier("PREMIUM");
		when(billingRepo.findByStudioGroup_Id(group.getId())).thenReturn(Optional.empty());
		assertFalse(service.hasActivePremium(group));
	}

	@Test
	void premiumPlanWithActiveSubscriptionIsEntitledWhenStripeConfigured() {
		var props = new VelvetStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		var account = new BillingAccount(group, "cus_test");
		account.setSubscriptionStatus("active");
		when(billingRepo.findByStudioGroup_Id(group.getId())).thenReturn(Optional.of(account));
		assertTrue(service.hasActivePremium(group));
	}

	@Test
	void premiumPlanIsEntitledWhenStripeNotConfigured() {
		var props = new VelvetStripeProperties(false, "", "", "", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		assertTrue(service.hasActivePremium(group));
	}
}
