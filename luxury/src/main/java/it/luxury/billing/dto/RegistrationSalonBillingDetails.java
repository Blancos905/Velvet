package it.luxury.billing.dto;

/**
 * Dati fatturazione opzionali nel payload registrazione; obbligatori se {@code planTier = PREMIUM}.
 */
@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
public record RegistrationSalonBillingDetails(
		String legalName,
		String billingEmail,
		String vatNumber,
		String fiscalCode,
		String subjectType,
		String addressLine1,
		String postalCode,
		String city,
		String province,
		String country,
		String sdiCode,
		String pecEmail) {

	public boolean hasAnyField() {
		return !allBlank(
				legalName,
				billingEmail,
				vatNumber,
				fiscalCode,
				subjectType,
				addressLine1,
				postalCode,
				city,
				province,
				country,
				sdiCode,
				pecEmail);
	}

	private static boolean allBlank(String... values) {
		for (String v : values) {
			if (v != null && !v.isBlank()) {
				return false;
			}
		}
		return true;
	}
}
