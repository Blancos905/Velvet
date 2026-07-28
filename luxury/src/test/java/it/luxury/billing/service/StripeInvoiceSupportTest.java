package it.luxury.billing.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class StripeInvoiceSupportTest {

	@Test
	void extractSubscriptionIdFromWebhookPayload_readsLegacyTopLevelField() {
		String payload = """
				{
				  "data": {
				    "object": {
				      "id": "in_test",
				      "subscription": "sub_legacy"
				    }
				  }
				}
				""";
		assertEquals("sub_legacy", StripeInvoiceSupport.extractSubscriptionIdFromWebhookPayload(payload));
	}

	@Test
	void extractSubscriptionIdFromWebhookPayload_readsParentSubscriptionDetails() {
		String payload = """
				{
				  "data": {
				    "object": {
				      "id": "in_test",
				      "parent": {
				        "type": "subscription_details",
				        "subscription_details": {
				          "subscription": "sub_parent"
				        }
				      }
				    }
				  }
				}
				""";
		assertEquals("sub_parent", StripeInvoiceSupport.extractSubscriptionIdFromWebhookPayload(payload));
	}

	@Test
	void extractSubscriptionIdFromWebhookPayload_returnsNullWhenMissing() {
		assertNull(StripeInvoiceSupport.extractSubscriptionIdFromWebhookPayload("""
				{"data":{"object":{"id":"in_test"}}}
				"""));
	}
}
