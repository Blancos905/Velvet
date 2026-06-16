package it.velvet.notification.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentStatus;
import it.velvet.catalog.domain.SalonService;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.QueuedNotificationStatus;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.AppointmentTokenService;
import it.velvet.studio.domain.Location;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduledNotificationProcessorTest {

	@Mock
	private ScheduledNotificationRepository scheduledNotificationRepository;

	@Mock
	private AppointmentTokenService appointmentTokenService;

	@Mock
	private ReviewRepository reviewRepository;

	@Mock
	private FcmPushDispatchService fcmPushDispatchService;

	@Mock
	private TransactionalEmailDispatchService transactionalEmailDispatchService;

	@Test
	void processDue_marksBookingConfirmationSent() {
		ScheduledNotificationProcessor processor = processor();
		Appointment appointment = appointmentWithPhone("393430344650");
		ScheduledNotification n = dueNotification(appointment, NotificationType.BOOKING_CONFIRMATION);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		assertThat(n.getSentAt()).isNotNull();
	}

	@Test
	void processDue_reminder_doesNotUseSalonClientPhoneWhenConsumerPhoneBlank() {
		ScheduledNotificationProcessor processor = processor();
		Appointment appointment = appointmentWithPhone(" ");
		ScheduledNotification n = dueNotification(appointment, NotificationType.REMINDER_1H);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		assertThat(n.getSentAt()).isNotNull();
	}

	@Test
	void processDue_reminder_marksSentWithConsumerProfilePhone() {
		ScheduledNotificationProcessor processor = processor();
		ReminderFixture fixture = appointmentForReminder(Instant.now().plus(3, ChronoUnit.HOURS));
		ScheduledNotification n = dueNotification(fixture.appointment(), NotificationType.REMINDER_1H);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		assertThat(n.getSentAt()).isNotNull();
	}

	@Test
	void processDue_reminder_cancelledWhenAppointmentAlreadyStarted() {
		ScheduledNotificationProcessor processor = processor();
		Appointment appointment = appointmentWithStartOnly(Instant.now().minus(5, ChronoUnit.MINUTES));
		ScheduledNotification n = dueNotification(appointment, NotificationType.REMINDER_24H);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.CANCELLED);
		assertThat(n.getSentAt()).isNull();
	}

	@Test
	void processDue_reminder_cancelledWhenProcessorRunsAtOrAfterStart_evenIfQueuedEarlier() {
		ScheduledNotificationProcessor processor = processor();
		Instant start = Instant.now().minus(1, ChronoUnit.SECONDS);
		Appointment appointment = appointmentWithStartOnly(start);
		ScheduledNotification n = dueNotification(appointment, NotificationType.REMINDER_1H);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.CANCELLED);
	}

	@Test
	void processDue_reminder24h_stillSentWhenAppointmentIsInFuture() {
		ScheduledNotificationProcessor processor = processor();
		ReminderFixture fixture = appointmentForReminder(Instant.now().plus(24, ChronoUnit.HOURS));
		ScheduledNotification n = dueNotification(fixture.appointment(), NotificationType.REMINDER_24H);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
	}

	private ScheduledNotificationProcessor processor() {
		VelvetNotificationProperties props = new VelvetNotificationProperties();
		props.setEnabled(true);
		return new ScheduledNotificationProcessor(
				scheduledNotificationRepository,
				props,
				appointmentTokenService,
				reviewRepository,
				fcmPushDispatchService,
				transactionalEmailDispatchService);
	}

	private Appointment appointmentWithPhone(String phone) {
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		Location location = org.mockito.Mockito.mock(Location.class);
		SalonService service = org.mockito.Mockito.mock(SalonService.class);
		ConsumerProfile consumerProfile = org.mockito.Mockito.mock(ConsumerProfile.class);
		UUID appointmentId = UUID.randomUUID();

		when(appointment.getId()).thenReturn(appointmentId);
		when(appointment.getStatus()).thenReturn(AppointmentStatus.CONFIRMED);
		when(appointment.getStart()).thenReturn(Instant.now().plusSeconds(3 * 3600));
		when(appointment.getLocation()).thenReturn(location);
		when(appointment.getService()).thenReturn(service);
		when(appointment.getConsumerProfile()).thenReturn(consumerProfile);
		when(location.getTimeZone()).thenReturn("Europe/Rome");
		when(location.getName()).thenReturn("Salon Test");
		when(service.getName()).thenReturn("Taglio");
		when(consumerProfile.getPhone()).thenReturn(phone);
		return appointment;
	}

	private ReminderFixture appointmentForReminder(Instant start) {
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		Location location = org.mockito.Mockito.mock(Location.class);
		SalonService service = org.mockito.Mockito.mock(SalonService.class);
		ConsumerProfile consumerProfile = org.mockito.Mockito.mock(ConsumerProfile.class);
		UUID appointmentId = UUID.randomUUID();

		when(appointment.getId()).thenReturn(appointmentId);
		when(appointment.getStatus()).thenReturn(AppointmentStatus.CONFIRMED);
		when(appointment.getStart()).thenReturn(start);
		when(appointment.getLocation()).thenReturn(location);
		when(appointment.getService()).thenReturn(service);
		when(appointment.getConsumerProfile()).thenReturn(consumerProfile);
		when(location.getTimeZone()).thenReturn("Europe/Rome");
		when(location.getName()).thenReturn("Salon Test");
		when(service.getName()).thenReturn("Taglio");
		when(consumerProfile.getPhone()).thenReturn("393430344650");
		return new ReminderFixture(appointment, appointmentId);
	}

	private Appointment appointmentWithStartOnly(Instant start) {
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		when(appointment.getStatus()).thenReturn(AppointmentStatus.CONFIRMED);
		when(appointment.getStart()).thenReturn(start);
		return appointment;
	}

	private record ReminderFixture(Appointment appointment, UUID appointmentId) {}

	private ScheduledNotification dueNotification(Appointment appointment, NotificationType type) {
		ScheduledNotification n = new ScheduledNotification(appointment, type, Instant.now().minusSeconds(10));
		when(scheduledNotificationRepository.findDuePending(
				eq(QueuedNotificationStatus.PENDING),
				any(Instant.class),
				eq(PageRequest.of(0, 50))))
				.thenReturn(List.of(n));
		return n;
	}
}
