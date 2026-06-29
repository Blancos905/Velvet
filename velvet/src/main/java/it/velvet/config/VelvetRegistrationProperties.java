package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.registration")
public class VelvetRegistrationProperties {

	/**
	 * Se false (es. test automatici), l’email viene marcata verificata subito e il login non richiede conferma.
	 */
	private boolean emailVerificationRequired = true;

	public boolean isEmailVerificationRequired() {
		return emailVerificationRequired;
	}

	public void setEmailVerificationRequired(boolean emailVerificationRequired) {
		this.emailVerificationRequired = emailVerificationRequired;
	}

}
