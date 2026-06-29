package it.velvet.billing.config;

import com.stripe.StripeClient;
import it.velvet.config.VelvetStripeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeClientConfiguration {

	@Bean
	StripeClient stripeClient(VelvetStripeProperties properties) {
		if (!properties.configured()) {
			throw new IllegalStateException(
					"velvet.billing.enabled=true richiede velvet.billing.secret-key e velvet.billing.premium-price-id");
		}
		return new StripeClient(properties.secretKey());
	}
}
