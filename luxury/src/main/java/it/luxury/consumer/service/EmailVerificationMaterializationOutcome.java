package it.luxury.consumer.service;

import it.luxury.consumer.domain.PendingRegistrationKind;

/** Esito materializzazione dopo conferma token email. */
public record EmailVerificationMaterializationOutcome(
		PendingRegistrationKind kind,
		String email,
		/** Piano salone da payload pending ({@code provisionPlanTier}); null se non titolare. */
		String salonProvisionPlanTier,
		/** Token per avviare Stripe Checkout senza profilo in DB (solo Premium + billing). */
		String premiumCheckoutToken) {

	public EmailVerificationMaterializationOutcome(
			PendingRegistrationKind kind,
			String email,
			String salonProvisionPlanTier) {
		this(kind, email, salonProvisionPlanTier, null);
	}

	public static EmailVerificationMaterializationOutcome legacyProfile(String email) {
		return new EmailVerificationMaterializationOutcome(null, email, null, null);
	}

	public boolean awaitingPremiumPayment() {
		return premiumCheckoutToken != null && !premiumCheckoutToken.isBlank();
	}
}
