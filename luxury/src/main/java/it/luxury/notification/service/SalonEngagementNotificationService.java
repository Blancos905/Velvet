package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.review.domain.Review;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Notifiche inbox salone per eventi non coperti dal flusso prenotazione (recensioni, nuovo cliente B2C).
 */
@Service
public class SalonEngagementNotificationService {

	public static final String NEW_CLIENT_PLATFORM_SUBJECT = "Nuovo cliente iscritto";

	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final LuxuryNotificationProperties notificationProperties;
	private final FcmPushDispatchService fcmPushDispatchService;

	public SalonEngagementNotificationService(
			ScheduledNotificationRepository scheduledNotificationRepository,
			LuxuryNotificationProperties notificationProperties,
			FcmPushDispatchService fcmPushDispatchService) {
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.notificationProperties = notificationProperties;
		this.fcmPushDispatchService = fcmPushDispatchService;
	}

	@Transactional
	public void onReviewSubmitted(Review review) {
		if (!notificationProperties.isEnabled() || review == null) {
			return;
		}
		Appointment appointment = review.getAppointment();
		if (appointment == null || appointment.getLocation() == null) {
			return;
		}
		ScheduledNotification salonInbox = scheduledNotificationRepository.save(
				ScheduledNotification.salonInboxDelivered(appointment, NotificationType.REVIEW_RECEIVED_FOR_SALON));
		dispatchReviewReceivedPush(appointment, review, salonInbox);
	}

	/** Cliente che si iscrive esplicitamente al salone (senza passare da una prenotazione). */
	@Transactional
	public void onNewSalonClientJoined(SalonClient salonClient) {
		if (!notificationProperties.isEnabled() || salonClient == null) {
			return;
		}
		Location location = salonClient.getLocation();
		if (location == null || location.getStudioGroup() == null) {
			return;
		}
		StudioGroup studioGroup = location.getStudioGroup();
		String clientName = resolveClientDisplayName(salonClient);
		String salonName = location.getName() != null && !location.getName().isBlank()
				? location.getName().trim()
				: "il salone";
		String body = clientName + " è diventato cliente di " + salonName + ".";
		Instant now = Instant.now();
		ScheduledNotification ownerInbox = scheduledNotificationRepository.save(
				ScheduledNotification.adminPlatformInbox(studioGroup, NEW_CLIENT_PLATFORM_SUBJECT, body, now));
		fcmPushDispatchService.dispatchOwnerOnlyForStudioGroup(
				studioGroup,
				"Nuovo cliente — " + salonName,
				body,
				ownerInbox);
	}

	private void dispatchReviewReceivedPush(Appointment appointment, Review review, ScheduledNotification salonInbox) {
		if (appointment.getLocation() == null) {
			return;
		}
		String salon = appointment.getLocation().getName() != null ? appointment.getLocation().getName() : "Salone";
		String customer = resolveConsumerDisplayName(appointment);
		String operator = resolveOperatorDisplayName(appointment);
		int salonStars = review.getRating();
		int staffStars = review.getStaffRating() != null ? review.getStaffRating() : salonStars;
		String ownerBody = withOperatorPhrase(
				customer + " ha lasciato una recensione (" + salonStars + "★ salone, " + staffStars + "★ operatore)",
				operator)
				+ ".";
		String operatorBody = customer + " ha lasciato una recensione (" + staffStars + "★).";
		fcmPushDispatchService.dispatchForScheduledNotificationWithSalonRoles(
				salonInbox,
				"Nuova recensione — " + salon,
				ownerBody,
				"Nuova recensione — " + salon,
				operatorBody);
	}

	private static String resolveOperatorDisplayName(Appointment a) {
		if (a.getOperator() == null
				|| a.getOperator().getDisplayName() == null
				|| a.getOperator().getDisplayName().isBlank()) {
			return null;
		}
		return a.getOperator().getDisplayName().trim();
	}

	private static String withOperatorPhrase(String base, String operatorName) {
		if (operatorName == null || operatorName.isBlank()) {
			return base;
		}
		return base + " con " + operatorName.trim();
	}

	private static String resolveConsumerDisplayName(Appointment a) {
		if (a.getConsumerProfile() != null
				&& a.getConsumerProfile().getDisplayName() != null
				&& !a.getConsumerProfile().getDisplayName().isBlank()) {
			return a.getConsumerProfile().getDisplayName().trim();
		}
		if (a.getSalonClient() != null
				&& a.getSalonClient().getDisplayName() != null
				&& !a.getSalonClient().getDisplayName().isBlank()) {
			return a.getSalonClient().getDisplayName().trim();
		}
		return "Un cliente";
	}

	private static String resolveClientDisplayName(SalonClient salonClient) {
		if (salonClient.getDisplayName() != null && !salonClient.getDisplayName().isBlank()) {
			return salonClient.getDisplayName().trim();
		}
		return "Un cliente";
	}
}
