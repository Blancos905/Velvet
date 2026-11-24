package it.luxury.notification.service;

import it.luxury.config.LuxuryMailProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Email interna a {@code assistenza@} quando un utente invia una richiesta dal form Assistenza.
 */
@Service
public class SupportRequestEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(SupportRequestEmailDispatchService.class);

	private final LuxuryMailProperties mailProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public SupportRequestEmailDispatchService(
			LuxuryMailProperties mailProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchSupportRequest(
			String subject,
			String messageBody,
			String requesterName,
			@Nullable String requesterEmail,
			@Nullable String roles,
			boolean fromSalonSide) {
		dispatchSupportRequest(subject, messageBody, requesterName, requesterEmail, roles, fromSalonSide, null);
	}

	/** {@code overrideTo} solo per anteprime locali; in produzione lasciare {@code null} → assistenza@. */
	public void dispatchSupportRequest(
			String subject,
			String messageBody,
			String requesterName,
			@Nullable String requesterEmail,
			@Nullable String roles,
			boolean fromSalonSide,
			@Nullable String overrideTo) {
		String to = TransactionalEmailDispatchService.normalizeEmail(
				overrideTo != null && !overrideTo.isBlank()
						? overrideTo
						: mailProperties.getSupportNotificationTo());
		if (to == null) {
			log.warn("Email assistenza saltata: destinatario luxury.mail.support-notification-to non valido.");
			return;
		}
		String cleanSubject = subject == null || subject.isBlank() ? "Richiesta assistenza" : subject.trim();
		String cleanBody = messageBody == null ? "" : messageBody.trim();
		String name = requesterName == null || requesterName.isBlank() ? "n/d" : requesterName.trim();
		String email = requesterEmail == null || requesterEmail.isBlank() ? "n/d" : requesterEmail.trim();
		String mailSubject = "Assistenza — " + cleanSubject;
		String plain = """
				Nuova richiesta assistenza da area account.

				Oggetto: %s
				Richiedente: %s
				Email: %s
				Tipo: %s
				Ruoli: %s

				Messaggio:
				%s
				"""
				.formatted(
						cleanSubject,
						name,
						email,
						fromSalonSide ? "Titolare / staff salone" : "Cliente",
						roles == null || roles.isBlank() ? "n/d" : roles,
						cleanBody.isEmpty() ? "(vuoto)" : cleanBody);
		String html = SupportRequestEmailHtml.build(
				cleanSubject, cleanBody.isEmpty() ? "(nessun testo)" : cleanBody, name, email, roles, fromSalonSide);

		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] assistenza non inviata (luxury.mail.enabled=false): to={} subject={}",
					to,
					mailSubject);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email assistenza saltata: SMTP non configurato. to={}", to);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(to)) {
			log.debug("Email assistenza saltata: destinatario non consegnabile to={}", to);
			return;
		}
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			String replyTo = TransactionalEmailDispatchService.normalizeEmail(requesterEmail);
			if (replyTo != null) {
				helper.setReplyTo(replyTo);
			}
			helper.setSubject(mailSubject);
			LuxuryEmailMimeSupport.setMultipartWithLogo(helper, plain, html);
			javaMailSender.send(message);
			log.info("[Luxury email] kind=support-request to={} subject={}", to, mailSubject);
		}
		catch (Exception ex) {
			if (TransactionalEmailDeliverability.isRecipientRejection(ex)) {
				log.debug("Email assistenza non consegnata to={}: {}", to, ex.getMessage());
			}
			else {
				log.warn("Invio email assistenza fallito to={}: {}", to, ex.getMessage());
			}
		}
	}
}
