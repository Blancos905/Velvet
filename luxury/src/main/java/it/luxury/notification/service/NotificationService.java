package it.luxury.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import it.luxury.notification.domain.UserDeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class NotificationService {

	private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

	private final Optional<FirebaseMessaging> firebaseMessaging;
	private final UserDeviceRepository userDeviceRepository;

	public NotificationService(
			Optional<FirebaseMessaging> firebaseMessaging,
			UserDeviceRepository userDeviceRepository) {
		this.firebaseMessaging = firebaseMessaging;
		this.userDeviceRepository = userDeviceRepository;
	}

	/**
	 * Invia una notifica push FCM. Se il token risulta invalido o scaduto, lo rimuove dal database.
	 */
	public void sendPushNotification(String fcmToken, String title, String body, Map<String, String> data) {
		FirebaseMessaging messaging = firebaseMessaging.orElse(null);
		if (messaging == null) {
			log.debug("Push FCM non inviata: Firebase Admin SDK non configurato (token={}).", abbreviate(fcmToken));
			return;
		}
		if (fcmToken == null || fcmToken.isBlank()) {
			log.debug("Push FCM non inviata: token assente.");
			return;
		}
		Message.Builder builder = Message.builder()
				.setToken(fcmToken.trim())
				.setNotification(Notification.builder()
						.setTitle(title != null ? title : "")
						.setBody(body != null ? body : "")
						.build())
				// Allineato al canale creato in MainActivity (luxury_alerts).
				.setAndroidConfig(com.google.firebase.messaging.AndroidConfig.builder()
						.setPriority(com.google.firebase.messaging.AndroidConfig.Priority.HIGH)
						.setNotification(com.google.firebase.messaging.AndroidNotification.builder()
								.setChannelId("luxury_alerts")
								.setPriority(com.google.firebase.messaging.AndroidNotification.Priority.HIGH)
								.build())
						.build());
		if (data != null && !data.isEmpty()) {
			builder.putAllData(data);
		}
		try {
			String messageId = messaging.send(builder.build());
			log.debug("Push FCM inviata (messageId={}, token={}).", messageId, abbreviate(fcmToken));
		}
		catch (FirebaseMessagingException ex) {
			if (isInvalidOrExpiredToken(ex)) {
				userDeviceRepository.deleteByFcmToken(fcmToken.trim());
				log.info(
						"Token FCM invalido o scaduto rimosso dal database (token={}, code={}).",
						abbreviate(fcmToken),
						ex.getMessagingErrorCode());
				return;
			}
			log.warn(
					"Invio push FCM fallito (token={}, code={}): {}",
					abbreviate(fcmToken),
					ex.getMessagingErrorCode(),
					ex.getMessage());
		}
	}

	private static boolean isInvalidOrExpiredToken(FirebaseMessagingException ex) {
		MessagingErrorCode code = ex.getMessagingErrorCode();
		return code == MessagingErrorCode.UNREGISTERED
				|| code == MessagingErrorCode.INVALID_ARGUMENT
				|| code == MessagingErrorCode.SENDER_ID_MISMATCH;
	}

	private static String abbreviate(String token) {
		if (token == null) {
			return "";
		}
		String trimmed = token.trim();
		if (trimmed.length() <= 12) {
			return trimmed;
		}
		return trimmed.substring(0, 8) + "…";
	}
}
