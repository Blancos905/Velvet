package it.velvet.billing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Fattura elettronica FatturaPA generata da pagamento Stripe (XML pronto per portale AdE). */
@Entity
@Table(
		name = "velvet_fiscal_invoices",
		uniqueConstraints = @UniqueConstraint(name = "uk_velvet_fiscal_invoice_stripe", columnNames = "stripe_invoice_id"))
public class VelvetFiscalInvoice {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "stripe_invoice_id", nullable = false, length = 64)
	private String stripeInvoiceId;

	@Column(name = "studio_group_id")
	private UUID studioGroupId;

	@Column(name = "fiscal_year", nullable = false)
	private int fiscalYear;

	@Column(name = "progressive", nullable = false)
	private int progressive;

	@Column(name = "progressive_invio", nullable = false, length = 5)
	private String progressiveInvio;

	@Column(name = "invoice_number", nullable = false, length = 32)
	private String invoiceNumber;

	@Column(name = "invoice_date", nullable = false)
	private LocalDate invoiceDate;

	@Column(name = "amount_cents", nullable = false)
	private long amountCents;

	@Column(name = "currency", nullable = false, length = 3)
	private String currency;

	@Column(name = "recipient_legal_name", length = 200)
	private String recipientLegalName;

	@Column(name = "recipient_vat", length = 16)
	private String recipientVat;

	@Column(name = "recipient_fiscal_code", length = 16)
	private String recipientFiscalCode;

	@Column(name = "recipient_sdi_code", length = 7)
	private String recipientSdiCode;

	@Column(name = "recipient_pec_email", length = 320)
	private String recipientPecEmail;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 40)
	private VelvetFiscalInvoiceStatus status;

	@Column(name = "skip_reason", length = 500)
	private String skipReason;

	@Column(name = "xml_content", columnDefinition = "TEXT")
	private String xmlContent;

	@Column(name = "xml_filename", length = 32)
	private String xmlFilename;

	@Column(name = "stripe_paid_at")
	private Instant stripePaidAt;

	@Column(name = "admin_notified_at")
	private Instant adminNotifiedAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected VelvetFiscalInvoice() {
	}

	public VelvetFiscalInvoice(String stripeInvoiceId) {
		this.stripeInvoiceId = stripeInvoiceId;
	}

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
		if (currency == null || currency.isBlank()) {
			currency = "EUR";
		}
	}

	public UUID getId() {
		return id;
	}

	public String getStripeInvoiceId() {
		return stripeInvoiceId;
	}

	public UUID getStudioGroupId() {
		return studioGroupId;
	}

	public void setStudioGroupId(UUID studioGroupId) {
		this.studioGroupId = studioGroupId;
	}

	public int getFiscalYear() {
		return fiscalYear;
	}

	public void setFiscalYear(int fiscalYear) {
		this.fiscalYear = fiscalYear;
	}

	public int getProgressive() {
		return progressive;
	}

	public void setProgressive(int progressive) {
		this.progressive = progressive;
	}

	public String getProgressiveInvio() {
		return progressiveInvio;
	}

	public void setProgressiveInvio(String progressiveInvio) {
		this.progressiveInvio = progressiveInvio;
	}

	public String getInvoiceNumber() {
		return invoiceNumber;
	}

	public void setInvoiceNumber(String invoiceNumber) {
		this.invoiceNumber = invoiceNumber;
	}

	public LocalDate getInvoiceDate() {
		return invoiceDate;
	}

	public void setInvoiceDate(LocalDate invoiceDate) {
		this.invoiceDate = invoiceDate;
	}

	public long getAmountCents() {
		return amountCents;
	}

	public void setAmountCents(long amountCents) {
		this.amountCents = amountCents;
	}

	public String getCurrency() {
		return currency;
	}

	public void setCurrency(String currency) {
		this.currency = currency;
	}

	public String getRecipientLegalName() {
		return recipientLegalName;
	}

	public void setRecipientLegalName(String recipientLegalName) {
		this.recipientLegalName = recipientLegalName;
	}

	public String getRecipientVat() {
		return recipientVat;
	}

	public void setRecipientVat(String recipientVat) {
		this.recipientVat = recipientVat;
	}

	public String getRecipientFiscalCode() {
		return recipientFiscalCode;
	}

	public void setRecipientFiscalCode(String recipientFiscalCode) {
		this.recipientFiscalCode = recipientFiscalCode;
	}

	public String getRecipientSdiCode() {
		return recipientSdiCode;
	}

	public void setRecipientSdiCode(String recipientSdiCode) {
		this.recipientSdiCode = recipientSdiCode;
	}

	public String getRecipientPecEmail() {
		return recipientPecEmail;
	}

	public void setRecipientPecEmail(String recipientPecEmail) {
		this.recipientPecEmail = recipientPecEmail;
	}

	public VelvetFiscalInvoiceStatus getStatus() {
		return status;
	}

	public void setStatus(VelvetFiscalInvoiceStatus status) {
		this.status = status;
	}

	public String getSkipReason() {
		return skipReason;
	}

	public void setSkipReason(String skipReason) {
		this.skipReason = skipReason;
	}

	public String getXmlContent() {
		return xmlContent;
	}

	public void setXmlContent(String xmlContent) {
		this.xmlContent = xmlContent;
	}

	public String getXmlFilename() {
		return xmlFilename;
	}

	public void setXmlFilename(String xmlFilename) {
		this.xmlFilename = xmlFilename;
	}

	public Instant getStripePaidAt() {
		return stripePaidAt;
	}

	public void setStripePaidAt(Instant stripePaidAt) {
		this.stripePaidAt = stripePaidAt;
	}

	public Instant getAdminNotifiedAt() {
		return adminNotifiedAt;
	}

	public void setAdminNotifiedAt(Instant adminNotifiedAt) {
		this.adminNotifiedAt = adminNotifiedAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
