package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.redis")
public record LuxuryRedisProperties(
		String host,
		int port,
		String password) {

	public LuxuryRedisProperties {
		if (host == null || host.isBlank()) {
			host = "localhost";
		}
		if (port <= 0) {
			port = 6379;
		}
	}
}
