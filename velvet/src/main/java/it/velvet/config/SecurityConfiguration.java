package it.velvet.config;

import it.velvet.security.api.VelvetApiAccessDeniedHandler;
import it.velvet.security.api.VelvetApiAuthenticationEntryPoint;
import it.velvet.security.auth.VelvetBearerAuthenticationFilter;
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
			VelvetBearerAuthenticationFilter velvetBearerAuthenticationFilter,
			VelvetApiAuthenticationEntryPoint velvetApiAuthenticationEntryPoint,
			VelvetApiAccessDeniedHandler velvetApiAccessDeniedHandler,
			@Autowired(required = false) @Qualifier("velvetCorsConfigurationSource") CorsConfigurationSource velvetCors)
			throws Exception {
		http.csrf(AbstractHttpConfigurer::disable);
		http.headers(headers -> headers
				.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
				.referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
				.permissionsPolicy(p -> p.policy("geolocation=(), microphone=(), camera=()")));
		if (velvetCors != null) {
			http.cors(c -> c.configurationSource(velvetCors));
		}
		http.exceptionHandling(ex -> ex
				.authenticationEntryPoint(velvetApiAuthenticationEntryPoint)
				.accessDeniedHandler(velvetApiAccessDeniedHandler));
		http.addFilterBefore(velvetBearerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
		http.authorizeHttpRequests(auth -> auth
				.requestMatchers("/h2-console", "/h2-console/**").permitAll()
				.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
				.requestMatchers("/api/v1/admin/auth/**").permitAll()
				.requestMatchers("/api/v1/admin/status").permitAll()
				.requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_ADMIN")
				.requestMatchers("/api/v1/auth/**").permitAll()
				// Basta JWT valido: i ruoli sono controllati con @PreAuthorize sui singoli endpoint (evita 403 globale
				// se il token ha claim `roles` malformato ma l’utente è comunque autenticato).
				.requestMatchers("/api/v1/me/**").authenticated()
				.anyRequest().permitAll());
		return http.build();
	}
}
