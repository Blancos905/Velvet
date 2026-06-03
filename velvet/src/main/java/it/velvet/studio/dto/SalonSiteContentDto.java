package it.velvet.studio.dto;

import it.velvet.studio.domain.SalonSiteContent;

import java.time.Instant;

/**
 * Contenuto vetrina/sito restituito al frontend. {@code payload} è lo stesso blob JSON gestito dal client.
 */
public record SalonSiteContentDto(String kind, String payload, Instant updatedAt) {

	public static SalonSiteContentDto from(SalonSiteContent content) {
		return new SalonSiteContentDto(content.getKind().token(), content.getPayload(), content.getUpdatedAt());
	}
}
