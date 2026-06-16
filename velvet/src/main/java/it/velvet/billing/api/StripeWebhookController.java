package it.velvet.billing.api;

import com.stripe.model.Event;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.billing.service.StripeWebhookProcessor;
import it.velvet.billing.service.StripeWebhookSignatureVerifier;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks/stripe")
@Tag(name = "Webhook Stripe")
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeWebhookController {

	private final StripeWebhookSignatureVerifier signatureVerifier;
	private final StripeWebhookProcessor webhookProcessor;

	public StripeWebhookController(
			StripeWebhookSignatureVerifier signatureVerifier,
			StripeWebhookProcessor webhookProcessor) {
		this.signatureVerifier = signatureVerifier;
		this.webhookProcessor = webhookProcessor;
	}

	@PostMapping
	@Operation(summary = "Riceve eventi Stripe (firma HMAC + idempotenza)")
	public ResponseEntity<Void> handleWebhook(
			@RequestBody String payload,
			@RequestHeader("Stripe-Signature") String stripeSignature,
			HttpServletRequest request) {
		Event event = signatureVerifier.constructEvent(payload, stripeSignature);
		webhookProcessor.process(event, payload, request);
		return ResponseEntity.ok().build();
	}
}
