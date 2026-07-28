package it.luxury.notification.service;

import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonLuxuryChatSender;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.config.LuxuryMailProperties;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.util.UUID;

/**
 * Notifica email opzionale per nuovi messaggi chat salone ↔ cliente.
 * Se l'indirizzo manca, è di test o l'SMTP non è configurato, l'invio viene saltato senza bloccare la chat.
 */
@Service
public class SalonLuxuryChatEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(SalonLuxuryChatEmailDispatchService.class);

	private static final int PREVIEW_MAX = 200;

	private final LuxuryMailProperties mailProperties;
	private final LuxuryNotificationProperties notificationProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public SalonLuxuryChatEmailDispatchService(
			LuxuryMailProperties mailProperties,
			LuxuryNotificationProperties notificationProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.notificationProperties = notificationProperties;
		this.javaMailSender = javaMailSender;
	}

	public void dispatchNewChatMessage(
			SalonLuxuryChatSender sender,
			String messageBody,
			SalonClient salonClient,
			@Nullable StaffOperator threadOperator) {
		if (sender == null || salonClient == null) {
			return;
		}
		String to = sender == SalonLuxuryChatSender.CLIENT
				? resolveSalonRecipientEmail(salonClient, threadOperator)
				: resolveClientRecipientEmail(salonClient);
		if (to == null) {
			log.debug(
					"Email chat saltata: nessun indirizzo destinatario salonClientId={} sender={}.",
					salonClient.getId(),
					sender);
			return;
		}
		if (!mailProperties.isEnabled()) {
			log.debug("Email chat saltata: luxury.mail.enabled=false salonClientId={} to={}.", salonClient.getId(), to);
			return;
		}
		if (javaMailSender == null) {
			log.debug("Email chat saltata: SMTP non configurato salonClientId={} to={}.", salonClient.getId(), to);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(to)) {
			log.debug(
					"Email chat saltata: destinatario di test o dominio non consegnabile salonClientId={} to={}.",
					salonClient.getId(),
					to);
			return;
		}

		String subject = buildSubject(sender, salonClient, threadOperator);
		String plainBody = buildPlainBody(messageBody, salonClient, threadOperator);
		String htmlBody = buildHtmlBody(messageBody, salonClient, threadOperator);
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			helper.setSubject(subject);
			LuxuryEmailMimeSupport.setMultipartWithLogo(helper, plainBody, htmlBody);
			javaMailSender.send(message);
			log.info(
					"[Luxury email chat] salonClientId={} sender={} to={} subject={}",
					salonClient.getId(),
					sender,
					to,
					subject);
		}
		catch (Exception ex) {
			if (TransactionalEmailDeliverability.isRecipientRejection(ex)) {
				log.debug(
						"Email chat non consegnata (destinatario rifiutato da SMTP, flusso non bloccato) salonClientId={} to={}: {}",
						salonClient.getId(),
						to,
						ex.getMessage());
			}
			else {
				log.warn(
						"Invio email chat fallito salonClientId={} to={}: {}",
						salonClient.getId(),
						to,
						ex.getMessage());
			}
		}
	}

	static String resolveClientRecipientEmail(SalonClient salonClient) {
		if (salonClient.getConsumerProfile() != null) {
			String fromConsumer = TransactionalEmailDispatchService.normalizeEmail(
					salonClient.getConsumerProfile().getEmail());
			if (fromConsumer != null) {
				return fromConsumer;
			}
		}
		return TransactionalEmailDispatchService.normalizeEmail(salonClient.getEmail());
	}

	static String resolveSalonRecipientEmail(SalonClient salonClient, @Nullable StaffOperator threadOperator) {
		if (threadOperator != null) {
			ConsumerProfile staffProfile = threadOperator.getConsumerProfile();
			if (staffProfile != null) {
				String staffEmail = TransactionalEmailDispatchService.normalizeEmail(staffProfile.getEmail());
				if (staffEmail != null) {
					return staffEmail;
				}
			}
		}
		Location location = salonClient.getLocation();
		if (location == null) {
			return null;
		}
		StudioGroup group = location.getStudioGroup();
		if (group == null) {
			return null;
		}
		return TransactionalEmailDispatchService.normalizeEmail(group.getOwnerEmail());
	}

	private String buildSubject(
			SalonLuxuryChatSender sender, SalonClient salonClient, @Nullable StaffOperator threadOperator) {
		if (sender == SalonLuxuryChatSender.CLIENT) {
			String clientName = firstNonBlank(salonClient.getDisplayName(), "Cliente");
			return "Nuovo messaggio da " + clientName;
		}
		Location location = salonClient.getLocation();
		if (threadOperator != null) {
			String operatorName = firstNonBlank(threadOperator.getDisplayName(), "Operatore");
			String salonName = location != null ? firstNonBlank(location.getName(), "Salone") : "Salone";
			return "Nuovo messaggio da " + operatorName + " — " + salonName;
		}
		String salonName = location != null ? firstNonBlank(location.getName(), "Salone") : "Salone";
		return "Nuovo messaggio da " + salonName;
	}

	private String buildPlainBody(
			String messageBody,
			SalonClient salonClient,
			@Nullable StaffOperator threadOperator) {
		String preview = truncatePreview(messageBody);
		String chatUrl = buildChatUrl(salonClient.getId(), threadOperator != null ? threadOperator.getId() : null);
		return """
				Hai ricevuto un nuovo messaggio in chat su Saloni Luxury:

				"%s"

				Apri la conversazione: %s
				""".formatted(preview, chatUrl);
	}

	private String buildHtmlBody(
			String messageBody,
			SalonClient salonClient,
			@Nullable StaffOperator threadOperator) {
		String preview = truncatePreview(messageBody);
		String chatUrl = buildChatUrl(salonClient.getId(), threadOperator != null ? threadOperator.getId() : null);
		return SalonLuxuryChatEmailHtml.build(preview, chatUrl);
	}

	private String buildChatUrl(@Nullable UUID salonClientId, @Nullable UUID staffOperatorId) {
		String base = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		if (salonClientId == null) {
			return base + "/account/chat";
		}
		StringBuilder url = new StringBuilder(base)
				.append("/account/chat?salonClientId=")
				.append(URLEncoder.encode(salonClientId.toString(), StandardCharsets.UTF_8));
		if (staffOperatorId != null) {
			url.append("&staffOperatorId=")
					.append(URLEncoder.encode(staffOperatorId.toString(), StandardCharsets.UTF_8));
		}
		return url.toString();
	}

	private static String truncatePreview(String body) {
		if (body == null || body.isBlank()) {
			return "";
		}
		String oneLine = body.replaceAll("\\s+", " ").trim();
		if (oneLine.length() <= PREVIEW_MAX) {
			return oneLine;
		}
		return oneLine.substring(0, PREVIEW_MAX - 1) + "…";
	}

	private static String firstNonBlank(String value, String fallback) {
		if (value != null && !value.isBlank()) {
			return value.trim();
		}
		return fallback;
	}
}
