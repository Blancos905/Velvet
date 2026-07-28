package it.luxury.notification.service;

/**
 * Template HTML per email transazionali (prenotazione, abbonamento Premium, …).
 * Logo inline: {@code cid:luxury-logo} (allegato dal servizio di dispatch).
 */
public final class TransactionalBookingEmailHtml {

	public static final String LOGO_CONTENT_ID = LuxuryEmailHtml.LOGO_CONTENT_ID;

	private TransactionalBookingEmailHtml() {
	}

	static String buildManageBookingEmail(
			String headline,
			String bodyIntro,
			String salon,
			String service,
			String weekday,
			String when,
			String manageUrl,
			String buttonLabel) {
		String bodyHtml = LuxuryEmailHtml.escapeHtml(bodyIntro)
				+ "<br>Un ringraziamento anche da parte di <strong>"
				+ LuxuryEmailHtml.escapeHtml(salon)
				+ "</strong>.";
		String details = bookingDetailsBox(service, weekday, when, salon);
		return LuxuryEmailHtml.build(headline, bodyHtml, details, manageUrl, buttonLabel, null, null);
	}

	static String buildBookingUpdatedEmail(
			String salon,
			String service,
			String weekday,
			String when,
			String manageUrl) {
		String bodyHtml = "<strong>"
				+ LuxuryEmailHtml.escapeHtml(salon)
				+ "</strong> ha modificato l&apos;orario della tua prenotazione.<br>Ecco il nuovo riepilogo.";
		String details = bookingDetailsBox(service, weekday, when, salon);
		return LuxuryEmailHtml.build(
				"Prenotazione aggiornata", bodyHtml, details, manageUrl, "Vedi prenotazione", null, null);
	}

	static String buildBookingReminderEmail(
			String headline,
			String salon,
			String service,
			String weekday,
			String when,
			String manageUrl) {
		String bodyHtml = "Appuntamento presso <strong>" + LuxuryEmailHtml.escapeHtml(salon) + "</strong>.";
		String details = bookingDetailsBox(service, weekday, when, salon);
		return LuxuryEmailHtml.build(headline, bodyHtml, details, manageUrl, "Vedi prenotazione", null, null);
	}

	static String buildBookingCancelledEmail(
			boolean cancelledBySalon,
			String salon,
			String service,
			String weekday,
			String when,
			String frontendBaseUrl) {
		String headline = cancelledBySalon ? "Prenotazione annullata dal salone" : "Prenotazione annullata";
		String bodyHtml = cancelledBySalon
				? "<strong>" + LuxuryEmailHtml.escapeHtml(salon) + "</strong> ha annullato il tuo appuntamento."
				: "Hai annullato la prenotazione presso <strong>"
						+ LuxuryEmailHtml.escapeHtml(salon)
						+ "</strong>.";
		String details = bookingDetailsBox(service, weekday, when, salon);
		String ctaUrl = frontendBaseUrl + "/cerca";
		return LuxuryEmailHtml.build(headline, bodyHtml, details, ctaUrl, "Cerca un salone", null, null);
	}

	public static String buildPremiumSubscriptionThankYouEmail(
			String introLine,
			String salonName,
			String amountDetail,
			String periodDetail,
			String profileUrl,
			String buttonLabel) {
		String amountRow = amountDetail != null && !amountDetail.isBlank()
				? LuxuryEmailHtml.detailRow("Importo addebitato", amountDetail)
				: "";
		String periodRow = periodDetail != null && !periodDetail.isBlank()
				? LuxuryEmailHtml.detailRow("Prossimo rinnovo", periodDetail)
				: "";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Salone", salonName)
						+ amountRow
						+ periodRow
						+ LuxuryEmailHtml.detailRowHtml("Piano", "Premium — tutte le funzionalità attive"));
		String bodyHtml = "Grazie per aver scelto l&apos;abbonamento Premium Saloni Luxury.";
		return LuxuryEmailHtml.build(
				introLine, bodyHtml, details, profileUrl, buttonLabel, LuxuryEmailHtml.supportFooter(), null);
	}

	public static String buildPremiumSubscriptionCancellationEmail(
			String introLine,
			String salonName,
			String accessDetail,
			String planDetail,
			String profileUrl,
			String buttonLabel) {
		String accessRow = accessDetail != null && !accessDetail.isBlank()
				? LuxuryEmailHtml.detailRow("Accesso Premium", accessDetail)
				: "";
		String planRow = planDetail != null && !planDetail.isBlank()
				? "<strong>" + LuxuryEmailHtml.escapeHtml(planDetail) + "</strong><br>"
				: "";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Salone", salonName) + accessRow + planRow);
		String bodyHtml = "Abbiamo registrato la disdetta del tuo abbonamento Premium Saloni Luxury.";
		return LuxuryEmailHtml.build(
				introLine, bodyHtml, details, profileUrl, buttonLabel, LuxuryEmailHtml.supportFooter(), null);
	}

	private static String bookingDetailsBox(String service, String weekday, String when, String salon) {
		return LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Servizio", service)
						+ LuxuryEmailHtml.detailRow("Giorno", weekday)
						+ LuxuryEmailHtml.detailRow("Data e ora", when)
						+ LuxuryEmailHtml.detailRow("Sede", salon));
	}
}
