package it.luxury.billing.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.context.annotation.Conditional;

/**
 * Bean Stripe attivi solo se billing è abilitato e le chiavi sono operative
 * ({@code sk_test_}, {@code rkcs_test_} sandbox CLI, {@code sk_live_} + price id).
 *
 * <p>La logica è in {@link StripeBillingOperationalCondition} (stessa di
 * {@link it.luxury.config.LuxuryStripeProperties#configured()}), non in SpEL:
 * evita falsi positivi dell'editor Eclipse/STS su {@code .matches(...)}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Conditional(StripeBillingOperationalCondition.class)
public @interface ConditionalOnStripeBillingOperational {
}
