package it.luxury.billing.config;

import it.luxury.config.LuxuryStripeProperties;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * Attiva i bean Stripe solo se {@link LuxuryStripeProperties#configured()} è vero
 * (billing enabled + secret key operativa + premium price id).
 */
public final class StripeBillingOperationalCondition implements Condition {

	@Override
	public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
		LuxuryStripeProperties properties = Binder.get(context.getEnvironment())
				.bind("luxury.billing", LuxuryStripeProperties.class)
				.orElse(null);
		return properties != null && properties.configured();
	}
}
