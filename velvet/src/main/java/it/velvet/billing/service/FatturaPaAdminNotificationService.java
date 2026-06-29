package it.velvet.billing.service;

import it.velvet.billing.domain.VelvetFiscalInvoice;
import it.velvet.config.VelvetBillingIssuerProperties;
import it.velvet.config.VelvetMailProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

/** Invia al titolare piattaforma l'XML FatturaPA con istruzioni portale AdE (gratuito). */
@Service
public class FatturaPaAdminNotificationService {

	private static final Logger LOG = LoggerFactory.getLogger(FatturaPaAdminNotificationService.class);

	private final VelvetBillingIssuerProperties issuerProperties;
	private final VelvetMailProperties mailProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public FatturaPaAdminNotificationService(
			VelvetBillingIssuerProperties issuerProperties,
			VelvetMailProperties mailProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.issuerProperties = issuerProperties;
		this.mailProperties = mailProperties;
		this.javaMailSender = javaMailSender;
	}

	public void notifyAdminIfConfigured(VelvetFiscalInvoice invoice) {
		if (invoice == null || invoice.getStatus() != it.velvet.billing.domain.VelvetFiscalInvoiceStatus.READY) {
			return;
		}
		if (invoice.getAdminNotifiedAt() != null) {
			return;
		}
		String to = issuerProperties.getAdminNotificationEmail();
		if (to == null || to.isBlank()) {
			return;
		}
		if (!mailProperties.isEnabled() || javaMailSender == null) {
			LOG.debug("Notifica fattura XML saltata: SMTP non configurato.");
			return;
		}
		String xml = invoice.getXmlContent();
		if (xml == null || xml.isBlank()) {
			return;
		}
		String filename = invoice.getXmlFilename() != null && !invoice.getXmlFilename().isBlank()
				? invoice.getXmlFilename()
				: "fattura.xml";
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to.trim());
			helper.setSubject("Fattura elettronica pronta — " + invoice.getInvoiceNumber());
			helper.setText(buildBody(invoice), false);
			helper.addAttachment(filename, new ByteArrayResource(xml.getBytes(StandardCharsets.UTF_8)), "application/xml");
			javaMailSender.send(message);
			invoice.setAdminNotifiedAt(Instant.now());
			LOG.info("FatturaPA inviata a admin email invoiceNumber={}", invoice.getInvoiceNumber());
		}
		catch (Exception ex) {
			LOG.warn("Invio email fattura XML fallito invoiceNumber={}: {}", invoice.getInvoiceNumber(), ex.getMessage());
		}
	}

	private static String buildBody(VelvetFiscalInvoice invoice) {
		return """
				È stata generata una fattura elettronica FatturaPA per un pagamento abbonamento Premium.

				Numero fattura: %s
				Data: %s
				Importo: %s %s
				Cliente: %s
				Stripe invoice: %s

				In allegato trovi il file XML da caricare gratuitamente sul portale Fatture e Corrispettivi dell'Agenzia delle Entrate (SPID/CIE):
				https://ivaservizi.agenziaentrate.gov.it/portale/web/guest/home

				Dopo l'invio allo SDI, conserva la ricevuta di consegna del Sistema di Interscambio.
				""".formatted(
				invoice.getInvoiceNumber(),
				invoice.getInvoiceDate(),
				FatturaPaXmlBuilder.formatMoney(invoice.getAmountCents()),
				invoice.getCurrency(),
				invoice.getRecipientLegalName(),
				invoice.getStripeInvoiceId());
	}
}
