package it.luxury.notification.service;

import it.luxury.config.LuxuryMailProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Email transazionale per recupero password account consumer/titolare/staff.
 */
@Service
public class PasswordResetEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(PasswordResetEmailDispatchService.class);

	private final LuxuryMailProperties mailProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public PasswordResetEmailDispatchService(
			LuxuryMailProperties mailProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchPasswordReset(String to, @Nullable String displayName, String resetUrl) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			log.debug("Email recupero password saltata: indirizzo non valido to={}", to);
			return;
		}
		log.info("[Luxury recupero password] account={} link: {}", recipient, resetUrl);

		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] recupero password non inviata (luxury.mail.enabled=false): to={}. "
							+ "Usa il link nel log sopra oppure configura SMTP.",
					recipient);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email recupero password saltata: SMTP non configurato to={}", recipient);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(recipient)) {
			log.debug("Email recupero password saltata: destinatario non consegnabile to={}", recipient);
			return;
		}

		String greeting = displayName != null && !displayName.isBlank() ? displayName.trim() : "Ciao";
		String subject = "Reimposta la password — Saloni Luxury";
		String textBody = """
				%s,

				Hai richiesto di reimpostare la password del tuo account Saloni Luxury.
				Apri questo link per scegliere una nuova password (valido per un tempo limitato):

				%s

				Se non hai richiesto il recupero password, ignora questo messaggio.

				Saloni Luxury
				"""
				.formatted(greeting, resetUrl);
		String htmlBody = PasswordResetEmailHtml.buildResetEmail(greeting, resetUrl);

		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(recipient);
			helper.setSubject(subject);
			helper.setText(textBody, htmlBody);
			ClassPathResource logo = new ClassPathResource("email/logo-saloni-luxury.png");
			if (logo.exists()) {
				helper.addInline(
						TransactionalBookingEmailHtml.LOGO_CONTENT_ID,
						logo,
						"image/png");
			}
			else {
				log.warn("Logo email non trovato in classpath: email/logo-saloni-luxury.png");
			}
			javaMailSender.send(message);
			log.info("[Luxury email] recupero password inviata to={}", recipient);
		}
		catch (Exception ex) {
			if (TransactionalEmailDeliverability.isRecipientRejection(ex)) {
				log.debug(
						"Email recupero password non consegnata (destinatario rifiutato da SMTP) to={}: {}",
						recipient,
						ex.getMessage());
			}
			else {
				log.warn("Invio email recupero password fallito to={}: {}", recipient, ex.getMessage());
			}
		}
	}
}
