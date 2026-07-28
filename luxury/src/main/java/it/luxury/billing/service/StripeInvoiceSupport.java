package it.luxury.billing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.StripeException;
import com.stripe.model.Invoice;
import org.springframework.lang.Nullable;

/**
 * Estrae l'id subscription da fatture Stripe su webhook/API basil (campo {@code parent})
 * e versioni precedenti ({@code subscription} top-level).
 */
public final class StripeInvoiceSupport {

	private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

	private StripeInvoiceSupport() {
	}

	public static String resolveSubscriptionId(
			Invoice invoice,
			@Nullable String rawWebhookPayload,
			@Nullable com.stripe.StripeClient stripeClient) throws StripeException {
		String id = subscriptionFromInvoice(invoice);
		if (id != null) {
			return id;
		}
		id = extractSubscriptionIdFromWebhookPayload(rawWebhookPayload);
		if (id != null) {
			return id;
		}
		if (stripeClient != null && invoice != null && invoice.getId() != null && !invoice.getId().isBlank()) {
			Invoice refreshed = stripeClient.invoices().retrieve(invoice.getId().trim());
			return subscriptionFromInvoice(refreshed);
		}
		return null;
	}

	static String subscriptionFromInvoice(@Nullable Invoice invoice) {
		if (invoice == null) {
			return null;
		}
		return subscriptionFromInvoiceParent(invoice);
	}

	static String extractSubscriptionIdFromWebhookPayload(@Nullable String rawWebhookPayload) {
		if (rawWebhookPayload == null || rawWebhookPayload.isBlank()) {
			return null;
		}
		try {
			JsonNode object = OBJECT_MAPPER.readTree(rawWebhookPayload).path("data").path("object");
			if (object.isMissingNode() || object.isNull()) {
				return null;
			}
			JsonNode subscription = object.get("subscription");
			if (subscription != null && subscription.isTextual()) {
				String id = subscription.asText();
				if (!id.isBlank()) {
					return id.trim();
				}
			}
			JsonNode parent = object.get("parent");
			if (parent != null && parent.isObject()) {
				return subscriptionFromParentNode(parent);
			}
		}
		catch (JsonProcessingException ignored) {
			// payload malformato: i caller provano altri fallback
		}
		return null;
	}

	private static String subscriptionFromInvoiceParent(Invoice invoice) {
		var parent = invoice.getParent();
		if (parent == null || !"subscription_details".equals(parent.getType())) {
			return null;
		}
		var details = parent.getSubscriptionDetails();
		if (details == null) {
			return null;
		}
		String subscription = details.getSubscription();
		if (subscription != null && !subscription.isBlank()) {
			return subscription.trim();
		}
		return null;
	}

	private static String subscriptionFromParentNode(JsonNode parent) {
		if (!"subscription_details".equals(parent.path("type").asText(null))) {
			return null;
		}
		String id = parent.path("subscription_details").path("subscription").asText(null);
		if (id != null && !id.isBlank()) {
			return id.trim();
		}
		return null;
	}
}
