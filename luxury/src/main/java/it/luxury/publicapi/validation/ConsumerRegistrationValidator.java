package it.luxury.publicapi.validation;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.dto.RegistrationSalonBillingDetails;
import it.luxury.billing.validation.SalonBillingProfileValidator;
import it.luxury.common.api.BusinessException;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Validazione incrociata piano / sede pubblica (doc: Location per ricerca e vetrina §8.1).
 */
public final class ConsumerRegistrationValidator {

	private ConsumerRegistrationValidator() {
	}

	public static List<SalonBusinessType> normalizeSalonBusinessTypesOrThrow(List<String> raw) {
		try {
			return SalonBusinessType.parseList(raw);
		} catch (IllegalArgumentException ex) {
			throw bad(ex.getMessage());
		}
	}

	public static List<SalonClientGender> normalizeSalonClientGendersOrThrow(List<String> raw) {
		try {
			return SalonClientGender.parseList(raw);
		} catch (IllegalArgumentException ex) {
			throw bad(ex.getMessage());
		}
	}

	/** Per piani con vetrina ({@code BASE} / {@code PREMIUM}) richiediamo almeno una tipologia. */
	public static void requireSalonBusinessTypesForPartnerPlans(String planTier, List<SalonBusinessType> types) {
		if (!"BASE".equals(planTier) && !"PREMIUM".equals(planTier)) {
			return;
		}
		if (types == null || types.isEmpty()) {
			throw bad(
					"Seleziona almeno una tipologia: parrucchiere, estetista e/o massaggio / fisioterapia. "
							+ "Puoi combinarne più di una.");
		}
	}

	/** Per piani con vetrina ({@code BASE} / {@code PREMIUM}) richiediamo almeno un pubblico di riferimento. */
	public static void requireSalonClientGendersForPartnerPlans(String planTier, List<SalonClientGender> genders) {
		if (!"BASE".equals(planTier) && !"PREMIUM".equals(planTier)) {
			return;
		}
		if (genders == null || genders.isEmpty()) {
			throw bad(
					"Seleziona almeno un pubblico di riferimento: maschile e/o femminile. "
							+ "Puoi indicare entrambi se il salone serve clienti uomo e donna.");
		}
	}

	public static void requireSalonLocationForFreePlan(String planTier, RegistrationSalonLocation loc) {
		if (!"BASE".equals(planTier)) {
			return;
		}
		if (blank(loc.addressLine1()) || blank(loc.postalCode()) || blank(loc.city()) || blank(loc.province())) {
			throw bad("Per il piano Free indica l’indirizzo della sede (via, CAP, città e provincia) così i clienti possono trovarti in ricerca e in vetrina.");
		}
	}

	/** Piano Premium: dati fatturazione obbligatori in registrazione. */
	public static void requireBillingForPremiumPlan(String planTier, RegistrationSalonBillingDetails billing, String accountEmail) {
		if (!"PREMIUM".equalsIgnoreCase(planTier != null ? planTier.trim() : "")) {
			return;
		}
		if (billing == null || !billing.hasAnyField()) {
			throw bad("Per il piano Premium indica i dati di fatturazione (intestazione, indirizzo, P.IVA o codice fiscale, SDI o PEC).");
		}
		SalonBillingProfile scratch = scratchProfile(billing, accountEmail);
		SalonBillingProfileValidator.validateForSave(scratch);
	}

	private static SalonBillingProfile scratchProfile(RegistrationSalonBillingDetails billing, String accountEmail) {
		var group = new it.luxury.studio.domain.StudioGroup("Salone", accountEmail, "BASE");
		SalonBillingProfile profile = new SalonBillingProfile(group);
		profile.setLegalName(billing.legalName());
		profile.setBillingEmail(
				SalonBillingProfileValidator.normalizeEmail(
						billing.billingEmail() != null && !billing.billingEmail().isBlank() ? billing.billingEmail() : accountEmail));
		profile.setVatNumber(billing.vatNumber());
		profile.setFiscalCode(billing.fiscalCode());
		profile.setSubjectType(billing.subjectType());
		profile.setAddressLine1(billing.addressLine1());
		profile.setPostalCode(billing.postalCode());
		profile.setCity(billing.city());
		profile.setProvince(billing.province());
		profile.setCountry(billing.country() != null && !billing.country().isBlank() ? billing.country() : "IT");
		profile.setSdiCode(billing.sdiCode());
		profile.setPecEmail(billing.pecEmail());
		return profile;
	}

	private static boolean blank(String s) {
		return s == null || s.trim().isEmpty();
	}

	private static BusinessException bad(String message) {
		return new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
	}
}
