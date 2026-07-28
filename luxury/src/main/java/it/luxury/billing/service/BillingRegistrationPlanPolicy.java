package it.luxury.billing.service;

import it.luxury.config.LuxuryStripeProperties;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.stereotype.Component;

/**
 * Piano richiesto in registrazione: {@code PREMIUM} resta {@code PREMIUM} anche con Stripe attivo.
 * Le funzionalità Premium sono sbloccate solo dopo pagamento ({@link SalonPremiumEntitlementService}).
 */
@Component
public class BillingRegistrationPlanPolicy {

	public static final String REGISTRATION_CHECKOUT_SUCCESS_PATH = "/registrazione/premium/success";
	public static final String REGISTRATION_CHECKOUT_START_PATH = "/registrazione/premium/checkout";

	public static String registrationCheckoutResumeUrl(String frontendBase, String encodedCheckoutToken) {
		String base = frontendBase.endsWith("/") ? frontendBase.substring(0, frontendBase.length() - 1) : frontendBase;
		return base + REGISTRATION_CHECKOUT_START_PATH + "?token=" + encodedCheckoutToken;
	}

	private final LuxuryStripeProperties stripeProperties;

	public BillingRegistrationPlanPolicy(LuxuryStripeProperties stripeProperties) {
		this.stripeProperties = stripeProperties;
	}

	public String effectiveProvisionPlanTier(String requestedPlanTier) {
		return StudioGroup.canonicalPlanTier(requestedPlanTier);
	}

	public boolean billingCheckoutRequiredForPremiumRegistration(String requestedPlanTier) {
		return stripeProperties.configured()
				&& "PREMIUM".equalsIgnoreCase(requestedPlanTier != null ? requestedPlanTier.trim() : "");
	}

	public String salonOwnerPostConfirmPath(String requestedPlanTier) {
		return billingCheckoutRequiredForPremiumRegistration(requestedPlanTier)
				? REGISTRATION_CHECKOUT_START_PATH
				: "/account/salone";
	}
}
