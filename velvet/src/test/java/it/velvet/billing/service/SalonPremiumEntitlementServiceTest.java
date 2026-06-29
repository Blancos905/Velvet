package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccount;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SalonPremiumEntitlementServiceTest {

	private SalonPromotionalTrialService promotionalTrialService;

	@BeforeEach
	void setUp() {
		promotionalTrialService = new SalonPromotionalTrialService();
		ReflectionTestUtils.setField(promotionalTrialService, "promotionalTrialMonths", 6);
	}

	@Test
	void premiumPlanWithoutSubscriptionIsNotEntitledWhenStripeConfigured() {
		var props = new VelvetStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo, promotionalTrialService);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		group.applyPlanTier("PREMIUM");
		ReflectionTestUtils.setField(group, "createdAt", Instant.now().minus(210, ChronoUnit.DAYS));
		when(billingRepo.findByStudioGroup_Id(group.getId())).thenReturn(Optional.empty());
		assertFalse(service.hasActivePremium(group));
	}

	@Test
	void premiumPlanWithActiveSubscriptionIsEntitledWhenStripeConfigured() {
		var props = new VelvetStripeProperties(true, "sk_test_x", "whsec_x", "price_x", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo, promotionalTrialService);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		var account = new BillingAccount(group, "cus_test");
		account.setSubscriptionStatus("active");
		when(billingRepo.findByStudioGroup_Id(group.getId())).thenReturn(Optional.of(account));
		assertTrue(service.hasActivePremium(group));
	}

	@Test
	void premiumPlanIsEntitledDuringPromotionalTrialWhenStripeNotConfigured() {
		var props = new VelvetStripeProperties(false, "", "", "", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo, promotionalTrialService);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		ReflectionTestUtils.setField(group, "createdAt", Instant.now().minus(60, ChronoUnit.DAYS));
		assertTrue(service.hasActivePremium(group));
	}

	@Test
	void premiumPlanIsNotEntitledAfterPromotionalTrialWhenStripeNotConfigured() {
		var props = new VelvetStripeProperties(false, "", "", "", null, null, null);
		var billingRepo = mock(it.velvet.billing.domain.BillingAccountRepository.class);
		var service = new SalonPremiumEntitlementService(props, billingRepo, promotionalTrialService);
		var group = new StudioGroup("Test", "owner@example.com", "PREMIUM");
		ReflectionTestUtils.setField(group, "createdAt", Instant.now().minus(210, ChronoUnit.DAYS));
		assertFalse(service.hasActivePremium(group));
	}
}
