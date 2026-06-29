package it.velvet.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionalBookingEmailHtmlTest {

	@Test
	void buildManageBookingEmail_includesButtonAndInlineLogo() {
		String html = TransactionalBookingEmailHtml.buildManageBookingEmail(
				"La tua prenotazione è confermata.",
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
				"Dopo la scadenza: piano Free",
				"https://www.example.com/account/profilo",
				"Riattiva Premium");

		assertThat(html).contains("Riattiva Premium");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("Disdetta Premium registrata.");
		assertThat(html).contains("attivo fino al 23 luglio 2026 alle 22:00");
		assertThat(html).contains("piano Free");
	}

	@Test
	void buildPremiumSubscriptionCancellationEmail_includesImmediateDeactivation() {
		String html = TransactionalBookingEmailHtml.buildPremiumSubscriptionCancellationEmail(
				"Abbonamento Premium disattivato.",
				"Salone Demo",
				"disattivato",
				"Piano attuale: Free",
				"https://example.com/account/profilo",
				"Riattiva Premium");

		assertThat(html).contains("disattivato");
		assertThat(html).contains("Piano attuale: Free");
	}

	@Test
	void buildManageBookingEmail_escapesHtmlInSalonName() {
		String html = TransactionalBookingEmailHtml.buildManageBookingEmail(
				"Confermata.",
				"Salone <script>",
				"Taglio",
				"lunedì",
				"lunedì 1 gennaio 2026, 10:00",
				"https://example.com",
				"Gestisci");

		assertThat(html).contains("Salone &lt;script&gt;");
		assertThat(html).doesNotContain("<script>");
	}
}
