package it.luxury.billing.domain;

import it.luxury.studio.domain.StudioGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Dati fiscali del titolare salone per fatturazione abbonamento (mirror locale; Stripe = pagamento). */
@Entity
@Table(name = "salon_billing_profiles")
public class SalonBillingProfile {

	@Id
	@GeneratedValue
	private UUID id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "studio_group_id", nullable = false, unique = true)
	private StudioGroup studioGroup;

	/** Ragione sociale / intestazione fattura. */
	@Column(name = "legal_name", length = 200)
	private String legalName;

	@Column(name = "billing_email", length = 320)
	private String billingEmail;

	@Column(name = "vat_number", length = 16)
	private String vatNumber;

	@Column(name = "fiscal_code", length = 16)
	private String fiscalCode;

	@Column(name = "subject_type", length = 16)
	private String subjectType;

	@Column(name = "address_line1", length = 200)
	private String addressLine1;

	@Column(name = "postal_code", length = 12)
	private String postalCode;

	@Column(name = "city", length = 100)
	private String city;

	@Column(name = "province", length = 5)
	private String province;

	@Column(name = "country", length = 2)
	private String country;

	@Column(name = "sdi_code", length = 7)
	private String sdiCode;

	@Column(name = "pec_email", length = 320)
	private String pecEmail;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected SalonBillingProfile() {
	}

	public SalonBillingProfile(StudioGroup studioGroup) {
		this.studioGroup = studioGroup;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public StudioGroup getStudioGroup() {
		return studioGroup;
	}

	public UUID getStudioGroupId() {
		return studioGroup != null ? studioGroup.getId() : null;
	}

	public String getLegalName() {
		return legalName;
	}

	public void setLegalName(String legalName) {
		this.legalName = legalName;
	}

	public String getBillingEmail() {
		return billingEmail;
	}

	public void setBillingEmail(String billingEmail) {
		this.billingEmail = billingEmail;
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

	public String getSubjectType() {
		return subjectType;
	}

	public void setSubjectType(String subjectType) {
		this.subjectType = subjectType;
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
		return country;
	}

	public void setCountry(String country) {
		this.country = country;
	}

	public String getSdiCode() {
		return sdiCode;
	}

	public void setSdiCode(String sdiCode) {
		this.sdiCode = sdiCode;
	}

	public String getPecEmail() {
		return pecEmail;
	}

	public void setPecEmail(String pecEmail) {
		this.pecEmail = pecEmail;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
