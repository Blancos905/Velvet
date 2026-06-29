package it.velvet.config;

import it.velvet.security.auth.VelvetBearerAuthenticationFilter;
import it.velvet.security.auth.VelvetTokenService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class VelvetAuthSecurityBeans {

	@Bean
	VelvetBearerAuthenticationFilter velvetBearerAuthenticationFilter(VelvetTokenService tokenService) {
		return new VelvetBearerAuthenticationFilter(tokenService);
	}

	@Bean
	PasswordEncoder velvetPasswordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
