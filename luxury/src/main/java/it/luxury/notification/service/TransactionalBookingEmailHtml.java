package it.luxury.notification.service;

import org.springframework.lang.Nullable;

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

	public static String buildPremiumPaymentReceiptEmail(
			String salonName,
			String amountDetail,
			String paidOnDetail,
			String receiptNumber,
			String profileUrl) {
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Salone", salonName)
						+ LuxuryEmailHtml.detailRow("Importo", amountDetail)
						+ LuxuryEmailHtml.detailRow("Pagato il", paidOnDetail)
						+ LuxuryEmailHtml.detailRow("Ricevuta", receiptNumber)
						+ "In allegato trovi il PDF della ricevuta di pagamento.<br>"
						+ "La fattura elettronica FatturaPA è gestita dall&apos;amministrazione della piattaforma.");
		String bodyHtml =
				"Ecco la ricevuta del pagamento Premium. Conservala per i tuoi archivi commerciali.";
		return LuxuryEmailHtml.build(
				"Ricevuta pagamento Premium",
				bodyHtml,
				details,
				profileUrl,
				"Gestisci abbonamento",
				LuxuryEmailHtml.supportFooter(),
				null);
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

	public static String buildPremiumPaymentFailedEmail(
			String salonName,
			String amountDetail,
			String profileUrl) {
		String amountRow = amountDetail != null && !amountDetail.isBlank()
				? LuxuryEmailHtml.detailRow("Importo non addebitato", amountDetail)
				: "";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Salone", salonName)
						+ amountRow
						+ "Aggiorna il metodo di pagamento per mantenere attivo Premium.");
		String bodyHtml =
				"Non siamo riusciti ad addebitare il rinnovo dell&apos;abbonamento Premium Saloni Luxury.";
		return LuxuryEmailHtml.build(
				"Pagamento Premium non riuscito",
				bodyHtml,
				details,
				profileUrl,
				"Aggiorna pagamento",
				LuxuryEmailHtml.supportFooter(),
				profileUrl);
	}

	public static String buildPremiumRenewalReminderEmail(
			String salonName,
			String renewOnDetail,
			String amountDetail,
			String profileUrl) {
		String renewRow = renewOnDetail != null && !renewOnDetail.isBlank()
				? LuxuryEmailHtml.detailRow("Data rinnovo", renewOnDetail)
				: "";
		String amountRow = amountDetail != null && !amountDetail.isBlank()
				? LuxuryEmailHtml.detailRow("Importo previsto", amountDetail)
				: "";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Salone", salonName) + renewRow + amountRow);
		String bodyHtml = "Ti ricordiamo che l&apos;abbonamento Premium si rinnoverà a breve.";
		return LuxuryEmailHtml.build(
				"Prossimo rinnovo Premium",
				bodyHtml,
				details,
				profileUrl,
				"Gestisci abbonamento",
				LuxuryEmailHtml.supportFooter(),
				null);
	}

	public static String buildSalonDeletionWarningEmail(
			String salonName,
			String deletionOnDetail,
			String profileUrl) {
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Salone", salonName)
						+ LuxuryEmailHtml.detailRow("Cancellazione prevista", deletionOnDetail)
						+ "Riattiva Premium prima di questa data per conservare il profilo del salone.");
		String bodyHtml =
				"Il periodo di grazia dopo la disdetta Premium sta per scadere. Senza riattivazione il profilo salone verrà cancellato.";
		return LuxuryEmailHtml.build(
				"Il salone verrà cancellato a breve",
				bodyHtml,
				details,
				profileUrl,
				"Riattiva Premium",
				LuxuryEmailHtml.supportFooter(),
				profileUrl);
	}

	public static String buildReviewInviteEmail(
			String salon,
			String service,
			String when,
			String reviewUrl) {
		String bodyHtml = "Grazie per la visita da <strong>"
				+ LuxuryEmailHtml.escapeHtml(salon)
				+ "</strong>. Lascia una breve recensione: aiuta altri clienti e il salone.";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Servizio", service)
						+ LuxuryEmailHtml.detailRow("Data", when));
		return LuxuryEmailHtml.build(
				"Com'è andata? Lascia una recensione",
				bodyHtml,
				details,
				reviewUrl,
				"Lascia una recensione",
				null,
				reviewUrl);
	}

	public static String buildBookingRequestRejectedEmail(
			String salon,
			String service,
			String weekday,
			String when,
			@Nullable String operatorName,
			String frontendBaseUrl) {
		String intro = operatorName != null && !operatorName.isBlank()
				? "<strong>" + LuxuryEmailHtml.escapeHtml(operatorName) + "</strong> non ha confermato la tua richiesta."
				: "<strong>" + LuxuryEmailHtml.escapeHtml(salon) + "</strong> non ha confermato la tua richiesta.";
		String details = bookingDetailsBox(service, weekday, when, salon);
		String ctaUrl = frontendBaseUrl + "/cerca";
		return LuxuryEmailHtml.build(
				"Richiesta non confermata",
				intro,
				details,
				ctaUrl,
				"Cerca un salone",
				null,
				null);
	}

	private static String bookingDetailsBox(String service, String weekday, String when, String salon) {
		return LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Servizio", service)
						+ LuxuryEmailHtml.detailRow("Giorno", weekday)
						+ LuxuryEmailHtml.detailRow("Data e ora", when)
						+ LuxuryEmailHtml.detailRow("Sede", salon));
	}
}
