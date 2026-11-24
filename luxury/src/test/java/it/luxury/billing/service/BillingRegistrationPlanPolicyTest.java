package it.luxury.billing.service;

import it.luxury.common.api.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BillingRegistrationPlanPolicyTest {

	@Test
	void premiumRegistrationNeverOpensStripeCheckout() {
		var policy = new BillingRegistrationPlanPolicy();
		assertEquals("PREMIUM", policy.effectiveProvisionPlanTier("PREMIUM"));
		assertFalse(policy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
		assertEquals("/salone", policy.salonOwnerPostConfirmPath("PREMIUM"));
	}

	@Test
	void plusRegistrationKeepsPlusAndSkipsCheckout() {
		var policy = new BillingRegistrationPlanPolicy();
		assertEquals("PLUS", policy.effectiveProvisionPlanTier("PLUS"));
		assertFalse(policy.billingCheckoutRequiredForPremiumRegistration("PLUS"));
		assertEquals("/salone", policy.salonOwnerPostConfirmPath("PLUS"));
	}

	@Test
	void registrationRejectsNonPremiumProvisionTier() {
		var policy = new BillingRegistrationPlanPolicy();
		assertThrows(BusinessException.class, () -> policy.effectiveProvisionPlanTier("BASE"));
		assertThrows(BusinessException.class, () -> policy.effectiveProvisionPlanTier("UNKNOWN"));
		assertThrows(BusinessException.class, () -> policy.effectiveProvisionPlanTier(null));
	}
}
