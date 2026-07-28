package it.luxury.publicapi.dto;

/**
 * Risposta comune alle registrazioni pubbliche (cliente e titolare salone).
 */
public record RegistrationCreatedResponse(
		String message,
		boolean emailVerificationRequired,
		String premiumCheckoutToken) {

	public RegistrationCreatedResponse(String message, boolean emailVerificationRequired) {
		this(message, emailVerificationRequired, null);
	}

	public RegistrationCreatedResponse(String message) {
		this(message, true, null);
	}
}
