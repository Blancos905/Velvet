package it.velvet.studio.dto;

/**
 * Conteggi email/notifiche programmate per tipo, per sedi dello studio del titolare
 * ({@code GET /api/v1/me/salon/notifications}).
 */
public record MeSalonNotificationTypeStatDto(
		String type,
		String label,
		long sent,
		long pending) {
}
