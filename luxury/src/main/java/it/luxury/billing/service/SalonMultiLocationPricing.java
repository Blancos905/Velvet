package it.luxury.billing.service;

/**
 * Listino Premium per numero di sedi, allineato a {@code salonLocationPricing.ts}.
 * Importo unitario mensile: 1 sede 40 €, 2 sedi 35 €, da 3 sedi 30 €. Il totale è unitario × sedi.
 */
public final class SalonMultiLocationPricing {

	public static final int MAX_LOCATIONS = 20;

	public static final int ONE_LOCATION_UNIT_CENTS = 4_000;

	public static final int TWO_LOCATIONS_UNIT_CENTS = 3_500;

	public static final int THREE_OR_MORE_UNIT_CENTS = 3_000;

	private SalonMultiLocationPricing() {
	}

	public static int unitAmountCents(int locationCount) {
		int count = requireCount(locationCount);
		if (count <= 1) {
			return ONE_LOCATION_UNIT_CENTS;
		}
		if (count == 2) {
			return TWO_LOCATIONS_UNIT_CENTS;
		}
		return THREE_OR_MORE_UNIT_CENTS;
	}

	public static int monthlyTotalCents(int locationCount) {
		int count = requireCount(locationCount);
		return unitAmountCents(count) * count;
	}

	public static int requireCount(int locationCount) {
		if (locationCount < 1 || locationCount > MAX_LOCATIONS) {
			throw new IllegalArgumentException("Numero sedi non valido: " + locationCount);
		}
		return locationCount;
	}
}
