package it.luxury.billing.validation;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.common.api.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.Locale;
import java.util.regex.Pattern;

/** Validazione dati fiscali salone (Italia / UE). */
public final class SalonBillingProfileValidator {

	private static final Pattern IT_VAT = Pattern.compile("^\\d{11}$");
	private static final Pattern IT_FISCAL_COMPANY = Pattern.compile("^\\d{11}$");
	private static final Pattern IT_FISCAL_INDIVIDUAL = Pattern.compile("^[A-Z0-9]{16}$");
	private static final Pattern SDI = Pattern.compile("^[A-Z0-9]{7}$");
	private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
	private static final Pattern ISO_COUNTRY = Pattern.compile("^[A-Z]{2}$");

	private SalonBillingProfileValidator() {
	}

	public static void validateForSave(SalonBillingProfile profile) {
		if (profile == null) {
			throw bad("Profilo fatturazione mancante.");
		}
		requireNonBlank(profile.getLegalName(), "Indica la ragione sociale o l'intestazione per la fattura.");
		requireNonBlank(profile.getAddressLine1(), "Indica l'indirizzo di fatturazione (via e numero civico).");
		requireNonBlank(profile.getPostalCode(), "Indica il CAP di fatturazione.");
		requireNonBlank(profile.getCity(), "Indica la città di fatturazione.");
		requireNonBlank(profile.getProvince(), "Indica la provincia di fatturazione (sigla, es. MI).");

		String country = normalizeCountry(profile.getCountry());
		profile.setCountry(country);

		String billingEmail = normalizeEmail(profile.getBillingEmail());
		if (billingEmail != null && !EMAIL.matcher(billingEmail).matches()) {
			throw bad("Email di fatturazione non valida.");
		}
		profile.setBillingEmail(billingEmail);

		String vat = normalizeItalianVatDigits(profile.getVatNumber());
		String fiscal = normalizeFiscalCode(profile.getFiscalCode());
		profile.setVatNumber(vat);
		profile.setFiscalCode(fiscal);

		if (vat == null && fiscal == null) {
			throw bad("Indica la Partita IVA o il codice fiscale dell'intestatario fattura.");
		}
		if (vat != null && !IT_VAT.matcher(vat).matches()) {
			throw bad("Partita IVA italiana non valida: usa 11 cifre.");
		}
		if (fiscal != null && !IT_FISCAL_COMPANY.matcher(fiscal).matches() && !IT_FISCAL_INDIVIDUAL.matcher(fiscal).matches()) {
			throw bad("Codice fiscale non valido.");
		}

		String sdi = normalizeSdi(profile.getSdiCode());
		String pec = normalizeEmail(profile.getPecEmail());
		profile.setSdiCode(sdi);
		profile.setPecEmail(pec);

		if ("IT".equals(country)) {
			if (sdi == null && pec == null) {
				throw bad("Per la fatturazione elettronica in Italia indica il codice destinatario SDI oppure la PEC.");
			}
			if (sdi != null && !SDI.matcher(sdi).matches()) {
				throw bad("Codice destinatario SDI non valido: usa 7 caratteri alfanumerici.");
			}
			if (pec != null && !EMAIL.matcher(pec).matches()) {
				throw bad("Indirizzo PEC non valido.");
			}
		}
		else if (sdi != null && !SDI.matcher(sdi).matches()) {
			throw bad("Codice destinatario SDI non valido: usa 7 caratteri alfanumerici.");
		}
		else if (pec != null && !EMAIL.matcher(pec).matches()) {
			throw bad("Indirizzo PEC non valido.");
		}

		profile.setLegalName(profile.getLegalName().trim());
		profile.setAddressLine1(profile.getAddressLine1().trim());
		profile.setPostalCode(profile.getPostalCode().trim());
		profile.setCity(profile.getCity().trim());
		profile.setProvince(profile.getProvince().trim().toUpperCase(Locale.ROOT));
	}

	public static boolean isComplete(SalonBillingProfile profile) {
		if (profile == null) {
			return false;
		}
		try {
			validateForSave(profile);
			if (profile.getBillingEmail() == null || profile.getBillingEmail().isBlank()) {
				return false;
			}
			return true;
		}
		catch (BusinessException ex) {
			return false;
		}
	}

	public static String normalizeCountry(String raw) {
		if (raw == null || raw.isBlank()) {
			return "IT";
		}
		String c = raw.trim().toUpperCase(Locale.ROOT);
		if (!ISO_COUNTRY.matcher(c).matches()) {
			throw bad("Paese di fatturazione: usa il codice ISO a 2 lettere (es. IT).");
		}
		return c;
	}

	public static String normalizeItalianVatDigits(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String s = raw.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
		if (s.startsWith("IT")) {
			s = s.substring(2);
		}
		return s.isEmpty() ? null : s;
	}

	public static String normalizeFiscalCode(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
	}

	public static String normalizeSdi(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim().toUpperCase(Locale.ROOT);
	}

	public static String normalizeEmail(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim().toLowerCase(Locale.ROOT);
	}

	public static String stripeEuVatValue(SalonBillingProfile profile) {
		String vat = normalizeItalianVatDigits(profile.getVatNumber());
		if (vat != null && IT_VAT.matcher(vat).matches()) {
			return "IT" + vat;
		}
		String fiscal = normalizeFiscalCode(profile.getFiscalCode());
		if (fiscal != null && IT_FISCAL_COMPANY.matcher(fiscal).matches()) {
			return "IT" + fiscal;
		}
		return null;
	}

	private static void requireNonBlank(String value, String message) {
		if (value == null || value.isBlank()) {
			throw bad(message);
		}
	}

	private static BusinessException bad(String message) {
		return new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
	}
}
