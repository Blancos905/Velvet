package it.luxury.publicapi.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Indirizzo sede per ricerca / mini-sito (doc: {@code Location} con indirizzo, coordinate opzionali — §8.1 prodotto).
 * Obbligatorio in registrazione Premium. {@code displayName} — nome pubblico del salone.
 * Tipologia e pubblico, se presenti, valgono solo per questa sede.
 * {@code isEmpty()} non è un campo JSON: i payload già in coda contengono {@code "empty"} e vanno comunque letti.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RegistrationSalonLocation(
		String addressLine1,
		String postalCode,
		String city,
		String province,
		String country,
		String displayName,
		List<String> salonBusinessTypes,
		List<String> salonClientGenders
) {

	public RegistrationSalonLocation(
			String addressLine1,
			String postalCode,
			String city,
			String province,
			String country,
			String displayName) {
		this(addressLine1, postalCode, city, province, country, displayName, null, null);
	}

	public RegistrationSalonLocation withDisplayName(String displayName) {
		return new RegistrationSalonLocation(
				addressLine1(),
				postalCode(),
				city(),
				province(),
				country(),
				displayName,
				salonBusinessTypes(),
				salonClientGenders());
	}

	@JsonIgnore
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
