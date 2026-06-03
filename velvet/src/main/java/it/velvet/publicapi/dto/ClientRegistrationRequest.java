package it.velvet.publicapi.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registrazione da form <strong>/registrati</strong>: cliente finale (consumatore), senza piano salone.
 */
public record ClientRegistrationRequest(
		@NotBlank @Email @Size(max = 320) String email,
		@NotBlank @Size(min = 8, max = 200) String password,
		@NotBlank @Size(max = 100) String firstName,
		@NotBlank @Size(max = 100) String lastName,
		@Size(max = 40) String phone,
		/** Se {@code true}: solo se non esiste ancora super admin (DB/env), crea credenziali piattaforma e ruolo {@code ADMIN}. */
		Boolean bootstrapSuperAdmin,
		@AssertTrue(message = "Accetta termini e informativa privacy") Boolean acceptedTermsAndPrivacy,
		@Size(max = 40) String legalDocumentVersion
) {
}
