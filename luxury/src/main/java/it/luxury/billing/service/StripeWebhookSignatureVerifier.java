package it.luxury.billing.service;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryStripeProperties;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnStripeBillingOperational
public class StripeWebhookSignatureVerifier {

	private final LuxuryStripeProperties stripeProperties;

	public StripeWebhookSignatureVerifier(LuxuryStripeProperties stripeProperties) {
		this.stripeProperties = stripeProperties;
	}

	public Event constructEvent(String payload, String signatureHeader) {
		String secret = stripeProperties.webhookSecret();
		if (secret == null || secret.isBlank()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_MISCONFIGURED", "Webhook Stripe non configurato.");
		}
		try {
			return Webhook.constructEvent(payload, signatureHeader, secret);
		}
		catch (SignatureVerificationException ex) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "STRIPE_SIGNATURE_INVALID", "Firma webhook Stripe non valida.");
		}
	}
}
