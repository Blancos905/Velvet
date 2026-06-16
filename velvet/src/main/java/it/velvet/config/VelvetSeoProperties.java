package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.seo")
public record VelvetSeoProperties(
		/** Directory con la build SPA (es. {@code /app/web} in Docker). Se vuota, usa il template classpath. */
		String webStaticRoot,
		/** URL pubblico del sito per canonical e JSON-LD (es. {@code https://www.saloniluxury.it}). */
		String siteBaseUrl) {

	public VelvetSeoProperties {
		if (webStaticRoot == null) {
			webStaticRoot = "";
		}
		if (siteBaseUrl == null) {
			siteBaseUrl = "";
		}
	}
}
