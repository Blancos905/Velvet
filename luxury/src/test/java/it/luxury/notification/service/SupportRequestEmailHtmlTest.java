package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SupportRequestEmailHtmlTest {

	@Test
	void build_includesRequesterAndMessage() {
		String html = SupportRequestEmailHtml.build(
				"Problema prenotazione",
				"Non vedo l'appuntamento in agenda.",
				"Michele",
				"michele@example.com",
				"ROLE_CLIENT",
				false);

		assertThat(html).contains("Richiesta assistenza");
		assertThat(html).contains("Michele");
		assertThat(html).contains("michele@example.com");
		assertThat(html).contains("Problema prenotazione");
		assertThat(html).contains("Non vedo l'appuntamento");
		assertThat(html).contains("cid:" + LuxuryEmailHtml.LOGO_CONTENT_ID);
	}
}
