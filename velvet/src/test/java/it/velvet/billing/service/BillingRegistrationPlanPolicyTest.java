package it.velvet.billing.service;

import it.velvet.config.VelvetStripeProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BillingRegistrationPlanPolicyTest {

	@Test
	void premiumRegistrationStaysPremiumWhenBillingConfigured() {
		var props = new VelvetStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null);
		var policy = new BillingRegistrationPlanPolicy(props);
		assertEquals("PREMIUM", policy.effectiveProvisionPlanTier("PREMIUM"));
		assertTrue(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
	}

	@Test
	void premiumRegistrationUnchangedWhenBillingDisabled() {
		var props = new VelvetStripeProperties(false, "", "", "", null, null, null);
		var policy = new BillingRegistrationPlanPolicy(props);
		assertEquals("PREMIUM", policy.effectiveProvisionPlanTier("PREMIUM"));
		assertFalse(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
	}

	@Test
	void salonOwnerPostConfirmPathDependsOnBilling() {
		var enabled = new BillingRegistrationPlanPolicy(
				new VelvetStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null));
		var disabled = new BillingRegistrationPlanPolicy(
				new VelvetStripeProperties(false, "", "", "", null, null, null));
		assertEquals("/account/billing/checkout", enabled.salonOwnerPostConfirmPath("PREMIUM"));
		assertEquals("/account/salone", disabled.salonOwnerPostConfirmPath("PREMIUM"));
	}
}
