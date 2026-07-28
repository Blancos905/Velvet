package it.luxury.config;

import it.luxury.security.auth.LuxuryBearerAuthenticationFilter;
import it.luxury.security.auth.LuxuryTokenService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class LuxuryAuthSecurityBeans {

	@Bean
	LuxuryBearerAuthenticationFilter luxuryBearerAuthenticationFilter(LuxuryTokenService tokenService) {
		return new LuxuryBearerAuthenticationFilter(tokenService);
	}

	@Bean
	PasswordEncoder luxuryPasswordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
