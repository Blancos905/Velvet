package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountLifecycleEmailHtmlTest {

	@Test
	void welcomeClient_includesExploreCta() {
		String html = AccountLifecycleEmailHtml.buildWelcomeEmail("Michele", false, "https://example.com/");
		assertThat(html).contains("Benvenuto su Saloni Luxury");
		assertThat(html).contains("Inizia a esplorare");
		assertThat(html).contains("cid:" + LuxuryEmailHtml.LOGO_CONTENT_ID);
	}

	@Test
	void welcomeOwner_includesSalonCta() {
		String html = AccountLifecycleEmailHtml.buildWelcomeEmail("Michele", true, "https://example.com/salone");
		assertThat(html).contains("Vai al salone");
	}

	@Test
	void accountDeleted_hasNoCta() {
		String html = AccountLifecycleEmailHtml.buildAccountDeletedEmail("Michele");
		assertThat(html).contains("Account eliminato");
		assertThat(html).contains("privacy@saloniluxury.it");
	}

	@Test
	void passwordChanged_includesSecurityNotice() {
		String html = AccountLifecycleEmailHtml.buildPasswordChangedEmail(
				"Michele", "https://example.com/account/profilo");
		assertThat(html).contains("Password aggiornata");
		assertThat(html).contains("Se non sei stato tu");
		assertThat(html).contains("Vai al profilo");
	}

	@Test
	void staffInvite_doesNotIncludePassword() {
		String html = AccountLifecycleEmailHtml.buildStaffInviteEmail(
				"Marco", "Hair Jassa", "staff@example.com", "https://example.com/account");
		assertThat(html).contains("Accesso staff creato");
		assertThat(html).contains("staff@example.com");
		assertThat(html).contains("non viene inviata via email");
		assertThat(html).doesNotContain("password=");
	}
}
