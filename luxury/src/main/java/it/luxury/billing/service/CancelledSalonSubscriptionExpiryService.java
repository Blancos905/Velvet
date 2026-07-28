package it.luxury.billing.service;

import it.luxury.admin.service.SuperAdminOverviewActionsService;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Cancella automaticamente saloni Premium disdetti che non hanno riattivato l'abbonamento entro la finestra di grazia.
 */
@Service
@ConditionalOnStripeBillingOperational
public class CancelledSalonSubscriptionExpiryService {

	private static final Logger log = LoggerFactory.getLogger(CancelledSalonSubscriptionExpiryService.class);

	private final BillingAccountRepository billingAccountRepository;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;
	private final SalonSubscriptionLifecycleService subscriptionLifecycleService;
	private final SuperAdminOverviewActionsService superAdminOverviewActionsService;

	public CancelledSalonSubscriptionExpiryService(
			BillingAccountRepository billingAccountRepository,
			SalonPremiumEntitlementService salonPremiumEntitlementService,
			SalonSubscriptionLifecycleService subscriptionLifecycleService,
			SuperAdminOverviewActionsService superAdminOverviewActionsService) {
		this.billingAccountRepository = billingAccountRepository;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
		this.subscriptionLifecycleService = subscriptionLifecycleService;
		this.superAdminOverviewActionsService = superAdminOverviewActionsService;
	}

	@Transactional
	public int deleteExpiredCancelledSalonAccounts(int graceDaysAfterPeriodEnd) {
		if (graceDaysAfterPeriodEnd <= 0) {
			return 0;
		}
		Instant now = Instant.now();
		Instant periodEndCutoff = now.minus(graceDaysAfterPeriodEnd, ChronoUnit.DAYS);
		List<BillingAccount> candidates = billingAccountRepository.findPendingCancellationWithPeriodEnded(periodEndCutoff);
		int deleted = 0;
		for (BillingAccount account : candidates) {
			if (!subscriptionLifecycleService.isEligibleForAutomaticDeletion(account, graceDaysAfterPeriodEnd, now)) {
				continue;
			}
			if (account.getStudioGroup() != null && account.getStudioGroup().isProvider()) {
				continue;
			}
			if (salonPremiumEntitlementService.hasActivePremium(account.getStudioGroup())) {
				continue;
			}
			try {
				superAdminOverviewActionsService.deleteSalon(account.getStudioGroupId());
				deleted++;
				log.info(
						"Cancellazione automatica salone dopo disdetta abbonamento: studioGroupId={} cancelRequestedAt={} periodEnd={}.",
						account.getStudioGroupId(),
						account.getSubscriptionCancelRequestedAt(),
						account.getCurrentPeriodEnd());
			}
			catch (RuntimeException ex) {
				log.error(
						"Cancellazione automatica salone fallita: studioGroupId={}.",
						account.getStudioGroupId(),
						ex);
			}
		}
		return deleted;
	}
}
