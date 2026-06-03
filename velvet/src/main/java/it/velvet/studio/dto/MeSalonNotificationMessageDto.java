package it.velvet.studio.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Voce log email/notifica per titolare ({@code GET /api/v1/me/salon/notifications/messages}).
 */
public record MeSalonNotificationMessageDto(
		UUID id,
		String notificationType,
		String status,
		Instant scheduledAt,
		Instant sentAt,
		UUID appointmentId,
		String clientName,
		String previewLine) {
}
