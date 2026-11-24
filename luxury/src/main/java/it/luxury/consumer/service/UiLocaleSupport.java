package it.luxury.consumer.service;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Lingue UI supportate dal frontend Luxury (`it`, `en`, `fr`, `de`, `es`, `pt`). */
public final class UiLocaleSupport {

	private static final Pattern SUPPORTED = Pattern.compile("^(it|en|fr|de|es|pt)$");

	private static final Map<String, String> COUNTRY_TO_LOCALE = Map.ofEntries(
			Map.entry("IT", "it"),
			Map.entry("SM", "it"),
			Map.entry("VA", "it"),
			Map.entry("GB", "en"),
			Map.entry("IE", "en"),
			Map.entry("US", "en"),
			Map.entry("AU", "en"),
			Map.entry("NZ", "en"),
			Map.entry("MT", "en"),
			Map.entry("CA", "en"),
			Map.entry("FR", "fr"),
			Map.entry("BE", "fr"),
			Map.entry("LU", "fr"),
			Map.entry("MC", "fr"),
			Map.entry("DE", "de"),
			Map.entry("AT", "de"),
			Map.entry("LI", "de"),
			Map.entry("CH", "de"),
			Map.entry("ES", "es"),
			Map.entry("PT", "pt"),
			Map.entry("BR", "pt"));

	private UiLocaleSupport() {}

	public static String normalizePreferredLocale(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String v = raw.trim().toLowerCase(Locale.ROOT);
		return SUPPORTED.matcher(v).matches() ? v : null;
	}

	public static String localeFromCountryCode(String countryCode) {
		if (countryCode == null || countryCode.isBlank()) {
			return "it";
		}
		String cc = countryCode.trim().toUpperCase(Locale.ROOT);
		return COUNTRY_TO_LOCALE.getOrDefault(cc, "en");
	}

	public static String resolvePreferredLocale(String preferredLocale, String countryCode) {
		String normalized = normalizePreferredLocale(preferredLocale);
		if (normalized != null) {
			return normalized;
		}
		return localeFromCountryCode(countryCode);
	}
}
