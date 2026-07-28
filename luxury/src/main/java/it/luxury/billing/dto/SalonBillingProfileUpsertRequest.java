package it.luxury.billing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SalonBillingProfileUpsertRequest(
		@Size(max = 200) String legalName,
		@Email @Size(max = 320) String billingEmail,
		@Size(max = 16) String vatNumber,
		@Size(max = 16) String fiscalCode,
		@Pattern(regexp = "COMPANY|INDIVIDUAL", message = "Tipo soggetto: COMPANY o INDIVIDUAL") String subjectType,
		@Size(max = 200) String addressLine1,
		@Size(max = 12) String postalCode,
		@Size(max = 100) String city,
		@Size(max = 5) String province,
		@Size(max = 2) String country,
		@Size(max = 7) String sdiCode,
		@Email @Size(max = 320) String pecEmail) {
}
