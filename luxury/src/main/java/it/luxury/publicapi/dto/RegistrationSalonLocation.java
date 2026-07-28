package it.luxury.publicapi.dto;

/**
 * Indirizzo sede per ricerca / mini-sito (doc: {@code Location} con indirizzo, coordinate opzionali — §8.1 prodotto).
 * Obbligatorio per piano {@code BASE}. {@code displayName} — nome pubblico del salone (vetrina / ricerca).
 */
public record RegistrationSalonLocation(
		String addressLine1,
		String postalCode,
		String city,
		String province,
		String country,
		String displayName
) {

	public RegistrationSalonLocation withDisplayName(String displayName) {
		return new RegistrationSalonLocation(addressLine1(), postalCode(), city(), province(), country(), displayName);
	}

	public boolean isEmpty() {
		return blank(addressLine1())
				&& blank(postalCode())
				&& blank(city())
				&& blank(province())
				&& blank(country());
	}

	private static boolean blank(String s) {
		return s == null || s.trim().isEmpty();
	}
}
