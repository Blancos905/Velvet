package it.luxury.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS per SPA / WebView dev e produzione cross-host.
 * In dev con proxy Vite le fetch sono same-origin; serve se il browser chiama :8080 direttamente.
 */
@Configuration
public class LuxuryCorsConfiguration {

	@Bean(name = "luxuryCorsConfigurationSource")
	@ConditionalOnProperty(prefix = "luxury.cors", name = "allowed-origins")
	CorsConfigurationSource luxuryCorsConfigurationSource(
			@Value("${luxury.cors.allowed-origins}") String allowedOrigins) {
		CorsConfiguration config = new CorsConfiguration();
		long n = Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.peek(config::addAllowedOriginPattern)
				.count();
		if (n == 0) {
			throw new IllegalStateException(
					"luxury.cors.allowed-origins è valorizzato ma non contiene origini valide dopo il trim.");
		}
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
		config.setAllowedHeaders(List.of(
				"Authorization",
				"Content-Type",
				"Accept",
				"Accept-Language",
				"Origin",
				"X-Requested-With",
				"X-Luxury-Frontend-Origin",
				"X-Location-Id"));
		config.setExposedHeaders(List.of("Authorization"));
		config.setAllowCredentials(true);
		config.setMaxAge(3600L);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", config);
		return source;
	}
}
