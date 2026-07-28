package it.luxury.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
	LuxurySecurityProperties.class,
	LuxuryNotificationProperties.class,
	LuxuryMailProperties.class,
	LuxurySuperAdminProperties.class,
	LuxuryFirebaseProperties.class,
	LuxuryRedisProperties.class,
	LuxurySeoProperties.class,
	LuxuryStripeProperties.class,
	LuxuryStripeCheckoutBrandingProperties.class,
	LuxuryBillingIssuerProperties.class,
	LuxuryLoggingProperties.class,
	LuxuryRegistrationProperties.class
})
public class LuxuryPropertiesConfiguration {
}
