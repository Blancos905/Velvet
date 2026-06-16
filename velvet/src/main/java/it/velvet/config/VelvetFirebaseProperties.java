package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.firebase")
public record VelvetFirebaseProperties(
		Boolean enabled,
		String serviceAccountResource,
		String serviceAccountPath) {

	public VelvetFirebaseProperties {
		if (enabled == null) {
			enabled = true;
		}
		if (serviceAccountResource == null || serviceAccountResource.isBlank()) {
			serviceAccountResource = "firebase-service-account.json";
		}
	}
}
