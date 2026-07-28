package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalonLuxuryChatEmailHtmlTest {

	@Test
	void build_usesSharedLuxuryStyle() {
		String html = SalonLuxuryChatEmailHtml.build(
				"Ciao dal salone",
				"https://app.saloniluxury.it/account/chat?salonClientId=abc");

		assertThat(html).contains("cid:" + LuxuryEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("Nuovo messaggio in chat");
		assertThat(html).contains("Ciao dal salone");
		assertThat(html).contains("Apri la conversazione");
	}
}
