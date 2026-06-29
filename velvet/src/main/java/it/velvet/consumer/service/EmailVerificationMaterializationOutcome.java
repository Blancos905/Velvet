package it.velvet.consumer.service;

import it.velvet.consumer.domain.PendingRegistrationKind;

/** Esito materializzazione dopo conferma token email. */
public record EmailVerificationMaterializationOutcome(
		PendingRegistrationKind kind,
		String email,
		/** Piano salone da payload pending ({@code provisionPlanTier}); null se non titolare. */
		String salonProvisionPlanTier) {

	public static EmailVerificationMaterializationOutcome legacyProfile(String email) {
		return new EmailVerificationMaterializationOutcome(null, email, null);
	}
}
