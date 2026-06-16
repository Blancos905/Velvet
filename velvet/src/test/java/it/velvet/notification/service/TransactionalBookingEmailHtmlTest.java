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
