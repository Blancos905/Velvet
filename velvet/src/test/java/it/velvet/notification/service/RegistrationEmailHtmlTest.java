package it.velvet.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RegistrationEmailHtmlTest {

	@Test
	void buildVerificationEmail_includesButtonLogoAndDarkTheme() {
		String html = RegistrationEmailHtml.buildVerificationEmail(
				"Michele",
				"https://www.example.com/conferma-email?token=abc123");

		assertThat(html).contains("Conferma email");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("border-radius:999px");
		assertThat(html).contains("https://www.example.com/conferma-email?token=abc123");
		assertThat(html).contains("Michele");
	}

	@Test
	void buildVerificationEmail_escapesHtmlInGreeting() {
		String html = RegistrationEmailHtml.buildVerificationEmail(
				"Nome <script>",
				"https://example.com");

		assertThat(html).contains("Nome &lt;script&gt;");
		assertThat(html).doesNotContain("<script>");
	}
}
