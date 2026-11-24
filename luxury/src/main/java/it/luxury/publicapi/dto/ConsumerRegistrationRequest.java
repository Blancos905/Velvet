package it.luxury.publicapi.dto;

import it.luxury.billing.dto.RegistrationSalonBillingDetails;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Registrazione da form Piani: identità, sede e piano commerciale {@code PREMIUM}.
 */
public record ConsumerRegistrationRequest(
		@NotBlank @Email @Size(max = 320) String email,
		@NotBlank @Size(min = 8, max = 200) String password,
		@NotBlank @Size(max = 100) String firstName,
		@NotBlank @Size(max = 100) String lastName,
		@Size(max = 40) String phone,
		@NotBlank @Size(max = 200) String salonName,
		@NotBlank
		@Pattern(regexp = "PREMIUM|PLUS", message = "Il piano disponibile è Premium o Plus")
		String planTier,
		/** Sede obbligatoria per la registrazione Premium. */
		@Size(max = 200) String salonAddressLine1,
		@Size(max = 12) String salonPostalCode,
		@Size(max = 100) String salonCity,
		@Size(max = 5, message = "Provincia sede: usa la sigla di max 5 caratteri (es. CS per Cosenza).")
		String salonProvince,
		@Size(max = 2) String salonCountry,
		@Size(max = 16)
		@Pattern(regexp = "^(it|en|fr|de|es|pt)$", message = "Lingua UI non supportata")
		String preferredLocale,
		/** Codici tipologia: {@code HAIR}, {@code BEAUTY}, {@code MASSAGE}; obbligatori per {@code PREMIUM}. */
		List<String> salonBusinessTypes,
		/** Pubblico di riferimento: {@code MALE}, {@code FEMALE}; obbligatorio per {@code PREMIUM}. */
		List<String> salonClientGenders,
		@AssertTrue(message = "Accetta termini e informativa privacy") Boolean acceptedTermsAndPrivacy,
		@Size(max = 40) String legalDocumentVersion,
		@AssertTrue(message = "Accetta l'accordo sul trattamento dati (Art. 28 GDPR)") Boolean acceptedDataProcessingAgreement,
		@Size(max = 40) String dpaDocumentVersion,
		/** Fatturazione abbonamento — obbligatori se {@code planTier = PREMIUM}. */
		@Size(max = 200) String billingLegalName,
		@Email @Size(max = 320) String billingEmail,
		@Size(max = 16) String billingVatNumber,
		@Size(max = 16) String billingFiscalCode,
		@Pattern(regexp = "COMPANY|INDIVIDUAL", message = "Tipo soggetto: COMPANY o INDIVIDUAL") String billingSubjectType,
		@Size(max = 200) String billingAddressLine1,
		@Size(max = 12) String billingPostalCode,
		@Size(max = 100) String billingCity,
		@Size(max = 5) String billingProvince,
		@Size(max = 2) String billingCountry,
		@Size(max = 7) String billingSdiCode,
		@Email @Size(max = 320) String billingPecEmail,
		/**
		 * Sedi della registrazione. Se assente, vale l’indirizzo singolo {@code salonAddressLine1}…
		 * Obbligatorio in pratica dal form {@code /piani} (una o più sedi).
		 */
		@Size(max = 20) List<RegistrationSalonLocation> salonLocations) {

	public List<RegistrationSalonLocation> resolvedSalonLocations() {
		if (salonLocations != null && !salonLocations.isEmpty()) {
			return salonLocations;
		}
		return List.of(salonLocationDetails());
	}

	public RegistrationSalonLocation salonLocationDetails() {
		return new RegistrationSalonLocation(
				trimToNull(salonAddressLine1()),
				trimToNull(salonPostalCode()),
				trimToNull(salonCity()),
				trimToNull(salonProvince()),
				trimToNull(salonCountry()),
				trimToNull(salonName()));
	}

	public RegistrationSalonBillingDetails billingDetails() {
		return new RegistrationSalonBillingDetails(
				trimToNull(billingLegalName()),
				trimToNull(billingEmail()),
				trimToNull(billingVatNumber()),
				trimToNull(billingFiscalCode()),
				trimToNull(billingSubjectType()),
				trimToNull(billingAddressLine1()),
				trimToNull(billingPostalCode()),
				trimToNull(billingCity()),
				trimToNull(billingProvince()),
				trimToNull(billingCountry()),
				trimToNull(billingSdiCode()),
				trimToNull(billingPecEmail()));
	}

	private static String trimToNull(String s) {
		if (s == null) {
			return null;
		}
		String t = s.trim();
		return t.isEmpty() ? null : t;
	}
}
