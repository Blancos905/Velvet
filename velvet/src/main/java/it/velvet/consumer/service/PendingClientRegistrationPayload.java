package it.velvet.consumer.service;

/**
 * Dati extra registrazione cliente, serializzati in {@code pending_registrations.payload_json}.
 */
public record PendingClientRegistrationPayload(
		String firstName,
		String lastName,
		String country,
		String phone,
		boolean bootstrapSuperAdmin,
		String legalDocumentVersion) {
}
