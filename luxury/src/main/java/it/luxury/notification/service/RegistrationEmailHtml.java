package it.luxury.notification.service;

/**
 * Template HTML per email di registrazione (stesso stile delle email prenotazione).
 * Logo inline: {@code cid:luxury-logo}.
 */
final class RegistrationEmailHtml {

	private RegistrationEmailHtml() {
	}

	static String buildVerificationEmail(
			String greetingName,
			String verificationUrl,
			RegistrationEmailAudience audience) {
		boolean salonOwner = audience == RegistrationEmailAudience.SALON_OWNER;
		String headline = salonOwner ? "Conferma l'email del tuo salone" : "Conferma la tua email";
		String intro = salonOwner
				? "Grazie per aver registrato il tuo salone su Saloni Luxury.<br>"
						+ "Per attivare l'account titolare e proseguire con il piano scelto, conferma il tuo indirizzo email."
				: "Grazie per esserti registrato su Saloni Luxury.<br>"
						+ "Per attivare l'account e accedere, conferma il tuo indirizzo email.";
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>"
				+ intro;
		String disclaimer = LuxuryEmailHtml.disclaimerFooter("Se non hai richiesto la registrazione, ignora questo messaggio.");
		return LuxuryEmailHtml.build(
				headline,
				bodyHtml,
				null,
				verificationUrl,
				"Conferma email",
				disclaimer,
				null);
	}

	static String buildPremiumCheckoutEmail(String greetingName, String checkoutUrl) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>La tua email è confermata. Per attivare il salone Premium completa il pagamento sicuro su Stripe con il pulsante qui sotto.";
		String disclaimer = LuxuryEmailHtml.disclaimerFooter(
				"Se non hai richiesto la registrazione Premium, ignora questo messaggio.");
		return LuxuryEmailHtml.build(
				"Attiva il piano Premium",
				bodyHtml,
				null,
				checkoutUrl,
				"Completa pagamento Premium",
				disclaimer,
				checkoutUrl);
	}
}
