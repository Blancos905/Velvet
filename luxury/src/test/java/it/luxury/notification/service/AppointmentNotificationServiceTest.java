package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.QueuedNotificationStatus;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentNotificationServiceTest {

	@Mock
	private ScheduledNotificationRepository scheduledNotificationRepository;

	@Mock
	private AppointmentRepository appointmentRepository;

	@Mock
	private FcmPushDispatchService fcmPushDispatchService;

	@Mock
	private TransactionalEmailDispatchService transactionalEmailDispatchService;

	@Mock
	private ScheduledNotificationProcessor scheduledNotificationProcessor;

	@Captor
	private ArgumentCaptor<ScheduledNotification> scheduledCaptor;

	private LuxuryNotificationProperties notificationProperties;
	private AppointmentNotificationService service;

	@BeforeEach
	void setUp() {
		notificationProperties = new LuxuryNotificationProperties();
		notificationProperties.setEnabled(true);
		service = new AppointmentNotificationService(
				scheduledNotificationRepository,
				appointmentRepository,
				notificationProperties,
				fcmPushDispatchService,
				transactionalEmailDispatchService,
				scheduledNotificationProcessor);
	}

	private void stubSavePassthrough() {
		when(scheduledNotificationRepository.save(any(ScheduledNotification.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void onConsumerBookingCreated_onlySalonAlertUntilConfirmed() {
		stubSavePassthrough();
		Appointment appointment = mockConsumerAppointmentOnly();

		service.onConsumerBookingCreated(appointment.getId());

		assertThat(savedTypes()).containsExactly(NotificationType.BOOKING_CREATED_FOR_SALON);
		verify(scheduledNotificationRepository, never()).cancelAllPendingForAppointment(
				any(), any(), any());
	}

	@Test
	void onBookingConfirmedBySalon_schedulesConfirmation24hAnd2hReminders() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(26, ChronoUnit.HOURS);
		Appointment appointment = mockAppointmentWithConsumer(start);

		service.onBookingConfirmedBySalon(appointment.getId());

		assertThat(savedTypes()).contains(
				NotificationType.BOOKING_CONFIRMATION,
				NotificationType.REMINDER_24H,
				NotificationType.REMINDER_1H,
				NotificationType.REVIEW_INVITE);
		assertThat(savedTypes()).doesNotContain(NotificationType.BOOKING_CREATED_FOR_SALON);
		verify(scheduledNotificationRepository).cancelAllPendingForAppointment(
				eq(appointment.getId()),
				eq(QueuedNotificationStatus.PENDING),
				eq(QueuedNotificationStatus.CANCELLED));
	}

	@Test
	void onBookingConfirmedBySalon_reminder24hScheduledExactly24HoursBeforeStart() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(26, ChronoUnit.HOURS);
		Appointment appointment = mockAppointmentWithConsumer(start);

		service.onBookingConfirmedBySalon(appointment.getId());

		ScheduledNotification reminder24h = findSaved(NotificationType.REMINDER_24H);
		assertThat(reminder24h.getScheduledAt()).isEqualTo(start.minus(24, ChronoUnit.HOURS));
		assertThat(reminder24h.getAppointment()).isSameAs(appointment);
		assertThat(reminder24h.getStatus()).isEqualTo(QueuedNotificationStatus.PENDING);
	}

	@Test
	void onBookingConfirmedBySalon_reminder2hScheduledExactly2HoursBeforeStart() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(26, ChronoUnit.HOURS);
		Appointment appointment = mockAppointmentWithConsumer(start);

		service.onBookingConfirmedBySalon(appointment.getId());

		ScheduledNotification reminder2h = findSaved(NotificationType.REMINDER_1H);
		assertThat(reminder2h.getScheduledAt()).isEqualTo(start.minus(2, ChronoUnit.HOURS));
		assertThat(reminder2h.getAppointment()).isSameAs(appointment);
	}

	@Test
	void onBookingConfirmedBySalon_skips24hReminderWhenAppointmentWithin24Hours() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(10, ChronoUnit.HOURS);
		mockAppointmentWithConsumer(start);

		service.onBookingConfirmedBySalon(UUID.randomUUID());

		assertThat(savedTypes()).doesNotContain(NotificationType.REMINDER_24H);
		assertThat(savedTypes()).contains(NotificationType.REMINDER_1H);
	}

	@Test
	void onBookingConfirmedBySalon_skipsBothRemindersWhenAppointmentWithin2Hours() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(90, ChronoUnit.MINUTES);
		mockAppointmentWithConsumer(start);

		service.onBookingConfirmedBySalon(UUID.randomUUID());

		assertThat(savedTypes()).doesNotContain(NotificationType.REMINDER_24H, NotificationType.REMINDER_1H);
		assertThat(savedTypes()).contains(NotificationType.BOOKING_CONFIRMATION);
	}

	@Test
	void onBookingConfirmedBySalon_only2hReminderWhenBetween2And24HoursFromNow() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(5, ChronoUnit.HOURS);
		mockAppointmentWithConsumer(start);

		service.onBookingConfirmedBySalon(UUID.randomUUID());

		List<NotificationType> types = savedTypes();
		assertThat(types).doesNotContain(NotificationType.REMINDER_24H);
		assertThat(types).contains(NotificationType.REMINDER_1H);
		ScheduledNotification reminder2h = findSaved(NotificationType.REMINDER_1H);
		assertThat(reminder2h.getScheduledAt()).isEqualTo(start.minus(2, ChronoUnit.HOURS));
	}

	@Test
	void onConsumerBookingRescheduled_bookedAppointment_sendsSalonAcceptanceRequest() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(48, ChronoUnit.HOURS);
		Instant previousStart = start.minus(2, ChronoUnit.HOURS);
		Appointment appointment = mockAppointmentWithConsumer(start);

		service.onConsumerBookingRescheduled(appointment.getId(), previousStart);

		assertThat(savedTypes()).contains(NotificationType.BOOKING_RESCHEDULED_BY_CONSUMER);
		assertThat(savedTypes()).doesNotContain(NotificationType.BOOKING_UPDATED, NotificationType.BOOKING_CREATED_FOR_SALON);
		ScheduledNotification request = findSaved(NotificationType.BOOKING_RESCHEDULED_BY_CONSUMER);
		assertThat(request.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		assertThat(request.getPreviousAppointmentStart()).isEqualTo(previousStart);
		verify(fcmPushDispatchService).dispatchOperatorOnlyForScheduledNotification(
				org.mockito.Mockito.eq(request),
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.anyString());
	}

	@Test
	void onSalonBookingRescheduled_bookedAppointment_sendsUpdatedNotAcceptance() {
		stubSavePassthrough();
		Instant start = Instant.now().plus(48, ChronoUnit.HOURS);
		Appointment appointment = mockAppointmentWithConsumer(start);

		service.onSalonBookingRescheduled(appointment.getId());

		assertThat(savedTypes()).contains(NotificationType.BOOKING_UPDATED);
		assertThat(savedTypes()).doesNotContain(NotificationType.BOOKING_CREATED_FOR_SALON);
		verify(scheduledNotificationProcessor).processDue();
	}

	@Test
	void onConsumerBookingCancelled_cancelsPendingWithoutReschedulingReminders() {
		stubSavePassthrough();
		Appointment appointment = mockConsumerAppointmentOnly();

		service.onConsumerBookingCancelled(appointment.getId());

		verify(scheduledNotificationRepository).cancelAllPendingForAppointment(
				eq(appointment.getId()),
				eq(QueuedNotificationStatus.PENDING),
				eq(QueuedNotificationStatus.CANCELLED));
		assertThat(savedTypes()).containsExactly(NotificationType.BOOKING_CANCELLED_BY_CONSUMER);
		ScheduledNotification cancelled = findSaved(NotificationType.BOOKING_CANCELLED_BY_CONSUMER);
		assertThat(cancelled.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		verify(fcmPushDispatchService).dispatchForScheduledNotificationWithSalonRoles(
				org.mockito.Mockito.eq(cancelled),
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.anyString());
		verify(transactionalEmailDispatchService).dispatchConsumerAppointmentEmail(
				NotificationType.BOOKING_CANCELLED_BY_CONSUMER, appointment);
	}

	@Test
	void onConsumerBookingCreated_doesNothingWhenNotificationsDisabled() {
		notificationProperties.setEnabled(false);

		service.onConsumerBookingCreated(UUID.randomUUID());

		verify(scheduledNotificationRepository, never()).save(any());
	}

	@Test
	void onSalonManualBookingCreated_onlyEmailsConsumer_notSalonInbox() {
		Appointment appointment = mockAppointmentWithConsumer(Instant.now().plus(3, ChronoUnit.DAYS));

		service.onSalonManualBookingCreated(appointment.getId());

		assertThat(savedTypes()).doesNotContain(NotificationType.BOOKING_CREATED_FOR_SALON);
		assertThat(savedTypes()).contains(NotificationType.BOOKING_CONFIRMATION);
	}

	@Test
	void onSalonManualBookingCreated_walkInClient_onlySalonInboxNotification() {
		stubSavePassthrough();
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		when(appointment.getConsumerProfile()).thenReturn(null);
		when(appointmentRepository.findByIdWithGraph(any())).thenReturn(Optional.of(appointment));

		service.onSalonManualBookingCreated(appointment.getId());

		assertThat(savedTypes()).containsExactly(NotificationType.BOOKING_CREATED_FOR_SALON);
	}

	@Test
	void onAppointmentStatusChanged_bookedToCancelled_notifiesConsumerWithRequestRejected() {
		stubSavePassthrough();
		Appointment appointment = mockConsumerAppointmentOnly();

		service.onAppointmentStatusChanged(
				appointment.getId(), AppointmentStatus.BOOKED, AppointmentStatus.CANCELLED);

		assertThat(savedTypes()).containsExactly(NotificationType.BOOKING_REQUEST_REJECTED);
		verify(scheduledNotificationProcessor).processDue();
	}

	@Test
	void onAppointmentStatusChanged_confirmedToCancelled_notifiesConsumerWithSalonCancellation() {
		stubSavePassthrough();
		Appointment appointment = mockConsumerAppointmentOnly();

		service.onAppointmentStatusChanged(
				appointment.getId(), AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED);

		assertThat(savedTypes()).containsExactly(NotificationType.BOOKING_CANCELLED_BY_SALON);
		verify(scheduledNotificationProcessor).processDue();
	}

	@Test
	void onConsumerBookingCreated_doesNothingWithoutConsumerProfile() {
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		when(appointment.getConsumerProfile()).thenReturn(null);
		when(appointmentRepository.findByIdWithGraph(any())).thenReturn(Optional.of(appointment));

		service.onConsumerBookingCreated(appointment.getId());

		verify(scheduledNotificationRepository, never()).save(any());
	}

	private Appointment mockConsumerAppointmentOnly() {
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		UUID id = UUID.randomUUID();
		when(appointment.getId()).thenReturn(id);
		when(appointment.getConsumerProfile()).thenReturn(org.mockito.Mockito.mock(ConsumerProfile.class));
		it.luxury.studio.domain.Location location = org.mockito.Mockito.mock(it.luxury.studio.domain.Location.class);
		lenient().when(location.getName()).thenReturn("Sede Test");
		lenient().when(appointment.getLocation()).thenReturn(location);
		when(appointmentRepository.findByIdWithGraph(any())).thenReturn(Optional.of(appointment));
		return appointment;
	}

	private Appointment mockAppointmentWithConsumer(Instant start) {
		Appointment appointment = mockConsumerAppointmentOnly();
		when(appointment.getStart()).thenReturn(start);
		when(appointment.getEnd()).thenReturn(start.plus(1, ChronoUnit.HOURS));
		return appointment;
	}

	private List<ScheduledNotification> allSaved() {
		verify(scheduledNotificationRepository, org.mockito.Mockito.atLeastOnce())
				.save(scheduledCaptor.capture());
		return scheduledCaptor.getAllValues();
	}

	private List<NotificationType> savedTypes() {
		return allSaved().stream().map(ScheduledNotification::getType).toList();
	}

	private ScheduledNotification findSaved(NotificationType type) {
		return allSaved().stream()
				.filter(n -> n.getType() == type)
				.findFirst()
				.orElseThrow(() -> new AssertionError("Nessuna notifica salvata di tipo " + type));
	}
}
