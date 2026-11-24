package it.luxury.billing.service;

import it.luxury.common.api.BusinessException;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Registrazione titolare: l’unico piano commerciale è {@code PREMIUM}.
 * I 30 giorni di prova non aprono Stripe: checkout e dati fiscali arrivano a fine prova.
 * Le funzionalità Premium sono sbloccate con {@link SalonPremiumEntitlementService#hasActivePremium}.
 */
@Component
public class BillingRegistrationPlanPolicy {

	public static final String REGISTRATION_CHECKOUT_SUCCESS_PATH = "/registrazione/premium/success";
	public static final String REGISTRATION_CHECKOUT_START_PATH = "/registrazione/premium/checkout";

	public static String registrationCheckoutResumeUrl(String frontendBase, String encodedCheckoutToken) {
		String base = frontendBase.endsWith("/") ? frontendBase.substring(0, frontendBase.length() - 1) : frontendBase;
		return base + REGISTRATION_CHECKOUT_START_PATH + "?token=" + encodedCheckoutToken;
	}

	/**
	 * Piano da materializzare in registrazione. Non restituisce {@code BASE}:
	 * quel valore resta solo lo stato tecnico «non entitled» scritto da Stripe, non un piano scelto.
	 */
	public String effectiveProvisionPlanTier(String requestedPlanTier) {
		String canonical = StudioGroup.canonicalPlanTier(requestedPlanTier);
		if ("PLUS".equals(canonical)) {
			return "PLUS";
		}
		if (!"PREMIUM".equals(canonical)) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Il piano disponibile per la registrazione è Premium.");
		}
		return "PREMIUM";
	}

	/** La registrazione non raccoglie la carta: Stripe parte dopo i 30 giorni di prova. */
	public boolean billingCheckoutRequiredForPremiumRegistration(String requestedPlanTier) {
		return false;
	}

	public String salonOwnerPostConfirmPath(String requestedPlanTier) {
		if (requestedPlanTier == null || requestedPlanTier.isBlank()) {
			return "/salone";
		}
		return "/salone";
	}
}
