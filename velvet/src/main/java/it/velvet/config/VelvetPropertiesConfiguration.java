package it.velvet.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
	VelvetSecurityProperties.class,
	VelvetNotificationProperties.class,
	VelvetSuperAdminProperties.class
})
public class VelvetPropertiesConfiguration {
}
