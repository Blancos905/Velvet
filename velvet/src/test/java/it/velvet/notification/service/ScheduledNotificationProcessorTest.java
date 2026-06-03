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
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduledNotificationProcessorTest {

	@Mock
	private ScheduledNotificationRepository scheduledNotificationRepository;

	@Mock
	private AppointmentTokenService appointmentTokenService;

	@Mock
	private NotificationWhatsappDispatcher notificationWhatsappDispatcher;

	@Mock
	private ReviewRepository reviewRepository;

	@Captor
	private ArgumentCaptor<String> whatsappMessageCaptor;

	@Test
	void processDue_sendsWhatsappAndMarksSent() {
		VelvetNotificationProperties props = new VelvetNotificationProperties();
		props.setEnabled(true);

		ScheduledNotificationProcessor processor = new ScheduledNotificationProcessor(
				scheduledNotificationRepository,
				props,
				appointmentTokenService,
				notificationWhatsappDispatcher,
				reviewRepository);

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
		when(consumerProfile.getPhone()).thenReturn("393430344650");
		when(appointmentTokenService.mintManageToken(eq(appointmentId))).thenReturn("token-test");
		when(notificationWhatsappDispatcher.canSend()).thenReturn(true);

		ScheduledNotification n = new ScheduledNotification(appointment, NotificationType.BOOKING_CONFIRMATION, Instant.now().minusSeconds(10));
		when(scheduledNotificationRepository.findDuePending(
				eq(QueuedNotificationStatus.PENDING),
				any(Instant.class),
				eq(PageRequest.of(0, 50))))
				.thenReturn(List.of(n));

		processor.processDue();

		verify(notificationWhatsappDispatcher).send(
				eq("393430344650"),
				any(),
				eq(appointmentId),
				eq(NotificationType.BOOKING_CONFIRMATION.name()));
		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		assertThat(n.getWhatsappSentAt()).isNotNull();
	}

	@Test
	void processDue_reminder_doesNotUseSalonClientPhone() {
		VelvetNotificationProperties props = new VelvetNotificationProperties();
		props.setEnabled(true);

		ScheduledNotificationProcessor processor = new ScheduledNotificationProcessor(
				scheduledNotificationRepository,
				props,
				appointmentTokenService,
				notificationWhatsappDispatcher,
				reviewRepository);

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
		when(consumerProfile.getPhone()).thenReturn(" ");
		when(appointmentTokenService.mintManageToken(eq(appointmentId))).thenReturn("token-test");

		ScheduledNotification n = new ScheduledNotification(appointment, NotificationType.REMINDER_1H, Instant.now().minusSeconds(10));
		when(scheduledNotificationRepository.findDuePending(
				eq(QueuedNotificationStatus.PENDING),
				any(Instant.class),
				eq(PageRequest.of(0, 50))))
				.thenReturn(List.of(n));

		processor.processDue();

		verify(notificationWhatsappDispatcher, never()).send(anyString(), anyString(), any(), anyString());
		verify(notificationWhatsappDispatcher, never()).canSend();
		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		assertThat(n.getWhatsappSentAt()).isNull();
	}

	@Test
	void processDue_reminder_sendsWhatsappToConsumerProfilePhone() {
		VelvetNotificationProperties props = new VelvetNotificationProperties();
		props.setEnabled(true);

		ScheduledNotificationProcessor processor = new ScheduledNotificationProcessor(
				scheduledNotificationRepository,
				props,
				appointmentTokenService,
				notificationWhatsappDispatcher,
				reviewRepository);

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
		when(consumerProfile.getPhone()).thenReturn("393430344650");
		when(appointmentTokenService.mintManageToken(eq(appointmentId))).thenReturn("token-test");
		when(notificationWhatsappDispatcher.canSend()).thenReturn(true);

		ScheduledNotification n = new ScheduledNotification(appointment, NotificationType.REMINDER_1H, Instant.now().minusSeconds(10));
		when(scheduledNotificationRepository.findDuePending(
				eq(QueuedNotificationStatus.PENDING),
				any(Instant.class),
				eq(PageRequest.of(0, 50))))
				.thenReturn(List.of(n));

		processor.processDue();

		verify(notificationWhatsappDispatcher).send(
				eq("393430344650"),
				whatsappMessageCaptor.capture(),
				eq(appointmentId),
				eq(NotificationType.REMINDER_1H.name()));
		assertThat(n.getWhatsappSentAt()).isNotNull();
		assertThat(whatsappMessageCaptor.getValue()).contains("circa 2 ore");
	}

	@Test
	void processDue_reminder24h_sendsWhatsappWith24HourCopy() {
		ScheduledNotificationProcessor processor = processorWithWhatsappEnabled();
		ReminderFixture fixture = appointmentForReminder(Instant.now().plus(20, ChronoUnit.HOURS));
		ScheduledNotification n = dueNotification(fixture.appointment(), NotificationType.REMINDER_24H);

		processor.processDue();

		verify(notificationWhatsappDispatcher).send(
				eq("393430344650"),
				whatsappMessageCaptor.capture(),
				eq(fixture.appointmentId()),
				eq(NotificationType.REMINDER_24H.name()));
		assertThat(whatsappMessageCaptor.getValue())
				.contains("circa 24 ore")
				.contains("Salon Test")
				.contains("Taglio");
		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
	}

	@Test
	void processDue_reminder2h_sendsWhatsappWith2HourCopy() {
		ScheduledNotificationProcessor processor = processorWithWhatsappEnabled();
		ReminderFixture fixture = appointmentForReminder(Instant.now().plus(3, ChronoUnit.HOURS));
		ScheduledNotification n = dueNotification(fixture.appointment(), NotificationType.REMINDER_1H);

		processor.processDue();

		verify(notificationWhatsappDispatcher).send(
				eq("393430344650"),
				whatsappMessageCaptor.capture(),
				eq(fixture.appointmentId()),
				eq(NotificationType.REMINDER_1H.name()));
		assertThat(whatsappMessageCaptor.getValue()).contains("circa 2 ore");
		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
	}

	@Test
	void processDue_reminder_cancelledWhenAppointmentAlreadyStarted() {
		ScheduledNotificationProcessor processor = processorWithWhatsappEnabled();
		Appointment appointment = appointmentWithStartOnly(Instant.now().minus(5, ChronoUnit.MINUTES));
		ScheduledNotification n = dueNotification(appointment, NotificationType.REMINDER_24H);

		processor.processDue();

		verify(notificationWhatsappDispatcher, never()).send(anyString(), anyString(), any(), anyString());
		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.CANCELLED);
		assertThat(n.getSentAt()).isNull();
	}

	@Test
	void processDue_reminder_cancelledWhenProcessorRunsAtOrAfterStart_evenIfQueuedEarlier() {
		ScheduledNotificationProcessor processor = processorWithWhatsappEnabled();
		Instant start = Instant.now().minus(1, ChronoUnit.SECONDS);
		Appointment appointment = appointmentWithStartOnly(start);
		ScheduledNotification n = dueNotification(appointment, NotificationType.REMINDER_1H);

		processor.processDue();

		verify(notificationWhatsappDispatcher, never()).send(anyString(), anyString(), any(), anyString());
		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.CANCELLED);
	}

	@Test
	void processDue_reminder24h_stillSentWhenAppointmentIsInFuture() {
		ScheduledNotificationProcessor processor = processorWithWhatsappEnabled();
		ReminderFixture fixture = appointmentForReminder(Instant.now().plus(24, ChronoUnit.HOURS));
		ScheduledNotification n = dueNotification(fixture.appointment(), NotificationType.REMINDER_24H);

		processor.processDue();

		assertThat(n.getStatus()).isEqualTo(QueuedNotificationStatus.SENT);
		verify(notificationWhatsappDispatcher).send(
				anyString(), anyString(), eq(fixture.appointmentId()), anyString());
	}

	private ScheduledNotificationProcessor processorWithWhatsappEnabled() {
		VelvetNotificationProperties props = new VelvetNotificationProperties();
		props.setEnabled(true);
		return new ScheduledNotificationProcessor(
				scheduledNotificationRepository,
				props,
				appointmentTokenService,
				notificationWhatsappDispatcher,
				reviewRepository);
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
		when(appointmentTokenService.mintManageToken(eq(appointmentId))).thenReturn("token-test");
		when(notificationWhatsappDispatcher.canSend()).thenReturn(true);
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
