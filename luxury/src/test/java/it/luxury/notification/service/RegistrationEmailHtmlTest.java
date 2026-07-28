package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RegistrationEmailHtmlTest {

	@Test
	void buildVerificationEmail_includesInlineTextLinkAndBulletproofButton() {
		String url = "https://www.example.com/conferma-email?token=abc&audience=client&plan=PREMIUM";
		String html = RegistrationEmailHtml.buildVerificationEmail(
				"Michele",
				url,
				RegistrationEmailAudience.CLIENT);

		assertThat(html).contains("Conferma email");
		assertThat(html).contains("href=\"" + url + "\"");
	}

	@Test
	void buildVerificationEmail_includesButtonLogoAndDarkTheme() {
		String html = RegistrationEmailHtml.buildVerificationEmail(
				"Michele",
				"https://www.example.com/conferma-email?token=abc123",
				RegistrationEmailAudience.CLIENT);

		assertThat(html).contains("Conferma email");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("border-radius:999px");
		assertThat(html).contains("https://www.example.com/conferma-email?token=abc123");
	}

	@Test
	void buildVerificationEmail_salonOwnerUsesSalonCopy() {
		String html = RegistrationEmailHtml.buildVerificationEmail(
				"Mario",
				"https://www.example.com/conferma-email?token=abc",
				RegistrationEmailAudience.SALON_OWNER);

		assertThat(html).contains("Conferma l'email del tuo salone");
		assertThat(html).contains("registrato il tuo salone");
	}

	@Test
	void buildPremiumCheckoutEmail_includesPaymentCta() {
		String html = RegistrationEmailHtml.buildPremiumCheckoutEmail(
				"Mario", "https://www.example.com/registrazione/checkout?token=xyz");

		assertThat(html).contains("Attiva il piano Premium");
		assertThat(html).contains("Completa pagamento Premium");
		assertThat(html).contains("cid:" + TransactionalBookingEmailHtml.LOGO_CONTENT_ID);
	}

	@Test
	void buildVerificationEmail_escapesHtmlInGreeting() {
		String html = RegistrationEmailHtml.buildVerificationEmail(
				"Nome <script>",
				"https://example.com/conferma-email?token=abc",
				RegistrationEmailAudience.CLIENT);

		assertThat(html).contains("Nome &lt;script&gt;");
		assertThat(html).doesNotContain("<script>");
	}
}
