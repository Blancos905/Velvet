package it.velvet.billing.service;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetStripeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeWebhookSignatureVerifier {

	private final VelvetStripeProperties stripeProperties;

	public StripeWebhookSignatureVerifier(VelvetStripeProperties stripeProperties) {
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
