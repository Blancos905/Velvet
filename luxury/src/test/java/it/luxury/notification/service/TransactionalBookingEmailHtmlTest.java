package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionalBookingEmailHtmlTest {

	@Test
	void buildManageBookingEmail_includesButtonAndInlineLogo() {
		String html = TransactionalBookingEmailHtml.buildManageBookingEmail(
				"La tua prenotazione è confermata.",
				"Grazie per aver prenotato con Saloni Luxury.",
				"Hair Jassa",
				"Barba",
				"mercoledì",
				"mercoledì 10 giugno 2026, 13:30",
				"https://www.example.com/account/prenotazioni/abc-123",
				"Vedi prenotazione");

		assertThat(html).contains("Vedi prenotazione");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("https://www.example.com/account/prenotazioni/abc-123");
	}

	@Test
	void buildPremiumSubscriptionThankYouEmail_includesDetailsAndCta() {
		String html = TransactionalBookingEmailHtml.buildPremiumSubscriptionThankYouEmail(
				"Abbonamento Premium attivato.",
				"Hair Jassa",
				null,
				"23 luglio 2026",
				"https://www.example.com/account/profilo",
				"Gestisci abbonamento");

		assertThat(html).contains("Gestisci abbonamento");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("Hair Jassa");
		assertThat(html).contains("23 luglio 2026");
		assertThat(html).contains("Premium — tutte le funzionalità attive");
	}

	@Test
	void buildPremiumSubscriptionThankYouEmail_includesAmountWhenPaid() {
		String html = TransactionalBookingEmailHtml.buildPremiumSubscriptionThankYouEmail(
				"Pagamento Premium confermato.",
				"Salone Demo",
				"€ 29,00",
				"23 luglio 2026",
				"https://example.com/account/profilo",
				"Gestisci abbonamento");

		assertThat(html).contains("Importo addebitato:");
		assertThat(html).contains("€ 29,00");
	}

	@Test
	void buildPremiumSubscriptionCancellationEmail_includesAccessUntilAndCta() {
		String html = TransactionalBookingEmailHtml.buildPremiumSubscriptionCancellationEmail(
				"Disdetta Premium registrata.",
				"Hair Jassa",
				"attivo fino al 23 luglio 2026 alle 22:00",
				"Dopo la scadenza: abbonamento non attivo",
				"https://www.example.com/account/profilo",
				"Riattiva Premium");

		assertThat(html).contains("Riattiva Premium");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("Disdetta Premium registrata.");
		assertThat(html).contains("attivo fino al 23 luglio 2026 alle 22:00");
		assertThat(html).contains("abbonamento non attivo");
	}

	@Test
	void buildPremiumSubscriptionCancellationEmail_includesImmediateDeactivation() {
		String html = TransactionalBookingEmailHtml.buildPremiumSubscriptionCancellationEmail(
				"Abbonamento Premium disattivato.",
				"Salone Demo",
				"disattivato",
				"Abbonamento non attivo · profilo da riattivare",
				"https://example.com/account/profilo",
				"Riattiva Premium");

		assertThat(html).contains("disattivato");
		assertThat(html).contains("Abbonamento non attivo");
	}

	@Test
	void buildBookingUpdatedEmail_includesSalonAndCta() {
		String html = TransactionalBookingEmailHtml.buildBookingUpdatedEmail(
				"Hair Jassa",
				"Taglio",
				"mercoledì",
				"mercoledì 10 giugno 2026, 13:30",
				"https://www.example.com/account/prenotazioni/abc-123");

		assertThat(html).contains("Prenotazione aggiornata");
		assertThat(html).contains("Hair Jassa");
		assertThat(html).contains("Vedi prenotazione");
	}

	@Test
	void buildBookingCancelledEmail_distinguishesSalonCancellation() {
		String bySalon = TransactionalBookingEmailHtml.buildBookingCancelledEmail(
				true, "Hair Jassa", "Taglio", "lunedì", "lunedì 1 gennaio 2026, 10:00", "https://example.com");
		String byConsumer = TransactionalBookingEmailHtml.buildBookingCancelledEmail(
				false, "Hair Jassa", "Taglio", "lunedì", "lunedì 1 gennaio 2026, 10:00", "https://example.com");

		assertThat(bySalon).contains("annullata dal salone");
		assertThat(byConsumer).contains("Hai annullato");
		assertThat(bySalon).contains("Cerca un salone");
	}

	@Test
	void buildPremiumPaymentFailedEmail_includesCta() {
		String html = TransactionalBookingEmailHtml.buildPremiumPaymentFailedEmail(
				"Hair Jassa", "€ 29,00", "https://example.com/account/profilo");

		assertThat(html).contains("Pagamento Premium non riuscito");
		assertThat(html).contains("Aggiorna pagamento");
		assertThat(html).contains("€ 29,00");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
	}

	@Test
	void buildPremiumRenewalReminderEmail_includesDate() {
		String html = TransactionalBookingEmailHtml.buildPremiumRenewalReminderEmail(
				"Hair Jassa", "23 settembre 2026", "€ 29,00", "https://example.com/account/profilo");

		assertThat(html).contains("Prossimo rinnovo Premium");
		assertThat(html).contains("23 settembre 2026");
		assertThat(html).contains("Gestisci abbonamento");
	}

	@Test
	void buildSalonDeletionWarningEmail_includesDeletionDate() {
		String html = TransactionalBookingEmailHtml.buildSalonDeletionWarningEmail(
				"Hair Jassa", "23 ottobre 2026 alle 22:00", "https://example.com/account/profilo");

		assertThat(html).contains("verrà cancellato");
		assertThat(html).contains("23 ottobre 2026");
		assertThat(html).contains("Riattiva Premium");
	}

	@Test
	void buildReviewInviteEmail_includesReviewCta() {
		String html = TransactionalBookingEmailHtml.buildReviewInviteEmail(
				"Hair Jassa", "Barba", "mercoledì 10 giugno 2026, 13:30", "https://example.com/recensione?token=abc");

		assertThat(html).contains("Lascia una recensione");
		assertThat(html).contains("https://example.com/recensione?token=abc");
	}

	@Test
	void buildBookingRequestRejectedEmail_includesOperatorWhenPresent() {
		String html = TransactionalBookingEmailHtml.buildBookingRequestRejectedEmail(
				"Hair Jassa",
				"Barba",
				"mercoledì",
				"mercoledì 10 giugno 2026, 13:30",
				"Marco Rossi",
				"https://example.com");

		assertThat(html).contains("Marco Rossi");
		assertThat(html).contains("Richiesta non confermata");
		assertThat(html).contains("Cerca un salone");
	}
}
