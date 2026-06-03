package it.velvet.publicapi.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Registrazione da form Piani: identità e sede pubblica (Free / {@code BASE}); per {@code PREMIUM} la sede in vetrina è opzionale nel payload.
 */
public record ConsumerRegistrationRequest(
		@NotBlank @Email @Size(max = 320) String email,
		@NotBlank @Size(min = 8, max = 200) String password,
		@NotBlank @Size(max = 100) String firstName,
		@NotBlank @Size(max = 100) String lastName,
		@Size(max = 40) String phone,
		@NotBlank @Size(max = 200) String salonName,
		@NotBlank
		@Pattern(regexp = "BASE|PREMIUM", message = "Piano deve essere BASE o PREMIUM")
		String planTier,
		/** Sede per ricerca / vetrina — obbligatorio se piano BASE. */
		@Size(max = 200) String salonAddressLine1,
		@Size(max = 12) String salonPostalCode,
		@Size(max = 100) String salonCity,
		@Size(max = 5, message = "Provincia sede: usa la sigla di max 5 caratteri (es. CS per Cosenza).")
		String salonProvince,
		@Size(max = 2) String salonCountry,
		/** Codici tipologia: {@code HAIR}, {@code BEAUTY}, {@code MASSAGE}; obbligatori per {@code BASE} / {@code PREMIUM} in validazione applicativa. */
		List<String> salonBusinessTypes,
		/** Pubblico di riferimento: {@code MALE}, {@code FEMALE}; obbligatorio per {@code BASE} / {@code PREMIUM}. */
		List<String> salonClientGenders,
		@AssertTrue(message = "Accetta termini e informativa privacy") Boolean acceptedTermsAndPrivacy,
		@Size(max = 40) String legalDocumentVersion) {

	public RegistrationSalonLocation salonLocationDetails() {
		return new RegistrationSalonLocation(
				trimToNull(salonAddressLine1()),
				trimToNull(salonPostalCode()),
				trimToNull(salonCity()),
				trimToNull(salonProvince()),
				trimToNull(salonCountry()),
				trimToNull(salonName()));
	}

	private static String trimToNull(String s) {
		if (s == null) {
			return null;
		}
		String t = s.trim();
		return t.isEmpty() ? null : t;
	}
}
