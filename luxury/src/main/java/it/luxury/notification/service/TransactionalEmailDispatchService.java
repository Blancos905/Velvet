package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.config.LuxuryMailProperties;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.domain.NotificationType;
import it.luxury.security.AppointmentTokenService;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

/**
 * Invio email transazionali al cliente (conferma prenotazione e promemoria).
 * Disabilitato in dev finché {@code luxury.mail.enabled=true} e SMTP sono configurati.
 */
@Service
public class TransactionalEmailDispatchService {

	private static final Logger log = LoggerFactory.getLogger(TransactionalEmailDispatchService.class);

	private static final Set<NotificationType> EMAIL_TYPES = Set.of(
			NotificationType.BOOKING_CONFIRMATION,
			NotificationType.BOOKING_UPDATED,
			NotificationType.BOOKING_CANCELLED_BY_CONSUMER,
			NotificationType.BOOKING_CANCELLED_BY_SALON,
			NotificationType.BOOKING_REQUEST_REJECTED,
			NotificationType.REMINDER_24H,
			NotificationType.REMINDER_1H,
			NotificationType.REVIEW_INVITE);

	private final LuxuryMailProperties mailProperties;
	private final LuxuryNotificationProperties notificationProperties;
	@Nullable
	private final AppointmentTokenService appointmentTokenService;
	@Nullable
	private final JavaMailSender javaMailSender;

	public TransactionalEmailDispatchService(
			LuxuryMailProperties mailProperties,
			LuxuryNotificationProperties notificationProperties,
			@Nullable AppointmentTokenService appointmentTokenService,
			@Nullable JavaMailSender javaMailSender) {
		this.mailProperties = mailProperties;
		this.notificationProperties = notificationProperties;
		this.appointmentTokenService = appointmentTokenService;
		this.javaMailSender = javaMailSender;
	}

	static boolean supportsConsumerEmail(NotificationType type) {
		return EMAIL_TYPES.contains(type);
	}

	/** Invio immediato email cliente (es. annullamento senza passare dalla coda). */
	public void dispatchConsumerAppointmentEmail(NotificationType type, Appointment appointment) {
		if (appointment == null || type == null || !EMAIL_TYPES.contains(type)) {
			return;
		}
		String subject = BookingNotificationEmailContent.buildSubject(type, appointment);
		String body = BookingNotificationEmailContent.buildPlainBody(
				type, appointment, notificationProperties, appointmentTokenService);
		String htmlBody = resolveHtmlBody(type, appointment);
		dispatchForBookingNotification(type, appointment, subject, body, htmlBody);
	}

	private String resolveHtmlBody(NotificationType type, Appointment appointment) {
		if (type == NotificationType.REVIEW_INVITE) {
			return BookingNotificationEmailContent.buildReviewInviteHtmlBody(
					appointment, notificationProperties, appointmentTokenService);
		}
		return BookingNotificationEmailContent.buildHtmlBody(type, appointment, notificationProperties);
	}

	public void dispatchForBookingNotification(
			NotificationType type,
			Appointment appointment,
			String subject,
			String body) {
		dispatchForBookingNotification(type, appointment, subject, body, null);
	}

	public void dispatchForBookingNotification(
			NotificationType type,
			Appointment appointment,
			String subject,
			String body,
			String htmlBody) {
		if (appointment == null || type == null || !EMAIL_TYPES.contains(type)) {
			return;
		}
		if (!mailProperties.isEnabled()) {
			log.info(
					"[Luxury email] non inviata (luxury.mail.enabled=false): type={} appointmentId={} to={} subject={}. "
							+ "In dev configura SMTP in luxury/spring-dev.local.env e riavvia il backend.",
					type,
					appointment.getId(),
					resolveRecipientEmail(type, appointment),
					subject);
			return;
		}
		if (javaMailSender == null) {
			log.warn(
					"Email transazionale saltata: SMTP non configurato (imposta spring.mail.host e credenziali). type={}",
					type);
			return;
		}
		String to = resolveRecipientEmail(type, appointment);
		if (to == null) {
			log.debug(
					"Email transazionale saltata: nessun indirizzo cliente per appointmentId={} type={}.",
					appointment.getId(),
					type);
			return;
		}
		if (TransactionalEmailDeliverability.shouldSkipBeforeSmtp(to)) {
			log.debug(
					"Email transazionale saltata: destinatario di test o dominio non consegnabile appointmentId={} to={} type={}.",
					appointment.getId(),
					to,
					type);
			return;
		}
		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			boolean multipart = htmlBody != null && !htmlBody.isBlank();
			MimeMessageHelper helper = new MimeMessageHelper(message, multipart, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			helper.setSubject(subject);
			if (htmlBody != null && !htmlBody.isBlank()) {
				helper.setText(body, htmlBody);
				helper.addInline(
						TransactionalBookingEmailHtml.LOGO_CONTENT_ID,
						new ClassPathResource("email/logo-saloni-luxury.png"),
						"image/png");
			}
			else {
				helper.setText(body, false);
			}
			javaMailSender.send(message);
			log.info(
					"[Luxury email] type={} appointmentId={} to={} subject={}",
					type,
					appointment.getId(),
					to,
					subject);
		}
		catch (Exception ex) {
			if (TransactionalEmailDeliverability.isRecipientRejection(ex)) {
				log.debug(
						"Email transazionale non consegnata (destinatario rifiutato da SMTP, flusso non bloccato) type={} appointmentId={} to={}: {}",
						type,
						appointment.getId(),
						to,
						ex.getMessage());
			}
			else {
				log.warn(
						"Invio email transazionale fallito type={} appointmentId={} to={}: {}",
						type,
						appointment.getId(),
						to,
						ex.getMessage());
			}
		}
	}

	/**
	 * Per i promemoria solo l'email del {@link ConsumerProfile} collegato all'appuntamento.
	 * Per la conferma: profilo consumer, altrimenti email anagrafica {@code SalonClient}.
	 */
	static String resolveRecipientEmail(NotificationType type, Appointment appointment) {
		if (type == NotificationType.REMINDER_24H || type == NotificationType.REMINDER_1H) {
			return normalizeEmail(consumerEmail(appointment.getConsumerProfile()));
		}
		if (type == NotificationType.BOOKING_CONFIRMATION
				|| type == NotificationType.BOOKING_UPDATED
				|| type == NotificationType.BOOKING_CANCELLED_BY_CONSUMER
				|| type == NotificationType.BOOKING_CANCELLED_BY_SALON
				|| type == NotificationType.BOOKING_REQUEST_REJECTED
				|| type == NotificationType.REVIEW_INVITE) {
			String fromConsumer = normalizeEmail(consumerEmail(appointment.getConsumerProfile()));
			if (fromConsumer != null) {
				return fromConsumer;
			}
			if (appointment.getSalonClient() != null) {
				return normalizeEmail(appointment.getSalonClient().getEmail());
			}
		}
		return null;
	}

	private static String consumerEmail(ConsumerProfile profile) {
		return profile == null ? null : profile.getEmail();
	}

	static String normalizeEmail(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String trimmed = raw.trim().toLowerCase(Locale.ROOT);
		if (!trimmed.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
			return null;
		}
		return trimmed;
	}
}
