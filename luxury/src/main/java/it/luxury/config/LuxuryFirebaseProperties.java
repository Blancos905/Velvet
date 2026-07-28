package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.firebase")
public record LuxuryFirebaseProperties(
		Boolean enabled,
		String serviceAccountResource,
		String serviceAccountPath) {

	public LuxuryFirebaseProperties {
		if (enabled == null) {
			enabled = true;
		}
		if (serviceAccountResource == null || serviceAccountResource.isBlank()) {
			serviceAccountResource = "firebase-service-account.json";
		}
	}
}
