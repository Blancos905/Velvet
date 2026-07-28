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
 * Email transazionale per conferma indirizzo in registrazione cliente / titolare salone.
 */
@Service
public class RegistrationEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(RegistrationEmailDispatchService.class);

	private final LuxuryMailProperties mailProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public RegistrationEmailDispatchService(
			LuxuryMailProperties mailProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchEmailVerification(
			String to, String displayName, String verificationUrl, RegistrationEmailAudience audience) {
		dispatchEmailVerification(to, displayName, verificationUrl, audience, false);
	}

	public void dispatchEmailVerification(
			String to,
			String displayName,
			String verificationUrl,
			RegistrationEmailAudience audience,
			boolean resend) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			log.debug("Email conferma registrazione saltata: indirizzo non valido to={}", to);
			return;
		}
		log.info("[Luxury conferma email] account={} audience={} resend={} link: {}", recipient, audience, resend, verificationUrl);

		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] conferma registrazione non inviata (luxury.mail.enabled=false): to={}. "
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
		boolean salonOwner = audience == RegistrationEmailAudience.SALON_OWNER;
		String subject = salonOwner
				? "Conferma l'email del tuo salone — Saloni Luxury"
				: "Conferma il tuo indirizzo email — Saloni Luxury";
		if (resend) {
			subject = subject + " (reinvio)";
		}
		String textBody = salonOwner
				? buildSalonOwnerTextBody(greeting, verificationUrl)
				: buildClientTextBody(greeting, verificationUrl);
		String htmlBody = RegistrationEmailHtml.buildVerificationEmail(greeting, verificationUrl, audience);

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
			log.info("[Luxury email] conferma registrazione inviata to={}", recipient);
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

	private static String buildClientTextBody(String greeting, String verificationUrl) {
		return """
				%s,

				Grazie per esserti registrato su Saloni Luxury.
				Per attivare l'account e accedere, conferma il tuo indirizzo email aprendo questo link:

				%s

				Se non hai richiesto la registrazione, ignora questo messaggio.

				Saloni Luxury
				"""
				.formatted(greeting, verificationUrl);
	}

	private static String buildSalonOwnerTextBody(String greeting, String verificationUrl) {
		return """
				%s,

				Grazie per aver registrato il tuo salone su Saloni Luxury.
				Per attivare l'account titolare e proseguire con il piano scelto, conferma il tuo indirizzo email:

				%s

				Se non hai richiesto la registrazione, ignora questo messaggio.

				Saloni Luxury
				"""
				.formatted(greeting, verificationUrl);
	}

	public void dispatchPremiumCheckoutContinuation(String to, String displayName, String checkoutUrl) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			log.debug("Email checkout Premium saltata: indirizzo non valido to={}", to);
			return;
		}
		log.info("[Luxury checkout Premium] account={} link: {}", recipient, checkoutUrl);

		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] checkout Premium non inviato (luxury.mail.enabled=false): to={}. Usa il link nel log sopra.",
					recipient);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email checkout Premium saltata: SMTP non configurato to={}", recipient);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(recipient)) {
			log.debug("Email checkout Premium saltata: destinatario non consegnabile to={}", recipient);
			return;
		}

		String greeting = displayName != null && !displayName.isBlank() ? displayName.trim() : "Ciao";
		String subject = "Completa il pagamento Premium — Saloni Luxury";
		String textBody = """
				%s,

				La tua email è confermata. Per attivare il salone Premium completa il pagamento sicuro su Stripe:

				%s

				Se non hai richiesto la registrazione Premium, ignora questo messaggio.

				Saloni Luxury
				"""
				.formatted(greeting, checkoutUrl);
		String htmlBody = RegistrationEmailHtml.buildPremiumCheckoutEmail(greeting, checkoutUrl);

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
			log.info("[Luxury email] checkout Premium inviato to={}", recipient);
		}
		catch (Exception ex) {
			log.warn("Invio email checkout Premium fallito to={}: {}", recipient, ex.getMessage());
		}
	}
}
