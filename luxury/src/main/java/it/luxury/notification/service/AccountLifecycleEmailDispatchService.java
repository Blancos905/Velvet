package it.luxury.notification.service;

import it.luxury.config.LuxuryMailProperties;
import it.luxury.config.LuxuryNotificationProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Email lifecycle account: benvenuto, eliminazione, password cambiata, invito staff.
 */
@Service
public class AccountLifecycleEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(AccountLifecycleEmailDispatchService.class);

	private final LuxuryMailProperties mailProperties;
	private final LuxuryNotificationProperties notificationProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public AccountLifecycleEmailDispatchService(
			LuxuryMailProperties mailProperties,
			LuxuryNotificationProperties notificationProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.notificationProperties = notificationProperties;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchWelcome(String to, @Nullable String displayName, boolean salonOwner) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			return;
		}
		String greeting = greeting(displayName);
		String ctaUrl = salonOwner ? accountUrl("/salone") : accountUrl("/");
		String subject = "Benvenuto su Saloni Luxury";
		String plain = greeting
				+ ",\n\n"
				+ (salonOwner
						? "Il tuo account titolare è attivo. Gestisci agenda e vetrina dal tuo salone:\n"
						: "Il tuo account è attivo. Cerca saloni e prenota online:\n")
				+ ctaUrl
				+ "\n\nPer assistenza: supporto@saloniluxury.it\n";
		String html = AccountLifecycleEmailHtml.buildWelcomeEmail(greeting, salonOwner, ctaUrl);
		send(recipient, subject, plain, html, "account-welcome");
	}

	public void dispatchAccountDeleted(String to, @Nullable String displayName) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			return;
		}
		String greeting = greeting(displayName);
		String subject = "Account eliminato — Saloni Luxury";
		String plain = greeting
				+ ",\n\nAbbiamo chiuso il tuo account Saloni Luxury come richiesto.\n"
				+ "I dati identificativi del profilo sono stati anonimizzati.\n\n"
				+ "Per assistenza: privacy@saloniluxury.it\n";
		String html = AccountLifecycleEmailHtml.buildAccountDeletedEmail(greeting);
		send(recipient, subject, plain, html, "account-deleted");
	}

	public void dispatchEmailChangeNotice(String to, @Nullable String displayName, String newEmail) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			return;
		}
		String greeting = greeting(displayName);
		String next = newEmail != null ? newEmail.trim() : "";
		String subject = "Richiesta di cambio email — Saloni Luxury";
		String plain = greeting
				+ ",\n\nÈ stata richiesta la modifica dell'email del tuo account.\n"
				+ "Nuovo indirizzo (non ancora verificato): "
				+ next
				+ "\nSe non sei stato tu, accedi e reimposta la password.\n\nPer assistenza: supporto@saloniluxury.it\n";
		String html = AccountLifecycleEmailHtml.buildEmailChangeNotice(greeting, next);
		send(recipient, subject, plain, html, "email-change-notice");
	}

	public void dispatchPasswordChanged(String to, @Nullable String displayName) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			return;
		}
		String greeting = greeting(displayName);
		String profileUrl = accountUrl("/account/profilo");
		String subject = "Password aggiornata — Saloni Luxury";
		String plain = greeting
				+ ",\n\nLa password del tuo account è stata modificata.\n"
				+ "Se non sei stato tu, reimposta subito la password da:\n"
				+ profileUrl
				+ "\n\nPer assistenza: supporto@saloniluxury.it\n";
		String html = AccountLifecycleEmailHtml.buildPasswordChangedEmail(greeting, profileUrl);
		send(recipient, subject, plain, html, "password-changed");
	}

	public void dispatchStaffInvite(
			String to,
			@Nullable String displayName,
			String salonName,
			String staffEmail) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			return;
		}
		String greeting = greeting(displayName);
		String salon = salonName != null && !salonName.isBlank() ? salonName.trim() : "il salone";
		String emailLabel = TransactionalEmailDispatchService.normalizeEmail(staffEmail);
		if (emailLabel == null) {
			emailLabel = recipient;
		}
		String loginUrl = accountUrl("/account");
		String subject = "Accesso staff creato — " + salon;
		String plain = greeting
				+ ",\n\nIl titolare di "
				+ salon
				+ " ti ha creato un accesso staff su Saloni Luxury.\n"
				+ "Email di accesso: "
				+ emailLabel
				+ "\nUsa la password comunicata dal titolare (non inviata via email).\n\n"
				+ "Accedi: "
				+ loginUrl
				+ "\n\nPer assistenza: supporto@saloniluxury.it\n";
		String html = AccountLifecycleEmailHtml.buildStaffInviteEmail(greeting, salon, emailLabel, loginUrl);
		send(recipient, subject, plain, html, "staff-invite");
	}

	public void dispatchNewDeviceLogin(
			String to,
			@Nullable String displayName,
			String deviceSummary,
			String ipAddress) {
		String recipient = TransactionalEmailDispatchService.normalizeEmail(to);
		if (recipient == null) {
			return;
		}
		String greeting = greeting(displayName);
		String device = deviceSummary != null && !deviceSummary.isBlank()
				? deviceSummary.trim()
				: "Browser o app sconosciuti";
		String ip = ipAddress != null && !ipAddress.isBlank() ? ipAddress.trim() : "sconosciuto";
		String profileUrl = accountUrl("/account/profilo");
		String subject = "Nuovo accesso al tuo account — Saloni Luxury";
		String plain = greeting
				+ ",\n\nAbbiamo rilevato un accesso da un nuovo dispositivo o browser.\n"
				+ "Dispositivo: "
				+ device
				+ "\nIP: "
				+ ip
				+ "\n\nSe sei stato tu, ignora questa email.\n"
				+ "Se non riconosci l'accesso, cambia subito la password:\n"
				+ profileUrl
				+ "\n\nPer assistenza: supporto@saloniluxury.it\n";
		String html = AccountLifecycleEmailHtml.buildNewDeviceLoginEmail(greeting, device, ip, profileUrl);
		send(recipient, subject, plain, html, "new-device-login");
	}

	private void send(String to, String subject, String plain, String html, String kind) {
		if (!mailProperties.isEnabled()) {
			log.info("[Luxury email] non inviata (luxury.mail.enabled=false): kind={} to={} subject={}", kind, to, subject);
			return;
		}
		if (javaMailSender == null) {
			log.warn("Email account saltata: SMTP non configurato. kind={} to={}", kind, to);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(to)) {
			log.debug("Email account saltata: destinatario non consegnabile kind={} to={}", kind, to);
			return;
		}
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			helper.setSubject(subject);
			LuxuryEmailMimeSupport.setMultipartWithLogo(helper, plain, html);
			javaMailSender.send(message);
			log.info("[Luxury email] kind={} to={} subject={}", kind, to, subject);
		}
		catch (Exception ex) {
			if (TransactionalEmailDeliverability.isRecipientRejection(ex)) {
				log.debug("Email account non consegnata kind={} to={}: {}", kind, to, ex.getMessage());
			}
			else {
				log.warn("Invio email account fallito kind={} to={}: {}", kind, to, ex.getMessage());
			}
		}
	}

	private String accountUrl(String path) {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			base = "https://saloniluxury.it";
		}
		String normalizedPath = path.startsWith("/") ? path : "/" + path;
		return base.replaceAll("/+$", "") + normalizedPath;
	}

	private static String greeting(@Nullable String displayName) {
		if (displayName != null && !displayName.isBlank()) {
			String trimmed = displayName.trim();
			int space = trimmed.indexOf(' ');
			return space > 0 ? trimmed.substring(0, space) : trimmed;
		}
		return "Ciao";
	}
}
