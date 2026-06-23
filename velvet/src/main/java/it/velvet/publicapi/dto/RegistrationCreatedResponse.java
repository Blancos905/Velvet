package it.velvet.publicapi.dto;

/**
 * Risposta comune alle registrazioni pubbliche (cliente e titolare salone).
 */
public record RegistrationCreatedResponse(String message, boolean emailVerificationRequired) {

	public RegistrationCreatedResponse(String message) {
		this(message, true);
	}
}
