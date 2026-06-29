package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.studio.domain.StudioGroup;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Accesso alle funzionalità Premium: piano {@code PREMIUM} + abbonamento Stripe attivo
 * oppure ancora dentro la prova promozionale ({@link SalonPromotionalTrialService}).
 */
@Service
public class SalonPremiumEntitlementService {

	private final VelvetStripeProperties stripeProperties;
	private final BillingAccountRepository billingAccountRepository;
	private final SalonPromotionalTrialService promotionalTrialService;

	public SalonPremiumEntitlementService(
			VelvetStripeProperties stripeProperties,
			BillingAccountRepository billingAccountRepository,
			SalonPromotionalTrialService promotionalTrialService) {
		this.stripeProperties = stripeProperties;
		this.billingAccountRepository = billingAccountRepository;
		this.promotionalTrialService = promotionalTrialService;
	}

	public boolean hasActivePremium(StudioGroup group) {
		if (group == null) {
			return false;
		}
		if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
			return false;
		}
		if (stripeProperties.configured()) {
			boolean subscribed = billingAccountRepository.findByStudioGroup_Id(group.getId())
					.map(account -> "PREMIUM".equals(StripeSubscriptionSyncService.planTierForStatus(account.getSubscriptionStatus())))
					.orElse(false);
			if (subscribed) {
				return true;
			}
		}
		return promotionalTrialService.isWithinPromotionalTrial(group, Instant.now());
	}
}
