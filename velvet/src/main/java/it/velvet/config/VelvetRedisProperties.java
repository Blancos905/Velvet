package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.redis")
public record VelvetRedisProperties(
		String host,
		int port,
		String password) {

	public VelvetRedisProperties {
		if (host == null || host.isBlank()) {
			host = "localhost";
		}
		if (port <= 0) {
			port = 6379;
		}
	}
}
