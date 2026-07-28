package it.luxury.billing.config;

import com.stripe.StripeClient;
import it.luxury.config.LuxuryStripeProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnStripeBillingOperational
public class StripeClientConfiguration {

	@Bean
	StripeClient stripeClient(LuxuryStripeProperties properties) {
		return new StripeClient(properties.secretKey());
	}
}
