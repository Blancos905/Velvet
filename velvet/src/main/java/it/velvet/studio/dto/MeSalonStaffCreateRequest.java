package it.velvet.studio.dto;

import jakarta.validation.constraints.Size;

public record MeSalonStaffCreateRequest(
		@Size(max = 80) String firstName,
		@Size(max = 80) String lastName,
		@Size(max = 80) String role,
		@Size(max = 12_000_000) String photoDataUrl,
		/** Obbligatoria in creazione: credenziali di accesso all’area staff. */
		@Size(max = 320) String email,
		@Size(max = 128) String password) {
}
