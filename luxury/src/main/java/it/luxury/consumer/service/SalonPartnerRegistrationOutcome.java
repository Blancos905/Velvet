package it.luxury.consumer.service;

/**
 * Esito registrazione salone da form pubblico.
 *
 * @param emailVerificationRequired true se serve conferma email prima del pagamento / attivazione
 * @param premiumCheckoutToken token per Stripe Checkout quando email già verificata o verifica disabilitata
 */
public record SalonPartnerRegistrationOutcome(
		boolean emailVerificationRequired,
		String premiumCheckoutToken,
		String pollSecret) {

	public SalonPartnerRegistrationOutcome(boolean emailVerificationRequired, String premiumCheckoutToken) {
		this(emailVerificationRequired, premiumCheckoutToken, null);
	}

	public SalonPartnerRegistrationOutcome(boolean emailVerificationRequired) {
		this(emailVerificationRequired, null, null);
	}
}
