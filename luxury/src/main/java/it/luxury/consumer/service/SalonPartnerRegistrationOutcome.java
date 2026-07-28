package it.luxury.consumer.service;

/**
 * Esito registrazione salone da form pubblico.
 *
 * @param emailVerificationRequired true se serve conferma email prima del pagamento / attivazione
 * @param premiumCheckoutToken token per Stripe Checkout quando email già verificata o verifica disabilitata
 */
public record SalonPartnerRegistrationOutcome(boolean emailVerificationRequired, String premiumCheckoutToken) {

	public SalonPartnerRegistrationOutcome(boolean emailVerificationRequired) {
		this(emailVerificationRequired, null);
	}
}
