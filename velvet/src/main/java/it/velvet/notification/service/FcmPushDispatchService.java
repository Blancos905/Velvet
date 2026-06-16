package it.velvet.notification.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.UserDevice;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.StudioGroup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Invia push FCM ai dispositivi registrati ({@code user_devices}) quando una notifica transazionale
 * viene consegnata in inbox (cliente o titolare salone).
 */
@Service
public class FcmPushDispatchService {

	private static final Logger log = LoggerFactory.getLogger(FcmPushDispatchService.class);

	private final NotificationService notificationService;
	private final UserDeviceRepository userDeviceRepository;
	private final ConsumerProfileRepository consumerProfileRepository;

	public FcmPushDispatchService(
			NotificationService notificationService,
			UserDeviceRepository userDeviceRepository,
			ConsumerProfileRepository consumerProfileRepository) {
		this.notificationService = notificationService;
		this.userDeviceRepository = userDeviceRepository;
		this.consumerProfileRepository = consumerProfileRepository;
	}

	public void dispatchForScheduledNotification(ScheduledNotification n, String title, String body) {
		if (n == null || n.getType() == null) {
			return;
		}
		Appointment appointment = n.getAppointment();
		if (appointment == null) {
			return;
		}
		NotificationType type = n.getType();
		Map<String, String> data = pushData(type, appointment.getId(), n.getId());

		switch (type) {
			case BOOKING_CREATED_FOR_SALON ->
					resolveSalonOwnerProfileId(appointment).ifPresent(id -> sendToUser(id, title, body, data));
			case BOOKING_CONFIRMATION, BOOKING_UPDATED, REMINDER_24H, REMINDER_1H, REVIEW_INVITE,
					BOOKING_CANCELLED_BY_CONSUMER, BOOKING_CANCELLED_BY_SALON -> {
				if (appointment.getConsumerProfile() != null) {
					sendToUser(appointment.getConsumerProfile().getId(), title, body, data);
				}
			}
			default -> {
				// Nessuna push per messaggi piattaforma / assistenza.
			}
		}
	}

	private void sendToUser(UUID consumerProfileId, String title, String body, Map<String, String> data) {
		if (consumerProfileId == null) {
			return;
		}
		List<UserDevice> devices = userDeviceRepository.findByUserId(consumerProfileId);
		if (devices.isEmpty()) {
			log.debug("Push FCM saltata: nessun dispositivo per userId={}.", consumerProfileId);
			return;
		}
		for (UserDevice device : devices) {
			notificationService.sendPushNotification(device.getFcmToken(), title, body, data);
		}
	}

	private Optional<UUID> resolveSalonOwnerProfileId(Appointment appointment) {
		Location location = appointment.getLocation();
		if (location == null) {
			return Optional.empty();
		}
		return resolveOwnerProfileId(location.getStudioGroup());
	}

	private Optional<UUID> resolveOwnerProfileId(StudioGroup studioGroup) {
		if (studioGroup == null) {
			return Optional.empty();
		}
		String sub = studioGroup.getOwnerKeycloakSub();
		if (sub != null && !sub.isBlank()) {
			Optional<ConsumerProfile> bySub = consumerProfileRepository.findByKeycloakSub(sub.trim());
			if (bySub.isPresent() && bySub.get().getDeletedAt() == null) {
				return Optional.of(bySub.get().getId());
			}
		}
		String ownerEmail = studioGroup.getOwnerEmail();
		if (ownerEmail != null && !ownerEmail.isBlank()) {
			return consumerProfileRepository
					.findByEmailIgnoreCase(ownerEmail.trim().toLowerCase(Locale.ROOT))
					.filter(p -> p.getDeletedAt() == null)
					.map(ConsumerProfile::getId);
		}
		return Optional.empty();
	}

	private static Map<String, String> pushData(NotificationType type, UUID appointmentId, UUID notificationId) {
		Map<String, String> data = new HashMap<>();
		data.put("type", type.name());
		if (appointmentId != null) {
			data.put("appointmentId", appointmentId.toString());
		}
		if (notificationId != null) {
			data.put("notificationId", notificationId.toString());
		}
		return data;
	}
}
