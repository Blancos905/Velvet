package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Dati fiscali emittente (Saloni Luxury) per fattura elettronica FatturaPA. */
@ConfigurationProperties(prefix = "luxury.billing.issuer")
public class LuxuryBillingIssuerProperties {

	/** Abilita generazione XML FatturaPA su {@code invoice.paid}. */
	private boolean fatturapaEnabled = true;

	private String legalName = "";

	/** Partita IVA italiana (11 cifre, senza prefisso IT). */
	private String vatNumber = "";

	/** Codice fiscale emittente (se diverso dalla P.IVA). */
	private String fiscalCode = "";

	private String addressLine1 = "";

	private String postalCode = "";

	private String city = "";

	private String province = "";

	private String country = "IT";

	/** Regime fiscale FatturaPA (es. RF19 forfettario). */
	private String taxRegime = "RF19";

	/** Natura IVA quando non si applica IVA (es. N2.2 forfettario). */
	private String vatNature = "N2.2";

	/** Aliquota IVA percentuale (0 per forfettario con N2.2). */
	private String vatRate = "0.00";

	/** Email admin: riceve XML generato con istruzioni portale AdE (opzionale). */
	private String adminNotificationEmail = "";

	/** Soglia importo (centesimi) per bollo virtuale (default 7747 = 77,47 €). */
	private long bolloThresholdCents = 7747L;

	public boolean isFatturapaEnabled() {
		return fatturapaEnabled;
	}

	public void setFatturapaEnabled(boolean fatturapaEnabled) {
		this.fatturapaEnabled = fatturapaEnabled;
	}

	public String getLegalName() {
		return legalName;
	}

	public void setLegalName(String legalName) {
		this.legalName = legalName;
	}

	public String getVatNumber() {
		return vatNumber;
	}

	public void setVatNumber(String vatNumber) {
		this.vatNumber = vatNumber;
	}

	public String getFiscalCode() {
		return fiscalCode;
	}

	public void setFiscalCode(String fiscalCode) {
		this.fiscalCode = fiscalCode;
	}

	public String getAddressLine1() {
		return addressLine1;
	}

	public void setAddressLine1(String addressLine1) {
		this.addressLine1 = addressLine1;
	}

	public String getPostalCode() {
		return postalCode;
	}

	public void setPostalCode(String postalCode) {
		this.postalCode = postalCode;
	}

	public String getCity() {
		return city;
	}

	public void setCity(String city) {
		this.city = city;
	}

	public String getProvince() {
		return province;
	}

	public void setProvince(String province) {
		this.province = province;
	}

	public String getCountry() {
		return country == null || country.isBlank() ? "IT" : country.trim().toUpperCase();
	}

	public void setCountry(String country) {
		this.country = country;
	}

	public String getTaxRegime() {
		return taxRegime == null || taxRegime.isBlank() ? "RF19" : taxRegime.trim();
	}

	public void setTaxRegime(String taxRegime) {
		this.taxRegime = taxRegime;
	}

	public String getVatNature() {
		return vatNature == null || vatNature.isBlank() ? "N2.2" : vatNature.trim();
	}

	public void setVatNature(String vatNature) {
		this.vatNature = vatNature;
	}

	public String getVatRate() {
		return vatRate == null || vatRate.isBlank() ? "0.00" : vatRate.trim();
	}

	public void setVatRate(String vatRate) {
		this.vatRate = vatRate;
	}

	public String getAdminNotificationEmail() {
		return adminNotificationEmail;
	}

	public void setAdminNotificationEmail(String adminNotificationEmail) {
		this.adminNotificationEmail = adminNotificationEmail;
	}

	public long getBolloThresholdCents() {
		return bolloThresholdCents > 0 ? bolloThresholdCents : 7747L;
	}

	public void setBolloThresholdCents(long bolloThresholdCents) {
		this.bolloThresholdCents = bolloThresholdCents;
	}

	public boolean configured() {
		return legalName != null && !legalName.isBlank()
				&& normalizedVatDigits() != null
				&& addressLine1 != null && !addressLine1.isBlank()
				&& postalCode != null && !postalCode.isBlank()
				&& city != null && !city.isBlank()
				&& province != null && !province.isBlank();
	}

	public String normalizedVatDigits() {
		if (vatNumber == null || vatNumber.isBlank()) {
			return null;
		}
		String s = vatNumber.trim().toUpperCase().replaceAll("\\s+", "");
		if (s.startsWith("IT")) {
			s = s.substring(2);
		}
		return s.matches("\\d{11}") ? s : null;
	}

	public String issuerFiscalCodeForXml() {
		if (fiscalCode != null && !fiscalCode.isBlank()) {
			return fiscalCode.trim().toUpperCase();
		}
		return normalizedVatDigits();
	}
}
