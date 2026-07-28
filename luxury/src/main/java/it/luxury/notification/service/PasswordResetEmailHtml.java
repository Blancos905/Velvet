package it.luxury.notification.service;

/**
 * Template HTML per email di recupero password (stesso stile registrazione/prenotazione).
 */
final class PasswordResetEmailHtml {

	private PasswordResetEmailHtml() {
	}

	static String buildResetEmail(String greetingName, String resetUrl) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>Hai richiesto di reimpostare la password del tuo account Saloni Luxury.<br>"
				+ "Usa il pulsante qui sotto per scegliere una nuova password. Il link è valido per un tempo limitato.";
		String disclaimer = LuxuryEmailHtml.disclaimerFooter(
				"Se non hai richiesto il recupero password, ignora questo messaggio.");
		return LuxuryEmailHtml.build(
				"Reimposta la password",
				bodyHtml,
				null,
				resetUrl,
				"Reimposta password",
				disclaimer,
				resetUrl);
	}
}
