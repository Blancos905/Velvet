package it.luxury.notification.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetEmailHtmlTest {

	@Test
	void buildResetEmail_containsCtaAndFallbackLink() {
		String html = PasswordResetEmailHtml.buildResetEmail("Michele", "https://saloniluxury.it/reimposta-password?token=abc");
		assertThat(html).contains("Reimposta la password");
		assertThat(html).contains("Michele");
		assertThat(html).contains("https://saloniluxury.it/reimposta-password?token=abc");
		assertThat(html).contains("Reimposta password");
	}
}
