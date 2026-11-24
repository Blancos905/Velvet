package it.luxury.publicapi.service;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Normalizzazione e validazione CAP/postcode per geocoding (Nominatim).
 * <ul>
 *   <li>{@code digits} — solo cifre, lunghezza fissa (IT, DE, FR, …)</li>
 *   <li>{@code freeform} — alfanumerico (GB, IE, NL, MT, CA, …)</li>
 * </ul>
 */
public final class PostalCodeFormats {

	private static final Set<String> FREEFORM = Set.of(
			"GB", "IE", "NL", "MT", "CA", "AR", "BN", "JM", "SZ", "VG", "AI", "BM", "KY", "TC");

	private static final Set<String> DIGITS_3 = Set.of("IS", "LS");
	private static final Set<String> DIGITS_4 = Set.of(
			"AT", "AU", "BE", "BG", "CH", "DK", "HU", "LI", "LU", "MD", "NO", "NZ", "SI");
	private static final Set<String> DIGITS_5 = Set.of(
			"AL", "BA", "CY", "CZ", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IT", "LT", "LV",
			"ME", "MK", "MX", "PL", "RS", "SE", "SK", "SM", "UA", "US", "XK", "DZ", "MA", "TN",
			"TR", "TH", "MY", "ID", "PH", "SA", "AE", "EG", "ZA", "CO", "PE", "CL", "CR",
			"DO", "GT", "HN", "NI", "PA", "PY", "UY", "VE", "KH", "LA", "MM", "NP", "PK", "LK",
			"BD", "KW", "OM", "QA", "BH", "JO", "LB", "IQ", "AF", "UZ", "KZ", "KG", "TJ",
			"TM", "MN", "KR", "TW", "HK", "MO", "FJ", "PG", "NC", "PF", "RE", "GP", "MQ",
			"GF", "YT", "PM", "WF", "TF", "BL", "MF", "SX", "CW", "AW", "TT", "BB", "GD",
			"LC", "VC", "AG", "KN", "DM", "BS", "HT", "CU", "PR", "VI", "AS", "GU", "MP", "FM",
			"MH", "PW", "UM", "AX", "FO", "GL", "SJ");
	private static final Set<String> DIGITS_6 = Set.of("IN", "RO", "SG", "RU", "BY", "AM", "AZ", "GE");
	private static final Set<String> DIGITS_7 = Set.of("PT", "JP", "IL");
	private static final Set<String> DIGITS_8 = Set.of("BR", "IR");
	private static final Set<String> DIGITS_9 = Set.of("CN");
	private PostalCodeFormats() {
	}

	public record NormalizedPostal(String value, boolean freeform, int exactLength) {
	}

	/** Paese ISO alpha-2 valido. */
	public static Optional<String> normalizeCountry(String countryCodeRaw) {
		if (countryCodeRaw == null) {
			return Optional.empty();
		}
		String cc = countryCodeRaw.trim().toUpperCase(Locale.ROOT);
		if (!cc.matches("^[A-Z]{2}$")) {
			return Optional.empty();
		}
		return Optional.of(cc);
	}

	/**
	 * Normalizza il postcode per il paese.
	 * @return empty se troppo corto / formato incompatibile per una lookup Nominatim
	 */
	public static Optional<NormalizedPostal> normalizeForLookup(String postalCodeRaw, String countryIso) {
		String country = countryIso.trim().toUpperCase(Locale.ROOT);
		if (isFreeform(country)) {
			String v = normalizeFreeform(postalCodeRaw);
			if (v.length() < 3) {
				return Optional.empty();
			}
			return Optional.of(new NormalizedPostal(v, true, 0));
		}
		int exact = exactDigitLength(country);
		String digits = postalCodeRaw != null ? postalCodeRaw.replaceAll("\\D", "") : "";
		if (exact > 0) {
			// US ZIP+4 → usa le prime 5
			if ("US".equals(country) && digits.length() == 9) {
				digits = digits.substring(0, 5);
			}
			// PT a volte digitato come 4 (Lisbona 1000) — accetta 4 o 7
			if ("PT".equals(country) && digits.length() == 4) {
				return Optional.of(new NormalizedPostal(digits, false, 4));
			}
			if (digits.length() != exact) {
				return Optional.empty();
			}
			return Optional.of(new NormalizedPostal(digits, false, exact));
		}
		// Default: 3–12 cifre (paesi non mappati)
		if (digits.length() < 3 || digits.length() > 12) {
			return Optional.empty();
		}
		return Optional.of(new NormalizedPostal(digits, false, digits.length()));
	}

	/** Prefisso minimo per suggerimenti CAP (mentre l’utente digita). */
	public static Optional<String> normalizeForSuggestPrefix(String postalCodeRaw, String countryIso) {
		String country = countryIso.trim().toUpperCase(Locale.ROOT);
		if (isFreeform(country)) {
			String v = normalizeFreeform(postalCodeRaw);
			return v.length() >= 2 ? Optional.of(v) : Optional.empty();
		}
		String digits = postalCodeRaw != null ? postalCodeRaw.replaceAll("\\D", "") : "";
		return digits.length() >= 2 ? Optional.of(digits) : Optional.empty();
	}

	public static boolean isFreeform(String countryIso) {
		return FREEFORM.contains(countryIso.trim().toUpperCase(Locale.ROOT));
	}

	public static int exactDigitLength(String countryIso) {
		String c = countryIso.trim().toUpperCase(Locale.ROOT);
		if (DIGITS_3.contains(c)) return 3;
		if (DIGITS_4.contains(c)) return 4;
		if (DIGITS_5.contains(c)) return 5;
		if (DIGITS_6.contains(c)) return 6;
		if (DIGITS_7.contains(c)) return 7;
		if (DIGITS_8.contains(c)) return 8;
		if (DIGITS_9.contains(c)) return 9;
		if (isFreeform(c)) return 0;
		return 5; // fallback comune (molti stati usano 5)
	}

	private static String normalizeFreeform(String raw) {
		if (raw == null) {
			return "";
		}
		// Maiuscole, spazi singoli, solo A-Z / 0-9 / spazio
		String cleaned = raw.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9\\s]", "");
		return cleaned.replaceAll("\\s+", " ").trim();
	}
}
