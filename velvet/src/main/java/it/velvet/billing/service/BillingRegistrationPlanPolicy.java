package it.velvet.billing.service;

import it.velvet.config.VelvetStripeProperties;
import it.velvet.studio.domain.StudioGroup;
import org.springframework.stereotype.Component;

/**
 * Piano richiesto in registrazione: {@code PREMIUM} resta {@code PREMIUM} anche con Stripe attivo.
 * Le funzionalità Premium sono sbloccate solo dopo pagamento ({@link SalonPremiumEntitlementService}).
 */
@Component
public class BillingRegistrationPlanPolicy {

	private final VelvetStripeProperties stripeProperties;

	public BillingRegistrationPlanPolicy(VelvetStripeProperties stripeProperties) {
		this.stripeProperties = stripeProperties;
	}

	public String effectiveProvisionPlanTier(String requestedPlanTier) {
		return StudioGroup.canonicalPlanTier(requestedPlanTier);
	}

	public boolean billingCheckoutRequiredForPremiumRegistration(String requestedPlanTier) {
		return stripeProperties.configured()
				&& "PREMIUM".equalsIgnoreCase(requestedPlanTier != null ? requestedPlanTier.trim() : "");
	}
}
