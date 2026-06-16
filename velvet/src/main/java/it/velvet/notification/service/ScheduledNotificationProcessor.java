package it.velvet.notification.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentStatus;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.QueuedNotificationStatus;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.review.ReviewEligibility;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.AppointmentTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;

/**
 * Elabora la coda notifiche transazionali: inbox in-app, push FCM, email SMTP (se configurata) e log backend.
 */
@Service
public class ScheduledNotificationProcessor {

	private static final Logger log = LoggerFactory.getLogger(ScheduledNotificationProcessor.class);

	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final VelvetNotificationProperties notificationProperties;
	private final AppointmentTokenService appointmentTokenService;
	private final ReviewRepository reviewRepository;
	private final FcmPushDispatchService fcmPushDispatchService;
	private final TransactionalEmailDispatchService transactionalEmailDispatchService;

	public ScheduledNotificationProcessor(
			ScheduledNotificationRepository scheduledNotificationRepository,
			VelvetNotificationProperties notificationProperties,
			AppointmentTokenService appointmentTokenService,
			ReviewRepository reviewRepository,
			FcmPushDispatchService fcmPushDispatchService,
			TransactionalEmailDispatchService transactionalEmailDispatchService) {
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.notificationProperties = notificationProperties;
		this.appointmentTokenService = appointmentTokenService;
		this.reviewRepository = reviewRepository;
		this.fcmPushDispatchService = fcmPushDispatchService;
		this.transactionalEmailDispatchService = transactionalEmailDispatchService;
	}

	@Transactional
	public void processDue() {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Instant now = Instant.now();
		var due = scheduledNotificationRepository.findDuePending(
				QueuedNotificationStatus.PENDING, now, PageRequest.of(0, 50));
		for (ScheduledNotification n : due) {
			try {
				processOne(n, now);
			}
			catch (RuntimeException e) {
				log.warn("Elaborazione notifica fallita id={}", n.getId(), e);
			}
		}
	}

	private void processOne(ScheduledNotification n, Instant now) {
		if (n.getStatus() != QueuedNotificationStatus.PENDING) {
			return;
		}
		if (n.getAppointment() == null) {
			/* Es. messaggi solo in-app: non devono restare PENDING. */
			n.setStatus(QueuedNotificationStatus.CANCELLED);
			return;
		}
		Appointment a = n.getAppointment();
		NotificationType type = n.getType();

		if (a.getStatus() == AppointmentStatus.CANCELLED) {
			if (type != NotificationType.BOOKING_CANCELLED_BY_CONSUMER
					&& type != NotificationType.BOOKING_CANCELLED_BY_SALON) {
				n.setStatus(QueuedNotificationStatus.CANCELLED);
				return;
			}
		}

		if (type == NotificationType.REVIEW_INVITE) {
			if (!ReviewEligibility.mayInviteOrSubmitReview(a, now, notificationProperties.getReviewInviteOffsetHours())) {
				n.setStatus(QueuedNotificationStatus.CANCELLED);
				return;
			}
			if (reviewRepository.findByAppointment_Id(a.getId()).isPresent()) {
				n.setStatus(QueuedNotificationStatus.CANCELLED);
				return;
			}
		}

		if ((type == NotificationType.REMINDER_24H || type == NotificationType.REMINDER_1H)
				&& !now.isBefore(a.getStart())) {
			n.setStatus(QueuedNotificationStatus.CANCELLED);
			return;
		}

		String toPhone = resolveRecipientPhone(type, a);
		String subject = buildSubject(type, a);
		String body = buildBody(type, a);
		String htmlBody = buildHtmlEmailBody(type, a);

		String toEmail = TransactionalEmailDispatchService.resolveRecipientEmail(type, a);
		logDelivery(type, a.getId(), toPhone, toEmail, subject, body);
		fcmPushDispatchService.dispatchForScheduledNotification(n, subject, body);
		transactionalEmailDispatchService.dispatchForBookingNotification(type, a, subject, body, htmlBody);

		n.markSent(Instant.now());
	}

	private void logDelivery(
			NotificationType type,
			java.util.UUID appointmentId,
			String toPhone,
			String toEmail,
			String subject,
			String body) {
		log.info(
				"[Velvet notifica] type={} appointmentId={} toPhone={} toEmail={} subject={}",
				type,
				appointmentId,
				toPhone == null || toPhone.isBlank() ? "(nessun telefono)" : toPhone,
				toEmail == null || toEmail.isBlank() ? "(nessuna email)" : toEmail,
				subject);
		log.debug("[Velvet notifica body]\n{}", body);
	}

	/**
	 * Recapito telefonico del cliente (solo metadato di log). Per i promemoria solo il telefono del
	 * {@link it.velvet.consumer.domain.ConsumerProfile} collegato all’appuntamento: non si usa il numero sulla
	 * scheda {@code SalonClient}, che in salone può essere diverso o gestito dallo staff.
	 */
	private static String resolveRecipientPhone(NotificationType type, Appointment a) {
		if (type == NotificationType.REMINDER_24H || type == NotificationType.REMINDER_1H) {
			if (a.getConsumerProfile() != null) {
				String p = a.getConsumerProfile().getPhone();
				if (p != null && !p.isBlank()) {
					return p;
				}
			}
			return null;
		}
		if (type != NotificationType.BOOKING_CONFIRMATION
				&& type != NotificationType.BOOKING_UPDATED
				&& type != NotificationType.BOOKING_CANCELLED_BY_CONSUMER
				&& type != NotificationType.BOOKING_CANCELLED_BY_SALON
				&& type != NotificationType.REVIEW_INVITE) {
			return null;
		}
		if (a.getConsumerProfile() != null
				&& a.getConsumerProfile().getPhone() != null
				&& !a.getConsumerProfile().getPhone().isBlank()) {
			return a.getConsumerProfile().getPhone();
		}
		if (a.getSalonClient().getPhone() != null && !a.getSalonClient().getPhone().isBlank()) {
			return a.getSalonClient().getPhone();
		}
		return null;
	}

	private String buildConsumerAppointmentUrl(UUID appointmentId) {
		String base = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = notificationProperties.getConsumerAppointmentsPath().startsWith("/")
				? notificationProperties.getConsumerAppointmentsPath()
				: "/" + notificationProperties.getConsumerAppointmentsPath();
		return base + path + "/" + appointmentId;
	}

	private String buildReviewUrl(String token) {
		String base = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = notificationProperties.getReviewPath().startsWith("/")
				? notificationProperties.getReviewPath()
				: "/" + notificationProperties.getReviewPath();
		String enc = URLEncoder.encode(token, StandardCharsets.UTF_8);
		return base + path + "?token=" + enc;
	}

	private String buildSubject(NotificationType type, Appointment a) {
		String salon = a.getLocation().getName();
		return switch (type) {
			case BOOKING_CREATED_FOR_SALON -> "Nuova prenotazione cliente — " + salon;
			case BOOKING_CONFIRMATION -> "Conferma prenotazione — " + salon;
			case BOOKING_UPDATED -> "Prenotazione aggiornata — " + salon;
			case BOOKING_CANCELLED_BY_CONSUMER -> "Prenotazione annullata — " + salon;
			case BOOKING_CANCELLED_BY_SALON -> "Prenotazione annullata dal salone — " + salon;
			case REMINDER_24H -> "Promemoria: tra 24 ore — " + salon;
			case REMINDER_1H -> "Promemoria: tra 2 ore — " + salon;
			case REVIEW_INVITE -> "Com'è andata? Lascia una recensione — " + salon;
			case ADMIN_PLATFORM_MESSAGE -> "Messaggio Velvet";
			case SUPPORT_REQUEST_TO_VELVET -> "Assistenza Velvet";
		};
	}

	private String buildBody(NotificationType type, Appointment a) {
		ZoneId zone;
		try {
			zone = ZoneId.of(a.getLocation().getTimeZone());
		}
		catch (RuntimeException e) {
			zone = ZoneId.of("Europe/Rome");
		}
		DateTimeFormatter fmtIt = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy, HH:mm", Locale.ITALIAN).withZone(zone);
		DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEEE", Locale.ITALIAN).withZone(zone);
		String when = fmtIt.format(a.getStart());
		String weekday = dayFmt.format(a.getStart());
		String service = a.getService().getName();
		String salon = a.getLocation().getName();

		return switch (type) {
			case ADMIN_PLATFORM_MESSAGE -> "";
			case BOOKING_CREATED_FOR_SALON -> {
				String customer = a.getConsumerProfile() != null && a.getConsumerProfile().getDisplayName() != null
						&& !a.getConsumerProfile().getDisplayName().isBlank()
								? a.getConsumerProfile().getDisplayName()
								: (a.getSalonClient().getDisplayName() != null && !a.getSalonClient().getDisplayName().isBlank()
										? a.getSalonClient().getDisplayName()
										: "Cliente");
				yield "Nuova prenotazione ricevuta.\n\n"
						+ "Cliente: "
						+ customer
						+ "\n"
						+ "Servizio: "
						+ service
						+ "\n"
						+ "Quando: "
						+ when
						+ "\n"
						+ "Sede: "
						+ salon
						+ "\n";
			}
			case BOOKING_CONFIRMATION, BOOKING_UPDATED, REMINDER_24H, REMINDER_1H -> {
				String intro = switch (type) {
					case BOOKING_CONFIRMATION -> "La tua prenotazione è confermata.";
					case BOOKING_UPDATED -> "La tua prenotazione è stata spostata. Ecco il nuovo orario.";
					case REMINDER_24H -> "Ti ricordiamo l'appuntamento tra circa 24 ore.";
					case REMINDER_1H -> "Ti ricordiamo l'appuntamento tra circa 2 ore.";
					default -> "";
				};
				String appointmentUrl = buildConsumerAppointmentUrl(a.getId());
				yield "Grazie per aver prenotato con SaloniLuxury.\n\n"
						+ "Un ringraziamento anche da parte di "
						+ salon
						+ ".\n\n"
						+ "Servizio: "
						+ service
						+ "\n"
						+ "Giorno: "
						+ weekday
						+ "\n"
						+ "Data e ora: "
						+ when
						+ "\n"
						+ "Sede: "
						+ salon
						+ "\n\n"
						+ intro
						+ "\n\n"
						+ "Vedi la prenotazione nel tuo account:\n"
						+ appointmentUrl
						+ "\n";
			}
			case BOOKING_CANCELLED_BY_CONSUMER -> "Hai annullato la prenotazione.\n\n"
					+ "Servizio: "
					+ service
					+ "\n"
					+ "Giorno: "
					+ weekday
					+ "\n"
					+ "Data e ora: "
					+ when
					+ "\n"
					+ "Sede: "
					+ salon
					+ "\n";
			case BOOKING_CANCELLED_BY_SALON -> "Il salone ha annullato la seguente prenotazione.\n\n"
					+ "Servizio: "
					+ service
					+ "\n"
					+ "Giorno: "
					+ weekday
					+ "\n"
					+ "Data e ora: "
					+ when
					+ "\n"
					+ "Sede: "
					+ salon
					+ "\n"
					+ "\nPer un nuovo appuntamento visita il sito del salone o l'app SaloniLuxury.\n";
			case REVIEW_INVITE -> {
				String reviewToken = appointmentTokenService.mintReviewToken(a.getId());
				String reviewUrl = buildReviewUrl(reviewToken);
				yield "Grazie per la visita da "
						+ salon
						+ ".\n\n"
						+ "Servizio: "
						+ service
						+ " ("
						+ when
						+ ")\n\n"
						+ "Lascia una breve recensione (link valido per alcuni giorni):\n"
						+ reviewUrl
						+ "\n";
			}
			case SUPPORT_REQUEST_TO_VELVET -> "";
		};
	}

	private String buildHtmlEmailBody(NotificationType type, Appointment a) {
		return switch (type) {
			case BOOKING_CONFIRMATION, BOOKING_UPDATED, REMINDER_24H, REMINDER_1H -> buildConsumerAppointmentHtml(type, a);
			default -> null;
		};
	}

	private String buildConsumerAppointmentHtml(NotificationType type, Appointment a) {
		ZoneId zone;
		try {
			zone = ZoneId.of(a.getLocation().getTimeZone());
		}
		catch (RuntimeException e) {
			zone = ZoneId.of("Europe/Rome");
		}
		DateTimeFormatter fmtIt = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy, HH:mm", Locale.ITALIAN).withZone(zone);
		DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEEE", Locale.ITALIAN).withZone(zone);
		String when = fmtIt.format(a.getStart());
		String weekday = dayFmt.format(a.getStart());
		String service = a.getService().getName();
		String salon = a.getLocation().getName();
		String appointmentUrl = buildConsumerAppointmentUrl(a.getId());
		String intro = switch (type) {
			case BOOKING_CONFIRMATION -> "La tua prenotazione è confermata.";
			case BOOKING_UPDATED -> "La tua prenotazione è stata spostata.";
			case REMINDER_24H -> "Promemoria: appuntamento tra circa 24 ore.";
			case REMINDER_1H -> "Promemoria: appuntamento tra circa 2 ore.";
			default -> "La tua prenotazione.";
		};
		return TransactionalBookingEmailHtml.buildManageBookingEmail(
				intro, salon, service, weekday, when, appointmentUrl, "Vedi prenotazione");
	}
}
