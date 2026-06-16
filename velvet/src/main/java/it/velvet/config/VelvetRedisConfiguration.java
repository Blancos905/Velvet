package it.velvet.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
@ConditionalOnProperty(name = "velvet.security.refresh-token-store", havingValue = "redis")
@EnableConfigurationProperties(VelvetRedisProperties.class)
public class VelvetRedisConfiguration {

	@Bean
	RedisConnectionFactory velvetRedisConnectionFactory(VelvetRedisProperties properties) {
		RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(properties.host(), properties.port());
		if (properties.password() != null && !properties.password().isBlank()) {
			config.setPassword(RedisPassword.of(properties.password()));
		}
		return new LettuceConnectionFactory(config);
	}

	@Bean
	StringRedisTemplate velvetStringRedisTemplate(RedisConnectionFactory velvetRedisConnectionFactory) {
		return new StringRedisTemplate(velvetRedisConnectionFactory);
	}
}
