package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.registration")
public class LuxuryRegistrationProperties {

	/**
	 * Se false (es. test automatici), l’email viene marcata verificata subito e il login non richiede conferma.
	 */
	private boolean emailVerificationRequired = true;

	/** Giorni per completare Stripe Checkout dopo conferma email (registrazione Premium). */
	private int premiumCheckoutContinuationDays = 7;

	public boolean isEmailVerificationRequired() {
		return emailVerificationRequired;
	}

	public void setEmailVerificationRequired(boolean emailVerificationRequired) {
		this.emailVerificationRequired = emailVerificationRequired;
	}

	public int getPremiumCheckoutContinuationDays() {
		return premiumCheckoutContinuationDays <= 0 ? 7 : premiumCheckoutContinuationDays;
	}

	public void setPremiumCheckoutContinuationDays(int premiumCheckoutContinuationDays) {
		this.premiumCheckoutContinuationDays = premiumCheckoutContinuationDays;
	}
}
