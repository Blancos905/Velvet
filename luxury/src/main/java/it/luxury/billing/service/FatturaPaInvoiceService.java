package it.luxury.billing.service;

import com.stripe.model.Invoice;
import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.domain.SalonBillingProfileRepository;
import it.luxury.billing.domain.LuxuryFiscalInvoice;
import it.luxury.billing.domain.LuxuryFiscalInvoiceRepository;
import it.luxury.billing.domain.LuxuryFiscalInvoiceStatus;
import it.luxury.billing.validation.SalonBillingProfileValidator;
import it.luxury.config.LuxuryBillingIssuerProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import java.util.UUID;

/** Genera fattura elettronica FatturaPA al pagamento Stripe (invio SDI manuale via portale AdE). */
@Service
@ConditionalOnStripeBillingOperational
public class FatturaPaInvoiceService {

	private static final Logger LOG = LoggerFactory.getLogger(FatturaPaInvoiceService.class);
	private static final ZoneId ITALY = ZoneId.of("Europe/Rome");

	private final LuxuryBillingIssuerProperties issuerProperties;
	private final SalonBillingProfileRepository billingProfileRepository;
	private final LuxuryFiscalInvoiceRepository fiscalInvoiceRepository;
	private final FatturaPaAdminNotificationService adminNotificationService;

	public FatturaPaInvoiceService(
			LuxuryBillingIssuerProperties issuerProperties,
			SalonBillingProfileRepository billingProfileRepository,
			LuxuryFiscalInvoiceRepository fiscalInvoiceRepository,
			FatturaPaAdminNotificationService adminNotificationService) {
		this.issuerProperties = issuerProperties;
		this.billingProfileRepository = billingProfileRepository;
		this.fiscalInvoiceRepository = fiscalInvoiceRepository;
		this.adminNotificationService = adminNotificationService;
	}

	@Transactional
	public void issueFromStripeInvoice(Invoice invoice, UUID studioGroupId) {
		if (invoice == null || studioGroupId == null) {
			return;
		}
		String stripeInvoiceId = invoice.getId();
		if (stripeInvoiceId == null || stripeInvoiceId.isBlank()) {
			return;
		}
		stripeInvoiceId = stripeInvoiceId.trim();
		if (fiscalInvoiceRepository.existsByStripeInvoiceId(stripeInvoiceId)) {
			return;
		}

		if (!issuerProperties.isFatturapaEnabled()) {
			saveSkipped(stripeInvoiceId, studioGroupId, LuxuryFiscalInvoiceStatus.SKIPPED_DISABLED, "Fatturazione elettronica disabilitata.");
			return;
		}
		if (!issuerProperties.configured()) {
			saveSkipped(
					stripeInvoiceId,
					studioGroupId,
					LuxuryFiscalInvoiceStatus.SKIPPED_ISSUER_NOT_CONFIGURED,
					"Configura luxury.billing.issuer.* (P.IVA, indirizzo emittente).");
			return;
		}

		Long amountPaid = invoice.getAmountPaid();
		if (amountPaid == null || amountPaid <= 0) {
			saveSkipped(stripeInvoiceId, studioGroupId, LuxuryFiscalInvoiceStatus.SKIPPED_ZERO_AMOUNT, "Importo pagamento zero.");
			return;
		}

		SalonBillingProfile profile = billingProfileRepository.findByStudioGroup_Id(studioGroupId).orElse(null);
		if (!SalonBillingProfileValidator.isComplete(profile)) {
			saveSkipped(
					stripeInvoiceId,
					studioGroupId,
					LuxuryFiscalInvoiceStatus.SKIPPED_INCOMPLETE_PROFILE,
					"Profilo fatturazione salone incompleto.");
			return;
		}

		LocalDate invoiceDate = resolveInvoiceDate(invoice);
		int fiscalYear = invoiceDate.getYear();
		int progressive = fiscalInvoiceRepository.findMaxProgressiveForReadyInvoices(fiscalYear, LuxuryFiscalInvoiceStatus.READY) + 1;
		String progressiveInvio = FatturaPaXmlBuilder.padProgressivoInvio(String.valueOf(progressive));
		String invoiceNumber = fiscalYear + "/" + String.format(Locale.ROOT, "%03d", progressive);
		String currency = invoice.getCurrency() != null && !invoice.getCurrency().isBlank()
				? invoice.getCurrency().trim().toLowerCase(Locale.ROOT)
				: "eur";
		String lineDescription = "Abbonamento Premium Saloni Luxury — piattaforma SaaS prenotazioni salone";
		String causale = "Canone abbonamento Premium mensile Saloni Luxury";

		FatturaPaXmlBuilder.BuildResult built = FatturaPaXmlBuilder.build(
				new FatturaPaXmlBuilder.BuildInput(
						issuerProperties,
						profile,
						progressiveInvio,
						invoiceNumber,
						invoiceDate,
						amountPaid,
						currency,
						lineDescription,
						causale));

		LuxuryFiscalInvoice row = new LuxuryFiscalInvoice(stripeInvoiceId);
		row.setStudioGroupId(studioGroupId);
		row.setFiscalYear(fiscalYear);
		row.setProgressive(progressive);
		row.setProgressiveInvio(progressiveInvio);
		row.setInvoiceNumber(invoiceNumber);
		row.setInvoiceDate(invoiceDate);
		row.setAmountCents(amountPaid);
		row.setCurrency(currency.toUpperCase(Locale.ROOT));
		row.setRecipientLegalName(profile.getLegalName());
		row.setRecipientVat(profile.getVatNumber());
		row.setRecipientFiscalCode(profile.getFiscalCode());
		row.setRecipientSdiCode(profile.getSdiCode());
		row.setRecipientPecEmail(profile.getPecEmail());
		row.setStatus(LuxuryFiscalInvoiceStatus.READY);
		row.setXmlContent(built.xml());
		row.setXmlFilename(built.filename());
		row.setStripePaidAt(resolvePaidAt(invoice));
		fiscalInvoiceRepository.save(row);

		adminNotificationService.notifyAdminIfConfigured(row);
		fiscalInvoiceRepository.save(row);
		LOG.info(
				"FatturaPA generata stripeInvoiceId={} studioGroupId={} numero={} file={}",
				stripeInvoiceId,
				studioGroupId,
				invoiceNumber,
				built.filename());
	}

	private void saveSkipped(
			String stripeInvoiceId,
			UUID studioGroupId,
			LuxuryFiscalInvoiceStatus status,
			String reason) {
		LuxuryFiscalInvoice row = new LuxuryFiscalInvoice(stripeInvoiceId);
		row.setStudioGroupId(studioGroupId);
		row.setFiscalYear(LocalDate.now(ITALY).getYear());
		row.setProgressive(0);
		row.setProgressiveInvio("00000");
		row.setInvoiceNumber("-");
		row.setInvoiceDate(LocalDate.now(ITALY));
		row.setAmountCents(0L);
		row.setStatus(status);
		row.setSkipReason(reason);
		fiscalInvoiceRepository.save(row);
		LOG.warn("FatturaPA non generata stripeInvoiceId={} status={} reason={}", stripeInvoiceId, status, reason);
	}

	private static LocalDate resolveInvoiceDate(Invoice invoice) {
		Long created = invoice.getCreated();
		if (created != null && created > 0) {
			return Instant.ofEpochSecond(created).atZone(ITALY).toLocalDate();
		}
		if (invoice.getStatusTransitions() != null && invoice.getStatusTransitions().getPaidAt() != null) {
			return Instant.ofEpochSecond(invoice.getStatusTransitions().getPaidAt()).atZone(ITALY).toLocalDate();
		}
		return LocalDate.now(ITALY);
	}

	private static Instant resolvePaidAt(Invoice invoice) {
		if (invoice.getStatusTransitions() != null && invoice.getStatusTransitions().getPaidAt() != null) {
			return Instant.ofEpochSecond(invoice.getStatusTransitions().getPaidAt());
		}
		Long created = invoice.getCreated();
		if (created != null && created > 0) {
			return Instant.ofEpochSecond(created);
		}
		return Instant.now();
	}
}
