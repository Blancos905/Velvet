package it.velvet.review.dto;

import java.util.UUID;

/**
 * Riga aggregata per super admin: media voti salone (post-visita) su tutte le sedi e servizi dello studio.
 */
public record SuperAdminSalonReviewSummaryRow(
		UUID studioGroupId,
		String salonName,
		Double averageRating,
		Long reviewCount,
		String showcaseLocationSlug) {
}
