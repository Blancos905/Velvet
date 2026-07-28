package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.notification.domain.NotificationType;
import it.luxury.security.AppointmentTokenService;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/**
 * Copy condivisa per email/push cliente su eventi prenotazione (conferma, modifica, annullamento, promemoria).
 */
final class BookingNotificationEmailContent {

	private BookingNotificationEmailContent() {
	}

	static String buildSubject(NotificationType type, Appointment appointment) {
		String salon = appointment.getLocation().getName();
		return switch (type) {
			case BOOKING_CONFIRMATION -> "Conferma prenotazione — " + salon;
			case BOOKING_UPDATED -> "Prenotazione aggiornata — " + salon;
			case BOOKING_CANCELLED_BY_CONSUMER -> "Prenotazione annullata — " + salon;
			case BOOKING_CANCELLED_BY_SALON -> "Prenotazione annullata dal salone — " + salon;
			case BOOKING_REQUEST_REJECTED -> "Richiesta non confermata — " + salon;
			case REMINDER_24H -> "Promemoria: tra 24 ore — " + salon;
			case REMINDER_1H -> "Promemoria: tra 2 ore — " + salon;
			case REVIEW_INVITE -> "Com'è andata? Lascia una recensione — " + salon;
			default -> "Aggiornamento prenotazione — " + salon;
		};
	}

	static String buildPlainBody(
			NotificationType type,
			Appointment appointment,
			LuxuryNotificationProperties notificationProperties,
			AppointmentTokenService appointmentTokenService) {
		AppointmentDetails details = AppointmentDetails.from(appointment);
		return switch (type) {
			case BOOKING_CONFIRMATION, BOOKING_UPDATED, REMINDER_24H, REMINDER_1H -> {
				String intro = introLine(type, details);
				String appointmentUrl = buildConsumerAppointmentUrl(appointment.getId(), notificationProperties);
				yield """
						%s

						Servizio: %s
						Giorno: %s
						Data e ora: %s
						Sede: %s

						%s

						Vedi la prenotazione nel tuo account:
						%s
						"""
						.formatted(
								intro,
								details.service(),
								details.weekday(),
								details.when(),
								details.salon(),
								secondaryLine(type, details.salon()),
								appointmentUrl);
			}
			case BOOKING_CANCELLED_BY_CONSUMER -> """
					Hai annullato la prenotazione presso %s.

					Servizio: %s
					Giorno: %s
					Data e ora: %s
					Sede: %s

					L'orario è stato liberato in agenda. Per un nuovo appuntamento visita il salone su Saloni Luxury.
					"""
					.formatted(
							details.salon(),
							details.service(),
							details.weekday(),
							details.when(),
							details.salon());
			case BOOKING_CANCELLED_BY_SALON -> """
					Il salone ha annullato la seguente prenotazione.

					Servizio: %s
					Giorno: %s
					Data e ora: %s
					Sede: %s

					Per un nuovo appuntamento visita il sito del salone o l'app Saloni Luxury.
					"""
					.formatted(details.service(), details.weekday(), details.when(), details.salon());
			case BOOKING_REQUEST_REJECTED -> {
				String intro = details.operatorName() != null
						? details.operatorName() + " non ha confermato la tua richiesta di prenotazione."
						: details.salon() + " non ha confermato la tua richiesta di prenotazione.";
				yield """
						%s

						Servizio: %s
						Giorno: %s
						Data e ora: %s
						Sede: %s

						Puoi prenotare un nuovo orario dal sito del salone o dall'app Saloni Luxury.
						"""
						.formatted(
								intro,
								details.service(),
								details.weekday(),
								details.when(),
								details.salon());
			}
			case REVIEW_INVITE -> {
				String reviewToken = appointmentTokenService.mintReviewToken(appointment.getId());
				String reviewUrl = buildReviewUrl(reviewToken, notificationProperties);
				yield """
						Grazie per la visita da %s.

						Servizio: %s (%s)

						Lascia una breve recensione (link valido per alcuni giorni):
						%s
						"""
						.formatted(details.salon(), details.service(), details.when(), reviewUrl);
			}
			default -> "";
		};
	}

	static String buildHtmlBody(
			NotificationType type,
			Appointment appointment,
			LuxuryNotificationProperties notificationProperties) {
		AppointmentDetails details = AppointmentDetails.from(appointment);
		return switch (type) {
			case BOOKING_CONFIRMATION -> TransactionalBookingEmailHtml.buildManageBookingEmail(
					headline(type, details),
					bodyIntro(type),
					details.salon(),
					details.service(),
					details.weekday(),
					details.when(),
					buildConsumerAppointmentUrl(appointment.getId(), notificationProperties),
					"Vedi prenotazione");
			case BOOKING_UPDATED -> TransactionalBookingEmailHtml.buildBookingUpdatedEmail(
					details.salon(),
					details.service(),
					details.weekday(),
					details.when(),
					buildConsumerAppointmentUrl(appointment.getId(), notificationProperties));
			case REMINDER_24H, REMINDER_1H -> TransactionalBookingEmailHtml.buildBookingReminderEmail(
					headline(type, details),
					details.salon(),
					details.service(),
					details.weekday(),
					details.when(),
					buildConsumerAppointmentUrl(appointment.getId(), notificationProperties));
			case BOOKING_CANCELLED_BY_CONSUMER -> TransactionalBookingEmailHtml.buildBookingCancelledEmail(
					false,
					details.salon(),
					details.service(),
					details.weekday(),
					details.when(),
					notificationProperties.getFrontendBaseUrl().replaceAll("/+$", ""));
			case BOOKING_CANCELLED_BY_SALON -> TransactionalBookingEmailHtml.buildBookingCancelledEmail(
					true,
					details.salon(),
					details.service(),
					details.weekday(),
					details.when(),
					notificationProperties.getFrontendBaseUrl().replaceAll("/+$", ""));
			default -> null;
		};
	}

	private static String headline(NotificationType type, AppointmentDetails details) {
		return switch (type) {
			case BOOKING_CONFIRMATION -> details.operatorName() != null
					? details.operatorName() + " ha accettato il tuo appuntamento"
					: details.salon() + " ha confermato il tuo appuntamento";
			case REMINDER_24H -> "Promemoria: appuntamento tra 24 ore";
			case REMINDER_1H -> "Promemoria: appuntamento tra circa 2 ore";
			default -> "La tua prenotazione";
		};
	}

	private static String bodyIntro(NotificationType type) {
		return switch (type) {
			case BOOKING_CONFIRMATION -> "Grazie per aver prenotato con Saloni Luxury.";
			case REMINDER_24H -> "Ti ricordiamo l'appuntamento tra 24 ore.";
			case REMINDER_1H -> "Ti ricordiamo l'appuntamento tra circa 2 ore.";
			default -> "";
		};
	}

	private static String introLine(NotificationType type, AppointmentDetails details) {
		return switch (type) {
			case BOOKING_CONFIRMATION -> details.operatorName() != null
					? details.operatorName() + " ha accettato il tuo appuntamento presso " + details.salon() + "."
					: details.salon() + " ha confermato il tuo appuntamento.";
			case BOOKING_UPDATED -> "La tua prenotazione presso " + details.salon() + " è stata aggiornata.";
			case REMINDER_24H -> "Ti ricordiamo l'appuntamento tra 24 ore.";
			case REMINDER_1H -> "Ti ricordiamo l'appuntamento tra circa 2 ore.";
			default -> "";
		};
	}

	private static String secondaryLine(NotificationType type, String salon) {
		return switch (type) {
			case BOOKING_CONFIRMATION -> "Un ringraziamento anche da parte di " + salon + ".";
			case BOOKING_UPDATED -> "Ecco il nuovo orario confermato.";
			default -> "";
		};
	}

	private static String buildConsumerAppointmentUrl(UUID appointmentId, LuxuryNotificationProperties props) {
		String base = props.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = props.getConsumerAppointmentsPath().startsWith("/")
				? props.getConsumerAppointmentsPath()
				: "/" + props.getConsumerAppointmentsPath();
		return base + path + "/" + appointmentId;
	}

	private static String buildReviewUrl(String token, LuxuryNotificationProperties props) {
		String base = props.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = props.getReviewPath().startsWith("/") ? props.getReviewPath() : "/" + props.getReviewPath();
		String enc = URLEncoder.encode(token, StandardCharsets.UTF_8);
		return base + path + "?token=" + enc;
	}

	private record AppointmentDetails(String salon, String service, String weekday, String when, String operatorName) {

		static AppointmentDetails from(Appointment appointment) {
			ZoneId zone;
			try {
				zone = ZoneId.of(appointment.getLocation().getTimeZone());
			}
			catch (RuntimeException e) {
				zone = ZoneId.of("Europe/Rome");
			}
			DateTimeFormatter fmtIt =
					DateTimeFormatter.ofPattern("EEEE d MMMM yyyy, HH:mm", Locale.ITALIAN).withZone(zone);
			DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEEE", Locale.ITALIAN).withZone(zone);
			String salon = appointment.getLocation().getName();
			String operatorName = null;
			if (appointment.getOperator() != null
					&& appointment.getOperator().getDisplayName() != null
					&& !appointment.getOperator().getDisplayName().isBlank()) {
				operatorName = appointment.getOperator().getDisplayName().trim();
			}
			return new AppointmentDetails(
					salon,
					appointment.getService().getName(),
					dayFmt.format(appointment.getStart()),
					fmtIt.format(appointment.getStart()),
					operatorName);
		}
	}
}
