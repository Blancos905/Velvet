package it.velvet.publicapi.seo;

import it.velvet.config.VelvetNotificationProperties;
import it.velvet.config.VelvetSeoProperties;
import org.springframework.stereotype.Component;

@Component
public class SalonSeoSiteContext {

	private final VelvetSeoProperties seoProperties;
	private final VelvetNotificationProperties notificationProperties;

	public SalonSeoSiteContext(VelvetSeoProperties seoProperties, VelvetNotificationProperties notificationProperties) {
		this.seoProperties = seoProperties;
		this.notificationProperties = notificationProperties;
	}

	public String siteBaseUrl() {
		String configured = seoProperties.siteBaseUrl();
		if (configured != null && !configured.isBlank()) {
			return normalizeSiteBaseUrl(configured);
		}
		return normalizeSiteBaseUrl(notificationProperties.getFrontendBaseUrl());
	}

	public String absolutePath(String path) {
		String base = siteBaseUrl();
		if (path == null || path.isBlank()) {
			return base;
		}
		String normalized = path.startsWith("/") ? path : "/" + path;
		return base + normalized;
	}

	static String normalizeSiteBaseUrl(String siteBaseUrl) {
		if (siteBaseUrl == null || siteBaseUrl.isBlank()) {
			return "http://localhost:5173";
		}
		String trimmed = siteBaseUrl.trim();
		while (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}
}
