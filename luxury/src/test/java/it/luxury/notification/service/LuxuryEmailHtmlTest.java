package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LuxuryEmailHtmlTest {

	@Test
	void build_preservesRawAmpersandInHrefForEmailClients() {
		String url = "https://example.com/open?token=abc&audience=salon&plan=PREMIUM";
		String html = LuxuryEmailHtml.build(
				"Conferma",
				"Testo.",
				null,
				url,
				"Conferma email",
				null,
				url);

		assertThat(html).contains("href=\"" + url + "\"");
		assertThat(html).doesNotContain("audience=salon&amp;plan");
		assertThat(html).contains("role=\"presentation\"");
	}

	@Test
	void build_includesSharedShellAndLogo() {
		String html = LuxuryEmailHtml.build(
				"Titolo di prova",
				"Corpo del messaggio.",
				LuxuryEmailHtml.detailsBox(LuxuryEmailHtml.detailRow("Campo", "Valore")),
				"https://example.com/azione",
				"Azione",
				LuxuryEmailHtml.supportFooter(),
				null);

		assertThat(html).contains("cid:" + LuxuryEmailHtml.LOGO_CONTENT_ID);
		assertThat(html).contains("background:#1c1814");
		assertThat(html).contains("Saloni Luxury");
		assertThat(html).contains("Titolo di prova");
		assertThat(html).contains("Corpo del messaggio.");
		assertThat(html).contains("Azione");
		assertThat(html).contains("supporto@saloniluxury.it");
	}

	@Test
	void build_includesFallbackLinkWhenProvided() {
		String html = LuxuryEmailHtml.build(
				"Conferma",
				"Testo.",
				null,
				"https://example.com/confirm",
				"Conferma",
				null,
				"https://example.com/confirm");

		assertThat(html).contains("Se il pulsante non funziona");
		assertThat(html).contains("https://example.com/confirm");
	}

	@Test
	void quotePreviewBox_escapesHtml() {
		String html = LuxuryEmailHtml.quotePreviewBox("<script>alert(1)</script>");

		assertThat(html).contains("&lt;script&gt;");
		assertThat(html).doesNotContain("<script>");
	}
}
