package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.security")
public record LuxurySecurityProperties(
		String tokenSecret,
		String authJwtSecret,
		Integer authJwtTtlHours,
		Integer authAccessTtlMinutes,
		Integer refreshTokenTtlDays,
		Boolean rateLimitEnabled,
		Integer rateLimitRequestsPerMinute,
		int reviewTokenTtlDays) {

	public LuxurySecurityProperties {
		if (tokenSecret == null || tokenSecret.isBlank()) {
			tokenSecret = "luxury-dev-token-secret-change-in-production";
		}
		if (authJwtSecret == null || authJwtSecret.isBlank()) {
			authJwtSecret = tokenSecret;
		}
		if (authJwtTtlHours == null || authJwtTtlHours <= 0) {
			authJwtTtlHours = 24;
		}
		if (authAccessTtlMinutes == null || authAccessTtlMinutes <= 0) {
			authAccessTtlMinutes = 15;
		}
		if (refreshTokenTtlDays == null || refreshTokenTtlDays <= 0) {
			refreshTokenTtlDays = 30;
		}
		if (rateLimitEnabled == null) {
			rateLimitEnabled = true;
		}
		if (rateLimitRequestsPerMinute == null || rateLimitRequestsPerMinute <= 0) {
			rateLimitRequestsPerMinute = 30;
		}
		if (reviewTokenTtlDays <= 0) {
			reviewTokenTtlDays = 30;
		}
	}

	public long accessTokenTtlSeconds() {
		return authAccessTtlMinutes() * 60L;
	}
}
