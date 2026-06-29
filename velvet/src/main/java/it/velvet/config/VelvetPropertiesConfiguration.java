package it.velvet.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
	VelvetSecurityProperties.class,
	VelvetNotificationProperties.class,
	VelvetMailProperties.class,
	VelvetSuperAdminProperties.class,
	VelvetFirebaseProperties.class,
	VelvetRedisProperties.class,
	VelvetSeoProperties.class,
	VelvetStripeProperties.class,
	VelvetBillingIssuerProperties.class,
	VelvetLoggingProperties.class,
	VelvetRegistrationProperties.class
})
public class VelvetPropertiesConfiguration {
}
