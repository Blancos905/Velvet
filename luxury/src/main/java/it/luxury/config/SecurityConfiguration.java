package it.luxury.config;

import it.luxury.security.api.LuxuryApiAccessDeniedHandler;
import it.luxury.security.api.LuxuryApiAuthenticationEntryPoint;
import it.luxury.security.auth.LuxuryBearerAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {

	@Bean
	SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			LuxuryBearerAuthenticationFilter luxuryBearerAuthenticationFilter,
			LuxuryApiAuthenticationEntryPoint luxuryApiAuthenticationEntryPoint,
			LuxuryApiAccessDeniedHandler luxuryApiAccessDeniedHandler,
			@Autowired(required = false) @Qualifier("luxuryCorsConfigurationSource") CorsConfigurationSource luxuryCors)
			throws Exception {
		http.csrf(AbstractHttpConfigurer::disable);
		http.headers(headers -> headers
				.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
				.referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
				.permissionsPolicy(p -> p.policy("geolocation=(self), microphone=(), camera=()")));
		if (luxuryCors != null) {
			http.cors(c -> c.configurationSource(luxuryCors));
		}
		http.exceptionHandling(ex -> ex
				.authenticationEntryPoint(luxuryApiAuthenticationEntryPoint)
				.accessDeniedHandler(luxuryApiAccessDeniedHandler));
		http.addFilterBefore(luxuryBearerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
		http.authorizeHttpRequests(auth -> auth
				.requestMatchers("/h2-console", "/h2-console/**").permitAll()
				.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
				.requestMatchers("/api/v1/admin/auth/**").permitAll()
				.requestMatchers("/api/v1/admin/status").permitAll()
				.requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_ADMIN")
				.requestMatchers("/api/v1/auth/**").permitAll()
				.requestMatchers("/api/v1/public/health", "/api/v1/public/health/**").permitAll()
				.requestMatchers("/api/v1/webhooks/stripe").permitAll()
				// Basta JWT valido: i ruoli sono controllati con @PreAuthorize sui singoli endpoint (evita 403 globale
				// se il token ha claim `roles` malformato ma l’utente è comunque autenticato).
				.requestMatchers("/api/v1/me/**").authenticated()
				.requestMatchers("/api/v1/services", "/api/v1/operators").authenticated()
				.requestMatchers("/api/v1/clients", "/api/v1/clients/**").authenticated()
				.anyRequest().permitAll());
		return http.build();
	}
}
