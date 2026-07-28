package it.luxury.studio.dto;

import java.time.Instant;
import java.util.UUID;

public record MeSalonReviewDto(
		UUID id,
		int rating,
		Integer staffRating,
		/** Nome in anagrafica dell'operatore prenotato; {@code null} se assente. */
		String operatorName,
		String comment,
		Instant createdAt,
		String reviewerName,
		UUID appointmentId,
		Instant appointmentStart,
		String serviceName,
		String locationName) {
}
