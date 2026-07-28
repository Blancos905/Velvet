package it.luxury.billing.service;

import it.luxury.admin.service.SuperAdminOverviewActionsService;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CancelledSalonSubscriptionExpiryServiceTest {

	@Mock
	private BillingAccountRepository billingAccountRepository;

	@Mock
	private SalonPremiumEntitlementService salonPremiumEntitlementService;

	@Mock
	private SuperAdminOverviewActionsService superAdminOverviewActionsService;

	private SalonSubscriptionLifecycleService lifecycleService;
	private CancelledSalonSubscriptionExpiryService service;

	@BeforeEach
	void setUp() {
		lifecycleService = new SalonSubscriptionLifecycleService();
		service = new CancelledSalonSubscriptionExpiryService(
				billingAccountRepository,
				salonPremiumEntitlementService,
				lifecycleService,
				superAdminOverviewActionsService);
	}

	@Test
	void deletesSalonWhenGracePeriodElapsedAndPremiumNotActive() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");
		Instant periodEnd = Instant.now().minus(40, ChronoUnit.DAYS);
		account.setSubscriptionCancelRequestedAt(periodEnd.minus(5, ChronoUnit.DAYS));
		account.setCurrentPeriodEnd(periodEnd);
		account.setCancelAtPeriodEnd(true);
		account.setSubscriptionStatus("canceled");

		when(billingAccountRepository.findPendingCancellationWithPeriodEnded(any())).thenReturn(List.of(account));
		when(salonPremiumEntitlementService.hasActivePremium(group)).thenReturn(false);

		int deleted = service.deleteExpiredCancelledSalonAccounts(30);

		assertEquals(1, deleted);
		verify(superAdminOverviewActionsService).deleteSalon(studioGroupId);
	}

	@Test
	void skipsSalonWhenPremiumReactivated() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");
		Instant periodEnd = Instant.now().minus(40, ChronoUnit.DAYS);
		account.setSubscriptionCancelRequestedAt(periodEnd.minus(5, ChronoUnit.DAYS));
		account.setCurrentPeriodEnd(periodEnd);

		when(billingAccountRepository.findPendingCancellationWithPeriodEnded(any())).thenReturn(List.of(account));
		when(salonPremiumEntitlementService.hasActivePremium(group)).thenReturn(true);

		int deleted = service.deleteExpiredCancelledSalonAccounts(30);

		assertEquals(0, deleted);
		verify(superAdminOverviewActionsService, never()).deleteSalon(studioGroupId);
	}
}
