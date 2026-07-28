package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.seo")
public record LuxurySeoProperties(
		/** Directory con la build SPA (es. {@code /app/web} in Docker). Se vuota, usa il template classpath. */
		String webStaticRoot,
		/** URL pubblico del sito per canonical e JSON-LD (es. {@code https://www.saloniluxury.it}). */
		String siteBaseUrl) {

	public LuxurySeoProperties {
		if (webStaticRoot == null) {
			webStaticRoot = "";
		}
		if (siteBaseUrl == null) {
			siteBaseUrl = "";
		}
	}
}
