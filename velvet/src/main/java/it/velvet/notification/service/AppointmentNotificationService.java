package it.velvet.notification.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.appointment.domain.AppointmentStatus;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.QueuedNotificationStatus;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.review.ReviewEligibility;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AppointmentNotificationService {

	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final AppointmentRepository appointmentRepository;
	private final VelvetNotificationProperties notificationProperties;
	private final FcmPushDispatchService fcmPushDispatchService;

	public AppointmentNotificationService(
			ScheduledNotificationRepository scheduledNotificationRepository,
			AppointmentRepository appointmentRepository,
			VelvetNotificationProperties notificationProperties,
			FcmPushDispatchService fcmPushDispatchService) {
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.appointmentRepository = appointmentRepository;
		this.notificationProperties = notificationProperties;
		this.fcmPushDispatchService = fcmPushDispatchService;
	}

	@Transactional
	public void onConsumerBookingCreated(UUID appointmentId) {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null || a.getConsumerProfile() == null) {
			return;
		}
		ScheduledNotification salonInbox = scheduledNotificationRepository.save(
				ScheduledNotification.salonInboxDelivered(a, NotificationType.BOOKING_CREATED_FOR_SALON));
		dispatchSalonBookingCreatedPush(a, salonInbox);
		scheduleConfirmationAndReminders(a, NotificationType.BOOKING_CONFIRMATION);
	}

	/**
	 * Prenotazione inserita dal titolare in agenda.
	 * <ul>
	 *   <li>Cliente senza account Velvet (walk-in / nuovo in anagrafica): solo inbox salone
	 *       ({@link NotificationType#BOOKING_CREATED_FOR_SALON}).</li>
	 *   <li>Cliente con account collegato: conferma e promemoria al cliente, senza duplicare l&apos;avviso salone.</li>
	 * </ul>
	 */
	@Transactional
	public void onSalonManualBookingCreated(UUID appointmentId) {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null) {
			return;
		}
		if (a.getConsumerProfile() == null) {
			ScheduledNotification salonInbox = scheduledNotificationRepository.save(
					ScheduledNotification.salonInboxDelivered(a, NotificationType.BOOKING_CREATED_FOR_SALON));
			dispatchSalonBookingCreatedPush(a, salonInbox);
			return;
		}
		scheduleConfirmationAndReminders(a, NotificationType.BOOKING_CONFIRMATION);
	}

	@Transactional
	public void onConsumerBookingRescheduled(UUID appointmentId) {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null || a.getConsumerProfile() == null) {
			return;
		}
		cancelPendingForAppointment(appointmentId);
		scheduleConfirmationAndReminders(a, NotificationType.BOOKING_UPDATED);
	}

	@Transactional
	public void onConsumerBookingCancelled(UUID appointmentId) {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		cancelPendingForAppointment(appointmentId);
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null || a.getConsumerProfile() == null) {
			return;
		}
		scheduledNotificationRepository.save(
				new ScheduledNotification(a, NotificationType.BOOKING_CANCELLED_BY_CONSUMER, Instant.now()));
	}

	/**
	 * Transizioni di stato da API staff (es. COMPLETED, CANCELLED senza passare da {@code cancel()} consumatore).
	 */
	@Transactional
	public void onAppointmentStatusChanged(UUID appointmentId, AppointmentStatus previous, AppointmentStatus next) {
		if (!notificationProperties.isEnabled() || previous == next) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null) {
			return;
		}
		if (next == AppointmentStatus.CANCELLED && previous != AppointmentStatus.CANCELLED) {
			cancelPendingForAppointment(appointmentId);
			scheduledNotificationRepository.save(
					new ScheduledNotification(a, NotificationType.BOOKING_CANCELLED_BY_SALON, Instant.now()));
			return;
		}
		if (next == AppointmentStatus.NO_SHOW && previous != AppointmentStatus.NO_SHOW) {
			cancelPendingForAppointment(appointmentId);
			return;
		}
	}

	private void cancelPendingForAppointment(UUID appointmentId) {
		scheduledNotificationRepository.cancelAllPendingForAppointment(
				appointmentId, QueuedNotificationStatus.PENDING, QueuedNotificationStatus.CANCELLED);
	}

	private void scheduleConfirmationAndReminders(Appointment a, NotificationType immediateType) {
		cancelPendingForAppointment(a.getId());
		Instant now = Instant.now();
		Instant start = a.getStart();
		scheduledNotificationRepository.save(new ScheduledNotification(a, immediateType, now));
		Instant t24 = start.minus(24, ChronoUnit.HOURS);
		if (t24.isAfter(now)) {
			scheduledNotificationRepository.save(new ScheduledNotification(a, NotificationType.REMINDER_24H, t24));
		}
		Instant t2 = start.minus(2, ChronoUnit.HOURS);
		if (t2.isAfter(now)) {
			scheduledNotificationRepository.save(new ScheduledNotification(a, NotificationType.REMINDER_1H, t2));
		}
		scheduleReviewInviteIfConsumerLinked(a);
	}

	private void scheduleReviewInviteIfConsumerLinked(Appointment a) {
		if (a.getConsumerProfile() == null) {
			return;
		}
		int offsetH = ReviewEligibility.effectiveOffsetHours(notificationProperties.getReviewInviteOffsetHours());
		Instant sendAt = a.getEnd().plus(offsetH, ChronoUnit.HOURS);
		Instant now = Instant.now();
		if (!sendAt.isAfter(now)) {
			sendAt = now;
		}
		scheduledNotificationRepository.save(new ScheduledNotification(a, NotificationType.REVIEW_INVITE, sendAt));
	}

	private void dispatchSalonBookingCreatedPush(Appointment a, ScheduledNotification salonInbox) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		fcmPushDispatchService.dispatchForScheduledNotification(
				salonInbox,
				"Nuova prenotazione cliente — " + salon,
				"Hai ricevuto una nuova prenotazione.");
	}
}
