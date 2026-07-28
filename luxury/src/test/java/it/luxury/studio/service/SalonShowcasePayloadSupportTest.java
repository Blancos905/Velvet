package it.luxury.studio.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalonShowcasePayloadSupportTest {

	@Test
	void resolveHitVisualDataUrl_prefersLogo() {
		String payload =
				"""
				{"logoDataUrl":"data:image/png;base64,logo","siteImageDataUrls":["data:image/png;base64,site"]}
				""";
		assertThat(SalonShowcasePayloadSupport.resolveHitVisualDataUrl(payload))
				.isEqualTo("data:image/png;base64,logo");
	}

	@Test
	void resolveHitVisualDataUrl_fallsBackToSiteImages() {
		String payload =
				"""
				{"logoDataUrl":null,"siteImageDataUrls":[null,"","data:image/png;base64,site"]}
				""";
		assertThat(SalonShowcasePayloadSupport.resolveHitVisualDataUrl(payload))
				.isEqualTo("data:image/png;base64,site");
	}

	@Test
	void resolveHitVisualDataUrl_returnsNullForInvalidJson() {
		assertThat(SalonShowcasePayloadSupport.resolveHitVisualDataUrl("not-json")).isNull();
	}
}
