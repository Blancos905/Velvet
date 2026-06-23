package it.velvet.consumer.service;

/** Risposta interna conferma email: sessione opzionale + percorso post-conferma. */
public record EmailVerificationConfirmResult(
		String message,
		String accessToken,
		String refreshToken,
		long expiresInSeconds,
		int refreshTokenExpiresInDays,
		String nextPath) {

	public boolean issuesSession() {
		return accessToken != null && !accessToken.isBlank();
	}
}
