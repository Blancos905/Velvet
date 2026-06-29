package it.velvet.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import it.velvet.security.api.VelvetAuthRateLimitFilter;

@Configuration
public class VelvetSecurityHeadersConfiguration {

	@Bean
	FilterRegistrationBean<VelvetAuthRateLimitFilter> velvetAuthRateLimitFilterRegistration(VelvetAuthRateLimitFilter filter) {
		FilterRegistrationBean<VelvetAuthRateLimitFilter> bean = new FilterRegistrationBean<>(filter);
		bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
		return bean;
	}
}
