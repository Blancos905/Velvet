package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.QueuedNotificationStatus;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.review.ReviewEligibility;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class AppointmentNotificationService {

	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final AppointmentRepository appointmentRepository;
	private final LuxuryNotificationProperties notificationProperties;
	private final FcmPushDispatchService fcmPushDispatchService;
	private final TransactionalEmailDispatchService transactionalEmailDispatchService;
	private final ScheduledNotificationProcessor scheduledNotificationProcessor;

	public AppointmentNotificationService(
			ScheduledNotificationRepository scheduledNotificationRepository,
			AppointmentRepository appointmentRepository,
			LuxuryNotificationProperties notificationProperties,
			FcmPushDispatchService fcmPushDispatchService,
			TransactionalEmailDispatchService transactionalEmailDispatchService,
			ScheduledNotificationProcessor scheduledNotificationProcessor) {
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.appointmentRepository = appointmentRepository;
		this.notificationProperties = notificationProperties;
		this.fcmPushDispatchService = fcmPushDispatchService;
		this.transactionalEmailDispatchService = transactionalEmailDispatchService;
		this.scheduledNotificationProcessor = scheduledNotificationProcessor;
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
	}

	/** Dopo conferma titolare/operatore: notifica cliente (conferma + promemoria programmati). */
	@Transactional
	public void onBookingConfirmedBySalon(UUID appointmentId) {
		onBookingConfirmedBySalon(appointmentId, false);
	}

	@Transactional
	public void onBookingConfirmedBySalon(UUID appointmentId, boolean notifyOwnerOnOperatorRescheduleAccept) {
		dismissStaffBookingRequestAlerts(appointmentId);
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null || a.getConsumerProfile() == null) {
			return;
		}
		boolean afterConsumerReschedule = scheduledNotificationRepository.existsByAppointmentIdAndTypeAndStatus(
				appointmentId, NotificationType.BOOKING_RESCHEDULED_BY_CONSUMER, QueuedNotificationStatus.SENT);
		scheduleConfirmationAndReminders(a, NotificationType.BOOKING_CONFIRMATION);
		if (afterConsumerReschedule && notifyOwnerOnOperatorRescheduleAccept) {
			notifyOwnerAfterRescheduleAccepted(a);
		}
	}

	/** Operatore/titolare rifiuta richiesta cliente in attesa: avviso informativo al titolare. */
	@Transactional
	public void onBookingRejectedByOperator(UUID appointmentId) {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null || a.getConsumerProfile() == null) {
			return;
		}
		ScheduledNotification ownerInbox = scheduledNotificationRepository.save(
				ScheduledNotification.salonInboxDelivered(a, NotificationType.BOOKING_REJECTED_BY_OPERATOR));
		dispatchOwnerBookingRejectedPush(a, ownerInbox);
	}

	/**
	 * Prenotazione inserita dal titolare in agenda.
	 * <ul>
	 *   <li>Cliente senza account Saloni Luxury (walk-in / nuovo in anagrafica): solo inbox salone
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
	public void onConsumerBookingRescheduled(UUID appointmentId, Instant previousStart) {
		onBookingRescheduled(appointmentId, true, previousStart);
	}

	/** Spostamento da agenda salone: avviso informativo all'operatore assegnato (no richiesta accettazione). */
	@Transactional
	public void onSalonBookingRescheduled(UUID appointmentId) {
		onBookingRescheduled(appointmentId, false, null);
	}

	private void onBookingRescheduled(UUID appointmentId, boolean consumerInitiated, Instant previousStart) {
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null || a.getConsumerProfile() == null) {
			return;
		}
		cancelPendingForAppointment(appointmentId);
		if (consumerInitiated) {
			ScheduledNotification operatorInbox = scheduledNotificationRepository.save(
					ScheduledNotification.salonInboxDelivered(
							a, NotificationType.BOOKING_RESCHEDULED_BY_CONSUMER, previousStart));
			dispatchOperatorRescheduleRequestPush(a, operatorInbox);
		} else {
			scheduledNotificationRepository.save(
					ScheduledNotification.salonInboxDelivered(a, NotificationType.BOOKING_UPDATED));
			scheduleConsumerInboxBookingUpdated(a);
			transactionalEmailDispatchService.dispatchConsumerAppointmentEmail(NotificationType.BOOKING_UPDATED, a);
		}
		scheduleRemindersOnly(a);
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
		ScheduledNotification salonAlert = scheduledNotificationRepository.save(
				ScheduledNotification.salonInboxDelivered(a, NotificationType.BOOKING_CANCELLED_BY_CONSUMER));
		dispatchSalonConsumerCancellationPush(a, salonAlert);
		transactionalEmailDispatchService.dispatchConsumerAppointmentEmail(
				NotificationType.BOOKING_CANCELLED_BY_CONSUMER, a);
	}

	/**
	 * Transizioni di stato da API staff (es. COMPLETED, CANCELLED senza passare da {@code cancel()} consumatore).
	 */
	@Transactional
	public void onAppointmentStatusChanged(UUID appointmentId, AppointmentStatus previous, AppointmentStatus next) {
		if (previous == next) {
			return;
		}
		if (previous == AppointmentStatus.BOOKED
				&& (next == AppointmentStatus.CANCELLED || next == AppointmentStatus.CONFIRMED)) {
			dismissStaffBookingRequestAlerts(appointmentId);
		}
		if (!notificationProperties.isEnabled()) {
			return;
		}
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId).orElse(null);
		if (a == null) {
			return;
		}
		if (next == AppointmentStatus.CANCELLED && previous != AppointmentStatus.CANCELLED) {
			cancelPendingForAppointment(appointmentId);
			if (a.getConsumerProfile() != null) {
				NotificationType consumerType = previous == AppointmentStatus.BOOKED
						? NotificationType.BOOKING_REQUEST_REJECTED
						: NotificationType.BOOKING_CANCELLED_BY_SALON;
				scheduledNotificationRepository.save(new ScheduledNotification(a, consumerType, Instant.now()));
				scheduledNotificationRepository.flush();
				scheduledNotificationProcessor.processDue();
			}
			return;
		}
		if (next == AppointmentStatus.NO_SHOW && previous != AppointmentStatus.NO_SHOW) {
			cancelPendingForAppointment(appointmentId);
			return;
		}
	}

	/**
	 * Nasconde all'operatore le richieste Accetta/Rifiuta dopo che la prenotazione non è più in attesa.
	 * Il titolare continua a vederle in inbox (filtro {@code staffDeletedAt} solo con actor staff).
	 */
	private void dismissStaffBookingRequestAlerts(UUID appointmentId) {
		if (appointmentId == null) {
			return;
		}
		scheduledNotificationRepository.markStaffDeletedBookingRequestsForAppointment(
				appointmentId,
				List.of(
						NotificationType.BOOKING_CREATED_FOR_SALON,
						NotificationType.BOOKING_RESCHEDULED_BY_CONSUMER),
				Instant.now());
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
		if (immediateType == NotificationType.BOOKING_CONFIRMATION) {
			scheduledNotificationRepository.flush();
			scheduledNotificationProcessor.processDue();
		}
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
		String customer = resolveConsumerDisplayName(a);
		String operator = resolveOperatorDisplayName(a);
		String ownerBody = withOperatorPhrase(customer + " ha prenotato presso il salone", operator) + ".";
		fcmPushDispatchService.dispatchForScheduledNotificationWithSalonRoles(
				salonInbox,
				"Nuova prenotazione — " + salon,
				ownerBody,
				"Richiesta prenotazione — " + salon,
				"Conferma o rifiuta la richiesta del cliente.");
	}

	private void dispatchOperatorRescheduleRequestPush(Appointment a, ScheduledNotification operatorInbox) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		String customer = resolveConsumerDisplayName(a);
		fcmPushDispatchService.dispatchOperatorOnlyForScheduledNotification(
				operatorInbox,
				"Cambio orario prenotazione — " + salon,
				customer + " ha cambiato l'orario. Conferma o rifiuta il nuovo orario.");
	}

	private void notifyOwnerAfterRescheduleAccepted(Appointment a) {
		ScheduledNotification ownerInbox = scheduledNotificationRepository.save(
				ScheduledNotification.salonInboxDelivered(a, NotificationType.BOOKING_UPDATED));
		dispatchOwnerRescheduleAcceptedPush(a, ownerInbox);
	}

	private void dispatchOwnerRescheduleAcceptedPush(Appointment a, ScheduledNotification ownerInbox) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		String customer = resolveConsumerDisplayName(a);
		String operator = resolveOperatorDisplayName(a);
		String body = withOperatorPhrase(customer + " ha cambiato l'orario della prenotazione", operator) + ".";
		fcmPushDispatchService.dispatchOwnerOnlyForScheduledNotification(
				ownerInbox, "Cambio orario prenotazione — " + salon, body);
	}

	private void dispatchOwnerBookingRejectedPush(Appointment a, ScheduledNotification ownerInbox) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		String customer = resolveConsumerDisplayName(a);
		String operator = resolveOperatorDisplayName(a);
		String body = withOperatorPhrase(
				"L'appuntamento di " + customer + " è stato rifiutato dall'operatore", operator) + ".";
		fcmPushDispatchService.dispatchOwnerOnlyForScheduledNotification(
				ownerInbox, "Richiesta rifiutata — " + salon, body);
	}

	private void dispatchSalonConsumerCancellationPush(Appointment a, ScheduledNotification salonInbox) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		String customer = resolveConsumerDisplayName(a);
		String operator = resolveOperatorDisplayName(a);
		String ownerBody = withOperatorPhrase(customer + " ha disdetto l'appuntamento", operator)
				+ ". L'orario torna libero in agenda.";
		String operatorBody = customer + " ha disdetto l'appuntamento. L'orario torna libero in agenda.";
		fcmPushDispatchService.dispatchForScheduledNotificationWithSalonRoles(
				salonInbox,
				"Appuntamento annullato — " + salon,
				ownerBody,
				"Appuntamento annullato — " + salon,
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

	private void scheduleConsumerInboxBookingUpdated(Appointment a) {
		Instant now = Instant.now();
		ScheduledNotification consumerInbox = scheduledNotificationRepository.save(
				new ScheduledNotification(a, NotificationType.BOOKING_UPDATED, now));
		scheduledNotificationRepository.flush();
		scheduledNotificationProcessor.processDue();
		dispatchConsumerBookingUpdatedPush(a, consumerInbox);
	}

	private void dispatchConsumerBookingUpdatedPush(Appointment a, ScheduledNotification consumerInbox) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		fcmPushDispatchService.dispatchConsumerOnlyForScheduledNotification(
				consumerInbox,
				"Prenotazione aggiornata — " + salon,
				"Il salone ha aggiornato l'orario del tuo appuntamento.");
	}

	private void dispatchSalonAppointmentChangeAlert(
			Appointment a, ScheduledNotification salonInbox, NotificationType type) {
		if (a.getLocation() == null) {
			return;
		}
		String salon = a.getLocation().getName() != null ? a.getLocation().getName() : "Salone";
		String title = switch (type) {
			case BOOKING_UPDATED -> "Prenotazione spostata — " + salon;
			case BOOKING_CANCELLED_BY_CONSUMER -> "Prenotazione annullata — " + salon;
			default -> "Aggiornamento prenotazione — " + salon;
		};
		String pushBody = switch (type) {
			case BOOKING_UPDATED -> "Il cliente ha cambiato orario. Controlla l'agenda.";
			case BOOKING_CANCELLED_BY_CONSUMER -> "Il cliente ha disdetto l'appuntamento.";
			default -> "Controlla il centro notifiche del salone.";
		};
		fcmPushDispatchService.dispatchForScheduledNotification(salonInbox, title, pushBody);
	}

	private void scheduleRemindersOnly(Appointment a) {
		Instant now = Instant.now();
		Instant start = a.getStart();
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
}
