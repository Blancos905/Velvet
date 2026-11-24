package it.luxury.billing.service;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.domain.SalonBillingProfileRepository;
import it.luxury.billing.validation.SalonBillingProfileValidator;
import it.luxury.config.LuxuryMailProperties;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.notification.service.LuxuryEmailMimeSupport;
import it.luxury.notification.service.TransactionalBookingEmailHtml;
import it.luxury.studio.domain.StudioGroup;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Email transazionali al titolare: pagamento, fallimento addebito, rinnovo, disdetta, avviso cancellazione. */
@Service
public class SalonBillingEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(SalonBillingEmailDispatchService.class);

	private static final ZoneId ITALY = ZoneId.of("Europe/Rome");
	private static final DateTimeFormatter ITALIAN_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ITALIAN);
	private static final DateTimeFormatter ITALIAN_DATE_TIME = DateTimeFormatter.ofPattern("d MMMM yyyy 'alle' HH:mm", Locale.ITALIAN);

	private static final Set<String> SKIP_EMAIL_DOMAINS = Set.of(
			"test.com",
			"example.com",
			"example.org",
			"example.net",
			"invalid",
			"localhost");

	private final LuxuryMailProperties mailProperties;
	private final LuxuryNotificationProperties notificationProperties;
	private final SalonBillingProfileRepository billingProfileRepository;
	@Nullable
	private final JavaMailSender javaMailSender;

	public SalonBillingEmailDispatchService(
			LuxuryMailProperties mailProperties,
			LuxuryNotificationProperties notificationProperties,
			SalonBillingProfileRepository billingProfileRepository,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.notificationProperties = notificationProperties;
		this.billingProfileRepository = billingProfileRepository;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchPaymentThankYou(
			StudioGroup group,
			long amountPaidCents,
			String currencyCode,
			@Nullable Instant periodEnd) {
		String to = resolveSalonBillingEmail(group);
		if (to == null) {
			log.debug("Email pagamento abbonamento saltata: nessun indirizzo studioGroupId={}.", group.getId());
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		String amountLine = amountPaidCents > 0 ? formatMoney(amountPaidCents, currencyCode) : null;
		String periodLine = periodEnd != null ? formatInstantDate(periodEnd) : null;
		String profileUrl = profileUrl();
		boolean paidNow = amountPaidCents > 0;
		String subject = paidNow
				? "Grazie — pagamento abbonamento Premium confermato"
				: "Grazie — abbonamento Premium attivato";
		String introLine = paidNow
				? "Pagamento Premium confermato."
				: "Abbonamento Premium attivato.";
		String plainPaymentLine = paidNow
				? "Importo addebitato: " + amountLine + "\n"
				: "";
		String plainPeriodLine = periodLine != null
				? "Prossimo rinnovo: " + periodLine + "\n"
				: "";
		String body = """
				Grazie per aver scelto l'abbonamento Premium Saloni Luxury.

				Salone: %s
				%s%sPiano: Premium — tutte le funzionalità attive

				Gestisci metodo di pagamento e fatture dal tuo profilo:
				%s

				Per assistenza scrivi a supporto@saloniluxury.it
				""".formatted(salonName, plainPaymentLine, plainPeriodLine, profileUrl);
		String htmlBody = TransactionalBookingEmailHtml.buildPremiumSubscriptionThankYouEmail(
				introLine,
				salonName,
				amountLine,
				periodLine,
				profileUrl,
				"Gestisci abbonamento");
		sendTransactional(to, subject, body, htmlBody, "billing-payment-thank-you", group.getId());
	}

	/**
	 * Ricevuta PDF al titolare dopo pagamento reale (oltre thank-you HTML).
	 * Non sostituisce FatturaPA (XML solo admin).
	 */
	public void dispatchPaymentReceiptPdf(
			StudioGroup group,
			long amountPaidCents,
			String currencyCode,
			@Nullable Instant paidAt,
			@Nullable String stripeInvoiceId) {
		if (amountPaidCents <= 0) {
			return;
		}
		String to = resolveSalonBillingEmail(group);
		if (to == null) {
			log.debug("Email ricevuta PDF saltata: nessun indirizzo studioGroupId={}.", group.getId());
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		String amountLine = formatMoney(amountPaidCents, currencyCode);
		Instant when = paidAt != null ? paidAt : Instant.now();
		String paidOn = formatInstantDateTime(when);
		String invoiceRef = stripeInvoiceId != null && !stripeInvoiceId.isBlank()
				? stripeInvoiceId.trim()
				: "n/d";
		String receiptNumber = "RCV-"
				+ LocalDate.now(ITALY).getYear()
				+ "-"
				+ (invoiceRef.length() > 8 ? invoiceRef.substring(invoiceRef.length() - 8) : invoiceRef)
						.toUpperCase(Locale.ROOT);
		String legalName = billingProfileRepository.findByStudioGroup_Id(group.getId())
				.map(SalonBillingProfile::getLegalName)
				.filter(n -> n != null && !n.isBlank())
				.orElse(null);
		byte[] pdf = SalonPremiumReceiptPdfBuilder.build(
				receiptNumber, salonName, amountLine, when, invoiceRef, legalName);
		String filename = "ricevuta-premium-" + receiptNumber.toLowerCase(Locale.ROOT) + ".pdf";
		String profileUrl = profileUrl();
		String subject = "Ricevuta pagamento Premium — " + salonName;
		String plain = """
				In allegato la ricevuta PDF del pagamento Premium Saloni Luxury.

				Salone: %s
				Importo: %s
				Pagato il: %s
				Ricevuta: %s

				La fattura elettronica FatturaPA è gestita dall'amministrazione della piattaforma.

				Gestisci abbonamento: %s
				""".formatted(salonName, amountLine, paidOn, receiptNumber, profileUrl);
		String htmlBody = TransactionalBookingEmailHtml.buildPremiumPaymentReceiptEmail(
				salonName, amountLine, paidOn, receiptNumber, profileUrl);
		sendTransactionalWithPdf(
				to, subject, plain, htmlBody, pdf, filename, "billing-payment-receipt-pdf", group.getId());
	}

	public void dispatchSubscriptionCancellationConfirmed(StudioGroup group, @Nullable Instant accessUntil) {
		String to = resolveSalonBillingEmail(group);
		if (to == null) {
			log.debug("Email disdetta abbonamento saltata: nessun indirizzo studioGroupId={}.", group.getId());
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		boolean scheduledEnd = accessUntil != null;
		String accessPlain = scheduledEnd
				? "Il piano Premium resterà attivo fino al "
						+ formatInstantDateTime(accessUntil)
						+ ". Dopo questa data il profilo verrà bloccato.\n\n"
						+ "Se non riattivi Premium entro 30 giorni dalla scadenza dell'abbonamento, "
						+ "il profilo del salone verrà cancellato automaticamente.\n\n"
				: "L'abbonamento Premium è stato disattivato.\n\n"
						+ "Se non riattivi Premium entro 30 giorni, il profilo del salone verrà cancellato automaticamente.\n\n";
		String accessDetail = scheduledEnd
				? "attivo fino al " + formatInstantDateTime(accessUntil)
				: "disattivato";
		String planDetail = scheduledEnd
				? "Dopo la scadenza: profilo bloccato · cancellazione entro 30 giorni se non riattivi"
				: "Abbonamento non attivo · riattiva il profilo entro 30 giorni";
		String introLine = scheduledEnd
				? "Disdetta Premium registrata."
				: "Abbonamento Premium disattivato.";
		String profileUrl = profileUrl();
		String subject = "Conferma disdetta abbonamento Premium";
		String body = """
				Abbiamo registrato la disdetta del tuo abbonamento Premium Saloni Luxury.

				Salone: %s

				%sPuoi riattivare Premium in qualsiasi momento dal tuo profilo:
				%s

				Per assistenza scrivi a supporto@saloniluxury.it
				""".formatted(salonName, accessPlain, profileUrl);
		String htmlBody = TransactionalBookingEmailHtml.buildPremiumSubscriptionCancellationEmail(
				introLine,
				salonName,
				accessDetail,
				planDetail,
				profileUrl,
				"Riattiva Premium");
		sendTransactional(to, subject, body, htmlBody, "billing-subscription-cancelled", group.getId());
	}

	public void dispatchPaymentFailed(StudioGroup group, long amountDueCents, String currencyCode) {
		String to = resolveSalonBillingEmail(group);
		if (to == null) {
			log.debug("Email pagamento fallito saltata: nessun indirizzo studioGroupId={}.", group.getId());
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		String amountLine = amountDueCents > 0 ? formatMoney(amountDueCents, currencyCode) : null;
		String profileUrl = profileUrl();
		String subject = "Pagamento Premium non riuscito — aggiorna il metodo";
		String plainAmount = amountLine != null ? "Importo non addebitato: " + amountLine + "\n" : "";
		String body = """
				Non siamo riusciti ad addebitare il rinnovo dell'abbonamento Premium Saloni Luxury.

				Salone: %s
				%s
				Aggiorna il metodo di pagamento dal tuo profilo:
				%s

				Per assistenza scrivi a supporto@saloniluxury.it
				""".formatted(salonName, plainAmount, profileUrl);
		String htmlBody = TransactionalBookingEmailHtml.buildPremiumPaymentFailedEmail(salonName, amountLine, profileUrl);
		sendTransactional(to, subject, body, htmlBody, "billing-payment-failed", group.getId());
	}

	public void dispatchRenewalReminder(
			StudioGroup group,
			@Nullable Instant renewOn,
			@Nullable Long amountCents,
			@Nullable String currencyCode) {
		String to = resolveSalonBillingEmail(group);
		if (to == null) {
			log.debug("Email rinnovo Premium saltata: nessun indirizzo studioGroupId={}.", group.getId());
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		String renewLine = renewOn != null ? formatInstantDate(renewOn) : null;
		String amountLine = amountCents != null && amountCents > 0
				? formatMoney(amountCents, currencyCode != null ? currencyCode : "eur")
				: null;
		String profileUrl = profileUrl();
		String subject = "Prossimo rinnovo Premium — Saloni Luxury";
		String plainRenew = renewLine != null ? "Data rinnovo: " + renewLine + "\n" : "";
		String plainAmount = amountLine != null ? "Importo previsto: " + amountLine + "\n" : "";
		String body = """
				Ti ricordiamo che l'abbonamento Premium si rinnoverà a breve.

				Salone: %s
				%s%s
				Gestisci abbonamento dal profilo:
				%s

				Per assistenza scrivi a supporto@saloniluxury.it
				""".formatted(salonName, plainRenew, plainAmount, profileUrl);
		String htmlBody = TransactionalBookingEmailHtml.buildPremiumRenewalReminderEmail(
				salonName, renewLine, amountLine, profileUrl);
		sendTransactional(to, subject, body, htmlBody, "billing-renewal-reminder", group.getId());
	}

	public void dispatchSalonDeletionWarning(StudioGroup group, Instant deletionAt) {
		String to = resolveSalonBillingEmail(group);
		if (to == null) {
			log.debug("Email avviso cancellazione salone saltata: nessun indirizzo studioGroupId={}.", group.getId());
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		String deletionLine = formatInstantDateTime(deletionAt);
		String profileUrl = profileUrl();
		String subject = "Il salone verrà cancellato a breve — Saloni Luxury";
		String body = """
				Il periodo di grazia dopo la disdetta Premium sta per scadere.

				Salone: %s
				Cancellazione prevista: %s

				Riattiva Premium prima di questa data per conservare il profilo:
				%s

				Per assistenza scrivi a supporto@saloniluxury.it
				""".formatted(salonName, deletionLine, profileUrl);
		String htmlBody = TransactionalBookingEmailHtml.buildSalonDeletionWarningEmail(
				salonName, deletionLine, profileUrl);
		sendTransactional(to, subject, body, htmlBody, "billing-salon-deletion-warning", group.getId());
	}

	private void sendTransactional(
			String to,
			String subject,
			String plainBody,
			@Nullable String htmlBody,
			String kind,
			UUID studioGroupId) {
		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] non inviata (luxury.mail.enabled=false): kind={} studioGroupId={} to={} subject={}.",
					kind,
					studioGroupId,
					to,
					subject);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email fatturazione saltata: SMTP non configurato. kind={} studioGroupId={}.", kind, studioGroupId);
			return;
		}
		if (shouldSkipBeforeSmtp(to)) {
			log.debug(
					"Email fatturazione saltata: destinatario di test o dominio non consegnabile kind={} studioGroupId={} to={}.",
					kind,
					studioGroupId,
					to);
			return;
		}
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			boolean multipart = htmlBody != null && !htmlBody.isBlank();
			MimeMessageHelper helper = new MimeMessageHelper(message, multipart, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			helper.setSubject(subject);
			if (multipart) {
				helper.setText(plainBody, htmlBody);
				helper.addInline(
						TransactionalBookingEmailHtml.LOGO_CONTENT_ID,
						new ClassPathResource("email/logo-saloni-luxury.png"),
						"image/png");
			}
			else {
				helper.setText(plainBody, false);
			}
			javaMailSender.send(message);
			log.info("[Luxury email] kind={} studioGroupId={} to={} subject={}", kind, studioGroupId, to, subject);
		}
		catch (Exception ex) {
			if (isRecipientRejection(ex)) {
				log.debug(
						"Email fatturazione non consegnata (destinatario rifiutato da SMTP) kind={} studioGroupId={} to={}: {}",
						kind,
						studioGroupId,
						to,
						ex.getMessage());
			}
			else {
				log.warn(
						"Invio email fatturazione fallito kind={} studioGroupId={} to={}: {}",
						kind,
						studioGroupId,
						to,
						ex.getMessage());
			}
		}
	}

	private void sendTransactionalWithPdf(
			String to,
			String subject,
			String plainBody,
			String htmlBody,
			byte[] pdfBytes,
			String pdfFilename,
			String kind,
			UUID studioGroupId) {
		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] non inviata (luxury.mail.enabled=false): kind={} studioGroupId={} to={} subject={}.",
					kind,
					studioGroupId,
					to,
					subject);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email fatturazione saltata: SMTP non configurato. kind={} studioGroupId={}.", kind, studioGroupId);
			return;
		}
		if (shouldSkipBeforeSmtp(to) || pdfBytes == null || pdfBytes.length == 0) {
			return;
		}
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			helper.setSubject(subject);
			LuxuryEmailMimeSupport.setMultipartWithLogo(helper, plainBody, htmlBody);
			helper.addAttachment(pdfFilename, new ByteArrayResource(pdfBytes), "application/pdf");
			javaMailSender.send(message);
			log.info("[Luxury email] kind={} studioGroupId={} to={} subject={}", kind, studioGroupId, to, subject);
		}
		catch (Exception ex) {
			if (isRecipientRejection(ex)) {
				log.debug(
						"Email fatturazione non consegnata (destinatario rifiutato da SMTP) kind={} studioGroupId={} to={}: {}",
						kind,
						studioGroupId,
						to,
						ex.getMessage());
			}
			else {
				log.warn(
						"Invio email fatturazione fallito kind={} studioGroupId={} to={}: {}",
						kind,
						studioGroupId,
						to,
						ex.getMessage());
			}
		}
	}

	private String resolveSalonBillingEmail(StudioGroup group) {
		String fromProfile = billingProfileRepository.findByStudioGroup_Id(group.getId())
				.map(SalonBillingProfile::getBillingEmail)
				.map(SalonBillingEmailDispatchService::normalizeEmail)
				.orElse(null);
		if (fromProfile != null) {
			return fromProfile;
		}
		return normalizeEmail(group.getOwnerEmail());
	}

	private String profileUrl() {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			return "https://saloniluxury.it/account/profilo";
		}
		return base.replaceAll("/+$", "") + "/account/profilo";
	}

	private static String formatMoney(long amountCents, String currencyCode) {
		String code = currencyCode != null ? currencyCode.trim().toUpperCase(Locale.ROOT) : "EUR";
		double amount = amountCents / 100.0;
		if ("EUR".equals(code)) {
			return String.format(Locale.ITALIAN, "€ %.2f", amount);
		}
		return String.format(Locale.ITALIAN, "%.2f %s", amount, code);
	}

	private static String formatInstantDate(Instant instant) {
		return ITALIAN_DATE.format(instant.atZone(ITALY));
	}

	private static String formatInstantDateTime(Instant instant) {
		return ITALIAN_DATE_TIME.format(instant.atZone(ITALY));
	}

	private static String firstNonBlank(String value, String fallback) {
		if (value != null && !value.isBlank()) {
			return value.trim();
		}
		return fallback;
	}

	private static String normalizeEmail(String raw) {
		String normalized = SalonBillingProfileValidator.normalizeEmail(raw);
		if (normalized == null || !normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
			return null;
		}
		return normalized;
	}

	private static boolean shouldSkipBeforeSmtp(String normalizedEmail) {
		if (normalizedEmail == null || normalizedEmail.isBlank()) {
			return true;
		}
		int at = normalizedEmail.lastIndexOf('@');
		if (at < 0 || at == normalizedEmail.length() - 1) {
			return true;
		}
		return SKIP_EMAIL_DOMAINS.contains(normalizedEmail.substring(at + 1));
	}

	private static boolean isRecipientRejection(Throwable ex) {
		Throwable current = ex;
		while (current != null) {
			String message = current.getMessage();
			if (message != null) {
				String lower = message.toLowerCase(Locale.ROOT);
				if (lower.contains("invalid addresses")
						|| lower.contains("invalid destination domain")
						|| lower.contains("smtpaddressfailedexception")
						|| lower.contains("mailbox unavailable")
						|| lower.contains("user unknown")
						|| lower.contains("recipient address rejected")
						|| lower.contains("dominio non valido")) {
					return true;
				}
			}
			String simpleName = current.getClass().getSimpleName();
			if ("SendFailedException".equals(simpleName) || "SMTPAddressFailedException".equals(simpleName)) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}
}
