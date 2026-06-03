package it.velvet.config;

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
 * CORS opzionale per SPA su dominio diverso dall’API (es. produzione). In dev, il proxy Vite evita il bisogno.
 */
@Configuration
public class VelvetCorsConfiguration {

	@Bean(name = "velvetCorsConfigurationSource")
	@ConditionalOnProperty(prefix = "velvet.cors", name = "allowed-origins")
	CorsConfigurationSource velvetCorsConfigurationSource(
			@Value("${velvet.cors.allowed-origins}") String allowedOrigins) {
		CorsConfiguration config = new CorsConfiguration();
		long n = Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.peek(config::addAllowedOriginPattern)
				.count();
		if (n == 0) {
			throw new IllegalStateException(
					"velvet.cors.allowed-origins è valorizzato ma non contiene origini valide dopo il trim.");
		}
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(false);
		config.setMaxAge(3600L);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", config);
		return source;
	}
}
