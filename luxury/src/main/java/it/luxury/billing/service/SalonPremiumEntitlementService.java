package it.luxury.billing.service;

import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.config.LuxuryStripeProperties;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Accesso alle funzionalità Premium: piano {@code PREMIUM} dentro i 30 giorni di prova,
 * oppure abbonamento Stripe attivo dopo la prova ({@link SalonPromotionalTrialService}).
 */
@Service
public class SalonPremiumEntitlementService {

	private final LuxuryStripeProperties stripeProperties;
	private final BillingAccountRepository billingAccountRepository;
	private final SalonPromotionalTrialService promotionalTrialService;

	public SalonPremiumEntitlementService(
			LuxuryStripeProperties stripeProperties,
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
		String tier = StudioGroup.canonicalPlanTier(group.getPlanTier());
		if (!"PREMIUM".equals(tier) && !"PLUS".equals(tier)) {
			return false;
		}
		Instant now = Instant.now();
		if (promotionalTrialService.isWithinPromotionalTrial(group, now)) {
			return true;
		}
		if (!stripeProperties.configured()) {
			return false;
		}
		return billingAccountRepository.findByStudioGroup_Id(group.getId())
				.map(account -> "PREMIUM".equals(
						StripeSubscriptionSyncService.planTierForStatus(account.getSubscriptionStatus())))
				.orElse(false);
	}
}
