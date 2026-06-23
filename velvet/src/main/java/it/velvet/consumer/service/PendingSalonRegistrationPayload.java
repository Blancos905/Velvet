package it.velvet.consumer.service;

import it.velvet.billing.dto.RegistrationSalonBillingDetails;
import java.util.List;

/**
 * Dati registrazione titolare + salone, serializzati in {@code pending_registrations.payload_json}.
 */
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
		List<String> salonBusinessTypes,
		List<String> salonClientGenders,
		String legalDocumentVersion,
		RegistrationSalonBillingDetails billing) {
}
