package it.velvet.billing.service;

import it.velvet.config.VelvetStripeProperties;
import it.velvet.studio.domain.StudioGroup;
import org.springframework.stereotype.Component;

/**
 * Con billing Stripe attivo, la registrazione Premium crea salone in piano Free finché il webhook non conferma il pagamento.
 */
@Component
public class BillingRegistrationPlanPolicy {

	private final VelvetStripeProperties stripeProperties;

	public BillingRegistrationPlanPolicy(VelvetStripeProperties stripeProperties) {
		this.stripeProperties = stripeProperties;
	}

	public String effectiveProvisionPlanTier(String requestedPlanTier) {
		if (!stripeProperties.configured()) {
			return StudioGroup.canonicalPlanTier(requestedPlanTier);
		}
		if ("PREMIUM".equalsIgnoreCase(requestedPlanTier != null ? requestedPlanTier.trim() : "")) {
			return "BASE";
		}
		return StudioGroup.canonicalPlanTier(requestedPlanTier);
	}

	public boolean billingCheckoutRequiredForPremiumRegistration(String requestedPlanTier) {
		return stripeProperties.configured()
				&& "PREMIUM".equalsIgnoreCase(requestedPlanTier != null ? requestedPlanTier.trim() : "");
	}
}
