package it.luxury.billing.service;

import it.luxury.config.LuxuryStripeProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BillingRegistrationPlanPolicyTest {

	@Test
	void premiumRegistrationStaysPremiumWhenBillingConfigured() {
		var props = new LuxuryStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null);
		var policy = new BillingRegistrationPlanPolicy(props);
		assertEquals("PREMIUM", policy.effectiveProvisionPlanTier("PREMIUM"));
		assertTrue(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
	}

	@Test
	void premiumRegistrationUnchangedWhenBillingDisabled() {
		var props = new LuxuryStripeProperties(false, "", "", "", null, null, null);
		var policy = new BillingRegistrationPlanPolicy(props);
		assertEquals("PREMIUM", policy.effectiveProvisionPlanTier("PREMIUM"));
		assertFalse(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
	}

	@Test
	void premiumRegistrationRequiresCheckoutWithSandboxCliKey() {
		var props = new LuxuryStripeProperties(
				true, "rkcs_test_51TrJk57fDTXxuuEN", "whsec_x", "price_x", null, null, null);
		var policy = new BillingRegistrationPlanPolicy(props);
		assertTrue(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
	}

	@Test
	void premiumRegistrationSkipsCheckoutWhenSecretKeyIsNotOperational() {
		var props = new LuxuryStripeProperties(true, "not_a_stripe_key", "whsec_x", "price_x", null, null, null);
		var policy = new BillingRegistrationPlanPolicy(props);
		assertFalse(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
		assertEquals("/account/salone", policy.salonOwnerPostConfirmPath("PREMIUM"));
	}

	@Test
	void salonOwnerPostConfirmPathDependsOnBilling() {
		var enabled = new BillingRegistrationPlanPolicy(
				new LuxuryStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null));
		var disabled = new BillingRegistrationPlanPolicy(
				new LuxuryStripeProperties(false, "", "", "", null, null, null));
		assertEquals(BillingRegistrationPlanPolicy.REGISTRATION_CHECKOUT_START_PATH, enabled.salonOwnerPostConfirmPath("PREMIUM"));
		assertEquals("/account/salone", disabled.salonOwnerPostConfirmPath("PREMIUM"));
	}
}
