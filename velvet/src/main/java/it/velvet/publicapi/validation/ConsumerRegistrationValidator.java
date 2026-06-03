package it.velvet.publicapi.validation;

import it.velvet.common.api.BusinessException;
import it.velvet.publicapi.dto.RegistrationSalonLocation;
import it.velvet.studio.domain.SalonBusinessType;
import it.velvet.studio.domain.SalonClientGender;
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

	private static boolean blank(String s) {
		return s == null || s.trim().isEmpty();
	}

	private static BusinessException bad(String message) {
		return new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
	}
}
