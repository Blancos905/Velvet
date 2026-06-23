package it.velvet.notification.service;

import it.velvet.config.VelvetMailProperties;
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
 * Email transazionale per conferma indirizzo in registrazione cliente / titolare salone.
 */
@Service
public class RegistrationEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(RegistrationEmailDispatchService.class);

	private final VelvetMailProperties mailProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public RegistrationEmailDispatchService(
			VelvetMailProperties mailProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchEmailVerification(String to, String displayName, String verificationUrl) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			log.debug("Email conferma registrazione saltata: indirizzo non valido to={}", to);
			return;
		}
		log.info("[Velvet conferma email] account={} link: {}", recipient, verificationUrl);

		if (!mailProperties.isEnabled()) {
			log.info(
					"[Velvet email] conferma registrazione non inviata (velvet.mail.enabled=false): to={}. "
							+ "Usa il link nel log sopra oppure configura SMTP.",
					recipient);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email conferma registrazione saltata: SMTP non configurato to={}", recipient);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(recipient)) {
			log.debug("Email conferma registrazione saltata: destinatario non consegnabile to={}", recipient);
			return;
		}

		String greeting = displayName != null && !displayName.isBlank() ? displayName.trim() : "Ciao";
		String subject = "Conferma il tuo indirizzo email — Saloni Luxury";
		String textBody = """
				%s,

				Grazie per esserti registrato su Saloni Luxury.
				Per attivare l'account e accedere, conferma il tuo indirizzo email aprendo questo link:

				%s

				Se non hai richiesto la registrazione, ignora questo messaggio.

				Saloni Luxury
				"""
				.formatted(greeting, verificationUrl);
		String htmlBody = RegistrationEmailHtml.buildVerificationEmail(greeting, verificationUrl);

		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(recipient);
			helper.setSubject(subject);
			helper.setText(textBody, htmlBody);
			helper.addInline(
					TransactionalBookingEmailHtml.LOGO_CONTENT_ID,
					new ClassPathResource("email/logo-saloni-luxury.png"),
					"image/png");
			javaMailSender.send(message);
			log.info("[Velvet email] conferma registrazione inviata to={}", recipient);
		}
		catch (Exception ex) {
			if (TransactionalEmailDeliverability.isRecipientRejection(ex)) {
				log.debug(
						"Email conferma registrazione non consegnata (destinatario rifiutato da SMTP) to={}: {}",
						recipient,
						ex.getMessage());
			}
			else {
				log.warn("Invio email conferma registrazione fallito to={}: {}", recipient, ex.getMessage());
			}
		}
	}
}
