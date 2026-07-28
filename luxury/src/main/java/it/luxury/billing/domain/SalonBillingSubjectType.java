package it.luxury.billing.domain;

import java.util.Locale;

/** Tipo intestatario fattura (Italia). */
public enum SalonBillingSubjectType {
	COMPANY,
	INDIVIDUAL;

	public static SalonBillingSubjectType parseOrNull(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return switch (raw.trim().toUpperCase(Locale.ROOT)) {
			case "COMPANY", "SOCIETA", "AZIENDA" -> COMPANY;
			case "INDIVIDUAL", "PERSONA_FISICA", "PERSONA" -> INDIVIDUAL;
			default -> null;
		};
	}
}
