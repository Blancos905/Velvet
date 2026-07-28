package it.luxury.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import it.luxury.security.api.LuxuryAuthRateLimitFilter;

@Configuration
public class LuxurySecurityHeadersConfiguration {

	@Bean
	FilterRegistrationBean<LuxuryAuthRateLimitFilter> luxuryAuthRateLimitFilterRegistration(LuxuryAuthRateLimitFilter filter) {
		FilterRegistrationBean<LuxuryAuthRateLimitFilter> bean = new FilterRegistrationBean<>(filter);
		bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
		return bean;
	}
}
