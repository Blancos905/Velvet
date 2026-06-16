package it.velvet.notification.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.UserDevice;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FcmPushDispatchServiceTest {

	private static final UUID CONSUMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID APPOINTMENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final String FCM_TOKEN = "device-token-test";

	@Mock
	private NotificationService notificationService;

	@Mock
	private UserDeviceRepository userDeviceRepository;

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Test
	void dispatchForScheduledNotification_consumerBookingConfirmation_sendsToConsumerDevices() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository);
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		ConsumerProfile consumer = org.mockito.Mockito.mock(ConsumerProfile.class);
		ScheduledNotification notification = org.mockito.Mockito.mock(ScheduledNotification.class);
		UUID notificationId = UUID.randomUUID();

		when(notification.getAppointment()).thenReturn(appointment);
		when(notification.getType()).thenReturn(NotificationType.BOOKING_CONFIRMATION);
		when(notification.getId()).thenReturn(notificationId);
		when(appointment.getId()).thenReturn(APPOINTMENT_ID);
		when(appointment.getConsumerProfile()).thenReturn(consumer);
		when(consumer.getId()).thenReturn(CONSUMER_ID);
		when(userDeviceRepository.findByUserId(CONSUMER_ID))
				.thenReturn(List.of(new UserDevice(CONSUMER_ID, FCM_TOKEN, it.velvet.notification.domain.DeviceOsType.IOS)));

		service.dispatchForScheduledNotification(notification, "Titolo", "Corpo");

		ArgumentCaptor<java.util.Map<String, String>> dataCaptor = ArgumentCaptor.forClass(java.util.Map.class);
		verify(notificationService).sendPushNotification(eq(FCM_TOKEN), eq("Titolo"), eq("Corpo"), dataCaptor.capture());
	}

	@Test
	void dispatchForScheduledNotification_salonBookingCreated_sendsToOwnerDevices() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository);
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		Location location = org.mockito.Mockito.mock(Location.class);
		StudioGroup studioGroup = org.mockito.Mockito.mock(StudioGroup.class);
		ConsumerProfile owner = org.mockito.Mockito.mock(ConsumerProfile.class);
		ScheduledNotification notification = org.mockito.Mockito.mock(ScheduledNotification.class);
		UUID ownerId = UUID.fromString("33333333-3333-3333-3333-333333333333");

		when(notification.getAppointment()).thenReturn(appointment);
		when(notification.getType()).thenReturn(NotificationType.BOOKING_CREATED_FOR_SALON);
		when(notification.getId()).thenReturn(UUID.randomUUID());
		when(appointment.getId()).thenReturn(APPOINTMENT_ID);
		when(appointment.getLocation()).thenReturn(location);
		when(location.getStudioGroup()).thenReturn(studioGroup);
		when(studioGroup.getOwnerKeycloakSub()).thenReturn("owner-sub");
		when(consumerProfileRepository.findByKeycloakSub("owner-sub")).thenReturn(Optional.of(owner));
		when(owner.getDeletedAt()).thenReturn(null);
		when(owner.getId()).thenReturn(ownerId);
		when(userDeviceRepository.findByUserId(ownerId))
				.thenReturn(List.of(new UserDevice(ownerId, FCM_TOKEN, it.velvet.notification.domain.DeviceOsType.IOS)));

		service.dispatchForScheduledNotification(notification, "Nuova prenotazione", "Corpo");

		verify(notificationService).sendPushNotification(eq(FCM_TOKEN), eq("Nuova prenotazione"), eq("Corpo"), any());
	}
}
