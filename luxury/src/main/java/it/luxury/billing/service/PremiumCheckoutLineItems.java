package it.luxury.billing.service;

import com.stripe.param.checkout.SessionCreateParams;

/**
 * Riga abbonamento Premium: 1 sede resta sul Price Stripe configurato (40 €);
 * da 2 sedi in su usa un importo unitario di fascia e quantity = numero sedi.
 */
public final class PremiumCheckoutLineItems {

	private PremiumCheckoutLineItems() {
	}

	public static SessionCreateParams.LineItem subscription(String premiumPriceId, int locationCount) {
		int count = SalonMultiLocationPricing.requireCount(locationCount);
		if (count == 1) {
			return SessionCreateParams.LineItem.builder()
					.setPrice(premiumPriceId)
					.setQuantity(1L)
					.build();
		}
		long unitCents = SalonMultiLocationPricing.unitAmountCents(count);
		return SessionCreateParams.LineItem.builder()
				.setQuantity((long) count)
				.setPriceData(
						SessionCreateParams.LineItem.PriceData.builder()
								.setCurrency("eur")
								.setUnitAmount(unitCents)
								.setRecurring(
										SessionCreateParams.LineItem.PriceData.Recurring.builder()
												.setInterval(SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH)
												.build())
								.setProductData(
										SessionCreateParams.LineItem.PriceData.ProductData.builder()
												.setName("Saloni Luxury Premium")
												.build())
								.build())
				.build();
	}
}
