package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.UserDevice;
import it.luxury.notification.domain.UserDeviceRepository;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
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

	@Mock
	private StaffOperatorRepository staffOperatorRepository;

	@Test
	void dispatchForScheduledNotification_consumerBookingConfirmation_sendsToConsumerDevices() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository, staffOperatorRepository);
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
				.thenReturn(List.of(new UserDevice(CONSUMER_ID, FCM_TOKEN, it.luxury.notification.domain.DeviceOsType.IOS)));

		service.dispatchForScheduledNotification(notification, "Titolo", "Corpo");

		ArgumentCaptor<java.util.Map<String, String>> dataCaptor = ArgumentCaptor.forClass(java.util.Map.class);
		verify(notificationService).sendPushNotification(eq(FCM_TOKEN), eq("Titolo"), eq("Corpo"), dataCaptor.capture());
	}

	@Test
	void dispatchForScheduledNotification_salonBookingCreated_sendsToOwnerDevices() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository, staffOperatorRepository);
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
		when(studioGroup.getOwnerAuthSub()).thenReturn("owner-sub");
		when(consumerProfileRepository.findByAuthSub("owner-sub")).thenReturn(Optional.of(owner));
		when(owner.getDeletedAt()).thenReturn(null);
		when(owner.getId()).thenReturn(ownerId);
		when(userDeviceRepository.findByUserId(ownerId))
				.thenReturn(List.of(new UserDevice(ownerId, FCM_TOKEN, it.luxury.notification.domain.DeviceOsType.IOS)));

		service.dispatchForScheduledNotification(notification, "Nuova prenotazione", "Corpo");

		verify(notificationService).sendPushNotification(eq(FCM_TOKEN), eq("Nuova prenotazione"), eq("Corpo"), any());
	}

	@Test
	void dispatchForScheduledNotification_salonBookingCreated_sendsToLinkedStaffOperator() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository, staffOperatorRepository);
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		Location location = org.mockito.Mockito.mock(Location.class);
		StudioGroup studioGroup = org.mockito.Mockito.mock(StudioGroup.class);
		StaffOperator operator = org.mockito.Mockito.mock(StaffOperator.class);
		ConsumerProfile owner = org.mockito.Mockito.mock(ConsumerProfile.class);
		ConsumerProfile staff = org.mockito.Mockito.mock(ConsumerProfile.class);
		ScheduledNotification notification = org.mockito.Mockito.mock(ScheduledNotification.class);
		UUID ownerId = UUID.fromString("33333333-3333-3333-3333-333333333333");
		UUID staffId = UUID.fromString("44444444-4444-4444-4444-444444444444");
		String staffToken = "staff-device-token";

		when(notification.getAppointment()).thenReturn(appointment);
		when(notification.getType()).thenReturn(NotificationType.BOOKING_CREATED_FOR_SALON);
		when(notification.getId()).thenReturn(UUID.randomUUID());
		when(appointment.getId()).thenReturn(APPOINTMENT_ID);
		when(appointment.getLocation()).thenReturn(location);
		when(appointment.getOperator()).thenReturn(operator);
		when(operator.getConsumerProfile()).thenReturn(staff);
		when(staff.getDeletedAt()).thenReturn(null);
		when(staff.getId()).thenReturn(staffId);
		when(location.getStudioGroup()).thenReturn(studioGroup);
		when(studioGroup.getOwnerAuthSub()).thenReturn("owner-sub");
		when(consumerProfileRepository.findByAuthSub("owner-sub")).thenReturn(Optional.of(owner));
		when(owner.getDeletedAt()).thenReturn(null);
		when(owner.getId()).thenReturn(ownerId);
		when(userDeviceRepository.findByUserId(ownerId))
				.thenReturn(List.of(new UserDevice(ownerId, FCM_TOKEN, it.luxury.notification.domain.DeviceOsType.IOS)));
		when(userDeviceRepository.findByUserId(staffId))
				.thenReturn(List.of(new UserDevice(staffId, staffToken, it.luxury.notification.domain.DeviceOsType.ANDROID)));

		service.dispatchForScheduledNotification(notification, "Nuova prenotazione", "Corpo");

		verify(notificationService).sendPushNotification(eq(FCM_TOKEN), eq("Nuova prenotazione"), eq("Corpo"), any());
		verify(notificationService).sendPushNotification(eq(staffToken), eq("Nuova prenotazione"), eq("Corpo"), any());
	}

	@Test
	void dispatchForScheduledNotification_salonBookingCreated_resolvesStaffViaRepositoryWhenProfileNotLoaded() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository, staffOperatorRepository);
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		StaffOperator operator = org.mockito.Mockito.mock(StaffOperator.class);
		ScheduledNotification notification = org.mockito.Mockito.mock(ScheduledNotification.class);
		UUID operatorId = UUID.fromString("55555555-5555-5555-5555-555555555555");
		UUID staffId = UUID.fromString("44444444-4444-4444-4444-444444444444");
		String staffToken = "staff-device-token";

		when(notification.getAppointment()).thenReturn(appointment);
		when(notification.getType()).thenReturn(NotificationType.BOOKING_CREATED_FOR_SALON);
		when(notification.getId()).thenReturn(UUID.randomUUID());
		when(appointment.getId()).thenReturn(APPOINTMENT_ID);
		when(appointment.getLocation()).thenReturn(null);
		when(appointment.getOperator()).thenReturn(operator);
		when(operator.getId()).thenReturn(operatorId);
		when(operator.getConsumerProfile()).thenReturn(null);
		when(staffOperatorRepository.findConsumerProfileIdByOperatorId(operatorId)).thenReturn(Optional.of(staffId));
		when(userDeviceRepository.findByUserId(staffId))
				.thenReturn(List.of(new UserDevice(staffId, staffToken, it.luxury.notification.domain.DeviceOsType.ANDROID)));

		service.dispatchForScheduledNotification(notification, "Nuova prenotazione", "Corpo");

		verify(notificationService).sendPushNotification(eq(staffToken), eq("Nuova prenotazione"), eq("Corpo"), any());
	}

	@Test
	void dispatchForScheduledNotification_bookingUpdated_sendsToOwnerStaffAndConsumer() {
		FcmPushDispatchService service = new FcmPushDispatchService(
				notificationService, userDeviceRepository, consumerProfileRepository, staffOperatorRepository);
		Appointment appointment = org.mockito.Mockito.mock(Appointment.class);
		Location location = org.mockito.Mockito.mock(Location.class);
		StudioGroup studioGroup = org.mockito.Mockito.mock(StudioGroup.class);
		StaffOperator operator = org.mockito.Mockito.mock(StaffOperator.class);
		ConsumerProfile owner = org.mockito.Mockito.mock(ConsumerProfile.class);
		ConsumerProfile staff = org.mockito.Mockito.mock(ConsumerProfile.class);
		ConsumerProfile consumer = org.mockito.Mockito.mock(ConsumerProfile.class);
		ScheduledNotification notification = org.mockito.Mockito.mock(ScheduledNotification.class);
		UUID ownerId = UUID.fromString("33333333-3333-3333-3333-333333333333");
		UUID staffId = UUID.fromString("44444444-4444-4444-4444-444444444444");
		UUID consumerId = CONSUMER_ID;
		String staffToken = "staff-device-token";
		String consumerToken = "consumer-device-token";

		when(notification.getAppointment()).thenReturn(appointment);
		when(notification.getType()).thenReturn(NotificationType.BOOKING_UPDATED);
		when(notification.getId()).thenReturn(UUID.randomUUID());
		when(appointment.getId()).thenReturn(APPOINTMENT_ID);
		when(appointment.getLocation()).thenReturn(location);
		when(appointment.getOperator()).thenReturn(operator);
		when(appointment.getConsumerProfile()).thenReturn(consumer);
		when(operator.getConsumerProfile()).thenReturn(staff);
		when(staff.getDeletedAt()).thenReturn(null);
		when(staff.getId()).thenReturn(staffId);
		when(consumer.getId()).thenReturn(consumerId);
		when(location.getStudioGroup()).thenReturn(studioGroup);
		when(studioGroup.getOwnerAuthSub()).thenReturn("owner-sub");
		when(consumerProfileRepository.findByAuthSub("owner-sub")).thenReturn(Optional.of(owner));
		when(owner.getDeletedAt()).thenReturn(null);
		when(owner.getId()).thenReturn(ownerId);
		when(userDeviceRepository.findByUserId(ownerId))
				.thenReturn(List.of(new UserDevice(ownerId, FCM_TOKEN, it.luxury.notification.domain.DeviceOsType.IOS)));
		when(userDeviceRepository.findByUserId(staffId))
				.thenReturn(List.of(new UserDevice(staffId, staffToken, it.luxury.notification.domain.DeviceOsType.ANDROID)));
		when(userDeviceRepository.findByUserId(consumerId))
				.thenReturn(List.of(new UserDevice(consumerId, consumerToken, it.luxury.notification.domain.DeviceOsType.IOS)));

		service.dispatchForScheduledNotification(notification, "Prenotazione spostata", "Corpo");

		verify(notificationService).sendPushNotification(eq(FCM_TOKEN), eq("Prenotazione spostata"), eq("Corpo"), any());
		verify(notificationService).sendPushNotification(eq(staffToken), eq("Prenotazione spostata"), eq("Corpo"), any());
		verify(notificationService).sendPushNotification(eq(consumerToken), eq("Prenotazione spostata"), eq("Corpo"), any());
	}
}
