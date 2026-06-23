package it.velvet.billing.service;

import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.studio.domain.StudioGroup;
import org.springframework.stereotype.Service;

/**
 * Accesso alle funzionalità Premium: piano {@code PREMIUM} + abbonamento attivo quando Stripe è configurato.
 */
@Service
public class SalonPremiumEntitlementService {

	private final VelvetStripeProperties stripeProperties;
	private final BillingAccountRepository billingAccountRepository;

	public SalonPremiumEntitlementService(
			VelvetStripeProperties stripeProperties,
			BillingAccountRepository billingAccountRepository) {
		this.stripeProperties = stripeProperties;
		this.billingAccountRepository = billingAccountRepository;
	}

	public boolean hasActivePremium(StudioGroup group) {
		if (group == null) {
			return false;
		}
		if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
			return false;
		}
		if (!stripeProperties.configured()) {
			return true;
		}
		return billingAccountRepository.findByStudioGroup_Id(group.getId())
				.map(account -> "PREMIUM".equals(StripeSubscriptionSyncService.planTierForStatus(account.getSubscriptionStatus())))
				.orElse(false);
	}
}
