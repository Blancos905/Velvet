package it.luxury.consumer.service;

import it.luxury.billing.dto.RegistrationSalonBillingDetails;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import java.util.List;

/**
 * Dati registrazione titolare + salone, serializzati in {@code pending_registrations.payload_json}.
 */
@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
public record PendingSalonRegistrationPayload(
		String firstName,
		String lastName,
		String phone,
		String provisionPlanTier,
		String salonName,
		String salonAddressLine1,
		String salonPostalCode,
		String salonCity,
		String salonProvince,
		String salonCountry,
		String preferredLocale,
		List<String> salonBusinessTypes,
		List<String> salonClientGenders,
		String legalDocumentVersion,
		String dpaDocumentVersion,
		RegistrationSalonBillingDetails billing,
		/** Sedi da creare. Assente nei payload già in coda: si usa l’indirizzo singolo. */
		List<RegistrationSalonLocation> salonLocations) {

	public List<RegistrationSalonLocation> resolvedLocations() {
		if (salonLocations != null && !salonLocations.isEmpty()) {
			return salonLocations;
		}
		String country = salonCountry() != null && !salonCountry().isBlank() ? salonCountry() : "IT";
		return List.of(new RegistrationSalonLocation(
				salonAddressLine1(),
				salonPostalCode(),
				salonCity(),
				salonProvince(),
				country,
				salonName()));
	}

	public int billableLocationCount() {
		int count = resolvedLocations().size();
		return count < 1 ? 1 : count;
	}
}
