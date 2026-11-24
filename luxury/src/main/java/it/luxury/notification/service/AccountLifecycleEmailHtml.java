package it.luxury.notification.service;

/**
 * Template HTML account lifecycle (benvenuto, eliminazione, password, invito staff) —
 * stesso guscio di {@link LuxuryEmailHtml}.
 */
final class AccountLifecycleEmailHtml {

	private AccountLifecycleEmailHtml() {
	}

	static String buildWelcomeEmail(String greetingName, boolean salonOwner, String ctaUrl) {
		String headline = salonOwner ? "Benvenuto su Saloni Luxury" : "Benvenuto su Saloni Luxury";
		String intro = salonOwner
				? "Il tuo account titolare è attivo. Da qui gestisci agenda, clienti e vetrina del salone."
				: "Il tuo account è attivo. Ora puoi cercare saloni e prenotare online.";
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName) + ",<br><br>" + intro;
		String ctaLabel = salonOwner ? "Vai al salone" : "Inizia a esplorare";
		return LuxuryEmailHtml.build(
				headline,
				bodyHtml,
				null,
				ctaUrl,
				ctaLabel,
				LuxuryEmailHtml.supportFooter(),
				null);
	}

	static String buildAccountDeletedEmail(String greetingName) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>Abbiamo chiuso il tuo account Saloni Luxury come richiesto.<br>"
				+ "I dati identificativi del profilo sono stati anonimizzati secondo l&apos;informativa privacy.";
		String details = LuxuryEmailHtml.detailsBox(
				"Non potrai più accedere con le stesse credenziali.<br>"
						+ "Per assistenza o nuove richieste privacy scrivi a privacy@saloniluxury.it");
		return LuxuryEmailHtml.build(
				"Account eliminato",
				bodyHtml,
				details,
				null,
				null,
				LuxuryEmailHtml.supportFooter(),
				null);
	}

	static String buildEmailChangeNotice(String greetingName, String newEmail) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>È stata richiesta la modifica dell'email del tuo account Saloni Luxury."
				+ "<br>Il nuovo indirizzo resterà non verificato finché non viene confermato dal link inviato lì.";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Nuova email", newEmail)
						+ "Se non sei stato tu, accedi e reimposta la password.");
		return LuxuryEmailHtml.build(
				"Richiesta di cambio email",
				bodyHtml,
				details,
				null,
				null,
				LuxuryEmailHtml.disclaimerFooter("Se non hai richiesto questa modifica, contatta supporto@saloniluxury.it."),
				null);
	}

	static String buildPasswordChangedEmail(String greetingName, String profileUrl) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>La password del tuo account Saloni Luxury è stata modificata correttamente.";
		String details = LuxuryEmailHtml.detailsBox(
				"Se non sei stato tu, reimposta subito la password e contatta supporto@saloniluxury.it.");
		return LuxuryEmailHtml.build(
				"Password aggiornata",
				bodyHtml,
				details,
				profileUrl,
				"Vai al profilo",
				LuxuryEmailHtml.disclaimerFooter("Se non hai richiesto questa modifica, agisci subito."),
				profileUrl);
	}

	static String buildStaffInviteEmail(
			String greetingName,
			String salonName,
			String staffEmail,
			String loginUrl) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>Il titolare di <strong>"
				+ LuxuryEmailHtml.escapeHtml(salonName)
				+ "</strong> ti ha creato un accesso staff su Saloni Luxury.";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Email di accesso", staffEmail)
						+ "Usa la password che ti ha comunicato il titolare (non viene inviata via email per sicurezza).");
		return LuxuryEmailHtml.build(
				"Accesso staff creato",
				bodyHtml,
				details,
				loginUrl,
				"Accedi all'area staff",
				LuxuryEmailHtml.supportFooter(),
				loginUrl);
	}

	static String buildNewDeviceLoginEmail(
			String greetingName,
			String deviceSummary,
			String ipAddress,
			String profileUrl) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(greetingName)
				+ ",<br><br>Abbiamo rilevato un accesso al tuo account Saloni Luxury da un "
				+ "<strong>nuovo dispositivo o browser</strong>.";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Dispositivo", deviceSummary)
						+ LuxuryEmailHtml.detailRow("Indirizzo IP", ipAddress)
						+ "Se sei stato tu, puoi ignorare questa email.<br>"
						+ "Se non riconosci l&apos;accesso, cambia subito la password.");
		return LuxuryEmailHtml.build(
				"Nuovo accesso al tuo account",
				bodyHtml,
				details,
				profileUrl,
				"Vai al profilo",
				LuxuryEmailHtml.disclaimerFooter("Se non hai effettuato tu questo accesso, agisci subito."),
				profileUrl);
	}
}
