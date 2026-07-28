package it.luxury.studio.dto;

import it.luxury.catalog.domain.SalonService;

import java.util.List;
import java.util.UUID;

/** Listino servizi della prima sede del titolare — stessi campi della vetrina pubblica. */
public record MeSalonServiceDto(
		UUID id,
		String name,
		int durationMinutes,
		int priceCents,
		String description,
		List<UUID> operatorIds) {

	public static MeSalonServiceDto from(SalonService s) {
		List<UUID> operatorIds = s.getOperators().stream().map(o -> o.getId()).sorted().toList();
		return new MeSalonServiceDto(
				s.getId(),
				s.getName(),
				s.getDurationMinutes(),
				s.getPriceCents(),
				s.getDescription(),
				operatorIds);
	}
}
