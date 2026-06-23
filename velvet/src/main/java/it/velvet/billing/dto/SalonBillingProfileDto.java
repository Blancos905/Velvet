package it.velvet.billing.dto;

import it.velvet.billing.domain.SalonBillingProfile;
import it.velvet.billing.validation.SalonBillingProfileValidator;

import java.time.Instant;

public record SalonBillingProfileDto(
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
		String pecEmail,
		boolean complete,
		boolean persisted,
		Instant updatedAt) {

	public static SalonBillingProfileDto from(SalonBillingProfile profile) {
		if (profile == null) {
			return empty(false);
		}
		return new SalonBillingProfileDto(
				profile.getLegalName(),
				profile.getBillingEmail(),
				profile.getVatNumber(),
				profile.getFiscalCode(),
				profile.getSubjectType(),
				profile.getAddressLine1(),
				profile.getPostalCode(),
				profile.getCity(),
				profile.getProvince(),
				profile.getCountry(),
				profile.getSdiCode(),
				profile.getPecEmail(),
				SalonBillingProfileValidator.isComplete(profile),
				profile.getId() != null,
				profile.getUpdatedAt());
	}

	public static SalonBillingProfileDto empty(boolean complete) {
		return new SalonBillingProfileDto(null, null, null, null, null, null, null, null, null, "IT", null, null, complete, false, null);
	}
}
