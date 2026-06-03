package it.velvet.notification.service;

import it.velvet.config.VelvetNotificationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Component
public class NotificationWhatsappDispatcher {

	private static final Logger log = LoggerFactory.getLogger(NotificationWhatsappDispatcher.class);

	private final VelvetNotificationProperties notificationProperties;
	private final RestClient restClient;

	public NotificationWhatsappDispatcher(VelvetNotificationProperties notificationProperties) {
		this.notificationProperties = notificationProperties;
		this.restClient = RestClient.create();
	}

	public boolean canSend() {
		return notificationProperties.isWhatsappEnabled()
				&& notificationProperties.getWhatsappWebhookUrl() != null
				&& !notificationProperties.getWhatsappWebhookUrl().isBlank();
	}

	/**
	 * Normalizza il numero per il webhook (tipicamente E.164). Numeri nazionali IT senza prefisso: mobile 10 cifre che inizia con 3 → +39.
	 */
	public String normalizeDestination(String raw) {
		if (raw == null) {
			return null;
		}
		String s = raw.trim().replace(" ", "").replace("-", "");
		if (s.isEmpty()) {
			return null;
		}
		if (s.startsWith("+")) {
			return s;
		}
		if (s.startsWith("00")) {
			return "+" + s.substring(2);
		}
		String ccDigits = notificationProperties.getWhatsappDefaultCountryCallingCode().replace("+", "");
		if (!s.matches("[0-9]+")) {
			return s;
		}
		if ("39".equals(ccDigits) && s.length() == 10 && s.charAt(0) == '3') {
			return "+39" + s;
		}
		if (s.length() > ccDigits.length() && s.startsWith(ccDigits)) {
			return "+" + s;
		}
		return "+" + ccDigits + s;
	}

	public void send(String toPhone, String message, UUID appointmentId, String notificationType) {
		String to = normalizeDestination(toPhone);
		if (to == null || to.isBlank()) {
			throw new IllegalStateException("Numero WhatsApp vuoto dopo normalizzazione.");
		}
		String url = notificationProperties.getWhatsappWebhookUrl();
		if (url == null || url.isBlank()) {
			throw new IllegalStateException("Webhook WhatsApp non configurato.");
		}
		RestClient.RequestBodySpec request = restClient.post()
				.uri(url.trim())
				.contentType(MediaType.APPLICATION_JSON);
		String bearerToken = notificationProperties.getWhatsappBearerToken();
		if (bearerToken != null && !bearerToken.isBlank()) {
			request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken.trim());
		}
		request.body(Map.of(
						"to", to,
						"message", message,
						"appointmentId", appointmentId.toString(),
						"notificationType", notificationType))
				.retrieve()
				.toBodilessEntity();
		log.debug("WhatsApp inviato a={} appointmentId={} type={}", to, appointmentId, notificationType);
	}
}
