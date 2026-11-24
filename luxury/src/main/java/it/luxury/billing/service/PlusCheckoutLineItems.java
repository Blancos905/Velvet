package it.luxury.billing.service;

import com.stripe.param.checkout.SessionCreateParams;

/**
 * Abbonamento Plus: 60 € al mese, importo fisso. Non usa il listino per sede del Premium.
 */
public final class PlusCheckoutLineItems {

	public static final long MONTHLY_AMOUNT_CENTS = 6_000L;

	private PlusCheckoutLineItems() {
	}

	public static SessionCreateParams.LineItem flatMonthly() {
		return SessionCreateParams.LineItem.builder()
				.setQuantity(1L)
				.setPriceData(
						SessionCreateParams.LineItem.PriceData.builder()
								.setCurrency("eur")
								.setUnitAmount(MONTHLY_AMOUNT_CENTS)
								.setRecurring(
										SessionCreateParams.LineItem.PriceData.Recurring.builder()
												.setInterval(SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH)
												.build())
								.setProductData(
										SessionCreateParams.LineItem.PriceData.ProductData.builder()
												.setName("Saloni Luxury Plus")
												.build())
								.build())
				.build();
	}
}
