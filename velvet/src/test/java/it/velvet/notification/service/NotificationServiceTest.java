package it.velvet.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import it.velvet.notification.domain.UserDeviceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

	private static final String FCM_TOKEN = "fcm-token-unit-test";

	@Mock
	private FirebaseMessaging firebaseMessaging;

	@Mock
	private UserDeviceRepository userDeviceRepository;

	@Test
	void sendPushNotification_withoutFirebase_doesNothing() {
		NotificationService service = new NotificationService(Optional.empty(), userDeviceRepository);

		service.sendPushNotification(FCM_TOKEN, "Titolo", "Corpo", Map.of("k", "v"));

		verify(userDeviceRepository, never()).deleteByFcmToken(any());
	}

	@Test
	void sendPushNotification_success_sendsMessage() throws Exception {
		NotificationService service = new NotificationService(Optional.of(firebaseMessaging), userDeviceRepository);
		when(firebaseMessaging.send(any(Message.class))).thenReturn("projects/x/messages/1");

		service.sendPushNotification(FCM_TOKEN, "Titolo", "Corpo", Map.of("type", "booking"));

		verify(firebaseMessaging).send(any(Message.class));
		verify(userDeviceRepository, never()).deleteByFcmToken(any());
	}

	@Test
	void sendPushNotification_unregisteredToken_removesFromDatabase() throws Exception {
		NotificationService service = new NotificationService(Optional.of(firebaseMessaging), userDeviceRepository);
		FirebaseMessagingException ex = org.mockito.Mockito.mock(FirebaseMessagingException.class);
		when(ex.getMessagingErrorCode()).thenReturn(MessagingErrorCode.UNREGISTERED);
		when(firebaseMessaging.send(any(Message.class))).thenThrow(ex);

		service.sendPushNotification(FCM_TOKEN, "Titolo", "Corpo", null);

		verify(userDeviceRepository).deleteByFcmToken(FCM_TOKEN);
	}
}
