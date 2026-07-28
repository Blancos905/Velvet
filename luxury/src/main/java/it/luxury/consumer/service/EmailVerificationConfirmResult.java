package it.luxury.consumer.service;

/** Risposta interna conferma email: sessione opzionale + percorso post-conferma. */
public record EmailVerificationConfirmResult(
		String message,
		String accessToken,
		String refreshToken,
		long expiresInSeconds,
		int refreshTokenExpiresInDays,
		String nextPath,
		String premiumCheckoutToken) {

	public EmailVerificationConfirmResult(
			String message,
			String accessToken,
			String refreshToken,
			long expiresInSeconds,
			int refreshTokenExpiresInDays,
			String nextPath) {
		this(message, accessToken, refreshToken, expiresInSeconds, refreshTokenExpiresInDays, nextPath, null);
	}

	public boolean issuesSession() {
		return accessToken != null && !accessToken.isBlank();
	}

	public boolean awaitingPremiumPayment() {
		return premiumCheckoutToken != null && !premiumCheckoutToken.isBlank();
	}
}
