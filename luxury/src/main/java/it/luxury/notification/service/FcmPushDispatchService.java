package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.UserDevice;
import it.luxury.notification.domain.UserDeviceRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
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
	private final StaffOperatorRepository staffOperatorRepository;

	public FcmPushDispatchService(
			NotificationService notificationService,
			UserDeviceRepository userDeviceRepository,
			ConsumerProfileRepository consumerProfileRepository,
			StaffOperatorRepository staffOperatorRepository) {
		this.notificationService = notificationService;
		this.userDeviceRepository = userDeviceRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.staffOperatorRepository = staffOperatorRepository;
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
		Map<String, String> data = pushData(n);

		switch (type) {
			case BOOKING_CREATED_FOR_SALON, BOOKING_RESCHEDULED_BY_CONSUMER, BOOKING_UPDATED, BOOKING_CANCELLED_BY_CONSUMER -> {
				dispatchSalonSidePush(appointment, title, body, data);
				if (type != NotificationType.BOOKING_CREATED_FOR_SALON
						&& type != NotificationType.BOOKING_RESCHEDULED_BY_CONSUMER
						&& appointment.getConsumerProfile() != null) {
					sendToUser(appointment.getConsumerProfile().getId(), title, body, data);
				}
			}
			case BOOKING_CONFIRMATION, REMINDER_24H, REMINDER_1H, REVIEW_INVITE, BOOKING_CANCELLED_BY_SALON,
					BOOKING_REQUEST_REJECTED -> {
				if (appointment.getConsumerProfile() != null) {
					sendToUser(appointment.getConsumerProfile().getId(), title, body, data);
				}
			}
			default -> {
				// Nessuna push per messaggi piattaforma / assistenza.
			}
		}
	}

	private void dispatchSalonSidePush(Appointment appointment, String title, String body, Map<String, String> data) {
		dispatchSalonSidePushSplit(appointment, title, body, title, body, data);
	}

	/**
	 * Titolare e operatore assegnato ricevono push distinte (stesso {@code type}/payload, copy diversa).
	 * L&apos;operatore vede richiesta accettazione; il titolare solo informativa con operatore indicato.
	 */
	public void dispatchForScheduledNotificationWithSalonRoles(
			ScheduledNotification n,
			String ownerTitle,
			String ownerBody,
			String operatorTitle,
			String operatorBody) {
		if (n == null || n.getType() == null) {
			return;
		}
		Appointment appointment = n.getAppointment();
		if (appointment == null) {
			return;
		}
		NotificationType type = n.getType();
		Map<String, String> data = pushData(n);
		switch (type) {
			case BOOKING_CREATED_FOR_SALON, BOOKING_CANCELLED_BY_CONSUMER, REVIEW_RECEIVED_FOR_SALON, BOOKING_UPDATED -> {
				dispatchSalonSidePushSplit(appointment, ownerTitle, ownerBody, operatorTitle, operatorBody, data);
			}
			case BOOKING_RESCHEDULED_BY_CONSUMER -> {
				dispatchOperatorOnlyPush(appointment, operatorTitle, operatorBody, data);
			}
			default -> dispatchForScheduledNotification(n, ownerTitle, ownerBody);
		}
	}

	/** Solo cliente collegato all'appuntamento (inbox + push). */
	public void dispatchConsumerOnlyForScheduledNotification(ScheduledNotification n, String title, String body) {
		if (n == null || n.getAppointment() == null) {
			return;
		}
		Appointment appointment = n.getAppointment();
		if (appointment.getConsumerProfile() == null) {
			return;
		}
		sendToUser(appointment.getConsumerProfile().getId(), title, body, pushData(n));
	}

	/** Solo titolare salone (messaggi studio senza appuntamento). */
	public void dispatchOwnerOnlyForStudioGroup(
			StudioGroup studioGroup, String title, String body, ScheduledNotification n) {
		Map<String, String> data = pushData(n);
		if (n != null && n.getType() != null) {
			data.put("type", n.getType().name());
		}
		if (n != null && n.getId() != null) {
			data.put("notificationId", n.getId().toString());
		}
		resolveOwnerProfileId(studioGroup).ifPresent(id -> sendToUser(id, title, body, data));
	}

	/** Solo titolare salone (inbox informativa, nessuna push operatore). */
	public void dispatchOwnerOnlyForScheduledNotification(ScheduledNotification n, String title, String body) {
		if (n == null || n.getAppointment() == null) {
			return;
		}
		Map<String, String> data = pushData(n);
		resolveSalonOwnerProfileId(n.getAppointment()).ifPresent(id -> sendToUser(id, title, body, data));
	}

	/** Solo operatore assegnato (richiesta accettazione / alert). */
	public void dispatchOperatorOnlyForScheduledNotification(ScheduledNotification n, String title, String body) {
		if (n == null || n.getAppointment() == null) {
			return;
		}
		dispatchOperatorOnlyPush(n.getAppointment(), title, body, pushData(n));
	}

	private void dispatchOperatorOnlyPush(
			Appointment appointment, String title, String body, Map<String, String> data) {
		resolveStaffOperatorProfileId(appointment).ifPresent(id -> sendToUser(id, title, body, data));
	}

	private void dispatchSalonSidePushSplit(
			Appointment appointment,
			String ownerTitle,
			String ownerBody,
			String operatorTitle,
			String operatorBody,
			Map<String, String> data) {
		Optional<UUID> ownerId = resolveSalonOwnerProfileId(appointment);
		ownerId.ifPresent(id -> sendToUser(id, ownerTitle, ownerBody, data));
		resolveStaffOperatorProfileId(appointment).ifPresent(staffProfileId -> {
			if (ownerId.isEmpty() || !ownerId.get().equals(staffProfileId)) {
				sendToUser(staffProfileId, operatorTitle, operatorBody, data);
			}
		});
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

	private Optional<UUID> resolveStaffOperatorProfileId(Appointment appointment) {
		StaffOperator operator = appointment.getOperator();
		if (operator == null) {
			return Optional.empty();
		}
		ConsumerProfile linked = operator.getConsumerProfile();
		if (linked != null && linked.getDeletedAt() == null) {
			return Optional.of(linked.getId());
		}
		return staffOperatorRepository.findConsumerProfileIdByOperatorId(operator.getId());
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
		String sub = studioGroup.getOwnerAuthSub();
		if (sub != null && !sub.isBlank()) {
			Optional<ConsumerProfile> bySub = consumerProfileRepository.findByAuthSub(sub.trim());
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

	private static Map<String, String> pushData(ScheduledNotification n) {
		Map<String, String> data = new HashMap<>();
		if (n == null || n.getType() == null) {
			return data;
		}
		NotificationType type = n.getType();
		Appointment appointment = n.getAppointment();
		data.put("type", type.name());
		if (appointment != null && appointment.getId() != null) {
			data.put("appointmentId", appointment.getId().toString());
		}
		if (n.getId() != null) {
			data.put("notificationId", n.getId().toString());
		}
		if (appointment != null && appointment.getStart() != null) {
			data.put("appointmentStart", appointment.getStart().toString());
		}
		if (n.getPreviousAppointmentStart() != null) {
			data.put("previousAppointmentStart", n.getPreviousAppointmentStart().toString());
		}
		if (appointment != null && appointment.getService() != null && appointment.getService().getName() != null) {
			String serviceName = appointment.getService().getName().trim();
			if (!serviceName.isEmpty()) {
				data.put("serviceName", serviceName);
			}
		}
		if (appointment != null && appointment.getOperator() != null && appointment.getOperator().getDisplayName() != null) {
			String operatorName = appointment.getOperator().getDisplayName().trim();
			if (!operatorName.isEmpty()) {
				data.put("operatorName", operatorName);
			}
		}
		if (appointment != null && appointment.getStatus() != null) {
			data.put("appointmentStatus", appointment.getStatus().name());
		}
		return data;
	}
}
